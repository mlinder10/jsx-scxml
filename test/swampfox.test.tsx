/** @jsxImportSource ../src/swampfox */
import { describe, expect, it } from "vitest";
import { expr, ScxmlNode, serialize } from "../src/index.js";
import {
  SWAMPFOX_NAMESPACE,
  swampfoxNamespaces,
  validateSwampfox,
} from "../src/swampfox/index.js";

describe("Swampfox dialect", () => {
  it("serializes typed extension elements and validates them as executable content", () => {
    const document = (
      <scxml {...swampfoxNamespaces()} initial="start" version="1.0">
        <state id="start">
          <onentry>
            <sf:log expr={expr`'Starting'`} />
            <sf:intent
              src=""
              srcexpr={expr`session.lastIntent`}
              immediate="false"
            />
            <sf:module
              src="module-id"
              srcexpr=""
              namelist="session"
              result="lastResult"
            >
              <param name="prompt" expr={expr`'Welcome'`} />
            </sf:module>
          </onentry>
        </state>
      </scxml>
    ) as ScxmlNode;

    const xml = serialize(document);
    expect(xml).toContain(`xmlns:sf="${SWAMPFOX_NAMESPACE}"`);
    expect(xml).toContain("<sf:log expr=\"'Starting'\"/>");
    expect(xml).toContain(
      '<sf:intent src="" srcexpr="session.lastIntent" immediate="false"/>',
    );
    expect(xml).toContain(
      '<sf:module src="module-id" srcexpr="" namelist="session" result="lastResult">',
    );
    expect(validateSwampfox(document).valid).toBe(true);
  });

  // it("keeps unknown extensions invalid", () => {
  //   const document = (
  //     <scxml>
  //       <state id="start">
  //         <sf:unknown />
  //       </state>
  //     </scxml>
  //   ) as ScxmlNode;
  //   expect(validateSwampfox(document).diagnostics).toContainEqual(
  //     expect.objectContaining({ code: "unknown-element" }),
  //   );
  // });
});
