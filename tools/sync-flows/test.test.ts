import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { syncTestSnapshot, testTsxPath } from "./test.js";

describe("sync-flows test fixture", () => {
  it("parses test.scxml and writes its TSX snapshot", async () => {
    const generated = await syncTestSnapshot();

    expect(await readFile(testTsxPath, "utf8")).toBe(generated);
    expect(generated).toContain('import { jexl } from "jsx-scxml";');
    expect(generated).toContain("export default (");
    expect(generated).toContain("<Flow");
  });
});
