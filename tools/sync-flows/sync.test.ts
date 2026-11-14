import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { syncFlows } from "./index.ts";
import { parseScxmlToTsx } from "./parser.ts";

const scxml = `
  <scxml initial="start">
    <datamodel/>
    <final id="start"/>
  </scxml>
`;

describe("syncFlows", () => {
  let projectRoot: string;
  let configPath: string;
  let snapshots: string;
  let dev: string;

  beforeEach(async () => {
    projectRoot = await mkdtemp(join(tmpdir(), "jsx-scxml-sync-"));
    configPath = join(projectRoot, "config.json");
    snapshots = join(projectRoot, "input", "snapshots");
    dev = join(projectRoot, "output", "dev");
    await writeFile(
      configPath,
      JSON.stringify({
        origin: { postgresUrl: "postgres://localhost/test" },
        paths: {
          snapshots: "input/snapshots",
          scripts: "scripts",
          modules: "modules",
          routing: "routing",
          announcements: "announcements",
          dev: "output/dev",
        },
      }),
    );
    vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await rm(projectRoot, { recursive: true, force: true });
  });

  it("converts SCXML recursively into mirrored TSX paths and logs each output", async () => {
    const flows = ["root.scxml", "snapshot/flow.scxml", "snapshot/nested/flow.v2.scxml"];
    for (const flow of flows) {
      const path = join(snapshots, flow);
      await mkdir(dirname(path), { recursive: true });
      await writeFile(path, scxml);
    }
    await writeFile(join(snapshots, "snapshot", "notes.txt"), "not SCXML");
    await writeFile(join(snapshots, "flow.scxml.bak"), "not SCXML");

    await syncFlows(configPath);

    for (const flow of flows) {
      const outputPath = join(dev, flow.replace(/\.scxml$/, ".tsx"));
      const output = await readFile(outputPath, "utf8");
      expect(output).toBe(parseScxmlToTsx(scxml));
      expect(output).toContain("<Flow");
      expect(output).toContain("export default (");
      expect(console.log).toHaveBeenCalledWith(outputPath);
    }
    expect(await readdir(dev)).toEqual(["root.tsx", "snapshot"]);
    expect(await readdir(join(dev, "snapshot"))).toEqual(["flow.tsx", "nested"]);
    expect(console.log).toHaveBeenCalledTimes(flows.length);
  });

  it("does nothing when snapshots contains no SCXML files", async () => {
    await mkdir(join(snapshots, "empty"), { recursive: true });
    await writeFile(join(snapshots, "notes.txt"), "not SCXML");

    await syncFlows(configPath);

    await expect(readdir(dev)).rejects.toMatchObject({ code: "ENOENT" });
    expect(console.log).not.toHaveBeenCalled();
  });

  it("propagates errors when the snapshots directory is missing", async () => {
    await expect(syncFlows(configPath)).rejects.toMatchObject({ code: "ENOENT" });
    expect(console.log).not.toHaveBeenCalled();
  });
});
