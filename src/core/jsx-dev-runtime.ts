export { Fragment, jsx, jsxs } from "./factory.js";
export type { JSX } from "./jsx-runtime.js";

import { jsx } from "./factory.js";
import type { ElementType } from "./factory.js";

/** Development-runtime compatibility entrypoint used by Vite and TypeScript. */
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
