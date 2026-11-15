import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { test } from "node:test";
import { zipSync } from "fflate";
import {
  bundleRuntimeAssets,
  importRuntimeAssets,
} from "../scripts/runtime-assets.mjs";

const contextName = "jexl-context.json";
const typesName = "jexl-types.json";
const context = {
  functions: [],
  variables: [{ name: "session", type: "Session" }],
  namespaces: [],
};
const types = {
  types: {
    Session: { properties: [{ name: "id", type: "string" }], methods: [] },
  },
};
const bytes = (value: unknown) => Buffer.from(JSON.stringify(value));
const hash = (value: Uint8Array) =>
  createHash("sha256").update(value).digest("hex");

function fixture(t: { after: (fn: () => void) => void }) {
  const root = mkdtempSync(join(tmpdir(), "jexl-runtime-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const runtimeDirectory = join(root, "runtime");
  const outDirectory = join(root, "out");
  const directory = join(root, "generator");
  mkdirSync(directory);
  return { root, runtimeDirectory, outDirectory, directory };
}

function dataset(directory: string, withTypes = true) {
  mkdirSync(directory, { recursive: true });
  writeFileSync(join(directory, contextName), bytes(context));
  if (withTypes) writeFileSync(join(directory, typesName), bytes(types));
}

function archive(root: string, entries: Record<string, Uint8Array>) {
  const vsix = join(root, "sf-jexl-0.0.6.vsix");
  writeFileSync(vsix, zipSync(entries));
  return vsix;
}

test("VSIX import extracts only the exact pair and records reproducible hashes without paths", async (t) => {
  const { root, runtimeDirectory } = fixture(t);
  const vsix = archive(root, {
    [`extension/${contextName}`]: bytes(context),
    [`extension/${typesName}`]: bytes(types),
    "extension/package.json": bytes({ private: true }),
    "../escaped.json": bytes({ unsafe: true }),
    [`extension/../${contextName}`]: bytes({ wrong: true }),
  });
  const manifest = await importRuntimeAssets({ vsix, runtimeDirectory });
  assert.deepEqual(
    readdirSync(runtimeDirectory).sort(),
    [contextName, typesName, "source.json"].sort(),
  );
  assert.deepEqual(manifest.source, {
    kind: "vsix",
    artifact: basename(vsix),
    sha256: hash(readFileSync(vsix)),
  });
  assert.deepEqual(manifest.files[contextName], {
    sha256: hash(bytes(context)),
    size: bytes(context).length,
  });
  assert.deepEqual(manifest.files[typesName], {
    sha256: hash(bytes(types)),
    size: bytes(types).length,
  });
  const recorded = readFileSync(join(runtimeDirectory, "source.json"), "utf8");
  assert.deepEqual(JSON.parse(recorded), manifest);
  assert.equal(recorded.includes(root), false);
  assert.equal(existsSync(join(root, "escaped.json")), false);
  assert.deepEqual(
    readFileSync(join(runtimeDirectory, contextName)),
    bytes(context),
  );
  assert.deepEqual(
    await importRuntimeAssets({ vsix, runtimeDirectory }),
    manifest,
  );
});

test("VSIX requires both exact entries and validates the whole pair before writing", async (t) => {
  const { root, runtimeDirectory } = fixture(t);
  dataset(runtimeDirectory);
  const cases: Array<Record<string, Uint8Array>> = [
    { [`extension/${contextName}`]: bytes(context) },
    { [`extension/${typesName}`]: bytes(types) },
    {
      [`extension/../${contextName}`]: bytes(context),
      [`extension/${typesName}`]: bytes(types),
    },
    {
      [`extension/${contextName}`]: bytes(context),
      [`extension/${typesName}`]: bytes({ types: [] }),
    },
  ];
  for (const entries of cases) {
    await assert.rejects(
      importRuntimeAssets({ vsix: archive(root, entries), runtimeDirectory }),
      /missing|Invalid runtime JSON/,
    );
    assert.deepEqual(
      readFileSync(join(runtimeDirectory, contextName)),
      bytes(context),
    );
    assert.deepEqual(
      readFileSync(join(runtimeDirectory, typesName)),
      bytes(types),
    );
    assert.equal(existsSync(join(runtimeDirectory, "source.json")), false);
  }
});

test("directory import removes stale types and replaces provenance", async (t) => {
  const { directory, runtimeDirectory } = fixture(t);
  dataset(directory);
  await importRuntimeAssets({ directory, runtimeDirectory });
  rmSync(join(directory, typesName));
  const manifest = await importRuntimeAssets({ directory, runtimeDirectory });
  assert.equal(existsSync(join(runtimeDirectory, typesName)), false);
  assert.deepEqual(manifest.source, {
    kind: "directory",
    artifact: "generator",
  });
  assert.deepEqual(Object.keys(manifest.files), [contextName]);
});

test("import rejects ambiguous inputs and missing context", async (t) => {
  const { directory, runtimeDirectory } = fixture(t);
  await assert.rejects(
    importRuntimeAssets({ runtimeDirectory }),
    /exactly one/,
  );
  await assert.rejects(
    importRuntimeAssets({ directory, vsix: "unused.vsix", runtimeDirectory }),
    /exactly one/,
  );
  writeFileSync(join(directory, typesName), bytes(types));
  await assert.rejects(
    importRuntimeAssets({ directory, runtimeDirectory }),
    /missing jexl-context/,
  );
  assert.equal(existsSync(runtimeDirectory), false);
});

test("malformed JSON and nested schema shapes are rejected before replacing assets", async (t) => {
  const { directory, runtimeDirectory } = fixture(t);
  dataset(runtimeDirectory);
  for (const invalid of [
    "{",
    "null",
    "[]",
    JSON.stringify({ ...context, functions: {} }),
    JSON.stringify({ ...context, variables: [null] }),
    JSON.stringify({ ...context, namespaces: [{ name: "ns", functions: {} }] }),
    JSON.stringify({
      ...context,
      functions: [{ name: "f", parameters: [{ name: "p", type: 4 }] }],
    }),
    JSON.stringify({ ...context, types: [] }),
    JSON.stringify({ ...context, types: { Session: { properties: {} } } }),
    JSON.stringify({ ...context, types: { Session: { methods: [null] } } }),
    JSON.stringify({ ...context, types: { Session: { supertypes: [7] } } }),
  ]) {
    writeFileSync(join(directory, contextName), invalid);
    await assert.rejects(
      importRuntimeAssets({ directory, runtimeDirectory }),
      /Invalid runtime JSON/,
    );
    assert.deepEqual(
      readFileSync(join(runtimeDirectory, contextName)),
      bytes(context),
    );
    assert.deepEqual(
      readFileSync(join(runtimeDirectory, typesName)),
      bytes(types),
    );
  }
});

test("bundle copies validated bytes and removes stale types without cross-dataset mixing", (t) => {
  const { root, directory, runtimeDirectory, outDirectory } = fixture(t);
  dataset(runtimeDirectory);
  dataset(directory);
  dataset(join(directory, "public"));
  const options = { runtimeDirectory, jexlSource: directory, outDirectory };
  assert.deepEqual(bundleRuntimeAssets(options).files, [
    contextName,
    typesName,
  ]);
  rmSync(join(runtimeDirectory, typesName));
  assert.deepEqual(bundleRuntimeAssets(options).files, [contextName]);
  assert.equal(existsSync(join(outDirectory, "runtime", typesName)), false);
  assert.deepEqual(
    readFileSync(join(outDirectory, "runtime", contextName)),
    bytes(context),
  );
  // Validation must happen before replacing the previous output.
  writeFileSync(join(runtimeDirectory, contextName), "[]");
  assert.throws(() => bundleRuntimeAssets(options), /Invalid runtime JSON/);
  assert.deepEqual(
    readFileSync(join(outDirectory, "runtime", contextName)),
    bytes(context),
  );
  assert.equal(existsSync(join(root, typesName)), false);
});

test("default selection prefers runtime, then checkout root, then public; never mixes pairs", (t) => {
  const { root, runtimeDirectory, directory, outDirectory } = fixture(t);
  const previous = process.cwd();
  process.chdir(root);
  try {
    dataset(join(directory, "public"));
    const options = { jexlSource: directory, outDirectory };
    assert.equal(
      bundleRuntimeAssets(options).sourceDirectory,
      join(directory, "public"),
    );
    dataset(directory, false);
    assert.equal(bundleRuntimeAssets(options).sourceDirectory, directory);
    assert.equal(existsSync(join(outDirectory, "runtime", typesName)), false);
    dataset(runtimeDirectory);
    assert.equal(
      bundleRuntimeAssets(options).sourceDirectory,
      runtimeDirectory,
    );
  } finally {
    process.chdir(previous);
  }
});

test("missing runtime warns, clears stale outputs, and does not fall back from an explicit override", (t) => {
  const { directory, runtimeDirectory, outDirectory } = fixture(t);
  dataset(directory);
  dataset(join(outDirectory, "runtime"));
  const warnings: unknown[][] = [];
  t.mock.method(console, "warn", (...args: unknown[]) => warnings.push(args));
  const result = bundleRuntimeAssets({
    runtimeDirectory,
    jexlSource: directory,
    outDirectory,
  });
  assert.deepEqual(result.files, []);
  assert.deepEqual(readdirSync(join(outDirectory, "runtime")), []);
  assert.equal(warnings.length, 1);
});

test("no default runtime or checkout still permits generic-engine packaging", (t) => {
  const { root, outDirectory } = fixture(t);
  const previous = process.cwd();
  t.mock.method(console, "warn", () => {});
  process.chdir(root);
  try {
    assert.deepEqual(bundleRuntimeAssets({ outDirectory }).files, []);
  } finally {
    process.chdir(previous);
  }
});
