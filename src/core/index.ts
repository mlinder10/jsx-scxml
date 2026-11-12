export { Fragment, jsx, jsxs, normalizeChildren } from "./factory.js";
export { serialize } from "./serialize.js";
export { validate } from "./validate.js";
export type {
  Expression,
  ScxmlAttributeValue,
  ScxmlChild,
  ScxmlElement,
  ScxmlElementName,
  ScxmlNode,
} from "./ast.js";
export type { Component, ElementType } from "./factory.js";
export type {
  Diagnostic,
  DiagnosticSeverity,
  ValidationOptions,
  ValidationResult,
} from "./validate.js";
export type { SerializeOptions } from "./serialize.js";
export type * from "./types.js";
