import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { test } from "node:test";
import { loadRuntimeContext, mergeRuntimeContexts, describeRuntimeContext } from "../src/runtime-context.js";

function fixture(t: { after(fn: () => void): void }) {
  const directory = mkdtempSync(join(tmpdir(), "jexl-context-"));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const bundled = join(directory, "bundled");
  const workspace = join(directory, "workspace");
  mkdirSync(bundled);
  mkdirSync(workspace);
  const write = (dir: string, name: string, value: unknown) => writeFileSync(join(dir, name), JSON.stringify(value));
  return { directory, bundled, workspace, write };
}

test("bundled Swampfox definitions load first and workspace context/types overlay them", t => {
  const f = fixture(t);
  f.write(f.bundled, "jexl-context.json", { functions: [{ name: "runtimeFunction" }], variables: [{ name: "status", type: "old" }] });
  f.write(f.bundled, "jexl-types.json", { types: { old: { documentation: "base" }, shared: { documentation: "old" } } });
  f.write(f.workspace, "jexl-context.json", { variables: [{ name: "status", type: "new" }] });
  f.write(f.workspace, "jexl-types.json", { types: { shared: { documentation: "project" } } });
  const files = loadRuntimeContext({}, [f.workspace], f.bundled);
  assert.deepEqual(files.map(file => file.origin), ["bundled", "bundled", "workspace", "workspace"]);
  const merged = mergeRuntimeContexts(files.map(file => file.context));
  assert.deepEqual(merged.functions, [{ name: "runtimeFunction" }]);
  assert.deepEqual(merged.variables, [{ name: "status", type: "new" }]);
  assert.deepEqual(merged.types, { old: { documentation: "base" }, shared: { documentation: "project" } });
  assert.match(describeRuntimeContext(files[0]), /bundled.*1 functions/);
});

test("explicit relative paths override workspace discovery and skipBundledContext excludes runtime", t => {
  const f = fixture(t);
  f.write(f.bundled, "jexl-context.json", { functions: [{ name: "runtime" }] });
  f.write(f.workspace, "jexl-context.json", { functions: [{ name: "notSelected" }] });
  f.write(f.workspace, "project.json", { functions: [{ name: "selected" }] });
  const files = loadRuntimeContext({ contextPath: "project.json", skipBundledContext: true }, [f.workspace], f.bundled);
  assert.equal(files.length, 1);
  assert.equal(files[0].origin, "explicit");
  assert.deepEqual(mergeRuntimeContexts(files.map(file => file.context)).functions, [{ name: "selected" }]);
});

test("all overloads from an overriding layer replace older overloads without losing unrelated names", () => {
  const merged = mergeRuntimeContexts([
    { functions: [{ name: "overloaded", signature: "old" }, { name: "other" }], namespaces: [{ name: "Log", functions: [{ name: "old" }] }] },
    { functions: [{ name: "overloaded", signature: "one" }, { name: "overloaded", signature: "two" }], namespaces: [{ name: "Log", functions: [{ name: "new" }] }] },
  ]);
  assert.deepEqual(merged.functions, [{ name: "other" }, { name: "overloaded", signature: "one" }, { name: "overloaded", signature: "two" }]);
  assert.deepEqual(merged.namespaces, [{ name: "Log", functions: [{ name: "new" }] }]);
});

test("missing default files are allowed but missing explicit files and invalid JSON fail clearly", t => {
  const f = fixture(t);
  assert.deepEqual(loadRuntimeContext({}, [f.workspace], f.bundled), []);
  assert.throws(() => loadRuntimeContext({ contextPath: "missing.json" }, [f.workspace], f.bundled), /Cannot load JEXL runtime context.*missing.json/);
  writeFileSync(join(f.workspace, "jexl-context.json"), "{");
  assert.throws(() => loadRuntimeContext({}, [f.workspace], f.bundled), /Cannot load JEXL runtime context/);
  f.write(f.workspace, "jexl-context.json", { variables: {} });
  assert.throws(() => loadRuntimeContext({}, [f.workspace], f.bundled), /variables must be an array/);
  f.write(f.workspace, "jexl-context.json", []);
  assert.throws(() => loadRuntimeContext({}, [f.workspace], f.bundled), /must contain a JEXL context object/);
});

test("invalid configuration does not silently enable a runtime or fall back to unrelated files", t => {
  const f = fixture(t);
  assert.throws(() => loadRuntimeContext({ skipBundledContext: "false" } as never, [], f.bundled), /must be a boolean/);
  assert.throws(() => loadRuntimeContext({ contextPath: "" }, [], f.bundled), /non-empty file path/);
  assert.throws(() => loadRuntimeContext({ typesPath: 42 } as never, [], f.bundled), /non-empty file path/);
});
