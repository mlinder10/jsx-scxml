export { Fragment, jsx, jsxs } from "../core/factory.js";
export type { JSX } from "./jsx-runtime.js";

import { jsx } from "../core/factory.js";
import type { ElementType } from "../core/factory.js";

/** Development-runtime compatibility entrypoint for the Swampfox JSX dialect. */
export function jsxDEV(
  type: ElementType,
  props: Record<string, unknown> | null,
  key: string | undefined,
  _isStaticChildren: boolean,
  _source: unknown,
  _self: unknown,
) {
  return jsx(type, props, key);
}
