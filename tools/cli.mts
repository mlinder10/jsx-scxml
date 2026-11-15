#!/usr/bin/env node
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { parseArgs } from "node:util";

export const usage = `Usage: jsx-scxml <operation> [options]

Operations (choose exactly one):
  --init <project-name>  Create a new flow project
  --compile-flows        Compile TS/TSX flows into SCXML snapshots
  --sync-flows           Convert SCXML snapshots into TSX flows
  --load-project         Load a project from PostgreSQL (not implemented yet)

Options:
  -c, --config <path>    Config file (default: ./icx.config.json)
  -h, --help             Show this help

Examples:
  npx jsx-scxml --init my-project
  npx jsx-scxml --compile-flows --config ./icx.config.json
  npx jsx-scxml --sync-flows`;

export function parseOptions(args: string[]) {
  const { values, tokens } = parseArgs({
    args,
    strict: true,
    allowPositionals: false,
    tokens: true,
    options: {
      init: { type: "string" },
      "compile-flows": { type: "boolean" },
      "sync-flows": { type: "boolean" },
      "load-project": { type: "boolean" },
      config: { type: "string", short: "c" },
      help: { type: "boolean", short: "h" },
    },
  });

  if (values.help) return { operation: "help" } as const;

  const operations = ["init", "compile-flows", "sync-flows", "load-project"] as const;
  const selected = operations.filter((operation) => values[operation] !== undefined);
  if (selected.length !== 1) {
    throw new Error("Choose exactly one operation: --init, --compile-flows, --sync-flows, or --load-project.");
  }
  const seen = new Set<string>();
  for (const token of tokens) {
    if (token.kind !== "option") continue;
    if (seen.has(token.name)) throw new Error(`Option --${token.name} may only be provided once.`);
    seen.add(token.name);
  }
  const operation = selected[0]!;
  if (operation === "init") {
    if (values.config !== undefined) throw new Error("--config cannot be used with --init.");
    if (!values.init) throw new Error("--init requires a project name.");
    return { operation, projectName: values.init } as const;
  }
  if (values.config === "") throw new Error("--config requires a non-empty path.");
  return { operation, configPath: values.config ?? "./icx.config.json" } as const;
}

export async function main(args = process.argv.slice(2)) {
  try {
    const options = parseOptions(args);
    switch (options.operation) {
      case "help":
        console.log(usage);
        break;
      case "init": {
        const { initializeProject } = await import("./initialize-project.mts");
        const directory = await initializeProject(options.projectName);
        console.log(`Created jsx-scxml project in ${directory}`);
        console.log(`Next steps:\n  cd ${options.projectName}\n  npm install`);
        break;
      }
      case "compile-flows": {
        const { compileFlows } = await import("./compile-flows.mts");
        await compileFlows(options.configPath);
        break;
      }
      case "sync-flows": {
        const { syncFlows } = await import("./sync-flows/index.ts");
        await syncFlows(options.configPath);
        break;
      }
      case "load-project": {
        const { loadProject } = await import("./load-project.mts");
        await loadProject(options.configPath);
        break;
      }
    }
  } catch (error) {
    console.error(`jsx-scxml: ${error instanceof Error ? error.message : error}`);
    console.error("Run jsx-scxml --help for usage.");
    process.exitCode = 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  await main();
}
