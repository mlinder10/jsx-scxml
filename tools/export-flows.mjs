#!/usr/bin/env node
import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { basename, dirname, extname, join, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import ts from "typescript";
import { serialize } from "jsx-scxml";
import { validateSwampfox } from "jsx-scxml/swampfox";

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const [configFilePathArgument] = process.argv.slice(2);

if (
  !configFilePathArgument ||
  configFilePathArgument === "--help" ||
  configFilePathArgument === "-h"
) {
  console.error("Usage: node tools/export-flows.mjs <config-path>");
  console.error("       npm run export:flows -- <config-path>");
  process.exit(configFilePathArgument ? 0 : 1);
}

const configFilePath = resolve(process.cwd(), configFilePathArgument);
const projectRoot = dirname(configFilePath);
const config = JSON.parse(await readFile(configFilePath));

const snapshotsDirectory = join(projectRoot, config.paths.snapshots);
const outputDirectory = join(projectRoot, config.paths.out);
// Keep transpiled modules inside this package so Node can resolve its self-imports.
const temporaryDirectory = join(packageRoot, ".jsx-scxml-export");
await rm(temporaryDirectory, { recursive: true, force: true });
await mkdir(temporaryDirectory, { recursive: true });

try {
  const flowFiles = await findFlowFiles(snapshotsDirectory);
  if (flowFiles.length === 0) {
    console.log(
      `No .ts or .tsx flow modules found in ${relative(projectRoot, snapshotsDirectory)}.`,
    );
    process.exitCode = 1;
  } else {
    const failures = [];

    for (const sourcePath of flowFiles) {
      try {
        await exportFlow(sourcePath);
      } catch (error) {
        failures.push({ sourcePath, error });
        console.error(`Failed to export ${relative(projectRoot, sourcePath)}:`);
        console.error(error instanceof Error ? error.message : error);
      }
    }

    if (failures.length > 0) {
      process.exitCode = 1;
    } else {
      console.log(
        `Exported ${flowFiles.length} flow${flowFiles.length === 1 ? "" : "s"} to ${relative(projectRoot, outputDirectory)}.`,
      );
    }
  }
} finally {
  await rm(temporaryDirectory, { recursive: true, force: true });
}

async function exportFlow(sourcePath) {
  const source = await readFile(sourcePath, "utf8");
  const relativePath = relative(snapshotsDirectory, sourcePath);
  const compiledPath = join(
    temporaryDirectory,
    relativePath.replace(/\.(?:tsx?|mts|cts)$/, ".mjs"),
  );

  await mkdir(dirname(compiledPath), { recursive: true });
  await writeFile(compiledPath, transpileFlow(source, sourcePath), "utf8");

  const flowModule = await import(
    `${pathToFileURL(compiledPath).href}?flow=${Date.now()}`
  );
  if (!("default" in flowModule)) {
    throw new Error(
      "Flow modules must have a default export containing an SCXML document.",
    );
  }

  const document = flowModule.default;
  const validation = validateSwampfox(document);
  const errors = validation.diagnostics.filter(
    (diagnostic) => diagnostic.severity === "error",
  );

  if (errors.length > 0) {
    throw new Error(
      errors
        .map((diagnostic) => `${diagnostic.path}: ${diagnostic.message}`)
        .join("\n"),
    );
  }

  for (const warning of validation.diagnostics) {
    if (warning.severity === "warning") {
      console.warn(
        `${relative(projectRoot, sourcePath)} ${warning.path}: ${warning.message}`,
      );
    }
  }

  const destinationPath = join(
    outputDirectory,
    dirname(relativePath),
    `${basename(relativePath, extname(relativePath))}.scxml`,
  );
  await mkdir(dirname(destinationPath), { recursive: true });
  await writeFile(
    destinationPath,
    serialize(document, { xmlDeclaration: true }),
    "utf8",
  );
  console.log(
    `${relative(projectRoot, sourcePath)} -> ${relative(projectRoot, destinationPath)}`,
  );
}

function transpileFlow(source, fileName) {
  const result = ts.transpileModule(source, {
    fileName,
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
      jsx: ts.JsxEmit.ReactJSX,
      jsxImportSource: "jsx-scxml",
      verbatimModuleSyntax: true,
    },
    reportDiagnostics: true,
  });

  const diagnostics =
    result.diagnostics?.filter(
      (diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error,
    ) ?? [];
  if (diagnostics.length > 0) {
    throw new Error(
      ts.formatDiagnosticsWithColorAndContext(diagnostics, {
        getCanonicalFileName: (name) => name,
        getCurrentDirectory: () => flowProjectRoot,
        getNewLine: () => "\n",
      }),
    );
  }

  return result.outputText;
}

async function findFlowFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await findFlowFiles(path)));
    } else if (
      entry.isFile() &&
      [".ts", ".tsx"].includes(extname(entry.name))
    ) {
      files.push(path);
    }
  }

  return files.sort();
}
