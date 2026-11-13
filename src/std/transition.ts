import type { Jexl } from "../jexl/index.js";
import type { Position } from "./types.js";

export type NodeKind = "state" | "final";

export type NodeOptions = {
  /** Preserves an existing SCXML identifier when importing a flow. */
  readonly xmlId?: string;
};

export type ReferenceNodeOptions = {
  /** Preserves an existing Swampfox reference-node identifier when importing. */
  readonly xmlId?: string;
  /** Editor-canvas position of this reference node. */
  readonly position: Position;
};

type NodeDefinition<Kind extends NodeKind> = NodeOptions & {
  readonly kind: Kind;
};

type ReferenceNodeDefinition<Target extends string = string> =
  ReferenceNodeOptions & {
    readonly kind: "reference";
    readonly target: Target;
  };

const nodeReference: unique symbol = Symbol("jsx-scxml.node-reference");
const referenceNodeReference: unique symbol = Symbol(
  "jsx-scxml.reference-node-reference",
);

/** A declared SCXML state or final node that can be used as a transition target. */
export type NodeRef<
  Key extends string = string,
  Kind extends NodeKind = NodeKind,
> = {
  readonly key: Key;
  readonly kind: Kind;
  readonly id: string;
  readonly [nodeReference]: true;
};

/** A declared Swampfox editor reference node, not valid as a transition target. */
export type ReferenceNodeRef<
  Key extends string = string,
  Target extends NodeRef = NodeRef,
> = {
  readonly key: Key;
  readonly kind: "reference";
  readonly id: string;
  readonly position: Position;
  readonly referencedNode: Target;
  readonly [referenceNodeReference]: true;
};

export type FlowGraph<
  Nodes extends Record<string, NodeRef> = Record<string, NodeRef>,
  Refs extends Record<string, ReferenceNodeRef> = Record<
    string,
    ReferenceNodeRef
  >,
> = {
  readonly nodes: Nodes;
  readonly refs: Refs;
};

export function node(options: NodeOptions = {}): NodeDefinition<"state"> {
  return { kind: "state", ...options };
}

export function finalNode(options: NodeOptions = {}): NodeDefinition<"final"> {
  return { kind: "final", ...options };
}

/** Declares an editor reference to a node key from the sibling `nodes` map. */
export function refNode<Target extends string>(
  target: Target,
  options: ReferenceNodeOptions,
): ReferenceNodeDefinition<Target> {
  return { kind: "reference", target, ...options };
}

/**
 * Declares a flow graph. `nodes` receive typed handles for transitions, while
 * `refs` receive typed handles for editor reference comments and global targets.
 */
export function defineNodes<
  const Definitions extends Record<string, NodeDefinition<NodeKind>>,
  const References extends Record<
    string,
    ReferenceNodeDefinition<Extract<keyof Definitions, string>>
  > = {},
>(definitions: {
  readonly nodes: Definitions;
  readonly refs?: References;
}): FlowGraph<
  {
    readonly [Key in keyof Definitions]: Key extends string
      ? NodeRef<Key, Definitions[Key]["kind"]>
      : never;
  },
  {
    readonly [Key in keyof References]: Key extends string
      ? ReferenceNodeRef<Key, NodeRef<References[Key]["target"]>>
      : never;
  }
> {
  const ids = new Set<string>();
  const nodes: Record<string, NodeRef> = {};
  for (const [key, definition] of Object.entries(definitions.nodes)) {
    const id = definition.xmlId ?? `if-node-${key}`;
    if (!id || /\s/.test(id)) {
      throw new Error(`Node '${key}' must resolve to a non-empty SCXML ID.`);
    }
    if (ids.has(id)) throw new Error(`Duplicate SCXML node ID '${id}'.`);
    ids.add(id);
    nodes[key] = { key, kind: definition.kind, id, [nodeReference]: true };
  }

  const refs: Record<string, ReferenceNodeRef> = {};
  for (const [key, definition] of Object.entries(definitions.refs ?? {})) {
    const referencedNode = nodes[definition.target];
    if (!referencedNode) {
      throw new Error(
        `Reference node '${key}' targets unknown node '${definition.target}'.`,
      );
    }
    const id = definition.xmlId ?? `${referencedNode.id}-ref-${key}`;
    if (!id || /\s/.test(id)) {
      throw new Error(
        `Reference node '${key}' must resolve to a non-empty SCXML ID.`,
      );
    }
    if (ids.has(id)) throw new Error(`Duplicate SCXML node ID '${id}'.`);
    ids.add(id);
    refs[key] = {
      key,
      kind: "reference",
      id,
      position: definition.position,
      referencedNode,
      [referenceNodeReference]: true,
    };
  }

  return { nodes, refs } as FlowGraph<
    {
      readonly [Key in keyof Definitions]: Key extends string
        ? NodeRef<Key, Definitions[Key]["kind"]>
        : never;
    },
    {
      readonly [Key in keyof References]: Key extends string
        ? ReferenceNodeRef<Key, NodeRef<References[Key]["target"]>>
        : never;
    }
  >;
}

export type TransitionProps = {
  readonly label: string;
  readonly cond: "Else" | Jexl;
  readonly to: NodeRef;
  readonly script?: Jexl;
};
