/** @jsxImportSource ../src/swampfox */
import { describe, expect, it } from "vitest";
import { jexl, serialize } from "../src/index.js";
import {
  Announcement,
  CommentNode,
  defineNodes,
  finalNode,
  Flow,
  Module,
  node,
  refNode,
  Return,
} from "../src/std/index.js";
import { validateSwampfox } from "../src/swampfox/index.js";
import { ScxmlNode } from "../dist/core/ast.js";

const graph = defineNodes({
  nodes: {
    start: finalNode(),
    welcome: node(),
    menu: node(),
    globalReturn: finalNode(),
  },
  refs: {
    startRef: refNode("start", {
      xmlId: "start-ref-1",
      position: { x: 0, y: 180 },
    }),
  },
});

describe("Swampfox standard library", () => {
  it("serializes flow annotations as XML comments before the data model", () => {
    const document = (
      <Flow
        graph={graph}
        initial={graph.nodes.start}
        dataModel={{}}
        annotations={[
          <CommentNode
            comment="Some comment"
            position={{ x: 36, y: -108 }}
            width={108}
            height={24}
          />,
        ]}
      >
        <Return node={graph.nodes.start} />
      </Flow>
    ) as ScxmlNode;

    const xml = serialize(document);
    expect(xml).toContain(
      '<!--FLOWCOMMENT|{"comment":"Some comment","position":{"x":36,"y":-108},"color":"#FFC","width":108,"height":24}-->',
    );
    expect(xml).toContain(
      '<!--REFNODE|{"id":"start-ref-1","refedNodeID":"if-node-start","position":{"x":0,"y":180}}-->',
    );
    expect(xml.indexOf("<!--FLOWCOMMENT")).toBeLessThan(
      xml.indexOf("<datamodel"),
    );
    expect(validateSwampfox(document).valid).toBe(true);
  });

  it("composes typed flow actions into a valid Swampfox SCXML document", () => {
    const document = (
      <Flow
        initial={graph.nodes.welcome}
        dataModel={{ lastEnabled: jexl`true`, nodeName: jexl`''` }}
      >
        <Announcement
          node={graph.nodes.welcome}
          name="Welcome"
          nodeType="Announcement"
          x={0}
          y={0}
          src="Common/Welcome"
          to={graph.nodes.menu}
        />
        <Module
          node={graph.nodes.menu}
          name="Main Menu"
          nodeType="Module"
          x={120}
          y={0}
          src="menu-module"
          nameList="session"
          to={graph.nodes.globalReturn}
        />

        <Return node={graph.nodes.globalReturn} />
      </Flow>
    ) as ScxmlNode;

    const xml = serialize(document);
    expect(xml).toContain('<scxml xmlns="http://www.w3.org/2005/07/scxml"');
    expect(xml).toContain('<sf:announcement src="Common/Welcome" srcexpr=""/>');
    expect(xml).toContain(
      '<sf:module src="menu-module" srcexpr="" namelist="session" result="lastResult"/>',
    );
    expect(xml).toContain("expr=\"'Welcome'\"");
    expect(validateSwampfox(document).valid).toBe(true);
  });
});
