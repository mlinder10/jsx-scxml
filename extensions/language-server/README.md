# Embedded JEXL language server

Editor-independent JEXL support for `jexl` tagged templates in TSX, TypeScript,
and JavaScript. The first client lives in [`../zed`](../zed). Ordinary TypeScript
language services continue to handle the surrounding file.

## Build from this checkout

Requires **Node.js 22+**. Run these commands from `jsx-scxml/extensions/language-server`:

```sh
npm ci
npm run typecheck
npm run import:runtime -- --vsix ../../sf-jexl-0.0.6.vsix
npm run build -- --jexl-source ../../../lib-langium-jexl
npm test
```

The build generates the sibling project's Langium grammar into this package's
ignored `.generated/` directory, then bundles its language services into
`out/src/server.js`. It **does not modify `lib-langium-jexl`**, and does not install
its Monaco or VS Code dependencies. Keep this server's `node_modules` beside
`out/`: Node dependencies remain external to the bundle.

`--jexl-source` is resolved relative to the working directory. The supplied
checkout must have the current JEXL services and grammar. Alternatively, install
`sf-jexl` from your private registry (including its built `sf-jexl/language`
export), then run `npm run build` without the source option. The peer dependency
is optional so ordinary development does not require private-registry access.

The generator-only `jsonschema` override pins 1.4.1: 1.5.0 failed to resolve
Langium 4.2's local schema references during generation on Node 26. No installed
package files are patched.

Launch with:

```sh
node out/src/server.js --stdio
```

This is a protocol process, not an interactive CLI. See the Zed README for how
to have the editor launch it. The package is private/unpublished for now; no
extension tries to download it automatically.

## Features

- One internal JEXL script document per template, using the existing Langium
  completion, hover, signature-help, and validation providers.
- Completion edits and diagnostics mapped back to host UTF-16 positions.
- Best-effort **lexical** highlighting transported as full LSP semantic tokens;
  no native Tree-sitter grammar is required. Tokens cover only embedded JEXL.
- `jexl` tags and named import aliases from `jsx-scxml`, `jsx-scxml/std`, and the
  legacy `jsx-scxml/jexl` module name.
- Unfinished non-interpolated templates, CRLF mapping, independent template
  scopes, and virtual-document cleanup when templates change or close.
- Raw template semantics, matching the current `src/std/jexl.ts` implementation:
  preserve backslashes; normalize literal CRLF/CR to LF as JavaScript does.

No TypeScript/TSX diagnostics or results are emitted outside the templates. An
additional editor language server must provide ordinary TypeScript support.

## Runtime context and types

### Bundled Swampfox runtime

The server now loads generated Swampfox runtime metadata from `out/runtime/`
automatically. This checkout's imported `sf-jexl-0.0.6.vsix` provides **235
function overloads, 59 variables/constants, 60 namespaces, and 1,594 types**.
For example, completion and documentation work for `getOperationResult()`,
`getActiveFlow()`, `OperationStatus.SUCCESS`, and `Log:info(...)`, including
members of the generated Java return types.

The definitions come from the existing DRMServer-generated artifact, not a
hand-maintained approximation. Import a VSIX as shown in the build instructions,
or import a newer generator output directory:

```sh
npm run import:runtime -- --directory /path/to/generated-metadata
npm run build -- --jexl-source ../../../lib-langium-jexl
```

Imports are validated before replacement. `runtime/source.json` records the
source artifact and SHA-256 hashes; the imported data is Git-ignored, so we do
not check in a second copy of the generated metadata. VSIX import requires both
`jexl-context.json` and `jexl-types.json`; directory import permits context-only
data. No archive code is executed, and no network requests are made.

Build asset selection is: `--runtime-dir <directory>` → imported `runtime/` →
`--jexl-source` root → that checkout's `public/`. Context and types are always
copied from the same selected directory, never mixed across datasets. An absent
context produces a warning and a generic server build; an invalid asset fails
the build. A context-only build has no separate Java type definitions.

**The current artifact does not define application-script globals such as
`SFVContext`, `SFVLogger`, or `SFVConstants`.** Supply those through project
context metadata if your application creates them. They are not invented from
method names appearing in flow scripts.

### Project-specific overrides

The bundled context and types are loaded first. The server then overlays
workspace-root `jexl-context.json` and `jexl-types.json` (first matching file of
each name wins), or files selected with explicit initialization options:

```json
{
  "contextPath": "/path/to/jexl-context.json",
  "typesPath": "/path/to/jexl-types.json"
}
```

Relative explicit paths resolve against the first workspace root. Later layers
replace symbols by name, including the entire overload group or namespace;
types are replaced by type name. Unrelated bundled symbols remain available.
Set `"skipBundledContext": true` in initialization options to use project context
only. For example, a project context can add:

```json
{
  "functions": [],
  "namespaces": [],
  "variables": [
    {
      "name": "session",
      "type": "example.Session",
      "documentation": "Current session."
    }
  ],
  "types": {
    "example.Session": {
      "properties": [
        {
          "name": "memberId",
          "type": "java.lang.String",
          "documentation": "Current member ID."
        }
      ],
      "methods": [
        { "name": "isActive", "parameters": [], "returnType": "boolean" }
      ]
    }
  }
}
```

Inside `jexl` followed by a template containing `session.`, completion should
include `memberId` and `isActive()`. Hovering `session.memberId` should show its
documentation. `jexl-types.json` uses `{ "types": { ... } }` and is merged after
the context file.

Files are loaded **once at initialization**, eagerly, without HTTP calls.
Restart the language server after changing them. Missing explicitly configured
files and malformed JSON fail initialization with an error; missing default
files are allowed. The server logs the source path and symbol counts for each
loaded layer. A server instance currently shares one base context across its
workspace folders.

## Deliberate first-version limits

- All templates use the full JEXL script grammar, including condition positions.
- SCXML `dataModel` keys are not yet collected automatically. Declare shared
  runtime variables in the context file; TypeScript locals are not JEXL variables.
- JavaScript `${...}` interpolation is excluded, matching the runtime's ban on
  substitutions. Escaped sequences are preserved as raw JEXL text.
- Tag detection is syntactic, not full TypeScript symbol/shadowing resolution;
  namespace imports and property-access tags are not recognized.
- Completion suggestions that would break the enclosing raw template are
  filtered. Snippets containing escapes, variables, or complex placeholders
  are conservatively omitted; ordinary callable tabstops are supported for
  generic clients. Zed receives plain callable insertions to avoid its TSX
  string-scope snippet-label substitution.
- No formatting, rename, definition/reference navigation, code actions, lazy
  HTTP type resolution, or context-file watching is advertised yet.
- Highlighting requires editor semantic-token support/settings. It is lexical,
  not type-based, and does not replace native TSX parsing or indentation.

## Architecture and tests

`src/templates.ts` extracts and maps raw templates with the TypeScript AST.
`src/embedded.ts` owns the Langium virtual documents and maps provider results.
`src/completion-adapter.ts` handles Zed's host-string filtering and callable
insertion behavior, selected by `initialize.clientInfo.name`.
`src/highlighting.ts` tokenizes only embedded text. `src/server.ts` exposes the
stdio LSP, serializes workspace operations, and suppresses stale diagnostics.

Tests cover extraction/raw escapes, CRLF/UTF-16 mapping, highlighting, actual
Langium completion/hover/signature help and diagnostics, edit safety, isolated
scopes, cleanup, and a spawned stdio JSON-RPC server's full lifecycle. Rebuild
before running tests: tests run the generated output rather than TS sources.
