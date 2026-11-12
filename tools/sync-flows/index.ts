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
const postgresUrl = config.origin.postgresUrl;
// TODO: read snapshots from db, parse scxml and write as tsx
