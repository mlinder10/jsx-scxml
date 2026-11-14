import { readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { z } from "zod";

export type ConfigFile = z.infer<typeof ConfigFileSchema>;

export const ConfigFileSchema = z.object({
  origin: z.object({
    postgresUrl: z.string(),
  }),
  paths: z.object({
    snapshots: z.string(),
    scripts: z.string(),
    modules: z.string(),
    routing: z.string(),
    announcements: z.string(),
    dev: z.string(),
  }),
});

export async function loadConfigFile(pathArgument: string) {
  const configFilePath = resolve(process.cwd(), pathArgument);
  const projectRoot = dirname(configFilePath);
  const json = JSON.parse((await readFile(configFilePath)).toString("utf8"));
  const parsed = ConfigFileSchema.safeParse(json);
  if (!parsed.success)
    throw new Error("Invalid config file provided", parsed.error);
  return { projectRoot, config: parsed.data };
}

export function buildLocalProjectPaths(
  projectRoot: string,
  config: ConfigFile,
): ConfigFile["paths"] {
  return Object.entries(config.paths).reduce(
    (prev, [key, value]) => ({
      ...prev,
      [key]: join(projectRoot, value),
    }),
    {},
  ) as ConfigFile["paths"];
}
