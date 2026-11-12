type XmlNode = {
  readonly name: string;
  readonly attributes: Readonly<Record<string, string>>;
  readonly children: XmlNode[];
  readonly text: string;
};

type NodeKind =
  | "Announcement"
  | "AssignResults"
  | "Disconnect"
  | "FILOffer"
  | "Language"
  | "Module"
  | "Script"
  | "SetIntent";

const DEFAULT_METADATA = { name: "", nodeType: "Script", x: 0, y: 0 };
const ENTITY_MAP: Readonly<Record<string, string>> = {
  amp: "&",
  apos: "'",
  gt: ">",
  lt: "<",
  quot: '"',
};

/** Parses Swampfox SCXML emitted by the jsx-scxml standard components into TSX. */
export function parseScxmlToTsx(flowText: string): string {
  const scxml = parseXml(flowText);
  if (scxml.name !== "scxml") {
    throw new Error(`Expected an <scxml> document, received <${scxml.name}>.`);
  }

  const imports = new Set<string>(["Flow"]);
  const needs = { module: false, announcement: false, routing: false };
  const dataModel = child(scxml, "datamodel");
  const data = dataModel?.children.filter(({ name }) => name === "data") ?? [];
  const nodes = scxml.children.filter(
    ({ name }) => name === "state" || name === "final",
  );
  const renderedNodes = nodes.map((node) => renderNode(node, imports, needs));

  const stdImports = [...imports].sort().join(",\n  ");
  const sourceImports = [
    needs.module && 'import module from "@modules" with { type: "json" };',
    needs.announcement &&
      'import announcement from "@announcements" with { type: "json" };',
    needs.routing && 'import routing from "@routing" with { type: "json" };',
  ].filter(Boolean);
  const flowProps = [
    attribute(scxml, "initial") &&
      `initial=${quote(attribute(scxml, "initial")!)}`,
    `dataModel={${renderDataModel(data)}}`,
    attribute(scxml, "global-module-disconnect-id") &&
      `globalModuleDisconnectId=${quote(attribute(scxml, "global-module-disconnect-id")!)}`,
    attribute(scxml, "global-module-error-id") &&
      `globalModuleErrorId=${quote(attribute(scxml, "global-module-error-id")!)}`,
  ].filter(Boolean);

  return [
    'import { jexl } from "jsx-scxml";',
    `import {\n  ${stdImports},\n} from "jsx-scxml/std";`,
    ...sourceImports,
    "",
    "export default (",
    `  <Flow\n${flowProps.map((prop) => `    ${prop}`).join("\n")}\n  >`,
    ...renderedNodes.map((node) => indent(node, 4)),
    "  </Flow>",
    ");",
    "",
  ].join("\n");
}

/** Backwards-compatible short name for callers that only need the generated TSX. */
export const parse = parseScxmlToTsx;

function renderDataModel(data: readonly XmlNode[]): string {
  if (data.length === 0) return "{}";
  return [
    "{",
    ...data.map(
      (entry) =>
        `      ${property(attribute(entry, "id") ?? "")}: ${jexlExpression(attribute(entry, "expr") ?? "")},`,
    ),
    "    }",
  ].join("\n");
}

function renderNode(
  node: XmlNode,
  imports: Set<string>,
  needs: { module: boolean; announcement: boolean; routing: boolean },
): string {
  const id = requiredAttribute(node, "id");
  const metadata = readMetadata(node);
  const isReturn = node.name === "final";
  const transitions = node.children.filter(({ name }) => name === "transition");
  const action = findAction(node);

  if (
    !isReturn &&
    !action &&
    transitions.every((transition) => !attribute(transition, "event"))
  ) {
    imports.add("Branch");
    imports.add("BranchTransition");
    return renderBranch(id, metadata, transitions);
  }

  const component = isReturn ? "Return" : (action?.kind ?? "Script");
  imports.add(component);
  const props = [
    `id=${quote(id)}`,
    metadataProp(
      metadata,
      isReturn ? { ...DEFAULT_METADATA, nodeType: "Return" } : DEFAULT_METADATA,
    ),
    ...renderCommonNodeProps(node, transitions, action?.element),
    ...(action ? renderActionProps(action, needs) : []),
  ].filter(Boolean);

  return `<${component}\n${props.map((prop) => `  ${prop}`).join("\n")}\n/>`;
}

function renderBranch(
  id: string,
  metadata: unknown,
  transitions: readonly XmlNode[],
): string {
  const metadataProperty = metadataProp(metadata, DEFAULT_METADATA);
  const props = [`id=${quote(id)}`, metadataProperty].filter(Boolean).join(" ");
  return [
    `<Branch ${props}>`,
    ...transitions.map((transition) => {
      const assign = child(transition, "assign");
      const script = child(transition, "script");
      const labelExpression = assign
        ? (attribute(assign, "expr") ?? "''")
        : "''";
      return [
        "  <BranchTransition",
        `    label=${quote(unquoteJexl(labelExpression))}`,
        `    to=${quote(requiredAttribute(transition, "target"))}`,
        `    cond=${jexl(attribute(transition, "cond") ?? "true")}`,
        script && `    script=${jexl(script.text)}`,
        "  />",
      ]
        .filter(Boolean)
        .join("\n");
    }),
    "</Branch>",
  ].join("\n");
}

function renderCommonNodeProps(
  node: XmlNode,
  transitions: readonly XmlNode[],
  actionElement: XmlNode | undefined,
): string[] {
  const onEntry = child(node, "onentry");
  const onExit = child(node, "onexit");
  const enable = onEntry && findAssignExpression(onEntry, "lastEnabled");
  const transition = transitions.find(
    ({ attributes }) => attributes.event === "module.complete",
  );
  const props: string[] = [];
  if (enable && enable !== "true") props.push(`enable=${jexl(enable)}`);
  if (transition)
    props.push(`to=${quote(requiredAttribute(transition, "target"))}`);

  const entryScripts = executableEntryScripts(onEntry, actionElement);
  if (entryScripts.length > 0)
    props.push(`beforeScript=${jexl(entryScripts[0])}`);
  if (entryScripts.length > 1)
    props.push(`afterScript=${jexl(entryScripts[1])}`);
  const exitScript = executableExitScript(onExit);
  if (exitScript) props.push(`onExit=${jexl(exitScript)}`);
  return props;
}

function renderActionProps(
  action: { kind: NodeKind; element: XmlNode },
  needs: { module: boolean; announcement: boolean; routing: boolean },
): string[] {
  const { kind, element } = action;
  switch (kind) {
    case "Announcement":
      needs.announcement = true;
      return sourceProps(element, "announcement");
    case "Module":
    case "FILOffer":
      needs.module = true;
      return [
        ...sourceProps(element, "module"),
        optionalProp("nameList", attribute(element, "namelist")),
        attribute(element, "result") === "lastResult"
          ? ""
          : optionalProp("result", attribute(element, "result")),
      ];
    case "SetIntent":
      needs.routing = true;
      return [
        ...sourceProps(element, "routing"),
        attribute(element, "immediate") === "true" ? "immediate" : "",
      ];
    case "Language":
      return [`language=${quote(requiredAttribute(element, "src"))}`];
    case "Script":
      return scriptProps(element);
    case "AssignResults":
      return [`results={${renderResults(element)}}`];
    case "Disconnect":
      return [];
  }
}

function sourceProps(
  element: XmlNode,
  namespace: "module" | "announcement" | "routing",
): string[] {
  const srcExpr = attribute(element, "srcexpr");
  if (srcExpr) return [`srcExpr=${jexl(srcExpr)}`];
  const src = requiredAttribute(element, "src");
  return [`src={${resourceReference(namespace, src)}}`];
}

function resourceReference(namespace: string, key: string): string {
  return /^[A-Za-z_$][\w$]*$/.test(key)
    ? `${namespace}.${key}`
    : `${namespace}[${quote(key)}]`;
}

function scriptProps(element: XmlNode): string[] {
  if (element.name === "script") return [`inline=${jexl(element.text)}`];
  const srcExpr = attribute(element, "srcexpr");
  if (srcExpr) return [`srcExpr=${jexl(srcExpr)}`];
  const src = attribute(element, "src");
  return src ? [`src=${quote(src)}`] : [];
}

function renderResults(element: XmlNode): string {
  const results = element.children.filter(
    ({ name }) => name === "sf:assignResult",
  );
  return `{ ${results.map((result) => `${property(requiredAttribute(result, "name"))}: ${jexl(requiredAttribute(result, "srcexpr"))}`).join(", ")} }`;
}

function findAction(
  node: XmlNode,
): { kind: NodeKind; element: XmlNode } | undefined {
  const onEntry = child(node, "onentry");
  const candidates = onEntry ? descendants(onEntry) : [];
  const kinds: Readonly<Record<string, NodeKind>> = {
    "sf:announcement": "Announcement",
    "sf:assignResult": "AssignResults",
    "sf:disconnect": "Disconnect",
    "sf:filOffer": "FILOffer",
    "sf:intent": "SetIntent",
    "sf:language": "Language",
    "sf:module": "Module",
    "sf:script": "Script",
    script: "Script",
  };
  const element = candidates.find(({ name }) => name in kinds);
  return element ? { kind: kinds[element.name], element } : undefined;
}

function executableEntryScripts(
  onEntry: XmlNode | undefined,
  actionElement: XmlNode | undefined,
): string[] {
  if (!onEntry) return [];
  const conditional = child(onEntry, "if");
  if (!conditional) return [];
  return conditional.children
    .filter((entry) => entry.name === "script" && entry !== actionElement)
    .map(({ text }) => text);
}

function executableExitScript(onExit: XmlNode | undefined): string | undefined {
  const conditional = onExit && child(onExit, "if");
  return conditional && child(conditional, "script")?.text;
}

function readMetadata(node: XmlNode): unknown {
  const raw = attribute(node, "metadata");
  if (!raw) return undefined;
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

function metadataProp(metadata: unknown, fallback: object): string {
  if (
    metadata === undefined ||
    JSON.stringify(metadata) === JSON.stringify(fallback)
  )
    return "";
  return `metadata={${JSON.stringify(metadata)}}`;
}

function findAssignExpression(
  node: XmlNode,
  location: string,
): string | undefined {
  return node.children.find(
    (entry) =>
      entry.name === "assign" && attribute(entry, "location") === location,
  )?.attributes.expr;
}

function child(node: XmlNode, name: string): XmlNode | undefined {
  return node.children.find((entry) => entry.name === name);
}
function descendants(node: XmlNode): XmlNode[] {
  return node.children.flatMap((entry) => [entry, ...descendants(entry)]);
}
function attribute(node: XmlNode, name: string): string | undefined {
  return node.attributes[name];
}
function requiredAttribute(node: XmlNode, name: string): string {
  const value = attribute(node, name);
  if (value === undefined)
    throw new Error(`Expected <${node.name}> to have a ${name} attribute.`);
  return value;
}
function optionalProp(name: string, value: string | undefined): string {
  return value ? `${name}=${quote(value)}` : "";
}
function property(value: string): string {
  return /^[A-Za-z_$][\w$]*$/.test(value) ? value : quote(value);
}
function quote(value: string): string {
  return JSON.stringify(value);
}
function jexlExpression(value: string): string {
  return `jexl\`${value.replace(/`/g, "\\`").replace(/\$\{/g, "\\${")}\``;
}

function jexl(value: string): string {
  return `{${jexlExpression(value)}}`;
}
function unquoteJexl(value: string): string {
  return value.length >= 2 && value.startsWith("'") && value.endsWith("'")
    ? value.slice(1, -1).replace(/\\'/g, "'")
    : value;
}
function indent(value: string, amount: number): string {
  return value
    .split("\n")
    .map((line) => `${" ".repeat(amount)}${line}`)
    .join("\n");
}

function parseXml(xml: string): XmlNode {
  const root: {
    name: string;
    attributes: Record<string, string>;
    children: XmlNode[];
    text: string;
  } = { name: "", attributes: {}, children: [], text: "" };
  const stack = [root];
  const tokens = xml.match(/<!--[\s\S]*?-->|<\?[^]*?\?>|<[^>]+>|[^<]+/g) ?? [];
  for (const token of tokens) {
    if (token.startsWith("<?") || token.startsWith("<!--")) continue;
    if (token.startsWith("</")) {
      if (stack.length === 1) throw new Error("Unexpected XML closing tag.");
      stack.pop();
      continue;
    }
    if (token.startsWith("<")) {
      const selfClosing = /\/\s*>$/.test(token);
      const content = token.slice(1, selfClosing ? -2 : -1).trim();
      const match = /^([^\s/>]+)([\s\S]*)$/.exec(content);
      if (!match) throw new Error(`Invalid XML tag: ${token}`);
      const node = {
        name: match[1],
        attributes: parseAttributes(match[2]),
        children: [],
        text: "",
      };
      stack[stack.length - 1].children.push(node);
      if (!selfClosing) stack.push(node);
    } else {
      stack[stack.length - 1].text += decodeEntities(token).trim();
    }
  }
  if (stack.length !== 1 || root.children.length !== 1)
    throw new Error("Expected one complete XML document.");
  return root.children[0];
}

function parseAttributes(input: string): Record<string, string> {
  const attributes: Record<string, string> = {};
  const pattern = /([^\s=]+)\s*=\s*("([^"]*)"|'([^']*)')/g;
  for (const match of input.matchAll(pattern))
    attributes[match[1]] = decodeEntities(match[3] ?? match[4] ?? "");
  return attributes;
}

function decodeEntities(value: string): string {
  return value.replace(
    /&(#x[\da-fA-F]+|#\d+|\w+);/g,
    (entity, body: string) => {
      if (body.startsWith("#x"))
        return String.fromCodePoint(Number.parseInt(body.slice(2), 16));
      if (body.startsWith("#"))
        return String.fromCodePoint(Number.parseInt(body.slice(1), 10));
      return ENTITY_MAP[body] ?? entity;
    },
  );
}
