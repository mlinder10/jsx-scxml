export const SCXML_ELEMENT_NAMES = [
  "scxml",
  "state",
  "parallel",
  "final",
  "history",
  "initial",
  "transition",
  "onentry",
  "onexit",
  "datamodel",
  "data",
  "donedata",
  "content",
  "param",
  "invoke",
  "finalize",
  "assign",
  "raise",
  "send",
  "cancel",
  "log",
  "script",
  "if",
  "elseif",
  "else",
  "foreach",
] as const;

export type ScxmlElementName = (typeof SCXML_ELEMENT_NAMES)[number];

export interface Expression {
  readonly kind: "expression";
  readonly source: string;
}

export type ScxmlAttributeValue = string | number | boolean | Expression;

export interface ScxmlElement {
  readonly kind: "element";
  readonly name: string;
  readonly attributes: Readonly<Record<string, ScxmlAttributeValue>>;
  readonly children: readonly ScxmlNode[];
}

export interface ScxmlText {
  readonly kind: "text";
  readonly value: string;
}

/** An XML comment, including its content but excluding `<!--` and `-->`. */
export interface ScxmlComment {
  readonly kind: "comment";
  readonly value: string;
}

export type ScxmlNode = ScxmlElement | ScxmlText | ScxmlComment;
export type ScxmlChild =
  | ScxmlNode
  | string
  | number
  | readonly ScxmlChild[]
  | null
  | undefined
  | boolean;

export function isExpression(value: unknown): value is Expression {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as Expression).kind === "expression"
  );
}

export function isElement(node: ScxmlNode): node is ScxmlElement {
  return node.kind === "element";
}
