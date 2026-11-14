import { loadConfigFile } from "./shared.mts";

export async function loadProject(configPath: string) {
  await loadConfigFile(configPath);
  // Database loading has not been implemented yet.
  throw new Error("Loading projects from PostgreSQL is not implemented yet.");
}
