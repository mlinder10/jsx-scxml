import { build } from "esbuild";
import { bundleRuntimeAssets } from "./scripts/runtime-assets.mjs";
import { existsSync, readdirSync, mkdirSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";

// The source checkout avoids requiring the Monaco/VS Code UI dependencies of
// sf-jexl during local development. Release builds can use its published export.
const index = process.argv.indexOf("--jexl-source");
const source = index >= 0 ? process.argv[index + 1] : undefined;
if (index >= 0 && !source)
  throw new Error("--jexl-source requires the lib-langium-jexl directory");
const modulePath = source
  ? resolve(source, "src/language/jexl-module.ts")
  : undefined;
if (modulePath && !existsSync(modulePath))
  throw new Error(`Missing JEXL module: ${modulePath}`);
if (modulePath) {
  mkdirSync(".generated", { recursive: true });
  const config = {
    projectName: "Jexl",
    languages: ["jexl", "jexl-expr", "jexl-lit"].map((id) => ({
      id,
      grammar: resolve(source, `src/language/${id}.langium`),
      fileExtensions: [
        { jexl: ".jexl", "jexl-expr": ".jexlexpr", "jexl-lit": ".jexllit" }[id],
      ],
    })),
    out: resolve(".generated/language"),
  };
  writeFileSync(".generated/langium-config.json", JSON.stringify(config));
  execFileSync(
    process.execPath,
    [
      "node_modules/langium-cli/bin/langium.js",
      "generate",
      "--file",
      ".generated/langium-config.json",
      "--mode",
      "production",
    ],
    { stdio: "inherit" },
  );
}
if (!modulePath) {
  try {
    import.meta.resolve("sf-jexl/language");
  } catch {
    throw new Error(
      "Install sf-jexl, or build with --jexl-source ../../../lib-langium-jexl",
    );
  }
}
await build({
  entryPoints: [
    "src/server.ts",
    ...readdirSync("test")
      .filter((name) => name.endsWith(".test.ts"))
      .map((name) => `test/${name}`),
  ],
  outdir: "out",
  outbase: ".",
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node22",
  sourcemap: true,
  // Langium is ESM. Keeping dependencies external also avoids bundling duplicate
  // service registries and preserves native Node module loading behavior.
  packages: "external",
  plugins: modulePath
    ? [
        {
          name: "local-jexl-engine",
          setup(builder) {
            builder.onResolve({ filter: /^sf-jexl\/language$/ }, () => ({
              path: modulePath,
            }));
            builder.onResolve({ filter: /^\.\/generated\// }, (args) => ({
              path: resolve(
                ".generated/language",
                args.path.split("/").at(-1).replace(/\.js$/, ".ts"),
              ),
            }));
          },
        },
      ]
    : [],
});
bundleRuntimeAssets({
  jexlSource: source,
  runtimeDirectory: (() => {
    const index = process.argv.indexOf("--runtime-dir");
    if (index < 0) return undefined;
    const directory = process.argv[index + 1];
    if (!directory || directory.startsWith("--"))
      throw new Error("--runtime-dir requires a directory");
    return directory;
  })(),
});
