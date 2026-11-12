import type { Expression } from "../core/ast.js";

/** Marks a value as source code for the SCXML data model rather than a JS value. */
export function expr(
  strings: TemplateStringsArray,
  ...values: readonly (string | number)[]
): Expression {
  let source = strings[0] ?? "";
  for (let index = 0; index < values.length; index += 1) {
    source += String(values[index]) + (strings[index + 1] ?? "");
  }
  return { kind: "expression", source };
}

/** Use when the SCXML expression is already available as a string. */
export function expression(source: string): Expression {
  return { kind: "expression", source };
}
