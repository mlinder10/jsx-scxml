import type { ScxmlChild } from "../core/ast.js";
import type { Jexl } from "./jexl.js";
import type { NodeRef } from "./transition.js";

export type Position = {
  readonly x: number;
  readonly y: number;
};

export type LoggingPrefix =
  | "sf:announcement"
  | "sf:script"
  | "sf:branch"
  | "sf:module"
  | "sf:intent"
  | "sf:language"
  | "sf:assignResult"
  | "sf:disconnect"
  | "sf:filOffer"
  | "State"
  | "Final";

export type KnownNodeType =
  | "Announcement"
  | "Script"
  | "Branch"
  | "Module"
  | "Intent"
  | "Language"
  | "Result"
  | "Disconnect"
  | "FILOffer"
  | "Return";

/** Allows editor-specific node types while documenting the built-in vocabulary. */
export type NodeType = KnownNodeType | (string & {});

export type Metadata = {
  readonly name?: string;
  readonly nodeType?: NodeType;
  readonly x?: number;
  readonly y?: number;
  readonly overrideError?: boolean;
};

export type NodeProps = {
  readonly node: NodeRef;
  readonly enable?: Jexl;
  readonly beforeScript?: Jexl;
  readonly afterScript?: Jexl;
  readonly onExit?: Jexl;
  /** Omit for terminal nodes that do not dispatch `module.complete`. */
  readonly to?: NodeRef;
} & Metadata;

/** Exactly one source mode must be provided by components that invoke a resource. */
export type StaticSource = {
  readonly src: string;
  readonly srcExpr?: never;
};

export type DynamicSource = {
  readonly src?: never;
  readonly srcExpr: Jexl;
};

export type Source = StaticSource | DynamicSource;

export function defaultMetadata(nodeType: NodeType | null): Metadata {
  return nodeType === null
    ? { name: "", x: 0, y: 0 }
    : { name: "", x: 0, y: 0, nodeType };
}

export function serializeMetadata(metadata: Metadata): string {
  return JSON.stringify(metadata);
}

export function quoteJexlString(value: string): Jexl {
  return `'${value.replace(/\\/g, "\\\\").replace(/'/g, "\\'")}'` as Jexl;
}

export type NodeChildren = {
  readonly children?: ScxmlChild;
};

export const STD_TYPE_TO_LOGGING_PREFIX: Record<KnownNodeType, LoggingPrefix> =
  {
    Announcement: "sf:announcement",
    Script: "sf:script",
    Branch: "sf:branch",
    Module: "sf:module",
    Intent: "sf:intent",
    Language: "sf:language",
    Result: "sf:assignResult",
    Disconnect: "sf:disconnect",
    FILOffer: "sf:filOffer",
    Return: "Final",
  };
