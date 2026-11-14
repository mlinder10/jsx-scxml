import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { buildLocalProjectPaths, loadConfigFile } from "../shared.mts";
import { parseScxmlToTsx } from "./parser.ts";

export async function syncFlows(configPath: string) {
  const { projectRoot, config } = await loadConfigFile(configPath);
  const { snapshots, dev } = buildLocalProjectPaths(projectRoot, config);

  async function syncDirectory(relativePath: string) {
    const entries = await readdir(join(snapshots, relativePath), {
      withFileTypes: true,
    });

    for (const entry of entries) {
      const entryPath = join(relativePath, entry.name);
      if (entry.isDirectory()) {
        await syncDirectory(entryPath);
      } else if (entry.isFile() && entry.name.endsWith(".scxml")) {
        const scxml = await readFile(join(snapshots, entryPath), "utf8");
        const tsx = parseScxmlToTsx(scxml);
        const tsxPath = join(dev, entryPath.replace(/\.scxml$/, ".tsx"));
        await mkdir(dirname(tsxPath), { recursive: true });
        await writeFile(tsxPath, tsx, "utf8");
        console.log(tsxPath);
      }
    }
  }

  await syncDirectory("");
}
