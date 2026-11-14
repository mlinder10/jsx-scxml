import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { initializeProject } from "../tools/initialize-project.mts";

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) =>
      rm(directory, { recursive: true, force: true }),
    ),
  );
});

async function createTemporaryDirectory() {
  const directory = await mkdtemp(join(tmpdir(), "jsx-scxml-init-"));
  temporaryDirectories.push(directory);
  return directory;
}

describe("initializeProject", () => {
  it("creates a complete project with valid, consistent JSON", async () => {
    const workingDirectory = await createTemporaryDirectory();
    const projectDirectory = await initializeProject("example-flow", workingDirectory);

    const packageJson = JSON.parse(
      await readFile(join(projectDirectory, "package.json"), "utf8"),
    );
    const tsconfig = JSON.parse(
      await readFile(join(projectDirectory, "tsconfig.json"), "utf8"),
    );
    const config = JSON.parse(
      await readFile(join(projectDirectory, "icx.config.json"), "utf8"),
    );

    expect(packageJson.name).toBe("example-flow");
    expect(tsconfig.compilerOptions.paths["#announcements"]).toEqual([
      "./announcements.json",
    ]);
    expect(config.paths.announcements).toBe("./announcements.json");
    await expect(readFile(join(projectDirectory, "modules.json"), "utf8")).resolves.toBe(
      "[]\n",
    );
  });

  it("does not overwrite an existing project directory", async () => {
    const workingDirectory = await createTemporaryDirectory();
    const projectDirectory = join(workingDirectory, "existing-project");
    await initializeProject("existing-project", workingDirectory);
    await writeFile(join(projectDirectory, "package.json"), "preserve me");

    await expect(
      initializeProject("existing-project", workingDirectory),
    ).rejects.toMatchObject({ code: "EEXIST" });
    await expect(readFile(join(projectDirectory, "package.json"), "utf8")).resolves.toBe(
      "preserve me",
    );
  });

  it("rejects names that could write outside the working directory", async () => {
    const workingDirectory = await createTemporaryDirectory();

    await expect(initializeProject("../outside", workingDirectory)).rejects.toThrow(
      "Project name must",
    );
  });
});
