import { existsSync, readFileSync } from "node:fs";
import { isAbsolute, join, resolve } from "node:path";

export interface RuntimeContextOptions {
  contextPath?: string;
  typesPath?: string;
  /** Use only project-supplied definitions instead of the bundled Swampfox base. */
  skipBundledContext?: boolean;
}

export interface RuntimeContextFile {
  path: string;
  origin: "bundled" | "workspace" | "explicit";
  context: Record<string, unknown>;
}

/** Load the generated Swampfox base first, then project-specific overrides. */
export function loadRuntimeContext(
  options: RuntimeContextOptions,
  roots: string[],
  bundledDirectory: string,
): RuntimeContextFile[] {
  if (
    options.skipBundledContext !== undefined &&
    typeof options.skipBundledContext !== "boolean"
  ) {
    throw new Error("skipBundledContext must be a boolean");
  }
  for (const key of ["contextPath", "typesPath"] as const) {
    if (
      options[key] !== undefined &&
      (typeof options[key] !== "string" || !options[key].trim())
    ) {
      throw new Error(`${key} must be a non-empty file path string`);
    }
  }
  const files: RuntimeContextFile[] = [];
  const load = (path: string, origin: RuntimeContextFile["origin"]): void => {
    let value: unknown;
    try {
      value = JSON.parse(readFileSync(path, "utf8"));
    } catch (error) {
      throw new Error(
        `Cannot load JEXL runtime context ${path}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      throw new Error(`${path} must contain a JEXL context object`);
    }
    const context = value as Record<string, unknown>;
    for (const key of ["functions", "variables", "namespaces", "annotations"]) {
      if (context[key] !== undefined && !Array.isArray(context[key])) {
        throw new Error(`${path}: ${key} must be an array`);
      }
    }
    if (
      context.types !== undefined &&
      (!context.types ||
        typeof context.types !== "object" ||
        Array.isArray(context.types))
    ) {
      throw new Error(`${path}: types must be an object`);
    }
    files.push({ path, origin, context });
  };

  if (!options.skipBundledContext) {
    for (const name of ["jexl-context.json", "jexl-types.json"]) {
      const path = join(bundledDirectory, name);
      if (existsSync(path)) load(path, "bundled");
    }
  }
  for (const [key, name] of [
    ["contextPath", "jexl-context.json"],
    ["typesPath", "jexl-types.json"],
  ] as const) {
    const explicit = options[key];
    if (explicit) {
      load(
        isAbsolute(explicit)
          ? explicit
          : resolve(roots[0] ?? process.cwd(), explicit),
        "explicit",
      );
    } else {
      const path = roots.map((root) => join(root, name)).find(existsSync);
      if (path) load(path, "workspace");
    }
  }
  return files;
}

/** Later layers replace a named symbol (including all its overloads), not append
 * duplicates: the engine's append-only merge otherwise keeps the old lookup. */
export function mergeRuntimeContexts(
  contexts: Record<string, unknown>[],
): Record<string, unknown> {
  const merged: Record<string, unknown> = {};
  for (const context of contexts) {
    for (const key of ["functions", "variables", "namespaces", "annotations"]) {
      const incoming = context[key] as { name: string }[] | undefined;
      if (!incoming) continue;
      const names = new Set(incoming.map((entry) => entry.name));
      const existing = (merged[key] ?? []) as { name: string }[];
      merged[key] = [
        ...existing.filter((entry) => !names.has(entry.name)),
        ...incoming,
      ];
    }
    merged.types = {
      ...((merged.types as object) ?? {}),
      ...((context.types as object) ?? {}),
    };
  }
  return merged;
}

export function describeRuntimeContext(file: RuntimeContextFile): string {
  const { context } = file;
  const count = (key: string) =>
    Array.isArray(context[key]) ? context[key].length : 0;
  return `Loaded ${file.origin} JEXL context: ${file.path} (${count("functions")} functions, ${count("variables")} variables, ${count("namespaces")} namespaces, ${Object.keys((context.types ?? {}) as object).length} types)`;
}
