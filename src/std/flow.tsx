/** @jsxImportSource jsx-scxml/swampfox */

import type { ScxmlChild } from "../core/ast.js";
import type { Jexl } from "../jexl/index.js";
import { swampfoxNamespaces } from "../swampfox/index.js";

export type FlowProps = {
  readonly dataModel: Readonly<Record<string, Jexl>>;
  readonly children?: ScxmlChild;
  readonly initial?: string;
  readonly globalModuleErrorId?: string;
  readonly globalModuleDisconnectId?: string;
};

/** Creates an SCXML document with the namespaces expected by Swampfox flows. */
export function Flow({
  dataModel,
  children,
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
      initial={initial}
      global-module-error-id={globalModuleErrorId}
      global-module-disconnect-id={globalModuleDisconnectId}
    >
      <datamodel>
        {Object.entries(dataModel).map(([id, expression]) => (
          <data key={id} id={id} expr={expression} />
        ))}
      </datamodel>
      {children}
    </scxml>
  );
}
