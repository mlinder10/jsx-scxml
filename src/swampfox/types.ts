import type { Expression } from "../core/ast.js";
import type { CommonAttributes } from "../core/types.js";

export const SWAMPFOX_NAMESPACE = "http://www.swampfoxinc.com/sf?version1";
export const COMMONS_SCXML_NAMESPACE = "http://commons.apache.ogr/scxml";

export const SWAMPFOX_ELEMENT_NAMES = [
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

export type SwampfoxElementName = (typeof SWAMPFOX_ELEMENT_NAMES)[number];
export type JexlSource = string | Expression;

export interface SwampfoxLogAttributes extends CommonAttributes {
  readonly expr: JexlSource;
}

export interface SwampfoxScriptAttributes extends CommonAttributes {
  readonly src?: string;
  readonly srcexpr?: JexlSource;
}

export interface SwampfoxAssignResultAttributes extends CommonAttributes {
  readonly name: string;
  readonly srcexpr: JexlSource;
}

export interface SwampfoxLanguageAttributes extends CommonAttributes {
  readonly src: string;
}

export interface SwampfoxSourceAttributes extends CommonAttributes {
  readonly src?: string;
  readonly srcexpr?: JexlSource;
}

export interface SwampfoxAnnouncementAttributes extends SwampfoxSourceAttributes {}

export interface SwampfoxIntentAttributes extends SwampfoxSourceAttributes {
  /** Serialized explicitly because the target runtime distinguishes false from omission. */
  readonly immediate?: boolean | "true" | "false";
}

export interface SwampfoxModuleAttributes extends SwampfoxSourceAttributes {
  readonly namelist?: string;
  readonly result?: string;
}

export interface SwampfoxFILOfferAttributes extends SwampfoxModuleAttributes {}

export type SwampfoxDisconnectAttributes = CommonAttributes;

export interface SwampfoxRootAttributes extends CommonAttributes {
  readonly "xmlns:sf"?: typeof SWAMPFOX_NAMESPACE;
  readonly "xmlns:cs"?: typeof COMMONS_SCXML_NAMESPACE;
  readonly "ife-version"?: string;
  readonly "global-module-error-id"?: string;
  readonly "global-module-disconnect-id"?: string;
}

/** Namespace declarations required by Swampfox extension elements. */
export function swampfoxNamespaces(): {
  readonly "xmlns:sf": typeof SWAMPFOX_NAMESPACE;
  readonly "xmlns:cs": typeof COMMONS_SCXML_NAMESPACE;
} {
  return {
    "xmlns:sf": SWAMPFOX_NAMESPACE,
    "xmlns:cs": COMMONS_SCXML_NAMESPACE,
  };
}
