#!/usr/bin/env node

import { mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

const usage = `Usage: jsx-scxml-init <project-name>\n       npx jsx-scxml-init <project-name>`;
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
        "compile-flows": "jsx-scxml-compile-flows ./icx.config.json",
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

async function main() {
  const arguments_ = process.argv.slice(2);
  const [projectName] = arguments_;

  if (projectName === "--help" || projectName === "-h") {
    console.log(usage);
    return;
  }

  if (!projectName || arguments_.length !== 1) {
    console.error(usage);
    process.exitCode = 1;
    return;
  }

  try {
    const projectDirectory = await initializeProject(projectName);
    console.log(`Created jsx-scxml project in ${projectDirectory}`);
    console.log("Next steps:");
    console.log(`  cd ${projectName}`);
    console.log("  npm install");
  } catch (error) {
    console.error(
      `Unable to create project: ${error instanceof Error ? error.message : error}`,
    );
    process.exitCode = 1;
  }
}

if (
  process.argv[1] &&
  import.meta.url === new URL(process.argv[1], "file:").href
) {
  await main();
}
