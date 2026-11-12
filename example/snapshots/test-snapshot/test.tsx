import { jexl } from "jsx-scxml";
import {
  Announcement,
  Branch,
  BranchTransition,
  Flow,
  Return,
  Script,
} from "jsx-scxml/std";
import announcement from "#announcements" with { type: "json" };

export default (
  <Flow
    initial="if-node-Zs1ToBRMKcP33Z9T3bho6"
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
    globalModuleDisconnectId="if-node-92ufh1ZQIRcycCTjIgnra-ref-pIt_VoJ0jw8DUcxSqIVzv"
    globalModuleErrorId="if-node-_hzbIVOZ82fD9jQ8sTvn5-ref-UWrY5uMB3hQtEsk1VNslc"
  >
    <Return
      id="if-node-FsH7fYcTVKyHCL0R907Wx"
      metadata={{"x":1560,"y":972}}
    />
    <Script
      id="if-node-qXrs6Za0xIyvuhJ5rvush"
      metadata={{"name":"Process Last Command","x":-12,"y":984,"nodeType":"Branch"}}
      inline={jexl`SFVContext.logLastCommand();`}
    />
    <Branch id="if-node-28zRlcevPcqDO6HG8l6Ov" metadata={{"name":"All Events","x":492,"y":984,"nodeType":"Branch"}}>
      <BranchTransition
        label="Return to Parent"
        to="if-node-itY6mU41gkIj0mH34kbSt"
        cond={jexl`true`}
      />
    </Branch>
    <Script
      id="if-node-_hzbIVOZ82fD9jQ8sTvn5"
      metadata={{"name":"Error","x":744,"y":1104,"nodeType":"Script","overrideError":true}}
      to="if-node-qXrs6Za0xIyvuhJ5rvush"
      inline={jexl`getOperationResult().setOperationStatus(OperationStatus.SUCCESS);  //workaround for a bug
    let event = (!empty(lastErrorEvent)?lastErrorEvent:SFVConstants.events.ERROR);
    SFVLogger.INFO('>>>Error received<<<:' + getActiveFlow().getQualifiedFlowName() + ', event:' + event);
    SFVContext.setLastCommandSetEvent(event);`}
    />
    <Script
      id="if-node-92ufh1ZQIRcycCTjIgnra"
      metadata={{"name":"Disconnect","x":744,"y":984,"nodeType":"Script"}}
      to="if-node-qXrs6Za0xIyvuhJ5rvush"
      inline={jexl`SFVLogger.INFO('>>>Disconnect received<<<:' + getActiveFlow().getQualifiedFlowName());`}
    />
    <Script
      id="if-node-zREc7KV_RxIbxquURhHXv"
      metadata={{"name":"Set Intent","x":1020,"y":1056}}
      to="if-node-itY6mU41gkIj0mH34kbSt"
      inline={jexl`SFVContext.logSetIntent();`}
    />
    <Script
      id="if-node-itY6mU41gkIj0mH34kbSt"
      metadata={{"name":"Flow End","x":1308,"y":972,"nodeType":"Script","overrideError":true}}
      to="if-node-FsH7fYcTVKyHCL0R907Wx"
      beforeScript={jexl`//`}
      onExit={jexl`SFVContext.logNodeEnd(nodeName);
    SFVContext.logFlowEnd();`}
      inline={jexl`SFVContext.logNodeStart(nodeName);`}
    />
    <Script
      id="if-node-Zs1ToBRMKcP33Z9T3bho6"
      metadata={{"name":"Flow Start","x":252,"y":0,"nodeType":"Script"}}
      to="if-node-wnYiMWp1qCOmIPzcOXKTd"
      beforeScript={jexl`//`}
      onExit={jexl`SFVContext.logNodeEnd(nodeName);`}
      inline={jexl`SFVContext.logFlowStart();
    SFVContext.logNodeStart(nodeName);`}
    />
    <Script
      id="if-node-hppEOJabwgNyYpSGZ0O_6"
      metadata={{"name":"Lookup Auth Status","x":336,"y":156,"nodeType":"Script"}}
      to="if-node-GxPCtb6ZASKCWBt7J2K9_"
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
    <Branch id="if-node-GxPCtb6ZASKCWBt7J2K9_" metadata={{"name":"Process Lookup Auth Status","x":588,"y":156,"nodeType":"Branch"}}>
      <BranchTransition
        label="Process Last Command"
        to="if-node-qXrs6Za0xIyvuhJ5rvush"
        cond={jexl`!session.lastCommand.equals(SFVConstants.lastCommand.CONTINUE)`}
        script={jexl`SFVContext.logTransition(branchLabel);`}
      />
      <BranchTransition
        label="Lookup OK"
        to="if-node-IEShPTmy62gjkChDqgPVS"
        cond={jexl`!empty(ivrStatus)`}
        script={jexl`SFVContext.logTransition(branchLabel);`}
      />
      <BranchTransition
        label="Lookup Failed"
        to="if-node-jqR_oVlmD7AiBAstm0OU_"
        cond={jexl`true`}
        script={jexl`SFVContext.logTransition(branchLabel);
    noMatchAttemptCtr++;`}
      />
    </Branch>
    <Script
      id="if-node-hIK_7aKVO2LkX9wnEke6u"
      metadata={{"name":"Menu No Auth Status Match","x":1152,"y":264}}
      to="if-node-ImfEWOjZbpCqVASz_PKyU"
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
    <Branch id="if-node-ImfEWOjZbpCqVASz_PKyU" metadata={{"name":"Process Menu No DOS Match","x":1428,"y":156,"nodeType":"Branch"}}>
      <BranchTransition
        label="Process Last Command"
        to="if-node-qXrs6Za0xIyvuhJ5rvush"
        cond={jexl`!session.lastCommand.equals(SFVConstants.lastCommand.CONTINUE)`}
        script={jexl`SFVContext.logTransition(branchLabel);`}
      />
      <BranchTransition
        label="Agent"
        to="if-node-qXrs6Za0xIyvuhJ5rvush"
        cond={jexl`lastResult.lastInputLabel.equalsIgnoreCase('Agent')`}
        script={jexl`SFVContext.logTransition(branchLabel);
    SFVContext.setLastCommandSetEvent(SFVConstants.events.AGENT);`}
      />
      <BranchTransition
        label="No Match"
        to="if-node-qXrs6Za0xIyvuhJ5rvush"
        cond={jexl`lastResult.lastMenuFail.equalsIgnoreCase('no.match')`}
        script={jexl`SFVContext.logTransition(branchLabel);
    SFVContext.setLastCommandSetEvent(SFVConstants.events.MENU_MAX_REC_ATTEMPTS);`}
      />
      <BranchTransition
        label="No Input"
        to="if-node-qXrs6Za0xIyvuhJ5rvush"
        cond={jexl`lastResult.lastMenuFail.equalsIgnoreCase('no.input')`}
        script={jexl`SFVContext.logTransition(branchLabel);
    SFVContext.setLastCommandSetEvent(SFVConstants.events.MENU_MAX_REC_ATTEMPTS);`}
      />
      <BranchTransition
        label="Having Trouble"
        to="if-node-qXrs6Za0xIyvuhJ5rvush"
        cond={jexl`noMatchAttemptCtr > noMatchAttemptCtrMax`}
        script={jexl`SFVContext.logTransition(branchLabel);
    SFVContext.setLastCommandSetEvent(SFVConstants.events.AGENT);`}
      />
      <BranchTransition
        label="Replay"
        to="if-node-jqR_oVlmD7AiBAstm0OU_"
        cond={jexl`lastResult.lastInputLabel.equalsIgnoreCase('Replay')`}
        script={jexl`SFVContext.logTransition(branchLabel);`}
      />
      <BranchTransition
        label="Reenter"
        to="if-node-Zs1ToBRMKcP33Z9T3bho6"
        cond={jexl`lastResult.lastInputLabel.equalsIgnoreCase('Reenter')`}
        script={jexl`SFVContext.logTransition(branchLabel);`}
      />
      <BranchTransition
        label="Main Menu"
        to="if-node-qXrs6Za0xIyvuhJ5rvush"
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
        to="if-node-qXrs6Za0xIyvuhJ5rvush"
        cond={jexl`true`}
        script={jexl`SFVContext.logTransition(branchLabel);
    SFVContext.setLastCommandSetEvent(SFVConstants.events.AGENT);`}
      />
    </Branch>
    <Announcement
      id="if-node-jqR_oVlmD7AiBAstm0OU_"
      metadata={{"name":"Annc Invalid DOS","x":852,"y":264}}
      to="if-node-hIK_7aKVO2LkX9wnEke6u"
      srcExpr={jexl`palmettoSession.service.equals(PalmettoConstants.services.RRB) ? 'Common/PriorAuthStatus/NoPriorAuth_ToDate' : 'Common/PriorAuthStatus/NoPriorAuth'`}
    />
    <Script
      id="if-node-wnYiMWp1qCOmIPzcOXKTd"
      metadata={{"name":"Lookup DOS","x":504,"y":0}}
      to="if-node-tzIz_UoVnsYKhdT66zL8W"
      onExit={jexl`SFVContext.logNodeEnd(nodeName);`}
      inline={jexl`SFVContext.logNodeStart(nodeName);
    SFVContext.setLastCommandContinue();`}
    />
    <Branch id="if-node-tzIz_UoVnsYKhdT66zL8W" metadata={{"name":"Process Lookup DOS Range","x":804,"y":0,"nodeType":"Branch"}}>
      <BranchTransition
        label="Process Events"
        to="if-node-qXrs6Za0xIyvuhJ5rvush"
        cond={jexl`!session.lastCommand.equals(SFVConstants.lastCommand.CONTINUE)`}
        script={jexl`SFVContext.logTransition(branchLabel);`}
      />
      <BranchTransition
        label="Continue"
        to="if-node-hppEOJabwgNyYpSGZ0O_6"
        cond={jexl`true`}
        script={jexl`SFVContext.logTransition(branchLabel);`}
      />
    </Branch>
    <Branch id="if-node-IEShPTmy62gjkChDqgPVS" metadata={{"name":"Prior Auth Status","x":0,"y":432,"nodeType":"Branch"}}>
      <BranchTransition
        label="Non-Affirmed"
        to="if-node-nXZmDLlIKDrazAqmslu1j"
        cond={jexl`"NON-AFFIRMED".equalsIgnoreCase(ivrStatus)`}
        script={jexl`SFVContext.logTransition(branchLabel);`}
      />
      <BranchTransition
        label="Deleted"
        to="if-node-nqLZxJ6sOGPASWzS7RCOl"
        cond={jexl`"DELETED".equalsIgnoreCase(ivrStatus)`}
        script={jexl`SFVContext.logTransition(branchLabel);`}
      />
      <BranchTransition
        label="Affirmed"
        to="if-node-KNZxVCPzVLDxjUZTmAEGp"
        cond={jexl`"AFFIRMED".equalsIgnoreCase(ivrStatus)`}
        script={jexl`SFVContext.logTransition(branchLabel);`}
      />
      <BranchTransition
        label="Pending / Revised / Sent"
        to="if-node-BA9YbqpaRdXSTIIO9hCxm"
        cond={jexl`true`}
        script={jexl`SFVContext.logTransition(branchLabel);`}
      />
    </Branch>
    <Script
      id="if-node-nqLZxJ6sOGPASWzS7RCOl"
      metadata={{"name":"Annc Prior Auth Deleted","x":252,"y":552}}
      to="if-node-5pyiqIEEnDACx7C1N6kMn"
      onExit={jexl`SFVContext.logNodeEnd(nodeName);`}
      inline={jexl`SFVContext.logNodeStart(nodeName);`}
    />
    <Script
      id="if-node-KNZxVCPzVLDxjUZTmAEGp"
      metadata={{"name":"Annc Prior Auth Affirmed","x":252,"y":660}}
      to="if-node-5pyiqIEEnDACx7C1N6kMn"
      onExit={jexl`SFVContext.logNodeEnd(nodeName);`}
      inline={jexl`SFVContext.logNodeStart(nodeName);`}
    />
    <Script
      id="if-node-5pyiqIEEnDACx7C1N6kMn"
      metadata={{"name":"Menu Get Intent","x":552,"y":432}}
      to="if-node-DIym83A7vogNce0pmXHUH"
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
    <Branch id="if-node-DIym83A7vogNce0pmXHUH" metadata={{"name":"Process Menu No DOB Match","x":816,"y":432,"nodeType":"Branch"}}>
      <BranchTransition
        label="Process Last Command"
        to="if-node-qXrs6Za0xIyvuhJ5rvush"
        cond={jexl`!session.lastCommand.equals(SFVConstants.lastCommand.CONTINUE)`}
        script={jexl`SFVContext.logTransition(branchLabel);`}
      />
      <BranchTransition
        label="Agent"
        to="if-node-qXrs6Za0xIyvuhJ5rvush"
        cond={jexl`lastResult.lastInputLabel.equalsIgnoreCase('Agent')`}
        script={jexl`SFVContext.logTransition(branchLabel);
    SFVContext.setLastCommandSetEvent(SFVConstants.events.AGENT);`}
      />
      <BranchTransition
        label="No Match"
        to="if-node-qXrs6Za0xIyvuhJ5rvush"
        cond={jexl`lastResult.lastMenuFail.equalsIgnoreCase('no.match')`}
        script={jexl`SFVContext.logTransition(branchLabel);
    SFVContext.setLastCommandSetEvent(SFVConstants.events.MENU_MAX_REC_ATTEMPTS);`}
      />
      <BranchTransition
        label="No Input"
        to="if-node-qXrs6Za0xIyvuhJ5rvush"
        cond={jexl`lastResult.lastMenuFail.equalsIgnoreCase('no.input')`}
        script={jexl`SFVContext.logTransition(branchLabel);
    SFVContext.setLastCommandSetEvent(SFVConstants.events.MENU_MAX_REC_ATTEMPTS);`}
      />
      <BranchTransition
        label="Repeat"
        to="if-node-IEShPTmy62gjkChDqgPVS"
        cond={jexl`lastResult.lastInputLabel.equalsIgnoreCase('Repeat')`}
        script={jexl`SFVContext.logTransition(branchLabel);`}
      />
      <BranchTransition
        label="Date Range"
        to="if-node-Zs1ToBRMKcP33Z9T3bho6"
        cond={jexl`lastResult.lastInputLabel.equalsIgnoreCase('Another')`}
        script={jexl`SFVContext.logTransition(branchLabel);`}
      />
      <BranchTransition
        label="Main Menu"
        to="if-node-qXrs6Za0xIyvuhJ5rvush"
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
        to="if-node-qXrs6Za0xIyvuhJ5rvush"
        cond={jexl`true`}
        script={jexl`SFVContext.logTransition(branchLabel);
    SFVContext.setLastCommandSetEvent(SFVConstants.events.AGENT);`}
      />
    </Branch>
    <Script
      id="if-node-BA9YbqpaRdXSTIIO9hCxm"
      metadata={{"name":"Annc Request Pending","x":252,"y":792}}
      to="if-node-5pyiqIEEnDACx7C1N6kMn"
      onExit={jexl`SFVContext.logNodeEnd(nodeName);`}
      inline={jexl`SFVContext.logNodeStart(nodeName);`}
    />
    <Announcement
      id="if-node-nXZmDLlIKDrazAqmslu1j"
      metadata={{"name":"Non Affirmed PAR Code","x":252,"y":432}}
      to="if-node-5pyiqIEEnDACx7C1N6kMn"
      srcExpr={jexl`"Common/PriorAuthStatus/PAStatus_" + parCode`}
    />
  </Flow>
);
