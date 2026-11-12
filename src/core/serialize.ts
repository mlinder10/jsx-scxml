import {
  isExpression,
  type ScxmlChild,
  type ScxmlElement,
  type ScxmlNode,
} from "./ast.js";

export interface SerializeOptions {
  readonly pretty?: boolean;
  readonly xmlDeclaration?: boolean;
  readonly indent?: string;
}

export function serialize(
  node: ScxmlNode | readonly ScxmlNode[],
  options: SerializeOptions = {},
): string {
  const pretty = options.pretty ?? true;
  const indent = options.indent ?? "  ";
  const nodes = Array.isArray(node) ? node : [node];
  const body = nodes
    .map((child) => serializeNode(child, 0, pretty, indent))
    .join(pretty ? "\n" : "");
  return options.xmlDeclaration
    ? `<?xml version="1.0" encoding="UTF-8"?>${pretty ? "\n" : ""}${body}`
    : body;
}

function serializeNode(
  node: ScxmlNode,
  depth: number,
  pretty: boolean,
  indent: string,
): string {
  if (node.kind === "text") return escapeText(node.value);

  const prefix = pretty ? indent.repeat(depth) : "";
  const attributes = serializeAttributes(node);
  if (node.children.length === 0)
    return `${prefix}<${node.name}${attributes}/>`;

  const allText = node.children.every((child) => child.kind === "text");
  if (allText) {
    return `${prefix}<${node.name}${attributes}>${node.children.map((child) => escapeText(child.value)).join("")}</${node.name}>`;
  }

  const children = node.children.map((child) =>
    serializeNode(child, depth + 1, pretty, indent),
  );
  const separator = pretty ? "\n" : "";
  const closingPrefix = pretty ? `\n${prefix}` : "";
  return `${prefix}<${node.name}${attributes}>${separator}${children.join(separator)}${closingPrefix}</${node.name}>`;
}

function serializeAttributes(element: ScxmlElement): string {
  return Object.entries(element.attributes)
    .filter(
      ([, value]) => value !== undefined && value !== null && value !== false,
    )
    .map(([name, value]) => {
      if (value === true) return ` ${name}="true"`;
      const source = isExpression(value) ? value.source : String(value);
      return ` ${name}="${escapeAttribute(source)}"`;
    })
    .join("");
}

function escapeText(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escapeAttribute(value: string): string {
  return escapeText(value).replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}
