export { Fragment, jsx, jsxs } from "./factory.js";

import type {
  AssignAttributes,
  CommonAttributes,
  DataAttributes,
  EmptyAttributes,
  ExpressionAttributes,
  ForeachAttributes,
  HistoryAttributes,
  IfAttributes,
  InvokeAttributes,
  ScxmlAttributes,
  SendAttributes,
  StateAttributes,
  TransitionAttributes,
} from "./types.js";
import type { ScxmlChild } from "./ast.js";

export namespace JSX {
  export type Element = ScxmlChild;
  export interface ElementChildrenAttribute {
    children: {};
  }
  export interface IntrinsicAttributes {
    key?: string | number;
  }
  export interface IntrinsicElements {
    scxml: ScxmlAttributes;
    state: StateAttributes;
    parallel: StateAttributes;
    final: CommonAttributes;
    history: HistoryAttributes;
    initial: EmptyAttributes;
    transition: TransitionAttributes;
    onentry: EmptyAttributes;
    onexit: EmptyAttributes;
    datamodel: EmptyAttributes;
    data: DataAttributes;
    donedata: EmptyAttributes;
    content: ExpressionAttributes;
    param: ExpressionAttributes & { name: string; location?: string };
    invoke: InvokeAttributes;
    finalize: EmptyAttributes;
    assign: AssignAttributes;
    raise: CommonAttributes & { event: string };
    send: SendAttributes;
    cancel: CommonAttributes & { sendid?: string; sendidexpr?: string };
    log: ExpressionAttributes & { label?: string };
    script: CommonAttributes & { src?: string };
    if: IfAttributes;
    elseif: IfAttributes;
    else: EmptyAttributes;
    foreach: ForeachAttributes;
  }
}
