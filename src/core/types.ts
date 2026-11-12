import type { Expression, ScxmlAttributeValue, ScxmlChild } from "./ast.js";

export interface CommonAttributes {
  readonly id?: string;
  /** JSX supplies nested SCXML content through this property. */
  readonly children?: ScxmlChild;
  readonly [attribute: string]: ScxmlAttributeValue | ScxmlChild | undefined;
}

export interface ScxmlAttributes extends CommonAttributes {
  readonly initial?: string;
  readonly version?: "1.0" | string;
  readonly datamodel?: string;
  readonly binding?: "early" | "late";
  readonly name?: string;
}

export interface TransitionAttributes extends CommonAttributes {
  readonly event?: string;
  readonly target?: string;
  readonly cond?: string | Expression;
  readonly type?: "internal" | "external";
}

export interface StateAttributes extends CommonAttributes {
  readonly initial?: string;
}

export interface HistoryAttributes extends CommonAttributes {
  readonly type?: "shallow" | "deep";
}

export interface DataAttributes extends CommonAttributes {
  readonly src?: string;
  readonly expr?: string | Expression;
}

export interface AssignAttributes extends CommonAttributes {
  readonly location: string;
  readonly expr: string | Expression;
}

export interface SendAttributes extends CommonAttributes {
  readonly event?: string;
  readonly eventexpr?: string | Expression;
  readonly target?: string;
  readonly targetexpr?: string | Expression;
  readonly type?: string;
  readonly delay?: string;
  readonly delayexpr?: string | Expression;
}

export interface InvokeAttributes extends CommonAttributes {
  readonly src?: string;
  readonly srcexpr?: string | Expression;
  readonly type?: string;
  readonly typeexpr?: string | Expression;
  readonly idlocation?: string;
  readonly autoforward?: boolean;
}

export interface ExpressionAttributes extends CommonAttributes {
  readonly expr?: string | Expression;
}

export interface IfAttributes extends CommonAttributes {
  readonly cond: string | Expression;
}

export interface ForeachAttributes extends CommonAttributes {
  readonly array: string | Expression;
  readonly item: string;
  readonly index?: string;
}

export type EmptyAttributes = CommonAttributes;
