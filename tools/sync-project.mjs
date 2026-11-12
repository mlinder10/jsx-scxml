#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const [configFilePathArgument] = process.argv.slice(2);

if (
  !configFilePathArgument ||
  configFilePathArgument === "--help" ||
  configFilePathArgument === "-h"
) {
  console.error("Usage: node tools/sync-project.mjs <config-path>");
  console.error("       npm run icx:sync -- <config-path>");
  process.exit(configFilePathArgument ? 0 : 1);
}

const configFilePath = resolve(process.cwd(), configFilePathArgument);
const projectRoot = dirname(configFilePath);
const config = JSON.parse(await readFile(configFilePath));

const scriptsDirectory = join(projectRoot, config.paths.scripts);
const modulesFile = join(projectRoot, config.paths.modules);
const routingFile = join(projectRoot, config.paths.routing);
const announcementsFile = join(projectRoot, config.paths.announcements);

const postgresUrl = config.origin.postgresUrl;
// TODO: read postgres db and write data to files
