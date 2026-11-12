export { Fragment, jsx, jsxs } from "../core/factory.js";

import type { JSX as CoreJSX } from "../core/jsx-runtime.js";
import type {
  SwampfoxAnnouncementAttributes,
  SwampfoxAssignResultAttributes,
  SwampfoxDisconnectAttributes,
  SwampfoxFILOfferAttributes,
  SwampfoxIntentAttributes,
  SwampfoxLanguageAttributes,
  SwampfoxLogAttributes,
  SwampfoxModuleAttributes,
  SwampfoxScriptAttributes,
} from "./types.js";

export namespace JSX {
  export type Element = CoreJSX.Element;
  export interface ElementChildrenAttribute
    extends CoreJSX.ElementChildrenAttribute {}
  export interface IntrinsicAttributes extends CoreJSX.IntrinsicAttributes {}
  export interface IntrinsicElements extends CoreJSX.IntrinsicElements {
    scxml: CoreJSX.IntrinsicElements["scxml"] &
      import("./types.js").SwampfoxRootAttributes;
    "sf:log": SwampfoxLogAttributes;
    "sf:script": SwampfoxScriptAttributes;
    "sf:assignResult": SwampfoxAssignResultAttributes;
    "sf:language": SwampfoxLanguageAttributes;
    "sf:announcement": SwampfoxAnnouncementAttributes;
    "sf:intent": SwampfoxIntentAttributes;
    "sf:disconnect": SwampfoxDisconnectAttributes;
    "sf:module": SwampfoxModuleAttributes;
    "sf:filOffer": SwampfoxFILOfferAttributes;
  }
}
