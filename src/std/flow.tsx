/** @jsxImportSource jsx-scxml/swampfox */

import type { ScxmlChild } from "../core/ast.js";
import type { Jexl } from "../jexl/index.js";
import { swampfoxNamespaces } from "../swampfox/index.js";
import { ReferenceNode } from "./comments.js";
import type { FlowGraph, NodeRef, ReferenceNodeRef } from "./transition.js";

export type FlowProps = {
  readonly dataModel: Readonly<Record<string, Jexl>>;
  readonly children?: ScxmlChild;
  /** Declared nodes and editor reference nodes for this flow. */
  readonly graph?: FlowGraph;
  /** Editor-only flow comments, emitted before reference nodes and <datamodel>. */
  readonly annotations?: ScxmlChild;
  readonly initial?: NodeRef;
  /** A node or editor reference handle, or a legacy ID when importing. */
  readonly globalModuleErrorId?: NodeRef | ReferenceNodeRef | string;
  /** A node or editor reference handle, or a legacy ID when importing. */
  readonly globalModuleDisconnectId?: NodeRef | ReferenceNodeRef | string;
};

function targetId(
  target: NodeRef | ReferenceNodeRef | string | undefined,
): string | undefined {
  return typeof target === "string" ? target : target?.id;
}

/** Creates an SCXML document with the namespaces expected by Swampfox flows. */
export function Flow({
  dataModel,
  children,
  graph,
  annotations,
  initial,
  // TODO: add default values
  globalModuleErrorId,
  globalModuleDisconnectId,
}: FlowProps) {
  return (
    <scxml
      xmlns="http://www.w3.org/2005/07/scxml"
      {...swampfoxNamespaces()}
      version="1.0"
      ife-version="1.3.2"
      initial={initial?.id}
      global-module-error-id={targetId(globalModuleErrorId)}
      global-module-disconnect-id={targetId(globalModuleDisconnectId)}
    >
      {annotations}
      {graph &&
        Object.values(graph.refs).map((ref) => <ReferenceNode ref={ref} />)}
      <datamodel>
        {Object.entries(dataModel).map(([id, expression]) => (
          <data key={id} id={id} expr={expression} />
        ))}
      </datamodel>
      {children}
    </scxml>
  );
}
