import { jexl } from "jsx-scxml";
import {
  Announcement,
  Branch,
  BranchTransition,
  Flow,
  Module,
  Return,
  SetIntent,
} from "jsx-scxml/std";
import module from "#modules" with { type: "json" };
import announcement from "#announcements" with { type: "json" };
import routing from "#routing" with { type: "json" };

export default (
  <Flow
    initial="welcome"
    dataModel={{
      flowNode: jexl`Breadcrumbs.enter(NodeType.FLOW, '1000_Example')`,
      attempts: jexl`0`,
    }}
    globalModuleDisconnectId="global-return"
    globalModuleErrorId="global-return"
  >
    <Announcement
      id="welcome"
      src={announcement["Common/Welcome"]}
      to="dtmf-menu-branch"
    />
    <Module
      id="dtmf-menu"
      src={module.SFVUniversalMenu}
      to="dtmf-menu-branch"
    />
    <Branch id="dtmf-menu-branch">
      <BranchTransition
        label="Repeat"
        to="welcome"
        cond={jexl`lastResult.lastInputLabel.equalsIgnoreCase('Repeat')`}
        script={jexl`Breadcrumbs.exit();`}
      />
      <BranchTransition
        label="Agent"
        to="agent-intent"
        cond={jexl`true`}
        script={jexl`Breadcrumbs.exit();`}
      />
    </Branch>

    <SetIntent id="agent-intent" src={routing.agent} to="global-return" />
    <Return id="global-return" />
  </Flow>
);
