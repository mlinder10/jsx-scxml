import { expr, jexl, type ScxmlChild } from "jsx-scxml";
import {
  Announcement,
  Branch,
  BranchTransition,
  Flow,
  Module,
  Return,
} from "jsx-scxml/std";

const machine = (
  <scxml initial="idle" version="1.0">
    <state id="idle">
      <onentry>
        <log label="Started" expr={expr`'ready'`} />
      </onentry>
      <transition event="START" target="running" />
    </state>
    <state id="running" />
  </scxml>
);

const validScxmlChild: ScxmlChild = machine;
void validScxmlChild;
