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
if (!result.valid) throw new Error(result.diagnostics.map((item) => item.message).join("\n"));

const xml = serialize(machine, { xmlDeclaration: true });
```

`expr` marks SCXML data-model source explicitly, keeping it distinct from JavaScript values. Plain strings are also accepted when expression source is already available.

## Public API

- `jsx`, `jsxs`, `Fragment`: automatic JSX runtime exports
- `expr` and `expression`: SCXML expression constructors
- `serialize(node, options)`: deterministic SCXML XML output
- `validate(node)`: structural validation and target-reference diagnostics
- TypeScript typings for the core SCXML intrinsic elements and attributes

This package only authors and validates documents. It deliberately does not include an SCXML interpreter, so generated XML remains portable across compatible runtimes.
