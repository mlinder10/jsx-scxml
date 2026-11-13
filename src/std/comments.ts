import type { ScxmlComment } from "../core/ast.js";
import type { Position } from "./types.js";
import type { ReferenceNodeRef } from "./transition.js";

// MARK: Comment

export type CommentProps = {
  readonly comment: string;
  readonly position?: Position;
  readonly color?: string;
  readonly width?: number;
  readonly height?: number;
};

export type CommentMetadata = {
  readonly comment: string;
  readonly position: Position;
  readonly color: string;
  readonly width: number;
  readonly height: number;
};

/**
 * Produces a Swampfox flow comment as an XML comment AST node.
 */
export function CommentNode({
  comment,
  position = { x: 0, y: 0 },
  color = "#FFC",
  width = 0,
  height = 0,
}: CommentProps): ScxmlComment {
  const value: CommentMetadata = { comment, position, color, width, height };
  return { kind: "comment", value: `FLOWCOMMENT|${JSON.stringify(value)}` };
}

// MARK: Reference

export type ReferenceNodeProps = {
  readonly ref: ReferenceNodeRef;
};

export type ReferenceMetadata = {
  readonly id: string;
  readonly refedNodeID: string;
  readonly position: Position;
};

export function ReferenceNode({ ref }: ReferenceNodeProps): ScxmlComment {
  const value: ReferenceMetadata = {
    id: ref.id,
    refedNodeID: ref.referencedNode.id,
    position: ref.position,
  };
  return { kind: "comment", value: `REFNODE|${JSON.stringify(value)}` };
}
