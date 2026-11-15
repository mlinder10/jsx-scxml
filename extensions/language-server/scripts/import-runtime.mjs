import { parseArgs } from "node:util";
import { importRuntimeAssets } from "./runtime-assets.mjs";

try {
  const { values } = parseArgs({
    options: {
      vsix: { type: "string" },
      directory: { type: "string" },
      help: { type: "boolean", short: "h" },
    },
    allowPositionals: false,
  });
  if (values.help) {
    console.log("Usage: node scripts/import-runtime.mjs (--vsix <file> | --directory <dir>)\nPaths resolve against the current working directory; output is runtime/.");
  } else {
    const manifest = await importRuntimeAssets(values);
    console.log(`Imported ${Object.keys(manifest.files).join(", ")} into runtime/`);
  }
} catch (error) {
  console.error(`Runtime import failed: ${error.message}`);
  process.exitCode = 1;
}
