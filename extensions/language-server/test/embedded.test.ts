import assert from "node:assert/strict";
import { afterEach, before, describe, test } from "node:test";
import { TextDocument } from "vscode-languageserver-textdocument";
import type {
  CompletionItem,
  Hover,
  Range,
  TextEdit,
} from "vscode-languageserver/node.js";
import { EmbeddedJexl, safeEdits } from "../src/embedded.js";
import { extractTemplates } from "../src/templates.js";

const uri = "file:///embedded-test.tsx";

function document(text: string, version = 1) {
  return TextDocument.create(uri, "typescriptreact", version, text);
}

function at(host: TextDocument, needle: string, offset = needle.length) {
  const start = host.getText().indexOf(needle);
  assert.ok(start >= 0, `Missing cursor marker: ${needle}`);
  return {
    textDocument: { uri: host.uri },
    position: host.positionAt(start + offset),
  };
}

function range(host: TextDocument, start: number, end = start): Range {
  return { start: host.positionAt(start), end: host.positionAt(end) };
}

function markdown(hover: Hover): string {
  const content = hover.contents;
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((value) => (typeof value === "string" ? value : value.value))
      .join("\n");
  }
  return content.value;
}

function edits(item: CompletionItem): TextEdit[] {
  assert.ok(
    item.textEdit,
    `Completion ${item.label} must have an explicit edit`,
  );
  return [
    "range" in item.textEdit
      ? item.textEdit
      : { range: item.textEdit.replace, newText: item.textEdit.newText },
    ...(item.additionalTextEdits ?? []),
  ];
}

// Construct the real Langium services only once; every test cleans up its host.
describe("EmbeddedJexl integration", { concurrency: false }, () => {
  let engine: EmbeddedJexl;

  before(() => {
    engine = new EmbeddedJexl();
    engine.loadContext({
      functions: [],
      namespaces: [],
      variables: [
        {
          name: "customer",
          type: "test.Customer",
          documentation: "Current customer.",
        },
      ],
      types: {
        "test.Customer": {
          properties: [
            {
              name: "displayName",
              type: "java.lang.String",
              documentation: "Customer display name.",
            },
          ],
          methods: [
            {
              name: "greet",
              documentation: "Greet this customer.",
              parameters: [
                { name: "prefix", type: "java.lang.String" },
                { name: "times", type: "int" },
              ],
              returnType: "java.lang.String",
            },
          ],
        },
      },
    });
  });

  afterEach(async () => {
    await engine.close(uri);
    assert.equal(engine.documentCount, 0);
  });

  test("context members complete with explicit, safe host edits", async () => {
    const host = document("const node = <State guard={jexl`customer.`} />;");
    await engine.update(host);
    const result = await engine.completion(at(host, "customer."));
    assert.ok(result);
    assert.ok(result.items.some((item) => item.label === "displayName"));
    assert.ok(
      result.items.some(
        (item) =>
          item.filterText === "greet" && item.label.startsWith("greet("),
      ),
    );
    const template = extractTemplates(host.getText())[0];
    for (const item of result.items) {
      assert.equal(item.command, undefined);
      assert.equal(item.data, undefined);
      assert.equal(safeEdits(host, template, edits(item)), true, item.label);
    }
    const property = result.items.find((item) => item.label === "displayName")!;
    const [edit] = edits(property);
    assert.deepEqual(
      edit.range,
      range(host, host.getText().indexOf("customer.") + "customer.".length),
    );
    assert.equal(edit.newText, "displayName");

    const plain = await engine.completion(at(host, "customer."), false);
    assert.ok(plain);
    assert.ok(plain.items.some((item) => item.label === "displayName"));
    assert.ok(plain.items.every((item) => item.insertTextFormat !== 2));
  });

  test("context member hover carries documentation and type", async () => {
    const host = document("const value = jexl`customer.displayName`;");
    assert.deepEqual(await engine.update(host), []);
    const hover = await engine.hover(at(host, "displayName", 3));
    assert.ok(hover);
    assert.match(markdown(hover), /Customer display name\./);
    assert.match(markdown(hover), /java\.lang\.String/);
    // The actual provider returns content without the optional LSP range.
    assert.equal(hover.range, undefined);
  });

  test("context method signature help tracks the active argument", async () => {
    const host = document('const value = jexl`customer.greet("Hi", `;');
    await engine.update(host);
    const help = await engine.signatureHelp(at(host, 'greet("Hi", '));
    assert.ok(help);
    assert.match(help.signatures[0].label, /greet/);
    assert.match(help.signatures[0].label, /prefix.*java\.lang\.String/);
    assert.match(help.signatures[0].label, /times.*int/);
    assert.equal(help.signatures[0].parameters?.length, 2);
    assert.equal(help.activeParameter, 1);
  });

  test("templates do not share local declarations", async () => {
    const host = document(
      [
        "const first = jexl`var privateLocal = 1; privateLocal;`;",
        "const second = jexl`privateLocal;`;",
      ].join("\n"),
    );
    const diagnostics = await engine.update(host);
    assert.equal(engine.documentCount, 2);
    const missing = diagnostics.filter(
      (diagnostic) => diagnostic.code === "jexl-undefined-identifier",
    );
    assert.equal(missing.length, 1);
    assert.equal(host.getText(missing[0].range), "privateLocal");
    assert.equal(missing[0].range.start.line, 1);
    const first = await engine.completion(
      at(host, "privateLocal;", "private".length),
    );
    const second = await engine.completion(
      at(host, "jexl`privateLocal", "jexl`private".length),
    );
    assert.ok(first?.items.some((item) => item.label === "privateLocal"));
    assert.ok(second);
    assert.ok(!second.items.some((item) => item.label === "privateLocal"));
  });

  test("diagnostics stay inside their template and omit virtual-document metadata", async () => {
    const host = document(
      [
        "const outsideMissing = notJexl;",
        "const good = jexl`customer.displayName`;",
        "const bad = jexl`missingEmbedded;`;",
      ].join("\n"),
    );
    const diagnostics = await engine.update(host);
    assert.ok(diagnostics.length > 0);
    const template = extractTemplates(host.getText())[1];
    for (const diagnostic of diagnostics) {
      assert.ok(host.offsetAt(diagnostic.range.start) >= template.start);
      assert.ok(host.offsetAt(diagnostic.range.end) <= template.end);
      assert.equal(diagnostic.source, "JEXL");
      assert.equal(diagnostic.data, undefined);
      assert.equal(diagnostic.relatedInformation, undefined);
    }
    assert.ok(
      diagnostics.some(
        (diagnostic) => host.getText(diagnostic.range) === "missingEmbedded",
      ),
    );
  });

  test("requests outside templates and for unknown documents return null", async () => {
    const host = document(
      "const outside = 1; const value = jexl`customer.displayName`;",
    );
    const params = at(host, "outside");
    assert.equal(await engine.completion(params), null);
    assert.equal(await engine.hover(params), null);
    assert.equal(await engine.signatureHelp(params), null);
    await engine.update(host);
    for (const position of [params, at(host, "jexl", 1), at(host, ";", 1)]) {
      assert.equal(await engine.completion(position), null);
      assert.equal(await engine.hover(position), null);
      assert.equal(await engine.signatureHelp(position), null);
    }
    assert.deepEqual(engine.semanticTokens("file:///unknown.tsx"), {
      data: [],
    });
  });

  test("replacement, template deletion and close remove virtual documents", async () => {
    await engine.update(document("jexl`var oldLocal = 1;`; jexl`customer`;"));
    assert.equal(engine.documentCount, 2);
    const replacement = document("jexl`oldLocal;`;", 2);
    const diagnostics = await engine.update(replacement);
    assert.equal(engine.documentCount, 1);
    assert.ok(
      diagnostics.some(
        (diagnostic) => diagnostic.code === "jexl-undefined-identifier",
      ),
    );
    assert.deepEqual(
      await engine.update(document("const removed = true;", 3)),
      [],
    );
    assert.equal(engine.documentCount, 0);
    assert.deepEqual(engine.semanticTokens(uri), { data: [] });
    await engine.update(document("jexl`customer`;", 4));
    assert.equal(engine.documentCount, 1);
    await engine.close(uri);
    await engine.close(uri);
    assert.equal(engine.documentCount, 0);
    assert.equal(await engine.hover(at(replacement, "oldLocal", 2)), null);
    assert.deepEqual(engine.semanticTokens(uri), { data: [] });
  });

  test("CRLF templates map diagnostics and completion and locate hover", async () => {
    const host = document(
      [
        "// host prefix",
        "const value = jexl`",
        "customer.displayName;",
        "missingCrlf;",
        "customer.dis",
        "`;",
      ].join("\r\n"),
    );
    const diagnostics = await engine.update(host);
    const missing = diagnostics.find(
      (diagnostic) =>
        diagnostic.code === "jexl-undefined-identifier" &&
        host.getText(diagnostic.range) === "missingCrlf",
    );
    assert.ok(missing);
    assert.deepEqual(missing.range, {
      start: { line: 3, character: 0 },
      end: { line: 3, character: 11 },
    });
    const hover = await engine.hover(at(host, "displayName", 3));
    assert.ok(hover);
    assert.match(markdown(hover), /Customer display name\./);
    const result = await engine.completion(
      at(host, "customer.dis\r", "customer.dis".length),
    );
    const item = result?.items.find((item) => item.label === "displayName");
    assert.ok(item);
    assert.deepEqual(edits(item)[0].range, {
      start: { line: 4, character: 9 },
      end: { line: 4, character: 12 },
    });
    assert.equal(
      safeEdits(host, extractTemplates(host.getText())[0], edits(item)),
      true,
    );
  });
});

test("safeEdits validates the combined replacement and host boundaries", () => {
  const host = document("const value = jexl`abcd`; const other = 1;");
  const template = extractTemplates(host.getText())[0];
  const edit = (start: number, end: number, newText: string): TextEdit => ({
    range: range(host, template.start + start, template.start + end),
    newText,
  });
  assert.equal(safeEdits(host, template, []), true);
  assert.equal(
    safeEdits(host, template, [edit(0, 4, "customer.displayName")]),
    true,
  );
  assert.equal(
    safeEdits(host, template, [edit(3, 4, "z"), edit(0, 1, "x")]),
    true,
  );
  for (const unsafe of [
    [edit(-1, 0, "x")],
    [edit(4, 5, "x")],
    [edit(3, 1, "x")],
    [edit(0, 3, "x"), edit(2, 4, "y")],
    [edit(0, 4, "`")],
    [edit(0, 4, "${customer}")],
    [edit(4, 4, "\\")],
    // Individually harmless insertions can create interpolation together or at a boundary.
    [edit(0, 4, "$"), edit(4, 4, "{customer}")],
    [edit(0, 1, "$"), edit(1, 2, "{")],
  ]) {
    assert.equal(
      safeEdits(host, template, unsafe),
      false,
      JSON.stringify(unsafe),
    );
  }
});
