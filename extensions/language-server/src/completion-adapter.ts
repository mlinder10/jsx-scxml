import type { CompletionItem, Position } from "vscode-languageserver/node.js";
import type { TextDocument } from "vscode-languageserver-textdocument";

/** Zed's TSX string scope includes dots and hyphens in its completion query.
 * Explicit LSP edit ranges control insertion, but do not change that query. */
export function adaptZedCompletion(
  item: CompletionItem,
  host: TextDocument,
  position: Position,
): CompletionItem | null {
  const edit = item.textEdit;
  if (!edit) return null;
  const cursor = host.offsetAt(position);
  const query = host.getText().slice(0, cursor).match(/[\p{L}\p{N}_$.-]*$/u)?.[0] ?? "";
  const queryStart = cursor - query.length;
  const editStart = host.offsetAt("range" in edit ? edit.range.start : edit.insert.start);
  const prefix = editStart > queryStart && editStart <= cursor
    ? host.getText().slice(queryStart, editStart)
    : "";
  const adapted: CompletionItem = {
    ...item,
    filterText: prefix + (item.filterText ?? item.label),
  };
  if (item.insertTextFormat === 2) {
    // In TSX strings Zed substitutes a method snippet's display label for its
    // insertion text. Send plain calls so a signature label never becomes code.
    // The engine currently emits simple numeric tabstops for callable members.
    if (/[\\`]|\$(?!\d)/.test(edit.newText)) return null;
    adapted.insertTextFormat = 1;
    adapted.textEdit = { ...edit, newText: edit.newText.replace(/\$\d+/g, "") };
    if (item.insertText !== undefined) {
      adapted.insertText = adapted.textEdit.newText;
    }
  }
  return adapted;
}
