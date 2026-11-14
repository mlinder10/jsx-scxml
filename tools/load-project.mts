#!/usr/bin/env node
import {
  buildLocalProjectPaths,
  getConfigArgument,
  loadConfigFile,
} from "./shared.mts";

const configPathArg = getConfigArgument("jsx-scxml-load-project");
const { projectRoot, config } = await loadConfigFile(configPathArg);
const { snapshots, scripts, modules, routing, announcements } =
  buildLocalProjectPaths(projectRoot, config);
const postgresUrl = config.origin.postgresUrl;

// TODO: read postgres db and write data to files
