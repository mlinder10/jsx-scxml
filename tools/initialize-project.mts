import { mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

const projectNamePattern = /^[a-z0-9][a-z0-9._-]*$/;

export async function initializeProject(
  projectName: string,
  workingDirectory = process.cwd(),
) {
  if (!projectNamePattern.test(projectName)) {
    throw new Error(
      "Project name must contain only lowercase letters, numbers, dots, hyphens, or underscores.",
    );
  }

  const projectDirectory = resolve(workingDirectory, projectName);
  await mkdir(projectDirectory);

  const writeJson = (fileName: string, value: unknown) =>
    writeFile(
      join(projectDirectory, fileName),
      `${JSON.stringify(value, null, 2)}\n`,
      { encoding: "utf8", flag: "wx" },
    );

  await Promise.all([
    writeJson("package.json", {
      name: projectName,
      private: true,
      type: "module",
      scripts: {
        "compile-flows": "jsx-scxml --compile-flows --config ./icx.config.json",
        "sync-flows": "jsx-scxml --sync-flows --config ./icx.config.json",
        typecheck: "tsc -p tsconfig.json",
      },
      dependencies: {
        "jsx-scxml": "^0.1.0",
      },
      devDependencies: {
        typescript: "^5.7.3",
      },
      imports: {
        "#modules": "./modules.json",
        "#announcements": "./announcements.json",
        "#routing": "./routing.json",
      },
    }),
    writeJson("tsconfig.json", {
      compilerOptions: {
        target: "ES2022",
        module: "NodeNext",
        moduleResolution: "NodeNext",
        strict: true,
        noEmit: true,
        jsx: "react-jsx",
        jsxImportSource: "jsx-scxml",
        resolveJsonModule: true,
        paths: {
          "#modules": ["./modules.json"],
          "#announcements": ["./announcements.json"],
          "#routing": ["./routing.json"],
        },
      },
      include: ["dev"],
    }),
    writeJson("icx.config.json", {
      origin: {
        postgresUrl: "<icx_config_url>",
      },
      paths: {
        snapshots: "./snapshots",
        scripts: "./scripts",
        modules: "./modules.json",
        routing: "./routing.json",
        announcements: "./announcements.json",
        dev: "./dev",
      },
    }),
    writeJson("announcements.json", []),
    writeJson("routing.json", []),
    writeJson("modules.json", []),
    mkdir(join(projectDirectory, "snapshots")),
    mkdir(join(projectDirectory, "scripts")),
    mkdir(join(projectDirectory, "dev")),
  ]);

  return projectDirectory;
}
