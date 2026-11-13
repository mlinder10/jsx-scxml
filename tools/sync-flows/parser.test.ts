import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { parseScxmlToTsx } from "./parser.js";

describe("parseScxmlToTsx", () => {
  it("preserves FLOWCOMMENT annotations and emits REFNODEs through graph refs", () => {
    const tsx = parseScxmlToTsx(`
      <scxml
        initial="start"
        global-module-disconnect-id="start-ref-1"
        global-module-error-id="legacy-target"
      >
        <!--FLOWCOMMENT|{"comment":"Some comment","position":{"x":36,"y":-108},"color":"#FFC","width":108,"height":24}-->
        <!--REFNODE|{"id":"start&#45;ref&#45;1","position":{"x":0,"y":180},"refedNodeID":"start"}-->
        <datamodel/>
        <final id="start"/>
      </scxml>
    `);

    expect(tsx).toContain("CommentNode");
    expect(tsx).not.toContain("ReferenceNode");
    expect(tsx).toContain("refNode");
    expect(tsx).toContain('comment="Some comment"');
    expect(tsx).toContain("const graph = defineNodes({");
    expect(tsx).toContain("nodes: {");
    expect(tsx).toContain('start: finalNode({ xmlId: "start" })');
    expect(tsx).toContain("refs: {");
    expect(tsx).toContain(
      'startRef1: refNode("start", { xmlId: "start-ref-1", position: { x: 0, y: 180 } })',
    );
    expect(tsx).not.toContain("ref={graph.refs.startRef1}");
    expect(tsx).toContain("graph={graph}");
    expect(tsx).toContain("initial={graph.nodes.start}");
    expect(tsx).toContain("globalModuleDisconnectId={graph.refs.startRef1}");
    expect(tsx).toContain('globalModuleErrorId={"legacy-target"}');
  });

  it("renders state metadata as individual standard-node props", () => {
    const tsx = parseScxmlToTsx(`
      <scxml initial="start">
        <datamodel/>
        <state
          id="start"
          metadata="{&quot;name&quot;:&quot;Run script&quot;,&quot;nodeType&quot;:&quot;Script&quot;,&quot;x&quot;:12,&quot;y&quot;:34,&quot;overrideError&quot;:true}"
        >
          <onentry><sf:script src="script-id"/></onentry>
        </state>
      </scxml>
    `);

    expect(tsx).toContain('name="Run script"');
    expect(tsx).toContain('nodeType="Script"');
    expect(tsx).toContain("x={12}");
    expect(tsx).toContain("y={34}");
    expect(tsx).toContain("overrideError={true}");
    expect(tsx).not.toContain("metadata=");
  });

  it("converts standard Swampfox SCXML into equivalent standard-library TSX", async () => {
    const xml = await readFile(
      new URL("../../example/out/test-snapshot/flow1.scxml", import.meta.url),
      "utf8",
    );
    const tsx = parseScxmlToTsx(xml);

    expect(tsx).toContain('import { jexl } from "jsx-scxml";');
    expect(tsx).toContain(
      'import module from "#modules" with { type: "json" };',
    );
    expect(tsx).toContain(
      'import announcement from "#announcements" with { type: "json" };',
    );
    expect(tsx).toContain(
      "flowNode: jexl`Breadcrumbs.enter(NodeType.FLOW, '1000_Example')`",
    );
    expect(tsx).toContain('src=""');
    expect(tsx).toContain("node={graph.nodes.dtmfMenuBranch}");
    expect(tsx).toContain('label="Repeat"');
    expect(tsx).toContain(
      "cond={jexl`lastResult.lastInputLabel.equalsIgnoreCase('Repeat')`}",
    );
    expect(tsx).toContain("script={jexl`Breadcrumbs.exit();`}");
    expect(tsx).toContain(
      "<Return\n      node={graph.nodes.globalReturn}\n    />",
    );
    expect(tsx).toContain("initial={graph.nodes.welcome}");
    expect(tsx).toContain(
      "globalModuleDisconnectId={graph.nodes.globalReturn}",
    );
    expect(tsx).toContain("globalModuleErrorId={graph.nodes.globalReturn}");
    expect(tsx).toContain("to={graph.nodes.globalReturn}");
    expect(tsx).toContain("const graph = defineNodes({");
    expect(tsx).toContain('node({ xmlId: "welcome" })');
    expect(tsx).toContain('finalNode({ xmlId: "global-return" })');
  });

  it("uses safe, unique camel-case keys for top-level SCXML IDs", () => {
    const tsx = parseScxmlToTsx(`
      <scxml initial="1000_Example">
        <!--REFNODE|{"id":"ref-1","position":{"x":0,"y":0},"refedNodeID":"1000_Example"}-->
        <datamodel/>
        <state id="1000_Example">
          <transition event="module.complete" target="a-b"/>
        </state>
        <state id="a-b">
          <transition event="module.complete" target="a_b"/>
        </state>
        <state id="a_b">
          <transition target="1000_Example"/>
        </state>
        <final id="done!"/>
      </scxml>
    `);

    expect(tsx).toContain('node1000Example: node({ xmlId: "1000_Example" })');
    expect(tsx).toContain('aB: node({ xmlId: "a-b" })');
    expect(tsx).toContain('aB2: node({ xmlId: "a_b" })');
    expect(tsx).toContain('done: finalNode({ xmlId: "done!" })');
    expect(tsx).toContain("initial={graph.nodes.node1000Example}");
    expect(tsx).toContain("node={graph.nodes.node1000Example}");
    expect(tsx).toContain("to={graph.nodes.aB}");
    expect(tsx).toContain("to={graph.nodes.aB2}");
    expect(tsx).toContain("to={graph.nodes.node1000Example}");
    expect(tsx).toContain(
      'ref1: refNode("node1000Example", { xmlId: "ref-1", position: { x: 0, y: 0 } })',
    );
    expect(tsx).not.toContain("ReferenceNode");
  });
});
