#!/usr/bin/env node
import { fileURLToPath } from "node:url";
import {
  createConnection,
  ProposedFeatures,
  TextDocuments,
  TextDocumentSyncKind,
  type InitializeParams,
  type Diagnostic,
} from "vscode-languageserver/node.js";
import { TextDocument } from "vscode-languageserver-textdocument";
import { URI } from "vscode-uri";
import { EmbeddedJexl } from "./embedded.js";
import { tokenTypes } from "./highlighting.js";
import {
  loadRuntimeContext,
  mergeRuntimeContexts,
  describeRuntimeContext,
  type RuntimeContextOptions,
} from "./runtime-context.js";

// The upstream engine logs during service creation. stdout belongs exclusively
// to JSON-RPC when this process is launched over stdio.
console.log = (...args: unknown[]) => console.error(...args);
if (
  !process.argv.some((arg) => /^--(stdio|node-ipc|socket|pipe)(=|$)/.test(arg))
)
  process.argv.push("--stdio");
const connection = createConnection(ProposedFeatures.all);
const documents = new TextDocuments(TextDocument);
let engine: EmbeddedJexl;
let snippets = false;
let zedStringCompletions = false;
let queue: Promise<unknown> = Promise.resolve();
let revision = 0;
const latestRevision = new Map<string, number>();
function serialized<T>(action: () => Promise<T> | T): Promise<T> {
  const next = queue.then(action);
  queue = next.catch((error) =>
    connection.console.error(
      error instanceof Error ? (error.stack ?? error.message) : String(error),
    ),
  );
  return next;
}

connection.onInitialize(async (params: InitializeParams) => {
  engine = new EmbeddedJexl();
  zedStringCompletions = [
    "zed",
    "zed preview",
    "zed nightly",
    "zed dev",
  ].includes(params.clientInfo?.name.toLowerCase() ?? "");
  snippets =
    params.capabilities.textDocument?.completion?.completionItem
      ?.snippetSupport ?? false;
  const options: unknown = params.initializationOptions ?? {};
  if (typeof options !== "object" || Array.isArray(options)) {
    throw new Error("initializationOptions must be an object");
  }
  const roots =
    params.workspaceFolders?.map((folder) => URI.parse(folder.uri).fsPath) ??
    (params.rootUri ? [URI.parse(params.rootUri).fsPath] : []);
  const contextFiles = loadRuntimeContext(
    options as RuntimeContextOptions,
    roots,
    fileURLToPath(new URL("../runtime/", import.meta.url)),
  );
  engine.loadContext(
    mergeRuntimeContexts(contextFiles.map((file) => file.context)),
  );
  for (const file of contextFiles) {
    connection.console.info(describeRuntimeContext(file));
  }
  if (contextFiles.length === 0) {
    connection.console.warn(
      "No JEXL runtime context loaded; only built-ins and script-local symbols are available. Import runtime metadata or configure contextPath/typesPath.",
    );
  }
  return {
    serverInfo: { name: "jsx-scxml-jexl", version: "0.1.0" },
    capabilities: {
      textDocumentSync: TextDocumentSyncKind.Incremental,
      completionProvider: {
        triggerCharacters: [".", ":", "@"],
        resolveProvider: false,
      },
      hoverProvider: true,
      signatureHelpProvider: {
        triggerCharacters: ["(", ","],
        retriggerCharacters: [","],
      },
      semanticTokensProvider: {
        legend: { tokenTypes, tokenModifiers: [] },
        full: true,
      },
    },
  };
});

documents.onDidChangeContent(({ document }) => {
  // TextDocuments mutates its document on subsequent changes. Snapshot now so
  // queued jobs never parse text from a different version than their diagnostics.
  const snapshot = TextDocument.create(
    document.uri,
    document.languageId,
    document.version,
    document.getText(),
  );
  const currentRevision = ++revision;
  latestRevision.set(document.uri, currentRevision);
  void serialized(async () => {
    const diagnostics: Diagnostic[] = await engine.update(snapshot);
    if (latestRevision.get(snapshot.uri) === currentRevision) {
      connection.sendDiagnostics({
        uri: snapshot.uri,
        version: snapshot.version,
        diagnostics,
      });
    }
  }).catch(() => {});
});
documents.onDidClose(({ document }) => {
  latestRevision.delete(document.uri);
  void serialized(async () => {
    await engine.close(document.uri);
    connection.sendDiagnostics({ uri: document.uri, diagnostics: [] });
  }).catch(() => {});
});
connection.onCompletion((params) =>
  serialized(() => engine.completion(params, snippets, zedStringCompletions)),
);
connection.onHover((params) => serialized(() => engine.hover(params)));
connection.onSignatureHelp((params) =>
  serialized(() => engine.signatureHelp(params)),
);
connection.languages.semanticTokens.on((params) =>
  serialized(() => engine.semanticTokens(params.textDocument.uri)),
);
documents.listen(connection);
connection.listen();
