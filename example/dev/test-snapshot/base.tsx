import { jexl } from "jsx-scxml";
import {
  Announcement,
  Branch,
  BranchTransition,
  CommentNode,
  Flow,
  Return,
  Script,
  defineNodes,
  finalNode,
  node,
  refNode,
} from "jsx-scxml/std";
import announcement from "#announcements" with { type: "json" };

const graph = defineNodes({
  nodes: {
    return1: finalNode({ xmlId: "if-node-FsH7fYcTVKyHCL0R907Wx" }),
    processLastCommand: node({ xmlId: "if-node-qXrs6Za0xIyvuhJ5rvush" }),
    allEvents: node({ xmlId: "if-node-28zRlcevPcqDO6HG8l6Ov" }),
    error: node({ xmlId: "if-node-_hzbIVOZ82fD9jQ8sTvn5" }),
    disconnect: node({ xmlId: "if-node-92ufh1ZQIRcycCTjIgnra" }),
    setIntent: node({ xmlId: "if-node-zREc7KV_RxIbxquURhHXv" }),
    flowEnd: node({ xmlId: "if-node-itY6mU41gkIj0mH34kbSt" }),
    flowStart: node({ xmlId: "if-node-Zs1ToBRMKcP33Z9T3bho6" }),
    lookupAuthStatus: node({ xmlId: "if-node-hppEOJabwgNyYpSGZ0O_6" }),
    processLookupAuthStatus: node({ xmlId: "if-node-GxPCtb6ZASKCWBt7J2K9_" }),
    menuNoAuthStatusMatch: node({ xmlId: "if-node-hIK_7aKVO2LkX9wnEke6u" }),
    processMenuNoDosMatch: node({ xmlId: "if-node-ImfEWOjZbpCqVASz_PKyU" }),
    anncInvalidDos: node({ xmlId: "if-node-jqR_oVlmD7AiBAstm0OU_" }),
    lookupDos: node({ xmlId: "if-node-wnYiMWp1qCOmIPzcOXKTd" }),
    processLookupDosRange: node({ xmlId: "if-node-tzIz_UoVnsYKhdT66zL8W" }),
    priorAuthStatus: node({ xmlId: "if-node-IEShPTmy62gjkChDqgPVS" }),
    anncPriorAuthDeleted: node({ xmlId: "if-node-nqLZxJ6sOGPASWzS7RCOl" }),
    anncPriorAuthAffirmed: node({ xmlId: "if-node-KNZxVCPzVLDxjUZTmAEGp" }),
    menuGetIntent: node({ xmlId: "if-node-5pyiqIEEnDACx7C1N6kMn" }),
    processMenuNoDobMatch: node({ xmlId: "if-node-DIym83A7vogNce0pmXHUH" }),
    anncRequestPending: node({ xmlId: "if-node-BA9YbqpaRdXSTIIO9hCxm" }),
    nonAffirmedParCode: node({ xmlId: "if-node-nXZmDLlIKDrazAqmslu1j" }),
  },
  refs: {
    processLastCommand: refNode("processLastCommand", {
      xmlId: "if-node-qXrs6Za0xIyvuhJ5rvush-ref-upeL46MRURe6IxmNdyMCq",
      position: { x: 996, y: 984 },
    }),
    setIntent: refNode("setIntent", {
      xmlId: "if-node-zREc7KV_RxIbxquURhHXv-ref-T3v1v11sid6SgQ0UpmScg",
      position: { x: 252, y: 984 },
    }),
    allEvents: refNode("allEvents", {
      xmlId: "if-node-28zRlcevPcqDO6HG8l6Ov-ref-TZp4f97kDq6ZgBc6dsT2y",
      position: { x: 252, y: 1032 },
    }),
    flowEnd: refNode("flowEnd", {
      xmlId: "if-node-itY6mU41gkIj0mH34kbSt-ref-lXOMo2uqwJIErL6qgvqgX",
      position: { x: 1020, y: 1176 },
    }),
    error: refNode("error", {
      xmlId: "if-node-_hzbIVOZ82fD9jQ8sTvn5-ref-UWrY5uMB3hQtEsk1VNslc",
      position: { x: 0, y: 216 },
    }),
    disconnect: refNode("disconnect", {
      xmlId: "if-node-92ufh1ZQIRcycCTjIgnra-ref-pIt_VoJ0jw8DUcxSqIVzv",
      position: { x: 0, y: 168 },
    }),
    flowEnd2: refNode("flowEnd", {
      xmlId: "if-node-itY6mU41gkIj0mH34kbSt-ref-Hqla7NuGcf5HTl171G8t9",
      position: { x: 252, y: 1080 },
    }),
    processLastCommand2: refNode("processLastCommand", {
      xmlId: "if-node-qXrs6Za0xIyvuhJ5rvush-ref-sHcrnguBt_p_97hXkBowI",
      position: { x: 1692, y: 156 },
    }),
    flowEnd3: refNode("flowEnd", {
      xmlId: "if-node-itY6mU41gkIj0mH34kbSt-ref-_WAaNk_uHTlWTreh7rj2Q",
      position: { x: 492, y: 1080 },
    }),
    processLastCommand3: refNode("processLastCommand", {
      xmlId: "if-node-qXrs6Za0xIyvuhJ5rvush-ref-jUyJZZoYrXVEBBF2GSpEk",
      position: { x: 852, y: 156 },
    }),
    processLastCommand4: refNode("processLastCommand", {
      xmlId: "if-node-qXrs6Za0xIyvuhJ5rvush-ref-K5hmQ1Qwkdz3QClom4Lne",
      position: { x: 1068, y: 0 },
    }),
    lookupAuthStatus: refNode("lookupAuthStatus", {
      xmlId: "if-node-hppEOJabwgNyYpSGZ0O_6-ref-YXMH7jNE5EDYe43zPq0wz",
      position: { x: 1068, y: 60 },
    }),
    priorAuthStatus: refNode("priorAuthStatus", {
      xmlId: "if-node-IEShPTmy62gjkChDqgPVS-ref-vZYiHs8ce58Jlr8a2d2s9",
      position: { x: 852, y: 216 },
    }),
    processLastCommand5: refNode("processLastCommand", {
      xmlId: "if-node-qXrs6Za0xIyvuhJ5rvush-ref-RxksbTopH5NY9bb9EosTi",
      position: { x: 1080, y: 432 },
    }),
    anncInvalidDos: refNode("anncInvalidDos", {
      xmlId: "if-node-jqR_oVlmD7AiBAstm0OU_-ref-E_W7DNVeKtR82U33eEA6E",
      position: { x: 1692, y: 204 },
    }),
    flowStart: refNode("flowStart", {
      xmlId: "if-node-Zs1ToBRMKcP33Z9T3bho6-ref-ZTY6nrP18VsDym2UVoHmN",
      position: { x: 1692, y: 252 },
    }),
    priorAuthStatus2: refNode("priorAuthStatus", {
      xmlId: "if-node-IEShPTmy62gjkChDqgPVS-ref-0RdVNnYKIE6LRv6FUX8sS",
      position: { x: 1080, y: 480 },
    }),
    flowStart2: refNode("flowStart", {
      xmlId: "if-node-Zs1ToBRMKcP33Z9T3bho6-ref-ciDJv_8SDii07SNmpLG8o",
      position: { x: 1080, y: 528 },
    }),
  },
});

export default (
  <Flow
    graph={graph}
    annotations={[
      <CommentNode
        comment="Infrastructure"
        position={{ x: -36, y: 936 }}
        color="#DDCCFF"
        width={2124}
        height={24}
      />,
    ]}
    initial={graph.nodes.flowStart}
    dataModel={{
      lastEnabled: jexl``,
      lastResult: jexl``,
      lastEvent: jexl``,
      nodeName: jexl``,
      session: jexl`SFVContext.getSession()`,
      provider: jexl`SFVContext.getProvider()`,
      member: jexl`SFVContext.getMember()`,
      palmettoSession: jexl`SFVContext.getPalmettoSession()`,
      ivrStatus: jexl`""`,
      parCode: jexl`""`,
      noMatchAttemptCtr: jexl`0`,
      noMatchAttemptCtrMax: jexl`2`,
    }}
    globalModuleDisconnectId={graph.refs.disconnect}
    globalModuleErrorId={graph.refs.error}
  >
    <Return node={graph.nodes.return1} x={1560} y={972} />
    <Script
      node={graph.nodes.processLastCommand}
      name="Process Last Command"
      nodeType="Branch"
      x={-12}
      y={984}
      inline={jexl`SFVContext.logLastCommand();`}
    />
    <Branch
      node={graph.nodes.allEvents}
      name="All Events"
      nodeType="Branch"
      x={492}
      y={984}
    >
      <BranchTransition
        label="Return to Parent"
        to={graph.nodes.flowEnd}
        cond="Else"
      />
    </Branch>
    <Script
      node={graph.nodes.error}
      name="Error"
      nodeType="Script"
      x={744}
      y={1104}
      overrideError={true}
      to={graph.nodes.processLastCommand}
      inline={jexl`getOperationResult().setOperationStatus(OperationStatus.SUCCESS);  //workaround for a bug
    let event = (!empty(lastErrorEvent)?lastErrorEvent:SFVConstants.events.ERROR);
    SFVLogger.INFO('>>>Error received<<<:' + getActiveFlow().getQualifiedFlowName() + ', event:' + event);
    SFVContext.setLastCommandSetEvent(event);`}
    />
    <Script
      node={graph.nodes.disconnect}
      name="Disconnect"
      nodeType="Script"
      x={744}
      y={984}
      to={graph.nodes.processLastCommand}
      inline={jexl`SFVLogger.INFO('>>>Disconnect received<<<:' + getActiveFlow().getQualifiedFlowName());`}
    />
    <Script
      node={graph.nodes.setIntent}
      name="Set Intent"
      x={1020}
      y={1056}
      to={graph.nodes.flowEnd}
      inline={jexl`SFVContext.logSetIntent();`}
    />
    <Script
      node={graph.nodes.flowEnd}
      name="Flow End"
      nodeType="Script"
      x={1308}
      y={972}
      overrideError={true}
      to={graph.nodes.return1}
      beforeScript={jexl`//`}
      onExit={jexl`SFVContext.logNodeEnd(nodeName);
    SFVContext.logFlowEnd();`}
      inline={jexl`SFVContext.logNodeStart(nodeName);`}
    />
    <Script
      node={graph.nodes.flowStart}
      name="Flow Start"
      nodeType="Script"
      x={252}
      y={0}
      to={graph.nodes.lookupDos}
      beforeScript={jexl`//`}
      onExit={jexl`SFVContext.logNodeEnd(nodeName);`}
      inline={jexl`SFVContext.logFlowStart();
    SFVContext.logNodeStart(nodeName);`}
    />
    <Script
      node={graph.nodes.lookupAuthStatus}
      name="Lookup Auth Status"
      nodeType="Script"
      x={336}
      y={156}
      to={graph.nodes.processLookupAuthStatus}
      beforeScript={jexl`let baseScript = "JmPartbAmbProviderAuthQuery@PalmettoDatabaseQuery";

    if (palmettoSession.service.equals(PalmettoConstants.services.RR)) {
      baseScript = "RrbPartbAmbProviderAuthQuery@PalmettoDatabaseQuery";
    }

    // current date format is mmddyyyy, needs to be yyyymmdd
    function formatDate(date) {
      date += '';
      return date.substring(4) + date.substring(0, 2) + date.substring(2, 4);
    }

    const startDate = formatDate(member.fromDos);
    const endDate = formatDate(member.toDos);

    const res = evalScript(
      baseScript,
      provider.npi,
      member.mbi,
      startDate,
      endDate
    );
    if (res.response != PalmettoConstants.WSReturnCodes.OK) {
      SFVLogger.INFO("Invalid " + baseScript + " Response: " + res);
      return;
    }

    SFVLogger.INFO("Result: " + res);

    const target = res.result[0];
    if (empty(target)) {
      SFVLogger.DEBUG("Invalid prior auth status received\n\tFrom: " + fromDos + "\n\tTo: " + toDos)
      return;
    }

    SFVLogger.INFO("ivr_status: " + target.ivr_status);
    ivrStatus = target.ivr_status;

    if (ivrStatus.equals("NON-AFFIRMED")) {
      const tmpParCode = target.ivr_par_codes.indexOf("Y") + 1;
      if (tmpParCode == 0) {
          SFVLogger.DEBUG("PAR Code not found: " + target.ivr_par_codes);
          return
      }

      if (tmpParCode != 14) {
          parCode = tmpParCode + "";
          return;
      }

      const parCodeLetter = target.ivr_par14_codes.indexOf("Y");
      if (parCodeLetter == -1) {
          SFVLogger.DEBUG("PAR Code 14 letter not found: " + target.ivr_par14_codes);
          return;
      }

      parCode = tmpParCode + ["A", "B", "C", "D", "E"][parCodeLetter];
    }`}
      onExit={jexl`SFVContext.logNodeEnd(nodeName);`}
      inline={jexl`SFVContext.logNodeStart(nodeName);
    SFVContext.setLastCommandContinue();`}
    />
    <Branch
      node={graph.nodes.processLookupAuthStatus}
      name="Process Lookup Auth Status"
      nodeType="Branch"
      x={588}
      y={156}
    >
      <BranchTransition
        label="Process Last Command"
        to={graph.nodes.processLastCommand}
        cond={jexl`!session.lastCommand.equals(SFVConstants.lastCommand.CONTINUE)`}
        script={jexl`SFVContext.logTransition(branchLabel);`}
      />
      <BranchTransition
        label="Lookup OK"
        to={graph.nodes.priorAuthStatus}
        cond={jexl`!empty(ivrStatus)`}
        script={jexl`SFVContext.logTransition(branchLabel);`}
      />
      <BranchTransition
        label="Lookup Failed"
        to={graph.nodes.anncInvalidDos}
        cond="Else"
        script={jexl`SFVContext.logTransition(branchLabel);
    noMatchAttemptCtr++;`}
      />
    </Branch>
    <Script
      node={graph.nodes.menuNoAuthStatusMatch}
      name="Menu No Auth Status Match"
      x={1152}
      y={264}
      to={graph.nodes.processMenuNoDosMatch}
      onExit={jexl`SFVContext.logNodeEnd(nodeName);

    var returnEntityType = lastResult.entityResultValue['replay_type'];
    if (!empty(returnEntityType)) {
    	SFVLogger.INFO("Found replay_type");
    	lastResult.lastInputLabel = 'Replay';
    	return;
    }

    returnEntityType = lastResult.entityResultValue['another_type'];
    if (!empty(returnEntityType)) {
    	SFVLogger.INFO("Found another_type");
    	lastResult.lastInputLabel = 'Reenter';
    	return;
    }

    returnEntityType = lastResult.entityResultValue['main_menu_type'];
    if (!empty(returnEntityType)) {
    	SFVLogger.INFO("Found main_menu_type");
    	lastResult.lastInputLabel = 'MainMenu';
    	return;
    }

    returnEntityType = lastResult.entityResultValue['agent_type'];
    if (!empty(returnEntityType)) {
    	SFVLogger.INFO("Found agent_type");
    	lastResult.lastInputLabel = 'Agent';
    	return;
    }`}
      inline={jexl`SFVContext.logNodeStart(nodeName);
    SFVContext.setLastCommandContinue();`}
    />
    <Branch
      node={graph.nodes.processMenuNoDosMatch}
      name="Process Menu No DOS Match"
      nodeType="Branch"
      x={1428}
      y={156}
    >
      <BranchTransition
        label="Process Last Command"
        to={graph.nodes.processLastCommand}
        cond={jexl`!session.lastCommand.equals(SFVConstants.lastCommand.CONTINUE)`}
        script={jexl`SFVContext.logTransition(branchLabel);`}
      />
      <BranchTransition
        label="Agent"
        to={graph.nodes.processLastCommand}
        cond={jexl`lastResult.lastInputLabel.equalsIgnoreCase('Agent')`}
        script={jexl`SFVContext.logTransition(branchLabel);
    SFVContext.setLastCommandSetEvent(SFVConstants.events.AGENT);`}
      />
      <BranchTransition
        label="No Match"
        to={graph.nodes.processLastCommand}
        cond={jexl`lastResult.lastMenuFail.equalsIgnoreCase('no.match')`}
        script={jexl`SFVContext.logTransition(branchLabel);
    SFVContext.setLastCommandSetEvent(SFVConstants.events.MENU_MAX_REC_ATTEMPTS);`}
      />
      <BranchTransition
        label="No Input"
        to={graph.nodes.processLastCommand}
        cond={jexl`lastResult.lastMenuFail.equalsIgnoreCase('no.input')`}
        script={jexl`SFVContext.logTransition(branchLabel);
    SFVContext.setLastCommandSetEvent(SFVConstants.events.MENU_MAX_REC_ATTEMPTS);`}
      />
      <BranchTransition
        label="Having Trouble"
        to={graph.nodes.processLastCommand}
        cond={jexl`noMatchAttemptCtr > noMatchAttemptCtrMax`}
        script={jexl`SFVContext.logTransition(branchLabel);
    SFVContext.setLastCommandSetEvent(SFVConstants.events.AGENT);`}
      />
      <BranchTransition
        label="Replay"
        to={graph.nodes.anncInvalidDos}
        cond={jexl`lastResult.lastInputLabel.equalsIgnoreCase('Replay')`}
        script={jexl`SFVContext.logTransition(branchLabel);`}
      />
      <BranchTransition
        label="Reenter"
        to={graph.nodes.flowStart}
        cond={jexl`lastResult.lastInputLabel.equalsIgnoreCase('Reenter')`}
        script={jexl`SFVContext.logTransition(branchLabel);`}
      />
      <BranchTransition
        label="Main Menu"
        to={graph.nodes.processLastCommand}
        cond={jexl`lastResult.lastInputLabel.equalsIgnoreCase('MainMenu')`}
        script={jexl`SFVContext.logTransition(branchLabel);

    if (!palmettoSession.jurisdiction.equals('RR')) {
        getSessionContext().setResultValue('intent.collector.flow', PalmettoConstants.intentRouterFlows.JJ_JM_PART_B_IntentRouterFlow);
        palmettoSession.appID = PalmettoConstants.appIDs.AppID_PartB;
        evalScript('updateQualKeyAppID@PalmettoUtilities');
    }

    SFVContext.setLastCommandSetEvent(PalmettoConstants.events.RETURN_MAIN_MENU);`}
      />
      <BranchTransition
        label="Other"
        to={graph.nodes.processLastCommand}
        cond="Else"
        script={jexl`SFVContext.logTransition(branchLabel);
    SFVContext.setLastCommandSetEvent(SFVConstants.events.AGENT);`}
      />
    </Branch>
    <Announcement
      node={graph.nodes.anncInvalidDos}
      name="Annc Invalid DOS"
      x={852}
      y={264}
      to={graph.nodes.menuNoAuthStatusMatch}
      srcExpr={jexl`palmettoSession.service.equals(PalmettoConstants.services.RRB) ? 'Common/PriorAuthStatus/NoPriorAuth_ToDate' : 'Common/PriorAuthStatus/NoPriorAuth'`}
    />
    <Script
      node={graph.nodes.lookupDos}
      name="Lookup DOS"
      x={504}
      y={0}
      to={graph.nodes.processLookupDosRange}
      onExit={jexl`SFVContext.logNodeEnd(nodeName);`}
      inline={jexl`SFVContext.logNodeStart(nodeName);
    SFVContext.setLastCommandContinue();`}
    />
    <Branch
      node={graph.nodes.processLookupDosRange}
      name="Process Lookup DOS Range"
      nodeType="Branch"
      x={804}
      y={0}
    >
      <BranchTransition
        label="Process Events"
        to={graph.nodes.processLastCommand}
        cond={jexl`!session.lastCommand.equals(SFVConstants.lastCommand.CONTINUE)`}
        script={jexl`SFVContext.logTransition(branchLabel);`}
      />
      <BranchTransition
        label="Continue"
        to={graph.nodes.lookupAuthStatus}
        cond="Else"
        script={jexl`SFVContext.logTransition(branchLabel);`}
      />
    </Branch>
    <Branch
      node={graph.nodes.priorAuthStatus}
      name="Prior Auth Status"
      nodeType="Branch"
      x={0}
      y={432}
    >
      <BranchTransition
        label="Non-Affirmed"
        to={graph.nodes.nonAffirmedParCode}
        cond={jexl`"NON-AFFIRMED".equalsIgnoreCase(ivrStatus)`}
        script={jexl`SFVContext.logTransition(branchLabel);`}
      />
      <BranchTransition
        label="Deleted"
        to={graph.nodes.anncPriorAuthDeleted}
        cond={jexl`"DELETED".equalsIgnoreCase(ivrStatus)`}
        script={jexl`SFVContext.logTransition(branchLabel);`}
      />
      <BranchTransition
        label="Affirmed"
        to={graph.nodes.anncPriorAuthAffirmed}
        cond={jexl`"AFFIRMED".equalsIgnoreCase(ivrStatus)`}
        script={jexl`SFVContext.logTransition(branchLabel);`}
      />
      <BranchTransition
        label="Pending / Revised / Sent"
        to={graph.nodes.anncRequestPending}
        cond="Else"
        script={jexl`SFVContext.logTransition(branchLabel);`}
      />
    </Branch>
    <Script
      node={graph.nodes.anncPriorAuthDeleted}
      name="Annc Prior Auth Deleted"
      x={252}
      y={552}
      to={graph.nodes.menuGetIntent}
      onExit={jexl`SFVContext.logNodeEnd(nodeName);`}
      inline={jexl`SFVContext.logNodeStart(nodeName);`}
    />
    <Script
      node={graph.nodes.anncPriorAuthAffirmed}
      name="Annc Prior Auth Affirmed"
      x={252}
      y={660}
      to={graph.nodes.menuGetIntent}
      onExit={jexl`SFVContext.logNodeEnd(nodeName);`}
      inline={jexl`SFVContext.logNodeStart(nodeName);`}
    />
    <Script
      node={graph.nodes.menuGetIntent}
      name="Menu Get Intent"
      x={552}
      y={432}
      to={graph.nodes.processMenuNoDobMatch}
      onExit={jexl`SFVContext.logNodeEnd(nodeName);

    var returnEntityType = lastResult.entityResultValue['repeat_type'];
    if (!empty(returnEntityType)) {
    	SFVLogger.INFO("Found repeat_type");
    	lastResult.lastInputLabel = 'Repeat';
    	return;
    }

    returnEntityType = lastResult.entityResultValue['another_type'];
    if (!empty(returnEntityType)) {
    	SFVLogger.INFO("Found another_type");
    	lastResult.lastInputLabel = 'Another';
    	return;
    }

    returnEntityType = lastResult.entityResultValue['main_menu_type'];
    if (!empty(returnEntityType)) {
    	SFVLogger.INFO("Found main_menu_type");
    	lastResult.lastInputLabel = 'MainMenu';
    	return;
    }

    returnEntityType = lastResult.entityResultValue['agent_type'];
    if (!empty(returnEntityType)) {
    	SFVLogger.INFO("Found agent_type");
    	lastResult.lastInputLabel = 'Agent';
    	return;
    }`}
      inline={jexl`SFVContext.logNodeStart(nodeName);
    SFVContext.setLastCommandContinue();`}
    />
    <Branch
      node={graph.nodes.processMenuNoDobMatch}
      name="Process Menu No DOB Match"
      nodeType="Branch"
      x={816}
      y={432}
    >
      <BranchTransition
        label="Process Last Command"
        to={graph.nodes.processLastCommand}
        cond={jexl`!session.lastCommand.equals(SFVConstants.lastCommand.CONTINUE)`}
        script={jexl`SFVContext.logTransition(branchLabel);`}
      />
      <BranchTransition
        label="Agent"
        to={graph.nodes.processLastCommand}
        cond={jexl`lastResult.lastInputLabel.equalsIgnoreCase('Agent')`}
        script={jexl`SFVContext.logTransition(branchLabel);
    SFVContext.setLastCommandSetEvent(SFVConstants.events.AGENT);`}
      />
      <BranchTransition
        label="No Match"
        to={graph.nodes.processLastCommand}
        cond={jexl`lastResult.lastMenuFail.equalsIgnoreCase('no.match')`}
        script={jexl`SFVContext.logTransition(branchLabel);
    SFVContext.setLastCommandSetEvent(SFVConstants.events.MENU_MAX_REC_ATTEMPTS);`}
      />
      <BranchTransition
        label="No Input"
        to={graph.nodes.processLastCommand}
        cond={jexl`lastResult.lastMenuFail.equalsIgnoreCase('no.input')`}
        script={jexl`SFVContext.logTransition(branchLabel);
    SFVContext.setLastCommandSetEvent(SFVConstants.events.MENU_MAX_REC_ATTEMPTS);`}
      />
      <BranchTransition
        label="Repeat"
        to={graph.nodes.priorAuthStatus}
        cond={jexl`lastResult.lastInputLabel.equalsIgnoreCase('Repeat')`}
        script={jexl`SFVContext.logTransition(branchLabel);`}
      />
      <BranchTransition
        label="Date Range"
        to={graph.nodes.flowStart}
        cond={jexl`lastResult.lastInputLabel.equalsIgnoreCase('Another')`}
        script={jexl`SFVContext.logTransition(branchLabel);`}
      />
      <BranchTransition
        label="Main Menu"
        to={graph.nodes.processLastCommand}
        cond={jexl`lastResult.lastInputLabel.equalsIgnoreCase('MainMenu')`}
        script={jexl`SFVContext.logTransition(branchLabel);

    if (!palmettoSession.jurisdiction.equals('RR')) {
        getSessionContext().setResultValue('intent.collector.flow', PalmettoConstants.intentRouterFlows.JJ_JM_PART_B_IntentRouterFlow);
        palmettoSession.appID = PalmettoConstants.appIDs.AppID_PartB;
        evalScript('updateQualKeyAppID@PalmettoUtilities');
    }

    SFVContext.setLastCommandSetEvent(PalmettoConstants.events.RETURN_MAIN_MENU);`}
      />
      <BranchTransition
        label="Other"
        to={graph.nodes.processLastCommand}
        cond="Else"
        script={jexl`SFVContext.logTransition(branchLabel);
    SFVContext.setLastCommandSetEvent(SFVConstants.events.AGENT);`}
      />
    </Branch>
    <Script
      node={graph.nodes.anncRequestPending}
      name="Annc Request Pending"
      x={252}
      y={792}
      to={graph.nodes.menuGetIntent}
      onExit={jexl`SFVContext.logNodeEnd(nodeName);`}
      inline={jexl`SFVContext.logNodeStart(nodeName);`}
    />
    <Announcement
      node={graph.nodes.nonAffirmedParCode}
      name="Non Affirmed PAR Code"
      x={252}
      y={432}
      to={graph.nodes.menuGetIntent}
      srcExpr={jexl`"Common/PriorAuthStatus/PAStatus_" + parCode`}
    />
  </Flow>
);
