import { EmptyFileSystem, type LangiumDocument } from "langium";
import { URI } from "vscode-uri";
import { TextDocument } from "vscode-languageserver-textdocument";
import {
  type CompletionParams,
  type CompletionItem,
  type CompletionList,
  type HoverParams,
  type SignatureHelpParams,
  type Position,
  type Range,
  type Diagnostic,
  type TextEdit,
} from "vscode-languageserver/node.js";
import { createJexlServices } from "sf-jexl/language";
import { extractTemplates, type EmbeddedTemplate } from "./templates.js";
import { highlightTemplates } from "./highlighting.js";
import { adaptZedCompletion } from "./completion-adapter.js";

interface VirtualDocument {
  template: EmbeddedTemplate;
  document: LangiumDocument;
}
interface HostDocument {
  document: TextDocument;
  virtual: VirtualDocument[];
}

/** All calls are serialized by the transport: Langium's workspace is mutable. */
export class EmbeddedJexl {
  private readonly services = createJexlServices(EmptyFileSystem);
  private readonly hosts = new Map<string, HostDocument>();
  private generation = 0;

  loadContext(context: Record<string, unknown>): void {
    this.services.Jexl.JexlContext.mergeContext(context);
  }

  async update(document: TextDocument): Promise<Diagnostic[]> {
    await this.close(document.uri);
    const templates = extractTemplates(document.getText(), document.uri);
    const generation = ++this.generation;
    const virtual = templates.map((template, index): VirtualDocument => {
      // Never use a real file URI: these documents are internal and must not
      // collide with workspace files or leak into client-facing responses.
      const uri = URI.parse(
        `embedded-jexl:/${encodeURIComponent(document.uri)}/${generation}/${index}.jexl`,
      );
      const parsed =
        this.services.shared.workspace.LangiumDocumentFactory.fromString(
          template.source,
          uri,
        );
      this.services.shared.workspace.LangiumDocuments.addDocument(parsed);
      return { template, document: parsed };
    });
    const host = { document, virtual };
    this.hosts.set(document.uri, host);
    await this.services.shared.workspace.DocumentBuilder.build(
      virtual.map((v) => v.document),
      { validation: true },
    );
    return virtual.flatMap((v) =>
      (v.document.diagnostics ?? []).map((diagnostic) => ({
        ...diagnostic,
        range: this.hostRange(host, v, diagnostic.range),
        source: "JEXL",
        // Provider data/related locations can refer to internal virtual URIs.
        data: undefined,
        relatedInformation: undefined,
      })),
    );
  }

  async close(uri: string): Promise<void> {
    const old = this.hosts.get(uri);
    if (!old) return;
    this.hosts.delete(uri);
    for (const v of old.virtual)
      this.services.Jexl.JexlContext.clearDocumentVariables(
        v.document.uri.toString(),
      );
    await this.services.shared.workspace.DocumentBuilder.update(
      [],
      old.virtual.map((v) => v.document.uri),
    );
  }

  private locate(uri: string, position: Position) {
    const host = this.hosts.get(uri);
    if (!host) return;
    const offset = host.document.offsetAt(position);
    const virtual = host.virtual.find(
      (v) => offset >= v.template.start && offset <= v.template.end,
    );
    if (!virtual) return;
    return {
      host,
      virtual,
      textDocument: { uri: virtual.document.uri.toString() },
      position: virtual.document.textDocument.positionAt(
        virtual.template.toVirtual(offset),
      ),
    };
  }

  private hostRange(
    host: HostDocument,
    virtual: VirtualDocument,
    range: Range,
  ): Range {
    const source = virtual.document.textDocument;
    return {
      start: host.document.positionAt(
        virtual.template.toHost(source.offsetAt(range.start)),
      ),
      end: host.document.positionAt(
        virtual.template.toHost(source.offsetAt(range.end)),
      ),
    };
  }

  async completion(
    params: CompletionParams,
    snippets = true,
    zedStringCompletions = false,
  ): Promise<CompletionList | null> {
    const at = this.locate(params.textDocument.uri, params.position);
    if (!at) return null;
    const result =
      await this.services.Jexl.lsp.CompletionProvider?.getCompletion(
        at.virtual.document,
        {
          ...params,
          textDocument: at.textDocument,
          position: at.position,
        },
      );
    if (!result) return null;
    const items: CompletionItem[] = [];
    for (const original of result.items) {
      let item = { ...original };
      // Provider commands use VS Code-specific command ids, not portable LSP.
      delete item.command;
      delete item.data;
      if (item.insertTextFormat === 2 && !snippets && !zedStringCompletions)
        continue;
      const edits: TextEdit[] = [];
      if (item.textEdit) {
        if ("range" in item.textEdit) {
          item.textEdit = {
            ...item.textEdit,
            range: this.hostRange(at.host, at.virtual, item.textEdit.range),
          };
          edits.push(item.textEdit);
        } else {
          item.textEdit = {
            ...item.textEdit,
            insert: this.hostRange(at.host, at.virtual, item.textEdit.insert),
            replace: this.hostRange(at.host, at.virtual, item.textEdit.replace),
          };
          edits.push({
            range: item.textEdit.replace,
            newText: item.textEdit.newText,
          });
        }
      } else {
        // Make the replacement range explicit so the editor does not apply
        // TypeScript's string-word rules to a JEXL identifier.
        const prefix = at.virtual.document.textDocument
          .getText()
          .slice(
            0,
            at.virtual.template.toVirtual(
              at.host.document.offsetAt(params.position),
            ),
          );
        const length = prefix.match(/[\w$]*$/)?.[0].length ?? 0;
        const end = at.virtual.template.toVirtual(
          at.host.document.offsetAt(params.position),
        );
        const range = this.hostRange(at.host, at.virtual, {
          start: at.virtual.document.textDocument.positionAt(end - length),
          end: at.position,
        });
        item.textEdit = { range, newText: item.insertText ?? item.label };
        edits.push(item.textEdit);
      }
      item.additionalTextEdits = item.additionalTextEdits?.map((edit) => ({
        ...edit,
        range: this.hostRange(at.host, at.virtual, edit.range),
      }));
      edits.push(...(item.additionalTextEdits ?? []));
      // Raw templates cannot encode arbitrary backticks/${ without changing the
      // runtime value. Reject unsafe suggestions rather than silently escaping.
      if (
        item.insertTextFormat === 2 &&
        edits.some((edit) => /[\\`]|\$(?!\d)/.test(edit.newText))
      )
        continue;
      if (zedStringCompletions) {
        const adapted = adaptZedCompletion(
          item,
          at.host.document,
          params.position,
        );
        if (!adapted) continue;
        item = adapted;
        edits[0] = { ...edits[0], newText: item.textEdit!.newText };
      }
      if (!safeEdits(at.host.document, at.virtual.template, edits)) continue;
      if (
        item.textEdit &&
        "insert" in item.textEdit &&
        !safeEdits(at.host.document, at.virtual.template, [
          { range: item.textEdit.insert, newText: item.textEdit.newText },
          ...(item.additionalTextEdits ?? []),
        ])
      )
        continue;
      items.push(item);
    }
    return { isIncomplete: result.isIncomplete, items };
  }

  async hover(params: HoverParams) {
    const at = this.locate(params.textDocument.uri, params.position);
    if (!at) return null;
    const hover = await this.services.Jexl.lsp.HoverProvider?.getHoverContent(
      at.virtual.document,
      {
        ...params,
        textDocument: at.textDocument,
        position: at.position,
      },
    );
    return hover
      ? {
          ...hover,
          range: hover.range
            ? this.hostRange(at.host, at.virtual, hover.range)
            : undefined,
        }
      : null;
  }

  async signatureHelp(params: SignatureHelpParams) {
    const at = this.locate(params.textDocument.uri, params.position);
    if (!at) return null;
    return (
      (await this.services.Jexl.lsp.SignatureHelp?.provideSignatureHelp(
        at.virtual.document,
        {
          ...params,
          textDocument: at.textDocument,
          position: at.position,
        },
      )) ?? null
    );
  }

  semanticTokens(uri: string) {
    const host = this.hosts.get(uri);
    return host
      ? highlightTemplates(
          host.document,
          host.virtual.map((v) => v.template),
        )
      : { data: [] };
  }

  /** Exposed for lifecycle regression tests, not used by the protocol. */
  get documentCount(): number {
    return this.services.shared.workspace.LangiumDocuments.all.toArray().length;
  }
}

export function safeEdits(
  host: TextDocument,
  template: EmbeddedTemplate,
  edits: TextEdit[],
): boolean {
  const offsets = edits
    .map((edit) => ({
      start: host.offsetAt(edit.range.start),
      end: host.offsetAt(edit.range.end),
      text: edit.newText,
    }))
    .sort((a, b) => b.start - a.start);
  let source = host.getText().slice(template.start, template.end);
  let previous = template.end;
  for (const edit of offsets) {
    if (
      edit.start < template.start ||
      edit.end > template.end ||
      edit.start > edit.end ||
      edit.end > previous
    )
      return false;
    previous = edit.start;
    source =
      source.slice(0, edit.start - template.start) +
      edit.text +
      source.slice(edit.end - template.start);
  }
  const wrapper = "jexl`" + source + "`";
  const found = extractTemplates(wrapper);
  return (
    found.length === 1 &&
    found[0].start === 5 &&
    found[0].end === wrapper.length - 1
  );
}
