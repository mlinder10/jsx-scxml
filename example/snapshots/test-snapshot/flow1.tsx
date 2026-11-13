import { jexl } from "jsx-scxml";
import {
  Announcement,
  Branch,
  BranchTransition,
  Flow,
  Module,
  Return,
  SetIntent,
  defineNodes,
  finalNode,
  node,
} from "jsx-scxml/std";
import module from "#modules" with { type: "json" };
import announcement from "#announcements" with { type: "json" };
import routing from "#routing" with { type: "json" };

const graph = defineNodes({
  nodes: {
    welcome: node({ xmlId: "welcome" }),
    dtmfMenu: node({ xmlId: "dtmf-menu" }),
    dtmfMenuBranch: node({ xmlId: "dtmf-menu-branch" }),
    agentIntent: node({ xmlId: "agent-intent" }),
    globalReturn: finalNode({ xmlId: "global-return" }),
  },
  refs: {},
});

export default (
  <Flow
    graph={graph}
    initial={graph.nodes.welcome}
    dataModel={{
      flowNode: jexl`Breadcrumbs.enter(NodeType.FLOW, '1000_Example')`,
      attempts: jexl`0`,
    }}
    globalModuleDisconnectId={graph.nodes.globalReturn}
    globalModuleErrorId={graph.nodes.globalReturn}
  >
    <Announcement
      node={graph.nodes.welcome}
      to={graph.nodes.dtmfMenu}
      src={announcement["Common/Welcome"]}
    />
    <Module
      node={graph.nodes.dtmfMenu}
      to={graph.nodes.dtmfMenuBranch}
      src={module.SFVUniversalMenu}
    />
    <Branch node={graph.nodes.dtmfMenuBranch} nodeType="Branch">
      <BranchTransition
        label="Repeat"
        to={graph.nodes.welcome}
        cond={jexl`lastResult.lastInputLabel.equalsIgnoreCase('Repeat')`}
        script={jexl`Breadcrumbs.exit();`}
      />
      <BranchTransition
        label="Agent"
        to={graph.nodes.agentIntent}
        cond={jexl`true`}
        script={jexl`Breadcrumbs.exit();`}
      />
    </Branch>
    <SetIntent
      node={graph.nodes.agentIntent}
      to={graph.nodes.globalReturn}
      src={routing.agent}
    />
    <Return node={graph.nodes.globalReturn} />
  </Flow>
);
