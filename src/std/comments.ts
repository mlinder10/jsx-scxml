import type { Position } from "./types.js";

export type CommentProps = {
  readonly comment: string;
  readonly position?: Position;
  readonly color?: string;
  readonly width?: number;
  readonly height?: number;
};

type CommentMetadata = {
  readonly comment: string;
  readonly position: Position;
  readonly color: string;
  readonly width: number;
  readonly height: number;
};

/**
 * Produces the Swampfox flow-comment payload. A comment AST node is still
 * required before this can be emitted as an XML comment by the serializer.
 */
export function CommentNode({
  comment,
  position = { x: 0, y: 0 },
  color = "#FFC",
  width = 0,
  height = 0,
}: CommentProps): string {
  const value: CommentMetadata = { comment, position, color, width, height };
  return `<!--FLOWCOMMENT|${JSON.stringify(value)}-->`;
}
