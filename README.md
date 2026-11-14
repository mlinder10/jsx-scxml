# jsx-scxml

A small TypeScript JSX runtime for authoring portable, validated SCXML documents.

## Install and configure

```sh
npm install jsx-scxml
```

Configure TypeScript for the automatic JSX runtime:

```json
{
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "jsx-scxml"
  }
}
```

## Example

```tsx
import { expr, serialize, validate } from "jsx-scxml";

const machine = (
  <scxml initial="idle" version="1.0">
    <state id="idle">
      <transition event="START" target="running" />
    </state>
    <state id="running">
      <onentry>
        <log label="Lifecycle" expr={expr`'Started'`} />
      </onentry>
      <transition event="STOP" target="idle" />
    </state>
  </scxml>
);

const result = validate(machine);
if (!result.valid)
  throw new Error(result.diagnostics.map((item) => item.message).join("\n"));

const xml = serialize(machine, { xmlDeclaration: true });
```

`expr` marks SCXML data-model source explicitly, keeping it distinct from JavaScript values. Plain strings are also accepted when expression source is already available.

## Command-line tools

Use the single `jsx-scxml` command with exactly one operation:

```sh
npx jsx-scxml --init my-project
npx jsx-scxml --compile-flows --config ./icx.config.json
npx jsx-scxml --sync-flows --config ./icx.config.json
npx jsx-scxml --help
```

`--compile-flows` converts the configured `dev` directory's TS/TSX flows to
SCXML in `snapshots`. `--sync-flows` converts SCXML snapshots back to TSX in
`dev`. Both preserve nested directory structure and overwrite matching output
files, so commit or back up hand-edited flows before syncing.

`--config` (or `-c`) defaults to `./icx.config.json`. Configured paths are relative
to the config file. `--load-project` is reserved for PostgreSQL loading and
currently reports that it is not implemented.

When working in this repository, use `npm run cli -- --help` or, for example,
`npm run cli -- --compile-flows --config ./example/icx.config.json`.
The command runs the TypeScript tool sources directly and requires a Node.js
version with native TypeScript support (Node.js 22.18+ or 24+).

This replaces the separate `jsx-scxml-init` and `jsx-scxml-compile-flows`
executables; update existing scripts to use the options above. Newly initialized
projects include scripts using the unified command.

## Public API

- `jsx`, `jsxs`, `Fragment`: automatic JSX runtime exports
- `expr` and `expression`: SCXML expression constructors
- `serialize(node, options)`: deterministic SCXML XML output
- `validate(node)`: structural validation and target-reference diagnostics
- TypeScript typings for the core SCXML intrinsic elements and attributes

This package only authors and validates documents. It deliberately does not include an SCXML interpreter, so generated XML remains portable across compatible runtimes.
