/** @jsxImportSource jsx-scxml/swampfox */

import type { Jexl } from "./jexl.js";
import type { ScxmlChild } from "../core/ast.js";
import type { KnownNodeType, Metadata, NodeProps } from "./types.js";
import {
  quoteJexlString,
  serializeMetadata,
  STD_TYPE_TO_LOGGING_PREFIX,
} from "./types.js";

export type StdBaseNodeProps = Omit<NodeProps, "to"> & {
  readonly isBranch?: boolean;
  readonly isReturn?: boolean;
  readonly children?: ScxmlChild;
  readonly to?: NodeProps["to"];
};

type NodeWrapperProps = {
  readonly id: string;
  readonly metadata: Metadata;
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

const NODE_NAMES_REQUIRED_IN_METADATA: KnownNodeType[] = [
  "Branch",
  "Script",
  "Result",
];

/**
 * Shared state/final-state wrapper used by standard Swampfox flow nodes.
 * Its children are executable on-entry content; transitions are intentionally
 * left to specialized node components such as Branch.
 */
export function StdBaseNode({
  node,
  enable,
  beforeScript,
  afterScript,
  onExit,
  isBranch = false,
  isReturn = false,
  children,
  to,
  // Metadata
  name,
  nodeType,
  x,
  y,
  overrideError,
}: StdBaseNodeProps) {
  const metadata =
    nodeType !== undefined &&
    NODE_NAMES_REQUIRED_IN_METADATA.includes(nodeType as KnownNodeType)
      ? { name, nodeType, x, y, overrideError }
      : { name, x, y, overrideError };
  const loggingPrefix = nodeType
    ? (STD_TYPE_TO_LOGGING_PREFIX[nodeType as KnownNodeType] ?? "State")
    : "State";

  return (
    <NodeWrapper id={node.id} metadata={metadata} isReturn={isReturn}>
      {nodeType === "Branch" && (
        <datamodel>
          <data id="branchLabel" />
        </datamodel>
      )}
      <onentry>
        <assign
          location="nodeName"
          expr={quoteJexlString(metadata.name ?? "")}
        />
        <sf:log expr={`'${loggingPrefix}::${node.id} ONENTRY'`} />
        <assign location="lastEnabled" expr={enable ?? "true"} />
        <if cond="lastEnabled">
          {beforeScript && <script>{beforeScript}</script>}
          {!isBranch && children}
          {afterScript && <script>{afterScript}</script>}
          <else />
          <sf:log
            expr={`'${loggingPrefix}::${node.id} SKIPPED; enabled expression evaluated false.'`}
          />
        </if>
      </onentry>

      {isBranch && children}

      {!isBranch && to && (
        <transition event="module.complete" target={to.id}>
          <assign location="lastEvent" expr="_event" />
        </transition>
      )}

      <onexit>
        <sf:log expr={`'${loggingPrefix}::${node.id} ONEXIT'`} />
        {onExit && (
          <if cond="lastEnabled">
            <script>{onExit}</script>
          </if>
        )}
      </onexit>
    </NodeWrapper>
  );
}

export type ReturnProps = Omit<NodeProps, "to"> & {
  readonly results?: Readonly<Record<string, Jexl>>;
};

export function Return({ results, ...props }: ReturnProps) {
  return (
    <StdBaseNode nodeType="Return" {...props} isReturn>
      {results &&
        Object.entries(results).map(([name, source]) => (
          <sf:assignResult key={name} name={name} srcexpr={source} />
        ))}
    </StdBaseNode>
  );
}
