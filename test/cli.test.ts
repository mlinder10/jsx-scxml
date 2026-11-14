import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { parseOptions } from "../tools/cli.mts";

const cliPath = fileURLToPath(new URL("../tools/cli.mts", import.meta.url));

function runCli(args: string[], cwd?: string) {
  return spawnSync(process.execPath, [cliPath, ...args], { encoding: "utf8", cwd });
}

describe("CLI options", () => {
  it("parses initialization and default config paths", () => {
    expect(parseOptions(["--init", "my-project"])).toEqual({
      operation: "init", projectName: "my-project",
    });
    for (const operation of ["compile-flows", "sync-flows", "load-project"]) {
      expect(parseOptions([`--${operation}`])).toEqual({
        operation, configPath: "./icx.config.json",
      });
    }
  });

  it("accepts long and short config options", () => {
    for (const option of ["--config", "-c"]) {
      expect(parseOptions([option, "custom.json", "--compile-flows"])).toEqual({
        operation: "compile-flows", configPath: "custom.json",
      });
    }
  });

  it.each([
    [], ["--unknown"], ["--init"], ["--compile-flows", "positional.json"],
    ["--compile-flows", "--sync-flows"], ["--init", "app", "--config", "config.json"],
    ["--compile-flows", "--config"], ["--compile-flows", "--config="],
    ["--compile-flows", "--compile-flows"],
  ])("rejects invalid arguments: %j", (...args) => {
    expect(() => parseOptions(args)).toThrow();
  });
});

describe("CLI executable", () => {
  it("prints help without loading a config", () => {
    const result = runCli(["--help"]);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("Usage: jsx-scxml");
    expect(result.stdout).toContain("--sync-flows");
    expect(result.stderr).toBe("");
  });

  it("exits unsuccessfully on invalid options", () => {
    const result = runCli([]);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("Choose exactly one operation");
  });

  it("dispatches initialization and reports unimplemented database loading", async () => {
    const directory = await mkdtemp(join(tmpdir(), "jsx-scxml-cli-"));
    try {
      const initialized = runCli(["--init", "my-project"], directory);
      expect(initialized.stderr).toBe("");
      expect(initialized.status).toBe(0);
      const manifest = JSON.parse(await readFile(join(directory, "my-project/package.json"), "utf8"));
      expect(manifest.scripts["compile-flows"]).toContain("jsx-scxml --compile-flows");
      const loaded = runCli(["--load-project"], join(directory, "my-project"));
      expect(loaded.status).toBe(1);
      expect(loaded.stderr).toContain("not implemented yet");
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});
