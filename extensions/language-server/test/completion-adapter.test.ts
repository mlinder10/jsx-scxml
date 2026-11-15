import assert from "node:assert/strict";
import { test } from "node:test";
import { TextDocument } from "vscode-languageserver-textdocument";
import type { CompletionItem, TextEdit } from "vscode-languageserver/node.js";
import { adaptZedCompletion } from "../src/completion-adapter.js";
import { EmbeddedJexl } from "../src/embedded.js";

function fixture(expression: string, typed: string, newText: string) {
  const before = `const value = <State guard={jexl\`\n${expression}`;
  const host = TextDocument.create(
    "file:///completion-adapter-test.tsx",
    "typescriptreact",
    1,
    `${before}\`} />;`,
  );
  const position = host.positionAt(before.length);
  const edit: TextEdit = {
    range: {
      start: host.positionAt(before.length - typed.length),
      end: position,
    },
    newText,
  };
  return { host, position, edit };
}

const members = [
  {
    expression: "OperationStatus.",
    typed: "",
    query: "OperationStatus.",
    prefix: "OperationStatus.",
    member: "SUCCESS",
  },
  {
    expression: "OperationStatus.SU",
    typed: "SU",
    query: "OperationStatus.SU",
    prefix: "OperationStatus.",
    member: "SUCCESS",
  },
  {
    expression: "date.su",
    typed: "su",
    query: "date.su",
    prefix: "date.",
    member: "substring",
  },
  {
    expression: "getOperationResult().",
    typed: "",
    query: ".",
    prefix: ".",
    member: "SUCCESS",
  },
  {
    expression: "getOperationResult().SU",
    typed: "SU",
    query: ".SU",
    prefix: ".",
    member: "SUCCESS",
  },
  {
    expression: "other-OperationStatus.SU",
    typed: "SU",
    query: "other-OperationStatus.SU",
    prefix: "other-OperationStatus.",
    member: "SUCCESS",
  },
  {
    expression: "操作状態.SU",
    typed: "SU",
    query: "操作状態.SU",
    prefix: "操作状態.",
    member: "SUCCESS",
  },
  {
    expression: "𐐀date.su",
    typed: "su",
    query: "𐐀date.su",
    prefix: "𐐀date.",
    member: "substring",
  },
  {
    expression: "items2_$-date.su",
    typed: "su",
    query: "items2_$-date.su",
    prefix: "items2_$-date.",
    member: "substring",
  },
];

for (const f of members) {
  test(`member filter matches the host search query ${f.query}`, () => {
    const { host, position, edit } = fixture(f.expression, f.typed, f.member);
    const item: CompletionItem = {
      label: f.member,
      filterText: f.member,
      textEdit: edit,
      detail: "Member documentation",
    };
    const original = structuredClone(item);
    const adapted = adaptZedCompletion(item, host, position);
    assert.ok(adapted);
    assert.equal(adapted.filterText, f.prefix + f.member);
    assert.ok(adapted.filterText.startsWith(f.query));
    assert.equal(adapted.label, f.member);
    assert.equal(adapted.detail, item.detail);
    assert.deepEqual(adapted.textEdit, edit);
    assert.equal(host.getText(edit.range), f.typed);
    assert.equal(
      TextDocument.applyEdits(host, [edit]),
      host.getText().slice(0, host.offsetAt(edit.range.start)) +
        f.member +
        host.getText().slice(host.offsetAt(edit.range.end)),
    );
    assert.deepEqual(item, original, "the provider item must not be mutated");
  });
}

for (const f of [
  {
    expression: "sub",
    typed: "sub",
    label: "substring",
    filterText: undefined,
  },
  {
    expression: "Log:de",
    typed: "de",
    label: "debug(message)",
    filterText: "debug",
  },
]) {
  test(`non-dot completion stays unprefixed for ${f.expression}`, () => {
    const { host, position, edit } = fixture(f.expression, f.typed, "debug()");
    const item: CompletionItem = {
      label: f.label,
      filterText: f.filterText,
      textEdit: edit,
    };
    const adapted = adaptZedCompletion(item, host, position);
    assert.ok(adapted);
    assert.equal(adapted.filterText, f.filterText ?? f.label);
    assert.equal(adapted.label, f.label);
    assert.deepEqual(adapted.textEdit, edit);
  });
}

test("member filter falls back to the label when filterText is absent", () => {
  const { host, position, edit } = fixture(
    "OperationStatus.SU",
    "SU",
    "SUCCESS",
  );
  const adapted = adaptZedCompletion(
    { label: "SUCCESS", textEdit: edit },
    host,
    position,
  );
  assert.equal(adapted?.filterText, "OperationStatus.SUCCESS");
  assert.equal(adapted?.label, "SUCCESS");
});

test("insert/replace edits use the insertion start and preserve both ranges", () => {
  const { host, position, edit } = fixture("date.su", "su", "substring");
  const textEdit = {
    newText: edit.newText,
    insert: edit.range,
    replace: {
      start: edit.range.start,
      end: host.positionAt(host.offsetAt(position) + 1),
    },
  };
  const adapted = adaptZedCompletion(
    { label: "substring", textEdit },
    host,
    position,
  );
  assert.equal(adapted?.filterText, "date.substring");
  assert.deepEqual(adapted?.textEdit, textEdit);
});

test("items without explicit edits are omitted", () => {
  const { host, position } = fixture("date.su", "su", "substring");
  assert.equal(
    adaptZedCompletion(
      { label: "substring", insertText: "substring" },
      host,
      position,
    ),
    null,
  );
});

for (const f of [
  { snippet: "substring($1)$0", plain: "substring()" },
  { snippet: "substring($1, $2)$0", plain: "substring(, )" },
  { snippet: "substring($12)$0", plain: "substring()" },
  { snippet: "substring()", plain: "substring()" },
]) {
  for (const withInsertText of [false, true]) {
    test(`callable snippet ${f.snippet} becomes plain (insertText: ${withInsertText})`, () => {
      const { host, position, edit } = fixture("date.su", "su", f.snippet);
      const item: CompletionItem = {
        label: "substring(begin: int): java.lang.String",
        filterText: "substring",
        insertTextFormat: 2,
        textEdit: edit,
        ...(withInsertText ? { insertText: f.snippet } : {}),
      };
      const original = structuredClone(item);
      const adapted = adaptZedCompletion(item, host, position);
      assert.ok(adapted);
      assert.equal(adapted.label, item.label, "keep the clean signature label");
      assert.equal(adapted.filterText, "date.substring");
      assert.equal(adapted.insertTextFormat, 1);
      assert.deepEqual(adapted.textEdit, { ...edit, newText: f.plain });
      assert.equal(adapted.insertText, withInsertText ? f.plain : undefined);
      assert.ok(!adapted.textEdit!.newText.includes("java.lang.String"));
      assert.deepEqual(item, original);
    });
  }
}

for (const snippet of [
  "substring(${1:begin})",
  "substring(${1})",
  "substring(${1|a,b|})",
  "substring(${1/(.*)/$1/})",
  "substring($TM_SELECTED_TEXT)",
  "substring(\\$1)",
  "substring(`value`)",
  "substring($)",
]) {
  test(`unsafe or complex snippet is omitted: ${snippet}`, () => {
    const { host, position, edit } = fixture("date.su", "su", snippet);
    const item: CompletionItem = {
      label: "substring(begin)",
      filterText: "substring",
      insertTextFormat: 2,
      textEdit: edit,
    };
    const original = structuredClone(item);
    assert.equal(adaptZedCompletion(item, host, position), null);
    assert.deepEqual(item, original);
  });
}

test("plain insertion text is not interpreted as snippet syntax", () => {
  const { host, position, edit } = fixture("date.su", "su", "substring('$1')");
  const adapted = adaptZedCompletion(
    { label: "substring", insertTextFormat: 1, textEdit: edit },
    host,
    position,
  );
  assert.deepEqual(adapted?.textEdit, edit);
  assert.equal(adapted?.insertTextFormat, 1);
});

function embeddedFixture(script: string) {
  const host = TextDocument.create(
    "file:///completion-adapter-integration.tsx",
    "typescriptreact",
    1,
    `const value = jexl\`${script}\`;`,
  );
  const cursor = host.getText().lastIndexOf(".su") + 3;
  assert.ok(cursor >= 3);
  return {
    host,
    params: {
      textDocument: { uri: host.uri },
      position: host.positionAt(cursor),
    },
  };
}

test("EmbeddedJexl Zed mode completes a locally inferred string with a member-only plain call", async (t) => {
  const engine = new EmbeddedJexl();
  const { host, params } = embeddedFixture("let date = '2026-11-14'; date.su");
  t.after(() => engine.close(host.uri));
  await engine.update(host);
  const result = await engine.completion(params, true, true);
  const item = result?.items.find(
    (candidate) => candidate.filterText === "date.substring",
  );
  assert.ok(item, "string completion must include date.substring in Zed mode");
  assert.match(item.label, /^substring\(/);
  assert.ok(!item.label.startsWith("date."));
  assert.equal(item.insertTextFormat, 1);
  assert.ok(item.textEdit && "range" in item.textEdit);
  assert.equal(host.getText(item.textEdit.range), "su");
  assert.match(item.textEdit.newText, /^substring\(/);
  assert.doesNotMatch(item.textEdit.newText, /\$|java\.lang\.String|date\./);
  const edited = TextDocument.applyEdits(host, [item.textEdit]);
  assert.ok(edited.includes(`date.${item.textEdit.newText}`));
});

test("EmbeddedJexl Zed mode completes minimal enum context without changing its label or edit", async (t) => {
  const engine = new EmbeddedJexl();
  engine.loadContext({
    variables: [
      {
        name: "OperationStatus",
        properties: [{ name: "SUCCESS", type: "java.lang.String" }],
      },
    ],
  });
  const host = TextDocument.create(
    "file:///completion-adapter-enum.tsx",
    "typescriptreact",
    1,
    "const value = jexl`OperationStatus.SU`;",
  );
  t.after(() => engine.close(host.uri));
  await engine.update(host);
  const position = host.positionAt(host.getText().indexOf(".SU") + 3);
  const result = await engine.completion(
    { textDocument: { uri: host.uri }, position },
    true,
    true,
  );
  const item = result?.items.find((candidate) => candidate.label === "SUCCESS");
  assert.ok(item);
  assert.equal(item.filterText, "OperationStatus.SUCCESS");
  assert.ok(item.textEdit && "range" in item.textEdit);
  assert.equal(host.getText(item.textEdit.range), "SU");
  assert.equal(item.textEdit.newText, "SUCCESS");
  assert.equal(
    TextDocument.applyEdits(host, [item.textEdit]),
    "const value = jexl`OperationStatus.SUCCESS`;",
  );
});

test("EmbeddedJexl Zed mode completes a JSDoc-typed string parameter", async (t) => {
  const engine = new EmbeddedJexl();
  const { host, params } = embeddedFixture(
    "/** @param {java.lang.String} date */\nfunction formatDate(date){ date += ''; return date.su; }",
  );
  t.after(() => engine.close(host.uri));
  await engine.update(host);
  const result = await engine.completion(params, true, true);
  assert.ok(
    result?.items.some((item) => item.filterText === "date.substring"),
    "the explicit JSDoc parameter type must provide substring in Zed mode",
  );
});

test("probe string inference after concatenation assignment to a function parameter", async (t) => {
  const engine = new EmbeddedJexl();
  const { host, params } = embeddedFixture(
    "function formatDate(date){date += '';return date.su;}",
  );
  t.after(() => engine.close(host.uri));
  await engine.update(host);
  const result = await engine.completion(params, true, true);
  assert.ok(
    result,
    "the function body must be an embedded completion location",
  );
  const substring = result.items.some(
    (item) => item.filterText === "date.substring",
  );
  t.diagnostic(
    `function formatDate(date){date += '';return date.su;} infers string members: ${substring}`,
  );
});
