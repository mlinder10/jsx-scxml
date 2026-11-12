import type {
  ScxmlAttributeValue,
  ScxmlChild,
  ScxmlElement,
  ScxmlNode,
} from "./ast.js";

export const Fragment = Symbol.for("jsx-scxml.fragment");

export type Component<Props = Record<string, unknown>> = (
  props: Props & { children?: readonly ScxmlNode[] },
) => ScxmlChild;
export type ElementType<Props = Record<string, unknown>> =
  string | Component<Props> | typeof Fragment;
type PropsWithChildren = Record<string, unknown> & { children?: unknown };

export function jsx(
  type: ElementType,
  props: PropsWithChildren | null,
  _key?: string,
): ScxmlChild {
  const normalizedChildren = normalizeChildren(props?.children);

  if (type === Fragment) return normalizedChildren;

  if (typeof type === "function") {
    const componentProps = { ...(props ?? {}), children: normalizedChildren };
    return type(componentProps);
  }

  const { children: _children, ...attributes } = props ?? {};
  const definedAttributes = Object.fromEntries(
    Object.entries(attributes).filter(([, value]) => value !== undefined),
  ) as Record<string, ScxmlAttributeValue>;

  return {
    kind: "element",
    name: type,
    attributes: definedAttributes,
    children: normalizedChildren,
  };
}

export const jsxs = jsx;

export function normalizeChildren(value: unknown): readonly ScxmlNode[] {
  const output: ScxmlNode[] = [];
  appendChildren(value, output);
  return output;
}

function appendChildren(value: unknown, output: ScxmlNode[]): void {
  if (
    value === null ||
    value === undefined ||
    value === false ||
    value === true
  )
    return;

  if (Array.isArray(value)) {
    for (const child of value) appendChildren(child, output);
    return;
  }

  if (typeof value === "string" || typeof value === "number") {
    output.push({ kind: "text", value: String(value) });
    return;
  }

  if (typeof value === "object" && value !== null && "kind" in value) {
    output.push(value as ScxmlNode);
    return;
  }

  throw new TypeError(`Invalid SCXML child: ${String(value)}`);
}
