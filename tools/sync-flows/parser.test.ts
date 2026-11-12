import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { parseScxmlToTsx } from "./parser.js";

describe("parseScxmlToTsx", () => {
  it("converts standard Swampfox SCXML into equivalent standard-library TSX", async () => {
    const xml = await readFile(
      new URL("../../example/out/test-snapshot/flow1.scxml", import.meta.url),
      "utf8",
    );
    const tsx = parseScxmlToTsx(xml);

    expect(tsx).toContain('import { jexl } from "jsx-scxml";');
    expect(tsx).toContain(
      'import module from "@modules" with { type: "json" };',
    );
    expect(tsx).toContain(
      'import announcement from "@announcements" with { type: "json" };',
    );
    expect(tsx).toContain(
      "flowNode: jexl`Breadcrumbs.enter(NodeType.FLOW, '1000_GetDOB')`",
    );
    expect(tsx).toContain('src={announcement["Common/Welcome"]}');
    expect(tsx).toContain("src={module.SFVUniversalMenu}");
    expect(tsx).toContain('<Branch id="get-dob-menu-branch">');
    expect(tsx).toContain('label="Repeat"');
    expect(tsx).toContain(
      "cond={jexl`lastResult.lastInputLabel.equalsIgnoreCase('Repeat')`}",
    );
    expect(tsx).toContain("script={jexl`Breadcrumbs.exit();`}");
    expect(tsx).toContain('<Return\n      id="global-return"\n    />');
  });
});
