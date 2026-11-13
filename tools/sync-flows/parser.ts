type XmlNode = {
  readonly name: string;
  readonly attributes: Readonly<Record<string, string>>;
  readonly children: XmlNode[];
  readonly comments: string[];
  readonly text: string;
};

type FlowAnnotation =
  | {
      readonly kind: "comment";
      readonly comment: string;
      readonly position: Position;
      readonly color?: string;
      readonly width?: number;
      readonly height?: number;
    }
  | {
      readonly kind: "reference";
      readonly id: string;
      readonly refedNodeID: string;
      readonly position: Position;
    };

type Position = { readonly x: number; readonly y: number };

type NodeKind =
  | "Announcement"
  | "AssignResults"
  | "Disconnect"
  | "FILOffer"
  | "Language"
  | "Module"
  | "Script"
  | "SetIntent";

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
  const annotations: FlowAnnotation[] = [];
  for (const comment of scxml.comments) {
    const annotation = parseFlowAnnotation(comment);
    if (annotation) annotations.push(annotation);
  }
  const comments = annotations.filter(
    (annotation): annotation is Extract<FlowAnnotation, { kind: "comment" }> =>
      annotation.kind === "comment",
  );
  if (comments.length > 0) imports.add("CommentNode");
  const nodes = scxml.children.filter(
    ({ name }) => name === "state" || name === "final",
  );
  const nodeRefs = createNodeRefs(nodes);
  const refRefs = createReferenceRefs(annotations);
  imports.add("defineNodes");
  imports.add("node");
  imports.add("finalNode");
  if (refRefs.size > 0) imports.add("refNode");
  const renderedNodes = nodes.map((node) =>
    renderNode(node, imports, needs, nodeRefs),
  );

  const stdImports = [...imports].sort().join(",\n  ");
  const sourceImports = [
    needs.module && 'import module from "#modules" with { type: "json" };',
    needs.announcement &&
      'import announcement from "#announcements" with { type: "json" };',
    needs.routing && 'import routing from "#routing" with { type: "json" };',
  ].filter(Boolean);
  const flowProps = [
    "graph={graph}",
    comments.length > 0 && `annotations={${renderAnnotations(comments)}}`,
    attribute(scxml, "initial") &&
      `initial={${nodeRef(nodeRefs, attribute(scxml, "initial")!)}}`,
    `dataModel={${renderDataModel(data)}}`,
    attribute(scxml, "global-module-disconnect-id") &&
      `globalModuleDisconnectId={${flowTarget(nodeRefs, refRefs, attribute(scxml, "global-module-disconnect-id")!)}}`,
    attribute(scxml, "global-module-error-id") &&
      `globalModuleErrorId={${flowTarget(nodeRefs, refRefs, attribute(scxml, "global-module-error-id")!)}}`,
  ].filter((prop): prop is string => Boolean(prop));

  return [
    'import { jexl } from "jsx-scxml";',
    `import {\n  ${stdImports},\n} from "jsx-scxml/std";`,
    ...sourceImports,
    "",
    renderNodesDeclaration(nodes, nodeRefs, annotations, refRefs),
    "",
    "export default (",
    `  <Flow\n${flowProps.map((prop) => indent(prop, 4)).join("\n")}\n  >`,
    ...renderedNodes.map((node) => indent(node, 4)),
    "  </Flow>",
    ");",
    "",
  ].join("\n");
}

/** Backwards-compatible short name for callers that only need the generated TSX. */
export const parse = parseScxmlToTsx;

function renderNodesDeclaration(
  nodes: readonly XmlNode[],
  nodeRefs: ReadonlyMap<string, string>,
  annotations: readonly FlowAnnotation[],
  refRefs: ReadonlyMap<string, string>,
): string {
  const references = annotations.filter(
    (
      annotation,
    ): annotation is Extract<FlowAnnotation, { kind: "reference" }> =>
      annotation.kind === "reference",
  );
  return [
    "const graph = defineNodes({",
    "  nodes: {",
    ...nodes.map((xmlNode) => {
      const xmlId = requiredAttribute(xmlNode, "id");
      const factory = xmlNode.name === "final" ? "finalNode" : "node";
      return `    ${nodeRefs.get(xmlId)!}: ${factory}({ xmlId: ${quote(xmlId)} }),`;
    }),
    "  },",
    "  refs: {",
    ...references.map(
      (annotation) =>
        `    ${refRefs.get(annotation.id)!}: refNode(${quote(nodeRefs.get(annotation.refedNodeID)!)}, { xmlId: ${quote(annotation.id)}, position: { x: ${annotation.position.x}, y: ${annotation.position.y} } }),`,
    ),
    "  },",
    "});",
  ].join("\n");
}

function renderAnnotations(
  annotations: readonly Extract<FlowAnnotation, { kind: "comment" }>[],
): string {
  return [
    "[",
    ...annotations.map((annotation) => `  ${renderAnnotation(annotation)},`),
    "]",
  ].join("\n");
}

function renderAnnotation(
  annotation: Extract<FlowAnnotation, { kind: "comment" }>,
): string {
  return `<CommentNode comment=${quote(annotation.comment)} position={{ x: ${annotation.position.x}, y: ${annotation.position.y} }}${annotation.color === undefined ? "" : ` color=${quote(annotation.color)}`}${annotation.width === undefined ? "" : ` width={${annotation.width}}`}${annotation.height === undefined ? "" : ` height={${annotation.height}}`} />`;
}

function parseFlowAnnotation(value: string): FlowAnnotation | undefined {
  const separator = value.indexOf("|");
  if (separator === -1) return undefined;
  const kind = value.slice(0, separator);
  if (kind !== "FLOWCOMMENT" && kind !== "REFNODE") return undefined;

  let metadata: unknown;
  try {
    metadata = JSON.parse(decodeEntities(value.slice(separator + 1)));
  } catch {
    throw new Error(`Invalid ${kind} metadata comment.`);
  }
  if (!isRecord(metadata) || !isPosition(metadata.position)) {
    throw new Error(`Invalid ${kind} metadata comment.`);
  }
  if (kind === "FLOWCOMMENT") {
    if (typeof metadata.comment !== "string")
      throw new Error("Invalid FLOWCOMMENT metadata comment.");
    return {
      kind: "comment",
      comment: metadata.comment,
      position: metadata.position,
      ...(typeof metadata.color === "string" ? { color: metadata.color } : {}),
      ...(typeof metadata.width === "number" ? { width: metadata.width } : {}),
      ...(typeof metadata.height === "number"
        ? { height: metadata.height }
        : {}),
    };
  }
  if (
    typeof metadata.id !== "string" ||
    typeof metadata.refedNodeID !== "string"
  )
    throw new Error("Invalid REFNODE metadata comment.");
  return {
    kind: "reference",
    id: metadata.id,
    refedNodeID: metadata.refedNodeID,
    position: metadata.position,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isPosition(value: unknown): value is Position {
  return (
    isRecord(value) &&
    typeof value.x === "number" &&
    typeof value.y === "number"
  );
}

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
  nodeRefs: ReadonlyMap<string, string>,
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
    return renderBranch(id, metadata, transitions, nodeRefs);
  }

  const component = isReturn ? "Return" : (action?.kind ?? "Script");
  imports.add(component);
  const props = [
    `node={${nodeRef(nodeRefs, id)}}`,
    ...metadataProps(metadata),
    ...renderCommonNodeProps(node, transitions, action?.element, nodeRefs),
    ...(action ? renderActionProps(action, needs) : []),
  ].filter(Boolean);

  return `<${component}\n${props.map((prop) => `  ${prop}`).join("\n")}\n/>`;
}

function renderBranch(
  id: string,
  metadata: unknown,
  transitions: readonly XmlNode[],
  nodeRefs: ReadonlyMap<string, string>,
): string {
  const props = [
    `node={${nodeRef(nodeRefs, id)}}`,
    ...metadataProps(metadata),
  ].join(" ");
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
        `    to={${nodeRef(nodeRefs, requiredAttribute(transition, "target"))}}`,
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
  nodeRefs: ReadonlyMap<string, string>,
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
    props.push(
      `to={${nodeRef(nodeRefs, requiredAttribute(transition, "target"))}}`,
    );

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
  return [`src=${quote(src)}`];
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

function metadataProps(metadata: unknown): string[] {
  if (!isRecord(metadata)) return [];

  const props: string[] = [];
  if (typeof metadata.name === "string")
    props.push(`name=${quote(metadata.name)}`);
  if (typeof metadata.nodeType === "string")
    props.push(`nodeType=${quote(metadata.nodeType)}`);
  if (typeof metadata.x === "number") props.push(`x={${metadata.x}}`);
  if (typeof metadata.y === "number") props.push(`y={${metadata.y}}`);
  if (typeof metadata.overrideError === "boolean")
    props.push(`overrideError={${metadata.overrideError}}`);
  return props;
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
function createNodeRefs(
  nodes: readonly XmlNode[],
): ReadonlyMap<string, string> {
  const refs = new Map<string, string>();
  const usedKeys = new Set<string>();
  for (const xmlNode of nodes) {
    const xmlId = requiredAttribute(xmlNode, "id");
    if (refs.has(xmlId))
      throw new Error(`Duplicate top-level node ID: ${xmlId}.`);

    const baseKey = camelCaseKey(xmlId);
    let key = baseKey;
    let suffix = 2;
    while (usedKeys.has(key)) key = `${baseKey}${suffix++}`;
    refs.set(xmlId, key);
    usedKeys.add(key);
  }
  return refs;
}

function createReferenceRefs(
  annotations: readonly FlowAnnotation[],
): ReadonlyMap<string, string> {
  const refs = new Map<string, string>();
  const usedKeys = new Set<string>();
  for (const annotation of annotations) {
    if (annotation.kind !== "reference") continue;
    if (refs.has(annotation.id))
      throw new Error(`Duplicate reference node ID: ${annotation.id}.`);

    const baseKey = camelCaseKey(annotation.id);
    let key = baseKey;
    let suffix = 2;
    while (usedKeys.has(key)) key = `${baseKey}${suffix++}`;
    refs.set(annotation.id, key);
    usedKeys.add(key);
  }
  return refs;
}

function camelCaseKey(xmlId: string): string {
  const words = xmlId.match(/[A-Za-z0-9]+/g) ?? [];
  const key = words
    .map((word, index) => {
      const normalized =
        word === word.toUpperCase() ? word.toLowerCase() : word;
      return index === 0
        ? normalized[0]?.toLowerCase() + normalized.slice(1)
        : normalized[0]?.toUpperCase() + normalized.slice(1);
    })
    .join("");
  const safeKey = key || "node";
  return /^[A-Za-z_$]/.test(safeKey) && !isUnsafeNodeKey(safeKey)
    ? safeKey
    : `node${safeKey[0]?.toUpperCase() ?? ""}${safeKey.slice(1)}`;
}

function isUnsafeNodeKey(key: string): boolean {
  return key === "__proto__" || key === "constructor" || key === "prototype";
}

function nodeRef(nodeRefs: ReadonlyMap<string, string>, xmlId: string): string {
  const key = nodeRefs.get(xmlId);
  if (!key) throw new Error(`Unknown top-level node ID: ${xmlId}.`);
  return `graph.nodes.${key}`;
}

function referenceRef(
  refRefs: ReadonlyMap<string, string>,
  xmlId: string,
): string {
  const key = refRefs.get(xmlId);
  if (!key) throw new Error(`Unknown reference node ID: ${xmlId}.`);
  return `graph.refs.${key}`;
}

function flowTarget(
  nodeRefs: ReadonlyMap<string, string>,
  refRefs: ReadonlyMap<string, string>,
  xmlId: string,
): string {
  if (nodeRefs.has(xmlId)) return nodeRef(nodeRefs, xmlId);
  if (refRefs.has(xmlId)) return referenceRef(refRefs, xmlId);
  return quote(xmlId);
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
    comments: string[];
    text: string;
  } = { name: "", attributes: {}, children: [], comments: [], text: "" };
  const stack = [root];
  const tokens = xml.match(/<!--[\s\S]*?-->|<\?[^]*?\?>|<[^>]+>|[^<]+/g) ?? [];
  for (const token of tokens) {
    if (token.startsWith("<?")) continue;
    if (token.startsWith("<!--")) {
      stack[stack.length - 1].comments.push(token.slice(4, -3));
      continue;
    }
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
        comments: [],
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
