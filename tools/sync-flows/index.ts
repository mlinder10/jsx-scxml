#!/usr/bin/env node
import { dirname, join } from "node:path";
import {
  buildLocalProjectPaths,
  getConfigArgument,
  loadConfigFile,
} from "../shared.mts";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { parseScxmlToTsx } from "./parser";

const configPathArg = getConfigArgument("jsx-scxml-sync-flows");
const { projectRoot, config } = await loadConfigFile(configPathArg);
const { snapshots, dev } = buildLocalProjectPaths(projectRoot, config);

// TODO: loop through snapshots directory, then loop through each flow and write to dev directory
for (const snapshotName in []) {
  await mkdir(dirname(join(dev, snapshotName)), { recursive: true });

  for (const flowName in []) {
    const scxmlPath = join(snapshots, snapshotName, flowName);
    const tsxPath = join(dev, snapshotName, flowName);
    const scxml = await readFile(scxmlPath, "utf8");
    const tsx = parseScxmlToTsx(scxml);
    await writeFile(tsxPath, tsx, "utf8");
  }
}
