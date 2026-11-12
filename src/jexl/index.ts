export { expr, expression } from "./expression.js";

/** Source written for the target JEXL runtime rather than evaluated by TypeScript. */
export type Jexl = string & {};

/** Creates an explicitly marked JEXL source string. */
export function jexl(
  strings: TemplateStringsArray,
  ...values: readonly (string | number)[]
): Jexl {
  let source = strings[0] ?? "";
  for (let index = 0; index < values.length; index += 1) {
    source += String(values[index]) + (strings[index + 1] ?? "");
  }
  return source as Jexl;
}
