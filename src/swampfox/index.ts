import type { ScxmlNode } from "../core/ast.js";
import {
  validate,
  type ValidationOptions,
  type ValidationResult,
} from "../core/validate.js";
import { SWAMPFOX_ELEMENT_NAMES } from "./types.js";

export {
  COMMONS_SCXML_NAMESPACE,
  SWAMPFOX_ELEMENT_NAMES,
  SWAMPFOX_NAMESPACE,
  swampfoxNamespaces,
} from "./types.js";
export type * from "./types.js";

const SWAMPFOX_EXECUTABLE_ELEMENT_NAMES = [
  "sf:log",
  "sf:script",
  "sf:assignResult",
  "sf:language",
  "sf:announcement",
  "sf:intent",
  "sf:disconnect",
  "sf:module",
  "sf:filOffer",
] as const;

/** Validates core SCXML plus the Swampfox extension vocabulary. */
export function validateSwampfox(
  document: ScxmlNode | readonly ScxmlNode[],
  options: Omit<
    ValidationOptions,
    "additionalKnownElements" | "additionalExecutableElements"
  > = {},
): ValidationResult {
  return validate(document, {
    ...options,
    additionalKnownElements: SWAMPFOX_ELEMENT_NAMES,
    additionalExecutableElements: SWAMPFOX_EXECUTABLE_ELEMENT_NAMES,
  });
}
