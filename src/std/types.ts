import type { ScxmlChild } from "../core/ast.js";
import type { Jexl } from "../jexl/index.js";

export type Position = {
  readonly x: number;
  readonly y: number;
};

export type KnownNodeType =
  | "Announcement"
  | "Branch"
  | "FILOffer"
  | "Intent"
  | "Module"
  | "Return"
  | "Script";

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
  readonly id: string;
  readonly metadata?: Metadata;
  readonly enable?: Jexl;
  readonly beforeScript?: Jexl;
  readonly afterScript?: Jexl;
  readonly onExit?: Jexl;
  /** Omit for terminal nodes that do not dispatch `module.complete`. */
  readonly to?: string;
};

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

export function defaultMetadata(nodeType: NodeType): Metadata {
  return { name: "", nodeType, x: 0, y: 0 };
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
