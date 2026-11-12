/** @jsxImportSource ../src/swampfox */
import { describe, expect, it } from "vitest";
import { jexl, serialize } from "../src/index.js";
import { Announcement, Flow, Module, Return } from "../src/std/index.js";
import { validateSwampfox } from "../src/swampfox/index.js";
import { ScxmlNode } from "../dist/core/ast.js";

describe("Swampfox standard library", () => {
  it("composes typed flow actions into a valid Swampfox SCXML document", () => {
    const document = (
      <Flow
        initial="welcome"
        dataModel={{ lastEnabled: jexl`true`, nodeName: jexl`''` }}
      >
        <Announcement
          id="welcome"
          metadata={{ name: "Welcome", nodeType: "Announcement", x: 0, y: 0 }}
          src="Common/Welcome"
          to="menu"
        />
        <Module
          id="menu"
          metadata={{ name: "Main Menu", nodeType: "Module", x: 120, y: 0 }}
          src="menu-module"
          nameList="session"
          to="global-return"
        />

        <Return id="global-return" />
      </Flow>
    ) as ScxmlNode;

    const xml = serialize(document);
    expect(xml).toContain('<scxml xmlns="http://www.w3.org/2005/07/scxml"');
    expect(xml).toContain('<sf:announcement src="Common/Welcome" srcexpr=""/>');
    expect(xml).toContain(
      '<sf:module src="menu-module" srcexpr="" namelist="session" result="lastResult"/>',
    );
    expect(xml).toContain('expr="&apos;Welcome&apos;"');
    expect(validateSwampfox(document).valid).toBe(true);
  });
});
