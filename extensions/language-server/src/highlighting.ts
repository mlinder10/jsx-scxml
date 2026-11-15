import type { SemanticTokens } from "vscode-languageserver";
import type { TextDocument } from "vscode-languageserver-textdocument";
import type { EmbeddedTemplate } from "./templates.js";

export const tokenTypes: string[] = [
  "comment",
  "string",
  "number",
  "keyword",
  "operator",
  "variable",
  "property",
  "function",
  "macro",
];

type TokenType = (typeof tokenTypes)[number];
interface Lexeme {
  start: number;
  end: number;
  text: string;
  type?: TokenType;
}

const keywords = new Set([
  "var",
  "let",
  "const",
  "function",
  "if",
  "else",
  "for",
  "while",
  "do",
  "return",
  "continue",
  "break",
  "throw",
  "try",
  "catch",
  "finally",
  "switch",
  "case",
  "default",
  "new",
  "true",
  "false",
  "null",
  "NaN",
]);
const wordOperators = new Set([
  "or",
  "and",
  "not",
  "eq",
  "ne",
  "lt",
  "gt",
  "le",
  "ge",
  "div",
  "mod",
  "empty",
  "size",
  "instanceof",
]);
const number =
  /(?:0[xX][\da-fA-F]+|0[bB][01]+|\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)[lLhHfFdDbB]?/y;
const identifier = /[a-zA-Z_$][a-zA-Z0-9_$]*/y;
const operator =
  /(?:>>>=|===|!==|<<=|>>=|>>>|\?\.|\.\.|\+\+|--|&&|\|\||[=!][~^$]|<<|>>|\?\?|\?:|->|=>|[+\-*/%&|^=!<>]=?|[?~])/y;

/** Tolerant raw-source lexer, deliberately independent of TSX and JEXL parsing. */
function lex(source: string): Lexeme[] {
  const tokens: Lexeme[] = [];
  let cursor = 0;
  while (cursor < source.length) {
    if (/\s/.test(source[cursor])) {
      cursor++;
      continue;
    }
    const start = cursor;
    let type: TokenType | undefined;
    const rest = source.slice(cursor, cursor + 8);
    if (
      source.startsWith("#pragma", cursor) &&
      !/[\w$]/.test(source[cursor + 7] ?? "")
    ) {
      cursor += 7;
      type = "macro";
    } else if (
      rest.startsWith("//") ||
      (source[cursor] === "#" && !/\d/.test(source[cursor + 1] ?? ""))
    ) {
      while (cursor < source.length && !/[\r\n]/.test(source[cursor])) cursor++;
      type = "comment";
    } else if (rest.startsWith("/*")) {
      const close = source.indexOf("*/", cursor + 2);
      cursor = close < 0 ? source.length : close + 2;
      type = "comment";
    } else if (source[cursor] === "'" || source[cursor] === '"') {
      const quote = source[cursor++];
      while (cursor < source.length) {
        const char = source[cursor++];
        if (char === "\\") cursor = Math.min(cursor + 1, source.length);
        else if (char === quote) break;
      }
      type = "string";
    } else {
      number.lastIndex = identifier.lastIndex = operator.lastIndex = cursor;
      const numeric = number.exec(source);
      const name = numeric ? null : identifier.exec(source);
      const symbolic = numeric || name ? null : operator.exec(source);
      if (numeric) {
        cursor += numeric[0].length;
        type = "number";
      } else if (name) {
        cursor += name[0].length;
        type = "variable";
      } else if (
        source[cursor] === "#" &&
        /\d/.test(source[cursor + 1] ?? "")
      ) {
        cursor++;
        while (/\d/.test(source[cursor] ?? "")) cursor++;
        type = "variable";
      } else {
        cursor += symbolic?.[0].length ?? 1;
        if (symbolic) type = "operator";
      }
    }
    tokens.push({
      start,
      end: cursor,
      text: source.slice(start, cursor),
      type,
    });
  }

  const significant = tokens.filter((token) => token.type !== "comment");
  for (let i = 0; i < significant.length; i++) {
    const token = significant[i];
    if (token.type !== "variable") continue;
    const previous = significant[i - 1]?.text;
    if (previous === "." || previous === "?.") {
      token.type = significant[i + 1]?.text === "(" ? "function" : "property";
    } else if (keywords.has(token.text)) token.type = "keyword";
    else if (wordOperators.has(token.text)) token.type = "operator";
    else if (significant[i + 1]?.text === "(") token.type = "function";
  }
  return tokens;
}

/**
 * Best-effort lexical highlighting, not name resolution or parser semantics.
 * Explicit variable tokens override the host template's string foreground.
 */
export function highlightTemplates(
  host: TextDocument,
  templates: EmbeddedTemplate[],
): SemanticTokens {
  const text = host.getText();
  const spans: { start: number; end: number; type: number }[] = [];
  for (const template of templates) {
    for (const token of lex(template.source)) {
      if (!token.type) continue;
      const start = template.toHost(token.start);
      const end = template.toHost(token.end);
      // Split in host space: raw template CRLFs occupy two UTF-16 code units.
      for (const part of text.slice(start, end).matchAll(/[^\r\n]+/g)) {
        const offset = start + part.index;
        spans.push({
          start: offset,
          end: offset + part[0].length,
          type: tokenTypes.indexOf(token.type),
        });
      }
    }
  }
  spans.sort((a, b) => a.start - b.start || a.end - b.end);
  const data: number[] = [];
  let previousLine = 0;
  let previousCharacter = 0;
  let previousEnd = 0;
  for (const span of spans) {
    if (span.start < previousEnd) continue;
    const position = host.positionAt(span.start);
    const deltaLine = position.line - previousLine;
    data.push(
      deltaLine,
      deltaLine === 0
        ? position.character - previousCharacter
        : position.character,
      span.end - span.start,
      span.type,
      0,
    );
    previousLine = position.line;
    previousCharacter = position.character;
    previousEnd = span.end;
  }
  return { data };
}
