declare const brand: unique symbol;

type Brand<T, TBrand extends string> = T & {
  readonly [brand]: TBrand;
};

/** Source written for the target JEXL runtime rather than evaluated by TypeScript. */
export type Jexl = Brand<string, "jexl">;

/** Creates an explicitly marked JEXL source string. */
export function jexl(strings: TemplateStringsArray, ..._: never[]): Jexl {
  if (strings.raw.length !== 1)
    throw new Error("jexl strings cannot use template values");
  return strings.raw[0] as Jexl;
}
