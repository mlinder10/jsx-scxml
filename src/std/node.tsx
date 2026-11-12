/** @jsxImportSource jsx-scxml/swampfox */

import type { ScxmlChild } from "../core/ast.js";
import type { NodeProps } from "./types.js";
import {
  defaultMetadata,
  quoteJexlString,
  serializeMetadata,
} from "./types.js";

export type StdBaseNodeProps = Omit<NodeProps, "to"> & {
  readonly isBranch?: boolean;
  readonly isReturn?: boolean;
  readonly children?: ScxmlChild;
  readonly to?: string;
};

type NodeWrapperProps = {
  readonly id: string;
  readonly metadata:
    ReturnType<typeof defaultMetadata> | NonNullable<NodeProps["metadata"]>;
  readonly isReturn: boolean;
  readonly children?: ScxmlChild;
};

function NodeWrapper({ id, metadata, isReturn, children }: NodeWrapperProps) {
  const attributes = { id, metadata: serializeMetadata(metadata) };
  return isReturn ? (
    <final {...attributes}>{children}</final>
  ) : (
    <state {...attributes}>{children}</state>
  );
}

/**
 * Shared state/final-state wrapper used by standard Swampfox flow nodes.
 * Its children are executable on-entry content; transitions are intentionally
 * left to specialized node components such as Branch.
 */
export function StdBaseNode({
  id,
  metadata,
  enable,
  beforeScript,
  afterScript,
  onExit,
  isBranch = false,
  isReturn = false,
  children,
  to,
}: StdBaseNodeProps) {
  const resolvedMetadata =
    metadata ?? defaultMetadata(isReturn ? "Return" : "Script");
  const loggingPrefix = isReturn ? "Final" : "State";

  return (
    <NodeWrapper id={id} metadata={resolvedMetadata} isReturn={isReturn}>
      <onentry>
        <assign
          location="nodeName"
          expr={quoteJexlString(resolvedMetadata.name ?? "")}
        />
        <sf:log expr={`'${loggingPrefix}::${id} ONENTRY'`} />
        <assign location="lastEnabled" expr={enable ?? "true"} />
        <if cond="lastEnabled">
          {beforeScript && <script>{beforeScript}</script>}
          {!isBranch && children}
          {afterScript && <script>{afterScript}</script>}
          <else />
          <sf:log
            expr={`'${loggingPrefix}::${id} SKIPPED; enabled expression evaluated false.'`}
          />
        </if>
      </onentry>

      {isBranch && children}

      {!isBranch && to && (
        <transition event="module.complete" target={to}>
          <assign location="lastEvent" expr="_event" />
        </transition>
      )}

      <onexit>
        <sf:log expr={`'${loggingPrefix}::${id} ONEXIT'`} />
        {onExit && (
          <if cond="lastEnabled">
            <script>{onExit}</script>
          </if>
        )}
      </onexit>
    </NodeWrapper>
  );
}

export type ReturnProps = Omit<NodeProps, "to">;

export function Return(props: ReturnProps) {
  return <StdBaseNode {...props} isReturn />;
}
