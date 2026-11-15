import assert from "node:assert/strict";
import { test } from "node:test";
import { runInNewContext } from "node:vm";
import { extractTemplates, isSafeTemplateText } from "../src/templates.js";

function one(raw: string, closed = true) {
  const text = "const value = jexl`" + raw + (closed ? "`;" : "");
  const templates = extractTemplates(text);
  assert.equal(templates.length, 1, JSON.stringify(raw));
  return { template: templates[0], text };
}

function assertIdentityMapping(raw: string, closed = true) {
  const { template } = one(raw, closed);
  assert.equal(template.source, raw);
  for (let offset = 0; offset <= raw.length; offset++) {
    assert.equal(template.toHost(offset), template.start + offset);
    assert.equal(template.toVirtual(template.start + offset), offset);
  }
}

test("extracts plain tags in TSX, in source order, with exclusive content ranges", () => {
  const text =
    "const node = <State guard={jexl`count > 0`} other={jexl``} />;\nconst x = jexl`true`;";
  const templates = extractTemplates(text, "flow.tsx");
  assert.deepEqual(
    templates.map((t) => t.source),
    ["count > 0", "", "true"],
  );
  for (const template of templates) {
    assert.equal(text[template.start - 1], "`");
    assert.equal(text[template.end], "`");
    assert.equal(text.slice(template.start, template.end), template.source);
    for (let offset = 0; offset <= template.source.length; offset++) {
      assert.equal(template.toHost(offset), template.start + offset);
      assert.equal(template.toVirtual(template.start + offset), offset);
    }
  }
});

test("ignores comments, normal strings, untagged templates, other tags and interpolation", () => {
  const text = [
    "// jexl`comment`",
    "/* jexl`comment` */",
    'const a = "jexl`string`";',
    "const b = 'jexl`string`';",
    "const c = `jexl\\`text\\``;",
    "other`wrong`; obj.jexl`wrong`; jexl`a${value}b`; jexl`${value}`;",
    "jexl`accepted`;",
  ].join("\n");
  assert.deepEqual(
    extractTemplates(text).map((t) => t.source),
    ["accepted"],
  );
  // An even number of backslashes does not escape interpolation.
  assert.deepEqual(extractTemplates("jexl`\\\\${value}`"), []);
});

test("accepts named import aliases, but not unrelated or type-only imports", () => {
  const text = [
    'import { jexl as root } from "jsx-scxml";',
    'import { jexl as std } from "jsx-scxml/std";',
    'import { jexl as expression } from "jsx-scxml/jexl";',
    'import { jexl as unrelated } from "other";',
    'import type { jexl as typeOnly } from "jsx-scxml/std";',
    'import { type jexl as inlineType } from "jsx-scxml/std";',
    'import defaultTag from "jsx-scxml/std";',
    'import * as ns from "jsx-scxml/std";',
    "root`root`; std`std`; expression`expression`; jexl`plain`;",
    "unrelated`no`; typeOnly`no`; inlineType`no`; defaultTag`no`; ns.jexl`no`;",
  ].join("\n");
  assert.deepEqual(
    extractTemplates(text).map((t) => t.source),
    ["root", "std", "expression", "plain"],
  );
});

test("accepts unfinished templates, including trailing backslashes and invalid escapes", () => {
  for (const raw of [
    "",
    "a > 1",
    "escaped\\`",
    "trailing\\",
    "\\u{",
    "\\xGG",
    "\\${value}",
  ]) {
    const { template, text } = one(raw, false);
    assert.equal(template.end, text.length);
    assert.equal(template.source, raw);
    assert.equal(template.toHost(template.source.length), text.length);
    assertIdentityMapping(raw, false);
  }
  const { template, text } = one("line\r\nnext\\", false);
  assert.equal(template.source, "line\nnext\\");
  assert.equal(template.end, text.length);
  assert.equal(template.toHost(template.source.length), text.length);
  assert.deepEqual(extractTemplates("jexl`a${value"), []);
});

test("matches JavaScript strings.raw[0], preserving every backslash sequence", () => {
  for (const raw of [
    String.raw`a\nb\rc\td\be\ff\vg\0`,
    String.raw`\\ \` \${value} \' \" \q \$ \{`,
    String.raw`\x41\u0042\u{43}\u{1F600}\uD83D\uDE00`,
    "literal 😀 and \\u{1f600}",
    "a\r\nb\rc\nd\u2028e\u2029f",
    "a\\\nb\\\r\nc\\\rd\\\u2028e\\\u2029f",
  ]) {
    const expected: unknown = runInNewContext("(s => s.raw[0])`" + raw + "`");
    assert.equal(one(raw).template.source, expected, JSON.stringify(raw));
    if (!raw.includes("\r")) assertIdentityMapping(raw);
  }
});

test("preserves malformed, out-of-range, octal and non-octal decimal escapes", () => {
  for (const raw of [
    String.raw`\x`,
    String.raw`\x1`,
    String.raw`\xGG`,
    String.raw`\u`,
    String.raw`\u123`,
    String.raw`\u12Q4`,
    String.raw`\u{}`,
    String.raw`\u{123`,
    String.raw`\u{-1}`,
    String.raw`\u{110000}`,
    String.raw`\1`,
    String.raw`\07`,
    String.raw`\08`,
    String.raw`\8`,
    String.raw`\9`,
  ]) {
    assert.equal(runInNewContext("(s => s.raw[0])`" + raw + "`"), raw);
    assertIdentityMapping(raw);
    assertIdentityMapping(raw, false);
  }
  assert.deepEqual(
    extractTemplates("jexl`\\xGG`; jexl`valid`;").map((t) => t.source),
    [String.raw`\xGG`, "valid"],
  );
});

test("only normalizes literal CRLF/CR and preserves backslash-newline continuations", () => {
  const { template: t } = one("A\r\nB\rC\\\r\nD\\\n");
  assert.equal(t.source, "A\nB\nC\\\nD\\\n");
  assert.deepEqual(
    Array.from(
      { length: t.source.length + 1 },
      (_, i) => t.toHost(i) - t.start,
    ),
    [0, 1, 3, 4, 5, 6, 7, 9, 10, 11, 12],
  );
  assert.deepEqual(
    Array.from({ length: t.end - t.start + 1 }, (_, i) =>
      t.toVirtual(t.start + i),
    ),
    [0, 1, 1, 2, 3, 4, 5, 6, 6, 7, 8, 9, 10],
  );
  for (let virtual = 0; virtual <= t.source.length; virtual++) {
    assert.equal(t.toVirtual(t.toHost(virtual)), virtual);
  }
  assertIdentityMapping("\\\n\\\u2028\\\u2029");
});

test("uses UTF-16 offsets, clamps ranges, and handles empty templates", () => {
  const text = "// 😀\r\nconst x = jexl`😀\\nZ`;";
  const t = extractTemplates(text)[0];
  assert.equal(t.start, text.indexOf("`") + 1);
  assert.equal(t.source, "😀\\nZ");
  assertIdentityMapping(t.source);
  assert.equal(t.toHost(-1), t.start);
  assert.equal(t.toHost(Infinity), t.end);
  assert.equal(t.toHost(NaN), t.start);
  assert.equal(t.toVirtual(-Infinity), 0);
  assert.equal(t.toVirtual(Infinity), t.source.length);
  assert.equal(t.toVirtual(NaN), 0);
  assert.equal(t.toHost(1.8), t.start + 1);
  const empty = one("").template;
  assert.equal(empty.start, empty.end);
  assert.equal(empty.toHost(10), empty.start);
  assert.equal(empty.toVirtual(empty.start), 0);
});

test("raw replacement safety rejects backticks and interpolation without escaping", () => {
  for (const text of [
    "",
    "plain",
    "\\",
    String.raw`\n\u{invalid}`,
    "$",
    "{",
    "😀\r\nnext",
  ]) {
    assert.equal(isSafeTemplateText(text), true, text);
  }
  for (const text of [
    "`",
    "${",
    "${value}",
    "before`after",
    "\\`",
    "\\${value}",
  ]) {
    assert.equal(isSafeTemplateText(text), false, text);
  }
  // Content safety alone cannot guarantee host syntax: a trailing backslash
  // consumes the closing delimiter, so the server must validate edit boundaries.
  assert.equal(isSafeTemplateText("trailing\\"), true);
  const { template, text } = one("trailing\\");
  assert.equal(template.end, text.length);
  assert.equal(template.source, "trailing\\`;");
});
