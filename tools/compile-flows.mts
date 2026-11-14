import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { basename, dirname, extname, join, relative } from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";
import { serialize } from "jsx-scxml";
import { validateSwampfox } from "jsx-scxml/swampfox";
import { buildLocalProjectPaths, loadConfigFile } from "./shared.mts";

export async function compileFlows(configPath: string) {
    const { projectRoot, config } = await loadConfigFile(configPath);
    const { snapshots, dev } = buildLocalProjectPaths(projectRoot, config);

    // Keep temporary modules in the flow project so Node resolves that project's
    // dependencies and package.json "imports" aliases (for example, #modules).
    const temporaryDirectory = join(projectRoot, ".jsx-scxml-export");
    await rm(temporaryDirectory, { recursive: true, force: true });
    await mkdir(temporaryDirectory, { recursive: true });

    try {
      const flowFiles = await findFlowFiles(dev);
      if (flowFiles.length === 0) {
        console.log(
          `No .ts or .tsx flow modules found in ${relative(projectRoot, dev)}.`,
        );
        process.exitCode = 1;
      } else {
        const failures = [];

        for (const sourcePath of flowFiles) {
          try {
            await exportFlow(sourcePath);
          } catch (error) {
            failures.push({ sourcePath, error });
            console.error(
              `Failed to export ${relative(projectRoot, sourcePath)}:`,
            );
            console.error(error instanceof Error ? error.message : error);
          }
        }

        if (failures.length > 0) {
          process.exitCode = 1;
        } else {
          console.log(
            `Exported ${flowFiles.length} flow${flowFiles.length === 1 ? "" : "s"} to ${relative(projectRoot, snapshots)}.`,
          );
        }
      }
    } finally {
      await rm(temporaryDirectory, { recursive: true, force: true });
    }

    async function exportFlow(sourcePath: string) {
      const source = await readFile(sourcePath, "utf8");
      const relativePath = relative(dev, sourcePath);
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
        snapshots,
        dirname(relativePath),
        `${basename(relativePath, extname(relativePath))}.scxml`,
      );
      await mkdir(dirname(destinationPath), { recursive: true });
      await writeFile(destinationPath, serialize(document), "utf8");
      console.log(
        `${relative(projectRoot, sourcePath)} -> ${relative(projectRoot, destinationPath)}`,
      );
    }

    function transpileFlow(source: string, fileName: string) {
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
            getCurrentDirectory: () => projectRoot,
            getNewLine: () => "\n",
          }),
        );
      }

      return result.outputText;
    }

    async function findFlowFiles(directory: string) {
      const entries = await readdir(directory, { withFileTypes: true });
      const files: string[] = [];

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
}
