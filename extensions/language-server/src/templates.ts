import ts from "typescript";

/** A raw JEXL document. All offsets are UTF-16 code-unit boundaries. */
export interface EmbeddedTemplate {
  source: string;
  /** Host content range, excluding backticks (or ending at EOF while typing). */
  start: number;
  end: number;
  /** Clamp to the document, then translate a raw-value boundary to the host. */
  toHost(offset: number): number;
  /** Clamp to the content range; the interior of CRLF maps before its LF. */
  toVirtual(hostOffset: number): number;
}

/**
 * Raw text cannot escape backticks or interpolation without changing its value.
 * This is only a content check: callers must also validate edits in host context
 * (for example, a trailing backslash can escape the closing backtick).
 */
export function isSafeTemplateText(text: string): boolean {
  return !text.includes("`") && !text.includes("${");
}

/**
 * Find syntactically tagged, non-interpolated templates, including unfinished
 * templates. Recognizes `jexl` and named import aliases from the public modules;
 * this is intentionally syntactic, not TypeScript symbol resolution.
 * Matches strings.raw[0]: preserves escapes, including invalid cooked escapes,
 * and only normalizes literal CRLF/CR to LF.
 */
export function extractTemplates(
  text: string,
  fileName = "embedded.tsx",
): EmbeddedTemplate[] {
  const file = ts.createSourceFile(
    fileName,
    text,
    ts.ScriptTarget.Latest,
    true,
  );
  const tags = new Set(["jexl"]);
  for (const statement of file.statements) {
    if (
      !ts.isImportDeclaration(statement) ||
      !ts.isStringLiteral(statement.moduleSpecifier)
    )
      continue;
    if (
      !["jsx-scxml", "jsx-scxml/std", "jsx-scxml/jexl"].includes(
        statement.moduleSpecifier.text,
      )
    )
      continue;
    const clause = statement.importClause;
    const bindings = clause?.namedBindings;
    if (clause?.isTypeOnly || !bindings || !ts.isNamedImports(bindings))
      continue;
    for (const specifier of bindings.elements) {
      if (
        !specifier.isTypeOnly &&
        (specifier.propertyName ?? specifier.name).text === "jexl"
      ) {
        tags.add(specifier.name.text);
      }
    }
  }

  const templates: EmbeddedTemplate[] = [];
  const visit = (node: ts.Node): void => {
    if (
      ts.isTaggedTemplateExpression(node) &&
      ts.isIdentifier(node.tag) &&
      tags.has(node.tag.text) &&
      ts.isNoSubstitutionTemplateLiteral(node.template)
    ) {
      const literal = node.template;
      const start = literal.getStart(file) + 1;
      const end = literal.end - (literal.isUnterminated ? 0 : 1);
      templates.push(mapTemplate(text.slice(start, end), start, end));
    }
    ts.forEachChild(node, visit);
  };
  visit(file);
  return templates;
}

function clamp(offset: number, length: number): number {
  return Number.isNaN(offset)
    ? 0
    : Math.max(0, Math.min(length, Math.trunc(offset)));
}

/** Map host text directly, except for Template Raw Value newline normalization. */
function mapTemplate(
  raw: string,
  start: number,
  end: number,
): EmbeddedTemplate {
  let source = "";
  let cursor = 0;
  const hostToVirtual: number[] = [0];
  const virtualToHost: number[] = [start];

  while (cursor < raw.length) {
    const char = raw[cursor++];
    if (char === "\r" && raw[cursor] === "\n") {
      hostToVirtual[cursor++] = source.length;
    }
    source += char === "\r" ? "\n" : char;
    virtualToHost.push(start + cursor);
    hostToVirtual[cursor] = source.length;
  }

  return {
    source,
    start,
    end,
    toHost: (offset) => virtualToHost[clamp(offset, source.length)],
    toVirtual: (hostOffset) =>
      hostToVirtual[clamp(hostOffset - start, raw.length)],
  };
}
