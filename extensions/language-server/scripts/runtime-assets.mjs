import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";

const contextName = "jexl-context.json";
const typesName = "jexl-types.json";
const assetNames = [contextName, typesName];
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
const object = (value) => value !== null && typeof value === "object" && !Array.isArray(value);

function requireShape(condition, location, expected) {
  if (!condition) throw new Error(`Invalid runtime JSON: ${location} must be ${expected}`);
}

function fields(value, location, requiredName = false) {
  requireShape(object(value), location, "an object");
  if (requiredName) requireShape(typeof value.name === "string", `${location}.name`, "a string");
  for (const key of ["name", "type", "documentation", "description", "signature", "returnType", "sourceClass", "deprecationNote", "deprecatedSince"]) {
    if (key in value) requireShape(typeof value[key] === "string", `${location}.${key}`, "a string");
  }
  for (const key of ["deprecated", "deprecatedForRemoval"]) {
    if (key in value) requireShape(typeof value[key] === "boolean", `${location}.${key}`, "a boolean");
  }
}

function array(value, key, location, validate, required = false) {
  if (!(key in value) && !required) return;
  requireShape(Array.isArray(value[key]), `${location}.${key}`, "an array");
  value[key].forEach((entry, index) => validate(entry, `${location}.${key}[${index}]`));
}

function named(value, location) {
  fields(value, location, true);
}

function callable(value, location) {
  named(value, location);
  array(value, "parameters", location, (parameter, at) => {
    named(parameter, at);
    requireShape(typeof parameter.type === "string", `${at}.type`, "a string");
  });
}

function validateAsset(bytes, name) {
  let value;
  try {
    value = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  } catch (error) {
    throw new Error(`Invalid runtime JSON in ${name}: ${error.message}`);
  }
  requireShape(object(value), name, "an object");
  if (name === contextName) {
    array(value, "functions", name, callable, true);
    array(value, "variables", name, (entry, at) => {
      named(entry, at);
      array(entry, "properties", at, named);
    }, true);
    array(value, "namespaces", name, (entry, at) => {
      named(entry, at);
      array(entry, "functions", at, callable, true);
    }, true);
    array(value, "annotations", name, callable);
  }
  if (name === typesName || "types" in value) {
    requireShape(object(value.types), `${name}.types`, "an object");
    for (const [key, definition] of Object.entries(value.types)) {
      const at = `${name}.types[${JSON.stringify(key)}]`;
      fields(definition, at);
      array(definition, "properties", at, named);
      array(definition, "methods", at, callable);
      array(definition, "supertypes", at, (entry, location) => requireShape(typeof entry === "string", location, "a string"));
    }
  }
}

function readDataset(directory) {
  const assets = {};
  if (!existsSync(join(directory, contextName))) return assets;
  for (const name of assetNames) {
    const path = join(directory, name);
    if (existsSync(path)) assets[name] = readFileSync(path);
  }
  return assets;
}

function validateDataset(assets) {
  for (const [name, bytes] of Object.entries(assets)) validateAsset(bytes, name);
}

function writeDataset(directory, assets) {
  mkdirSync(directory, { recursive: true });
  for (const name of assetNames) {
    if (assets[name]) writeFileSync(join(directory, name), assets[name]);
    else rmSync(join(directory, name), { force: true });
  }
}

/** Paths resolve against cwd. An explicit runtime directory never falls back. */
export function bundleRuntimeAssets({ runtimeDirectory, jexlSource, outDirectory = "out" } = {}) {
  let selected = runtimeDirectory === undefined ? undefined : resolve(runtimeDirectory);
  if (selected === undefined && existsSync(resolve("runtime"))) selected = resolve("runtime");
  if (selected === undefined && jexlSource) {
    selected = [resolve(jexlSource), resolve(jexlSource, "public")]
      .find((directory) => existsSync(join(directory, contextName)));
  }
  const assets = selected === undefined ? {} : readDataset(selected);
  validateDataset(assets);
  const destination = resolve(outDirectory, "runtime");
  // A source equal to the destination is harmless; bytes were read before writes.
  writeDataset(destination, assets);
  if (!assets[contextName]) console.warn("No JEXL runtime context found; packaging the generic engine without runtime assets.");
  return { sourceDirectory: selected, outDirectory: destination, files: Object.keys(assets) };
}

/** Imports a complete VSIX pair or a generator context with optional types. */
export async function importRuntimeAssets({ vsix, directory, runtimeDirectory = "runtime" } = {}) {
  if ((vsix === undefined) === (directory === undefined)) {
    throw new Error("Specify exactly one of --vsix <file> or --directory <dir>");
  }
  let assets;
  let source;
  if (vsix !== undefined) {
    const artifact = readFileSync(resolve(vsix));
    const { unzipSync } = await import("fflate");
    const entries = unzipSync(artifact, {
      filter: ({ name }) => name === `extension/${contextName}` || name === `extension/${typesName}`,
    });
    assets = {};
    // Never use archive paths as filesystem destinations.
    for (const name of assetNames) {
      const entry = entries[`extension/${name}`];
      if (!entry) throw new Error(`VSIX is missing extension/${name}`);
      assets[name] = entry;
    }
    source = { kind: "vsix", artifact: basename(resolve(vsix)), sha256: sha256(artifact) };
  } else {
    assets = readDataset(resolve(directory));
    if (!assets[contextName]) throw new Error(`Generator directory is missing ${contextName}`);
    source = { kind: "directory", artifact: basename(resolve(directory)) };
  }
  validateDataset(assets);
  const manifest = {
    version: 1,
    source,
    files: Object.fromEntries(Object.entries(assets).map(([name, bytes]) => [name, { sha256: sha256(bytes), size: bytes.length }])),
  };
  const destination = resolve(runtimeDirectory);
  writeDataset(destination, assets);
  writeFileSync(join(destination, "source.json"), `${JSON.stringify(manifest, null, 2)}\n`);
  return manifest;
}
