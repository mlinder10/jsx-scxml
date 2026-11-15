import assert from "node:assert/strict";
import { test } from "node:test";
import { TextDocument } from "vscode-languageserver-textdocument";
import { highlightTemplates, tokenTypes } from "../src/highlighting.js";
import { extractTemplates } from "../src/templates.js";

function highlight(text: string, reverse = false) {
  const host = TextDocument.create("file:///flow.tsx", "typescriptreact", 1, text);
  const templates = extractTemplates(text, "flow.tsx");
  const { data } = highlightTemplates(host, reverse ? templates.reverse() : templates);
  assert.equal(data.length % 5, 0);
  let line = 0;
  let character = 0;
  let previousEnd = 0;
  const tokens: { text: string; type: string; line: number; character: number; length: number }[] = [];
  for (let i = 0; i < data.length; i += 5) {
    const [deltaLine, deltaCharacter, length, type, modifiers] = data.slice(i, i + 5);
    for (const value of data.slice(i, i + 5)) assert.ok(Number.isInteger(value) && value >= 0);
    line += deltaLine;
    character = deltaLine === 0 ? character + deltaCharacter : deltaCharacter;
    assert.ok(length > 0);
    assert.equal(modifiers, 0);
    assert.ok(type < tokenTypes.length);
    const start = host.offsetAt({ line, character });
    assert.ok(start >= previousEnd, "tokens must be sorted and nonoverlapping");
    const value = text.slice(start, start + length);
    assert.doesNotMatch(value, /[\r\n]/, "tokens must not include host line breaks");
    assert.deepEqual(host.positionAt(start + length), { line, character: character + length });
    assert.ok(templates.some((template) => start >= template.start && start + length <= template.end));
    tokens.push({ text: value, type: tokenTypes[type], line, character, length });
    previousEnd = start + length;
  }
  return { tokens, data };
}

function raw(source: string) {
  return highlight("const value = jexl`" + source + "`;");
}

function pairs(source: string) {
  return raw(source).tokens.map(({ text, type }) => [text, type]);
}

test("exports a unique standard LSP legend and highlights plain variables", () => {
  const standard = new Set([
    "namespace", "type", "class", "enum", "interface", "struct", "typeParameter",
    "parameter", "variable", "property", "enumMember", "event", "function", "method",
    "macro", "keyword", "modifier", "comment", "string", "number", "regexp", "operator", "decorator",
  ]);
  assert.equal(new Set(tokenTypes).size, tokenTypes.length);
  assert.ok(tokenTypes.every((type) => standard.has(type)));
  assert.deepEqual(pairs("value + $other + _value2"), [
    ["value", "variable"], ["+", "operator"], ["$other", "variable"],
    ["+", "operator"], ["_value2", "variable"],
  ]);
});

test("classifies JEXL keywords, literals, word operators, properties and calls", () => {
  assert.deepEqual(pairs("let x = true and false or null; if (empty x) return ns:run (obj.size, obj?.name, obj.method());"), [
    ["let", "keyword"], ["x", "variable"], ["=", "operator"], ["true", "keyword"],
    ["and", "operator"], ["false", "keyword"], ["or", "operator"], ["null", "keyword"],
    ["if", "keyword"], ["empty", "operator"], ["x", "variable"], ["return", "keyword"],
    ["ns", "variable"], ["run", "function"], ["obj", "variable"], ["size", "property"],
    ["obj", "variable"], ["?.", "operator"], ["name", "property"],
    ["obj", "variable"], ["method", "function"],
  ]);
  assert.deepEqual(pairs("obj. /* comment */ empty + call /* gap */ (x)").filter(([, type]) => type !== "comment"), [
    ["obj", "variable"], ["empty", "property"], ["+", "operator"],
    ["call", "function"], ["x", "variable"],
  ]);
});

test("recognizes numeric forms and longest symbolic operators", () => {
  const numbers = ["0", "42", "3.14", "1e-3", "2E+4", "0xff", "0b101", "077", "42L", "3.2d", "10h"];
  assert.deepEqual(pairs(numbers.join(" ")), numbers.map((value) => [value, "number"]));
  const operators = ["+", "-", "*", "/", "%", "==", "!=", "===", "!==", "<=", ">=", "&&", "||", "<<", ">>", ">>>", ">>>=", "+=", "=~", "!~", "=^", "!$", "??", "?:", "..", "->", "=>", "++", "--"];
  assert.deepEqual(pairs(operators.join(" ")), operators.map((value) => [value, "operator"]));
  assert.deepEqual(pairs("1..3"), [["1", "number"], ["..", "operator"], ["3", "number"]]);
});

test("strings take precedence over comment markers, keywords and escapes", () => {
  const strings = [String.raw`"https://example/#pragma /* true */"`, String.raw`'it\'s // not a comment'`, String.raw`"a\"b\\c\n\u0041"`];
  assert.deepEqual(pairs(strings.join(" + ")), [
    [strings[0], "string"], ["+", "operator"], [strings[1], "string"],
    ["+", "operator"], [strings[2], "string"],
  ]);
});

test("comments take precedence over strings and support slash and hash forms", () => {
  assert.deepEqual(pairs('x // "unterminated /* false\ny /* \' // true */ z\n## hash "string"\n# hash comment\nend'), [
    ["x", "variable"], ['// "unterminated /* false', "comment"],
    ["y", "variable"], ["/* ' // true */", "comment"], ["z", "variable"],
    ['## hash "string"', "comment"], ["# hash comment", "comment"], ["end", "variable"],
  ]);
});

test("recognizes pragma directives without swallowing their values or registers", () => {
  assert.deepEqual(pairs("#pragma jexl.options '+strict'\n#pragma custom.flag true\n#0 + #12\n#pragmaOther ignored"), [
    ["#pragma", "macro"], ["jexl", "variable"], ["options", "property"], ["'+strict'", "string"],
    ["#pragma", "macro"], ["custom", "variable"], ["flag", "property"], ["true", "keyword"],
    ["#0", "variable"], ["+", "operator"], ["#12", "variable"], ["#pragmaOther ignored", "comment"],
  ]);
});

test("maps multiline strings and comments through CRLF and lone CR in UTF-16", () => {
  const text = '// 😀 host\r\nconst x = jexl`"😀a\r\n\r\nb\rc" + name\r\n/* first\r\n😀last */ tail`;';
  const { tokens } = highlight(text);
  assert.deepEqual(tokens.map(({ text, type, line, length }) => [text, type, line, length]), [
    ['"😀a', "string", 1, 4], ["b", "string", 3, 1], ['c"', "string", 4, 2],
    ["+", "operator", 4, 1], ["name", "variable", 4, 4],
    ["/* first", "comment", 5, 8], ["😀last */", "comment", 6, 9], ["tail", "variable", 6, 4],
  ]);
  assert.equal(tokens[0].character, 'const x = jexl`'.length);
  assert.equal(tokens[3].character, 3);
  assert.equal(tokens[7].character, 10);
});

test("handles multiline escapes and unterminated strings, comments and templates", () => {
  assert.deepEqual(pairs('"a\\\r\nb" next'), [
    ['"a\\', "string"], ['b"', "string"], ["next", "variable"],
  ]);
  for (const [source, expected] of [
    ['"unfinished // text', [["\"unfinished // text", "string"]]],
    ["'unfinished\\", [["'unfinished\\", "string"]]],
    ["/* unfinished\nnext", [["/* unfinished", "comment"], ["next", "comment"]]],
    ["value +", [["value", "variable"], ["+", "operator"]]],
  ] as const) {
    const { tokens } = highlight("const x = jexl`" + source);
    assert.deepEqual(tokens.map(({ text, type }) => [text, type]), expected);
  }
});

test("sorts multiple templates, resets lexical state, and ignores surrounding TSX", () => {
  const text = 'const x = <State guard={jexl`value`} text="ignored" other={jexl`call(1)`} />;\r\nconst a = jexl`/* open`; const b = jexl`next`;';
  const { tokens, data } = highlight(text, true);
  assert.deepEqual(tokens.map(({ text, type }) => [text, type]), [
    ["value", "variable"], ["call", "function"], ["1", "number"],
    ["/* open", "comment"], ["next", "variable"],
  ]);
  assert.deepEqual(data, highlight(text).data);
  assert.equal(data[0], 0);
  assert.equal(data[1], text.indexOf("value"));
  assert.equal(data[5], 0);
  assert.equal(data[6], text.indexOf("call") - text.indexOf("value"));
});

test("empty, whitespace-only, untagged and interpolated input emits no tokens", () => {
  for (const text of ["", "const x = 42;", "jexl``; jexl` \r\n `;", "other`x`; jexl`a${x}b`;"]) {
    assert.deepEqual(highlight(text).data, [], text);
  }
});
