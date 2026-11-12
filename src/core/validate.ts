import {
  SCXML_ELEMENT_NAMES,
  isExpression,
  type ScxmlElement,
  type ScxmlNode,
} from "./ast.js";

export type DiagnosticSeverity = "error" | "warning";

export interface Diagnostic {
  readonly severity: DiagnosticSeverity;
  readonly code: string;
  readonly message: string;
  readonly path: string;
}

export interface ValidationResult {
  readonly diagnostics: readonly Diagnostic[];
  readonly valid: boolean;
}

/** Optional dialect vocabulary accepted in addition to core SCXML. */
export interface ValidationOptions {
  readonly additionalKnownElements?: readonly string[];
  readonly additionalExecutableElements?: readonly string[];
}

const knownElements = new Set<string>(SCXML_ELEMENT_NAMES);
const stateLikeElements = new Set(["state", "parallel", "final", "history"]);
const executableElements = new Set([
  "assign",
  "raise",
  "send",
  "cancel",
  "log",
  "script",
  "if",
  "foreach",
]);

export function validate(
  document: ScxmlNode | readonly ScxmlNode[],
  options: ValidationOptions = {},
): ValidationResult {
  const diagnostics: Diagnostic[] = [];
  const allowedElements = new Set([
    ...knownElements,
    ...(options.additionalKnownElements ?? []),
  ]);
  const allowedExecutableElements = new Set([
    ...executableElements,
    ...(options.additionalExecutableElements ?? []),
  ]);
  const roots = (Array.isArray(document) ? document : [document]).filter(
    (node): node is ScxmlElement => node.kind === "element",
  );

  if (roots.length !== 1 || roots[0]?.name !== "scxml") {
    diagnostics.push({
      severity: "error",
      code: "root-scxml",
      message: "A document must contain exactly one <scxml> root element.",
      path: "/",
    });
  }

  const ids = new Map<string, string>();
  const transitions: { element: ScxmlElement; path: string }[] = [];

  for (const [index, root] of roots.entries()) {
    visit(
      root,
      `/${root.name}[${index}]`,
      undefined,
      ids,
      transitions,
      diagnostics,
      allowedElements,
      allowedExecutableElements,
    );
  }

  for (const { element, path } of transitions) {
    const target = element.attributes.target;
    if (typeof target !== "string") continue;
    for (const id of target.split(/\s+/).filter(Boolean)) {
      if (!id.startsWith("#") && !ids.has(id)) {
        diagnostics.push({
          severity: "error",
          code: "unknown-target",
          message: `<transition> targets unknown state '${id}'.`,
          path,
        });
      }
    }
  }

  return {
    diagnostics,
    valid: !diagnostics.some((item) => item.severity === "error"),
  };
}

function visit(
  element: ScxmlElement,
  path: string,
  parent: ScxmlElement | undefined,
  ids: Map<string, string>,
  transitions: { element: ScxmlElement; path: string }[],
  diagnostics: Diagnostic[],
  allowedElements: ReadonlySet<string>,
  allowedExecutableElements: ReadonlySet<string>,
): void {
  if (!allowedElements.has(element.name)) {
    diagnostics.push({
      severity: "error",
      code: "unknown-element",
      message: `Unsupported SCXML element <${element.name}>.`,
      path,
    });
  }

  validateAttributes(element, path, diagnostics);

  const id = element.attributes.id;
  if (typeof id === "string" && stateLikeElements.has(element.name)) {
    const previous = ids.get(id);
    if (previous) {
      diagnostics.push({
        severity: "error",
        code: "duplicate-id",
        message: `Duplicate state id '${id}' (first declared at ${previous}).`,
        path,
      });
    } else {
      ids.set(id, path);
    }
  }

  if (element.name === "transition") transitions.push({ element, path });
  if (
    element.name === "final" &&
    element.children.some(
      (child) => child.kind === "element" && child.name === "transition",
    )
  ) {
    diagnostics.push({
      severity: "error",
      code: "final-transition",
      message: "<final> cannot contain <transition>.",
      path,
    });
  }
  if (
    element.name === "initial" &&
    !element.children.some(
      (child) => child.kind === "element" && child.name === "transition",
    )
  ) {
    diagnostics.push({
      severity: "error",
      code: "initial-transition",
      message: "<initial> must contain a <transition>.",
      path,
    });
  }
  if (
    (element.name === "onentry" || element.name === "onexit") &&
    !element.children.some(
      (child) =>
        child.kind === "element" && allowedExecutableElements.has(child.name),
    )
  ) {
    diagnostics.push({
      severity: "warning",
      code: "empty-executable-content",
      message: `<${element.name}> has no executable content.`,
      path,
    });
  }
  if (parent?.name === "final" && element.name === "transition") {
    // This duplicates the parent-level error only for a path directly pointing at the invalid child.
    diagnostics.push({
      severity: "error",
      code: "final-transition",
      message: "<transition> cannot be a child of <final>.",
      path,
    });
  }

  for (const [index, child] of element.children.entries()) {
    if (child.kind === "element") {
      visit(
        child,
        `${path}/${child.name}[${index}]`,
        element,
        ids,
        transitions,
        diagnostics,
        allowedElements,
        allowedExecutableElements,
      );
    }
  }
}

function validateAttributes(
  element: ScxmlElement,
  path: string,
  diagnostics: Diagnostic[],
): void {
  for (const [name, value] of Object.entries(element.attributes)) {
    if (
      value === null ||
      value === undefined ||
      (typeof value === "object" && !isExpression(value))
    ) {
      diagnostics.push({
        severity: "error",
        code: "invalid-attribute",
        message: `Attribute '${name}' has an unsupported value.`,
        path,
      });
    }
  }

  for (const name of ["cond", "expr"]) {
    const value = element.attributes[name];
    if (
      value !== undefined &&
      typeof value !== "string" &&
      !isExpression(value)
    ) {
      diagnostics.push({
        severity: "error",
        code: "invalid-expression",
        message: `Attribute '${name}' must be a string or an expression value.`,
        path,
      });
    }
  }
}
