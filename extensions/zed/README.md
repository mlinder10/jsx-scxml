# JSX SCXML JEXL for Zed

An **additional**, opt-in language server (`jsx-scxml-jexl`) for Zed's existing
**TSX**, **TypeScript**, and **JavaScript** languages. It runs the shared server
in [`../language-server`](../language-server); it does not bundle or download an
npm package. The server package is unpublished.

## Prepare the shared server

Install **Node.js 22+**, then run these commands from `jsx-scxml/extensions/language-server`:

```sh
npm ci
npm run import:runtime -- --vsix ../../sf-jexl-0.0.6.vsix
npm run build -- --jexl-source ../../../lib-langium-jexl
npm test
```

This uses the sibling `lib-langium-jexl` checkout without modifying it or
installing its browser editor dependencies. See the [server README](../language-server/README.md)
for alternative builds and supported features. The required output is:

```text
extensions/language-server/out/src/server.js
extensions/language-server/node_modules/...
```

Do not copy just `server.js` into this extension: its runtime dependencies must
remain resolvable from the shared server directory. This extension does not
install dependencies or compile the server for you. Rebuild the shared server
after changing its source or the JEXL engine.

## Install the dev extension

This crate uses `zed_extension_api` **0.7.0**. Install Rust (preferably through
rustup) with the `wasm32-wasip2` target supported by your Zed version. In Zed, run
**`zed: install dev extension`** and select this `extensions/zed` directory
(the one containing `extension.toml`). Zed builds the Rust launcher to WebAssembly.
A native `cargo check` alone does not validate installation in Zed.

## Configure Zed

Add the following to Zed settings (or project `.zed/settings.json`). Replace the
example absolute path with the actual built server path on your machine:

```json
{
  "lsp": {
    "jsx-scxml-jexl": {
      "binary": {
        "path": "node",
        "arguments": [
          "/absolute/path/to/jsx-scxml/extensions/language-server/out/src/server.js",
          "--stdio"
        ],
        "env": {}
      },
      "initialization_options": {}
    }
  },
  "languages": {
    "TSX": {
      "language_servers": ["jsx-scxml-jexl", "..."],
      "semantic_tokens": "combined"
    },
    "TypeScript": {
      "language_servers": ["jsx-scxml-jexl", "..."]
    },
    "JavaScript": {
      "language_servers": ["jsx-scxml-jexl", "..."]
    }
  }
}
```

`"..."` preserves the default servers (including normal TypeScript/JavaScript
support); do not replace the list with just `jsx-scxml-jexl`. Enable only the
languages you need. The manifest lists all three in `opt_in_languages`, so on
Zed versions supporting that field the wildcard alone does **not** start this
server. Older Zed versions ignore the field and may start it automatically;
upgrade, or explicitly disable it using `"!jsx-scxml-jexl"` in each language's
`language_servers` list alongside `"..."`.

`node` must be available to Zed's project environment; an absolute path to the
Node executable can be used instead. The server script path must be absolute:
the extension does not assume a particular checkout location or process working
directory. Restart the language servers after changing launch settings.

### Launcher behavior

- `lsp.jsx-scxml-jexl.binary.path` is used verbatim when supplied. Otherwise the
  launcher calls `worktree.which("jsx-scxml-jexl-language-server")`. A missing
  executable produces an error explaining how to configure Node and the shared
  script; there is no hardcoded local checkout path or automatic npm download.
- `binary.arguments` **replaces**, rather than appends to, the default
  `["--stdio"]`. An explicitly empty array stays empty. No shell parsing,
  interpolation, or automatic script/flag insertion is performed. With `node`,
  supply both the absolute script path and `--stdio` yourself.
- The worktree shell environment is inherited. Entries in `binary.env` override
  matching inherited entries, including `PATH`; empty string values are
  preserved. Arguments and environment overrides work even without a path
  override. Default executable discovery still uses the worktree PATH, not the
  overridden child-process PATH.
- `initialization_options` is forwarded unchanged through the API's
  `language_server_initialization_options` hook. Omit it to send no custom
  options; consult the shared server for supported option names.

## Highlighting and limitations

The shared server's semantic tokens provide the **JEXL highlighting fallback**.
`"semantic_tokens": "combined"` on TSX combines those tokens with Zed's normal
Tree-sitter highlighting. You can also enable this setting for TypeScript and
JavaScript when needed. Highlighting requires a running server that advertises
and implements semantic tokens, plus a Zed version supporting that setting.

This extension provides **no native JEXL Tree-sitter grammar or injection
queries** and **does not replace Zed's built-in TSX language**. Normal TSX parsing,
indentation, and highlighting remain Zed's responsibility. Semantic tokens are
an LSP-based fallback, not native parsing of embedded JEXL; installing the Rust
launcher alone cannot provide them if the shared server is unavailable.

## Member completion

The server detects Zed (including Preview, Nightly, and Dev) and adapts member
completion filtering to its TSX string scope. For example, `OperationStatus.SU`
uses `OperationStatus.SUCCESS` as the search candidate, but replaces only `SU`
with `SUCCESS`. Other LSP clients keep ordinary member-only filtering.

Callable suggestions insert plain calls such as `substring()` rather than
snippets: Zed's TSX string scope otherwise substitutes the display signature
for method snippet text. Argument tabstop navigation is therefore unavailable
for these Zed suggestions.

String-member completion requires a known string type. A literal initializer
such as `let date = '20260101';` works. For an untyped parameter, use the engine's
existing JEXL doc-comment hints:

```js
/** @param {java.lang.String} date */
function formatDate(date) {
  return date.substring(4);
}
```

The engine does not currently infer the parameter's type from `date += ''`.
Place the type comment inside the `jexl` template, immediately before the JEXL
function—not on the surrounding TypeScript declaration.

## Validation and troubleshooting

From this directory:

```sh
cargo fmt --check
cargo check
cargo test
```

The unit tests cover PATH discovery, exact argument handling (including an empty
array), environment precedence, and the missing-server error. These native
checks do not run the Node server or test Zed integration. For a manual smoke
test, install the dev extension, configure the absolute script path, open a TSX
file with embedded JEXL, and verify that both the normal TypeScript server and
`jsx-scxml-jexl` run. Check diagnostics/completions and semantic highlighting;
use **`zed: open log`** for build or server startup failures.

## Runtime symbols

After importing and building the runtime metadata, the server automatically
loads the bundled Swampfox definitions—no additional Zed settings are needed.
Try completion after `OperationStatus.` or `getOperationResult().`, or type
`Log:` to see logging methods. The imported artifact includes 235 function
overloads, 59 variables/constants, 60 namespaces, and 1,594 Java types.

Workspace-root `jexl-context.json` and `jexl-types.json` add project symbols and
override bundled symbols by name. For explicit locations, set:

```json
{
  "lsp": {
    "jsx-scxml-jexl": {
      "initialization_options": {
        "contextPath": "/path/to/jexl-context.json",
        "typesPath": "/path/to/jexl-types.json"
      }
    }
  }
}
```

These are the existing `lib-langium-jexl` JSON schemas. Restart the server after
changing them or rebuilding the imported runtime. No Rust extension reinstall
is needed for metadata/server updates. Set `"skipBundledContext": true` in
`initialization_options` to disable the bundled base.

The current generated artifact does **not** include application-script globals
such as `SFVContext`, `SFVLogger`, or `SFVConstants`; those still require project
metadata. SCXML `dataModel` variables are not inferred automatically yet.
See the [server documentation](../language-server/README.md#runtime-context-and-types)
for a complete example and first-version limitations.

API references used by this extension:

- [Zed language servers, opt-in registration, and semantic tokens](https://zed.dev/docs/extensions/languages)
- [Developing Zed extensions](https://zed.dev/docs/extensions/developing-extensions)
- [API 0.7.0 `LspSettings`](https://docs.rs/zed_extension_api/0.7.0/zed_extension_api/settings/struct.LspSettings.html)
- [API 0.7.0 `CommandSettings`](https://docs.rs/zed_extension_api/0.7.0/zed_extension_api/settings/struct.CommandSettings.html)
- [API 0.7.0 `Extension` hooks](https://docs.rs/zed_extension_api/0.7.0/zed_extension_api/trait.Extension.html)
