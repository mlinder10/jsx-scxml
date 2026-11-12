import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseScxmlToTsx } from "./parser.js";

const toolDirectory = dirname(fileURLToPath(import.meta.url));
export const testScxmlPath = resolve(
  toolDirectory,
  "../../example/out/test-snapshot/test.scxml",
);
export const testTsxPath = resolve(
  toolDirectory,
  "../../example/snapshots/test-snapshot/test.tsx",
);

/** Regenerates the TSX fixture from the matching exported SCXML fixture. */
export async function syncTestSnapshot(): Promise<string> {
  const scxml = await readFile(testScxmlPath, "utf8");
  const tsx = parseScxmlToTsx(scxml);
  await mkdir(dirname(testTsxPath), { recursive: true });
  await writeFile(testTsxPath, tsx, "utf8");
  return tsx;
}
