export interface BundleRuntimeOptions {
  /** Authoritative directory, even if empty or missing. Defaults to cwd/runtime when present. */
  runtimeDirectory?: string;
  /** Fallback checkout: root context first, then public/. Never mixes directories. */
  jexlSource?: string;
  /** Build output root; assets go into its runtime/ subdirectory. Defaults to cwd/out. */
  outDirectory?: string;
}

export interface RuntimeManifest {
  version: number;
  source: {
    kind: "vsix" | "directory";
    artifact: string;
    /** Present for VSIX imports; hashes the entire archive. */
    sha256?: string;
  };
  files: Record<string, { sha256: string; size: number }>;
}

export function bundleRuntimeAssets(options?: BundleRuntimeOptions): {
  sourceDirectory: string | undefined;
  outDirectory: string;
  files: string[];
};

/** Exactly one of vsix and directory is required. All paths resolve against cwd. */
export function importRuntimeAssets(options: {
  vsix?: string;
  directory?: string;
  runtimeDirectory?: string;
}): Promise<RuntimeManifest>;
