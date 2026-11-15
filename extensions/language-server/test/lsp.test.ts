import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { test, type TestContext } from "node:test";
import {
  createMessageConnection,
  StreamMessageReader,
  StreamMessageWriter,
} from "vscode-jsonrpc/node.js";
import type {
  CompletionItem,
  CompletionList,
  Hover,
  InitializeResult,
  PublishDiagnosticsParams,
  SemanticTokens,
  SignatureHelp,
} from "vscode-languageserver/node.js";

test(
  "stdio server initializes, routes requests, handles incremental changes, and shuts down",
  { timeout: 30000 },
  async (t) => {
    const child = spawn(
      process.execPath,
      [fileURLToPath(new URL("../src/server.js", import.meta.url)), "--stdio"],
      {
        stdio: ["pipe", "pipe", "pipe"],
      },
    );
    let stderr = "";
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    const connection = createMessageConnection(
      new StreamMessageReader(child.stdout),
      new StreamMessageWriter(child.stdin),
    );
    const errors: unknown[] = [];
    connection.onError((error) => errors.push(error));
    t.after(() => {
      connection.dispose();
      child.kill();
    });
    const diagnostics: PublishDiagnosticsParams[] = [];
    connection.onNotification("textDocument/publishDiagnostics", (params) =>
      diagnostics.push(params),
    );
    connection.listen();
    const initialized = await connection.sendRequest<InitializeResult>(
      "initialize",
      {
        processId: process.pid,
        rootUri: null,
        capabilities: {
          textDocument: {
            completion: { completionItem: { snippetSupport: true } },
          },
        },
      },
    );
    assert.equal(initialized.serverInfo?.name, "jsx-scxml-jexl");
    assert.ok(initialized.capabilities.semanticTokensProvider);
    await connection.sendNotification("initialized", {});
    const uri = "file:///stdio-test.tsx";
    const text = "const value = jexl`let localValue = 1; localV`;";
    await connection.sendNotification("textDocument/didOpen", {
      textDocument: { uri, languageId: "typescriptreact", version: 1, text },
    });
    const cursor = text.indexOf("localV`") + "localV".length;
    const completion = await connection.sendRequest<CompletionList>(
      "textDocument/completion",
      {
        textDocument: { uri },
        position: { line: 0, character: cursor },
      },
    );
    assert.ok(
      completion.items.some((item) => item.label === "localValue"),
      stderr,
    );
    assert.ok(diagnostics.some((message) => message.version === 1));
    const outside = await connection.sendRequest("textDocument/hover", {
      textDocument: { uri },
      position: { line: 0, character: 2 },
    });
    assert.equal(outside, null);
    const tokens = await connection.sendRequest<SemanticTokens>(
      "textDocument/semanticTokens/full",
      { textDocument: { uri } },
    );
    assert.ok(tokens.data.length > 0);
    await connection.sendNotification("textDocument/didChange", {
      textDocument: { uri, version: 2 },
      contentChanges: [
        {
          range: {
            start: { line: 0, character: 0 },
            end: { line: 0, character: text.length },
          },
          text: "const value = 1;",
        },
      ],
    });
    const cleared = await connection.sendRequest<SemanticTokens>(
      "textDocument/semanticTokens/full",
      { textDocument: { uri } },
    );
    assert.deepEqual(cleared.data, []);
    assert.deepEqual(
      diagnostics.find((message) => message.version === 2)?.diagnostics,
      [],
    );
    await connection.sendNotification("textDocument/didClose", {
      textDocument: { uri },
    });
    await connection.sendRequest("shutdown");
    const exit = once(child, "exit");
    await connection.sendNotification("exit");
    assert.deepEqual(await exit, [0, null], stderr);
    assert.deepEqual(errors, [], stderr);
  },
);

async function bounded<T>(
  pending: Promise<T>,
  description: string,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      pending,
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error(`Timed out: ${description}`)),
          5000,
        );
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

async function runtimeServer(
  t: TestContext,
  root: string,
  initializationOptions = {},
  clientName?: string,
) {
  const child = spawn(
    process.execPath,
    [fileURLToPath(new URL("../src/server.js", import.meta.url)), "--stdio"],
    {
      cwd: root,
      stdio: ["pipe", "pipe", "pipe"],
    },
  );
  let stderr = "";
  child.stderr.on("data", (chunk) => {
    stderr += chunk;
  });
  const exit = once(child, "exit");
  // Observe spawn failures even if initialization fails before shutdown is reached.
  void exit.catch(() => {});
  const connection = createMessageConnection(
    new StreamMessageReader(child.stdout),
    new StreamMessageWriter(child.stdin),
  );
  const errors: unknown[] = [];
  connection.onError((error) => errors.push(error));
  t.after(async () => {
    connection.dispose();
    if (child.exitCode === null && child.signalCode === null)
      child.kill("SIGKILL");
    await bounded(exit, `server cleanup\n${stderr}`);
  });
  connection.listen();
  await bounded(
    connection.sendRequest<InitializeResult>("initialize", {
      processId: process.pid,
      rootUri: pathToFileURL(root).href,
      capabilities: {
        textDocument: {
          completion: { completionItem: { snippetSupport: true } },
        },
      },
      initializationOptions,
      clientInfo: clientName ? { name: clientName } : undefined,
    }),
    "server initialization",
  );
  await connection.sendNotification("initialized", {});
  let documentId = 0;
  async function request<T>(
    method: string,
    expression: string,
    character = expression.length,
  ) {
    const uri = pathToFileURL(join(root, `runtime-${++documentId}.tsx`)).href;
    const prefix = "const value = jexl`";
    await connection.sendNotification("textDocument/didOpen", {
      textDocument: {
        uri,
        languageId: "typescriptreact",
        version: 1,
        text: `${prefix}${expression}\`;`,
      },
    });
    try {
      return await bounded(
        connection.sendRequest<T>(method, {
          textDocument: { uri },
          position: { line: 0, character: prefix.length + character },
        }),
        `${method} for ${expression}\n${stderr}`,
      );
    } finally {
      await connection.sendNotification("textDocument/didClose", {
        textDocument: { uri },
      });
    }
  }
  return {
    request,
    async complete(expression: string) {
      const result = await request<CompletionList | null>(
        "textDocument/completion",
        expression,
      );
      assert.ok(result, `No completions for ${expression}\n${stderr}`);
      return result.items;
    },
    async shutdown() {
      await bounded(
        connection.sendRequest("shutdown"),
        `server shutdown\n${stderr}`,
      );
      await connection.sendNotification("exit");
      assert.deepEqual(
        await bounded(exit, `server exit\n${stderr}`),
        [0, null],
        stderr,
      );
      assert.deepEqual(errors, [], stderr);
    },
  };
}

function completionNamed(items: CompletionItem[], name: string) {
  return items.find(
    (item) =>
      item.filterText === name ||
      item.label === name ||
      item.label.startsWith(`${name}(`),
  );
}

function hoverText(hover: Hover): string {
  const contents = hover.contents;
  if (typeof contents === "string") return contents;
  if (Array.isArray(contents))
    return contents
      .map((value) => (typeof value === "string" ? value : value.value))
      .join("\n");
  return contents.value;
}

const hasBundledRuntime = ["jexl-context.json", "jexl-types.json"].every(
  (name) => existsSync(new URL(`../runtime/${name}`, import.meta.url)),
);

test(
  "stdio server uses real bundled Swampfox metadata with workspace overrides and opt-out",
  {
    timeout: 90000,
    skip: hasBundledRuntime
      ? false
      : "Generic-engine build: out/runtime/jexl-context.json and jexl-types.json are required; import runtime metadata and rebuild.",
  },
  async (t) => {
    const root = mkdtempSync(join(tmpdir(), "jexl-real-runtime-"));
    t.after(() => rmSync(root, { recursive: true, force: true }));

    await t.test(
      "bundled globals, enums, namespaces, and return types work without options",
      { timeout: 25000 },
      async (t) => {
        const server = await runtimeServer(t, root);
        const globals = await server.complete("get");
        const operationResult = completionNamed(globals, "getOperationResult");
        assert.ok(
          operationResult,
          "Missing bundled getOperationResult function",
        );
        assert.equal(
          operationResult.detail,
          "com.swampfox.drm.flow.OperationResult",
        );
        assert.ok(
          completionNamed(globals, "getActiveFlow"),
          "Missing bundled getActiveFlow function",
        );
        const statuses = await server.complete("OperationStatus.");
        assert.ok(
          completionNamed(statuses, "SUCCESS"),
          "Missing OperationStatus.SUCCESS",
        );
        assert.ok(
          completionNamed(statuses, "ERROR"),
          "Missing OperationStatus.ERROR",
        );
        const methods = await server.complete("getOperationResult().");
        assert.ok(
          completionNamed(methods, "setOperationStatus"),
          "Missing OperationResult.setOperationStatus",
        );
        assert.ok(
          completionNamed(methods, "getOperationStatus"),
          "Missing OperationResult.getOperationStatus",
        );
        const logging = await server.complete("Log:");
        assert.ok(completionNamed(logging, "info"), "Missing Log:info");
        assert.ok(completionNamed(logging, "debug"), "Missing Log:debug");
        const hover = await server.request<Hover | null>(
          "textDocument/hover",
          "getOperationResult()",
          5,
        );
        assert.ok(hover, "Missing getOperationResult hover");
        assert.match(
          hoverText(hover),
          /getOperationResult\(\): OperationResult/,
        );
        const signature = await server.request<SignatureHelp | null>(
          "textDocument/signatureHelp",
          "getOperationResult().setOperationStatus(",
        );
        assert.ok(
          signature?.signatures.length,
          "Missing setOperationStatus signature",
        );
        assert.match(
          signature.signatures[0].label,
          /setOperationStatus\(.*OperationStatus/,
        );
        await server.shutdown();
      },
    );

    await t.test(
      "Zed clients receive host-filterable, member-only completions",
      async (t) => {
        for (const clientName of [
          "Zed",
          "Zed Preview",
          "Zed Nightly",
          "Zed Dev",
        ]) {
          const server = await runtimeServer(t, root, {}, clientName);
          const statuses = await server.complete("OperationStatus.SU");
          const success = completionNamed(statuses, "SUCCESS");
          assert.ok(success, clientName);
          assert.equal(success.filterText, "OperationStatus.SUCCESS");
          assert.ok(success.textEdit && "range" in success.textEdit);
          assert.equal(success.textEdit.newText, "SUCCESS");
          assert.equal(
            success.textEdit.range.start.character,
            "const value = jexl`OperationStatus.".length,
          );
          const methods = await server.complete(
            "let date = '20260101'; date.su",
          );
          const substring = completionNamed(methods, "substring");
          assert.ok(substring, clientName);
          assert.equal(substring.filterText, "date.substring");
          assert.equal(substring.insertTextFormat, 1);
          assert.equal(substring.textEdit?.newText, "substring()");
          await server.shutdown();
        }
      },
    );

    // A colliding function with a distinct return type proves precedence, not just addition.
    writeFileSync(
      join(root, "jexl-context.json"),
      JSON.stringify({
        variables: [
          {
            name: "projectGlobal",
            type: "java.lang.String",
            documentation: "Workspace-only global.",
          },
        ],
        functions: [
          {
            name: "getActiveFlow",
            parameters: [],
            returnType: "java.lang.String",
            documentation: "Workspace override.",
          },
        ],
      }),
    );

    await t.test(
      "workspace context overrides bundled names without replacing bundled globals",
      { timeout: 25000 },
      async (t) => {
        const server = await runtimeServer(t, root);
        assert.ok(
          completionNamed(await server.complete("project"), "projectGlobal"),
          "Missing workspace global",
        );
        const globals = await server.complete("get");
        assert.ok(
          completionNamed(globals, "getOperationResult"),
          "Workspace overlay lost bundled function",
        );
        const activeFlow = completionNamed(globals, "getActiveFlow");
        assert.ok(activeFlow, "Missing overridden function");
        assert.equal(
          activeFlow.detail,
          "java.lang.String",
          "Workspace function must take priority",
        );
        const hover = await server.request<Hover | null>(
          "textDocument/hover",
          "getActiveFlow()",
          5,
        );
        assert.ok(hover);
        assert.match(hoverText(hover), /Workspace override\./);
        const methods = await server.complete("getOperationResult().");
        assert.ok(
          completionNamed(methods, "setOperationStatus"),
          "Workspace overlay lost bundled types",
        );
        await server.shutdown();
      },
    );

    await t.test(
      "skipBundledContext disables bundled functions but retains workspace context",
      { timeout: 25000 },
      async (t) => {
        const server = await runtimeServer(t, root, {
          skipBundledContext: true,
        });
        assert.ok(
          completionNamed(await server.complete("project"), "projectGlobal"),
          "Opt-out lost workspace global",
        );
        const globals = await server.complete("get");
        assert.equal(
          completionNamed(globals, "getOperationResult"),
          undefined,
          "Opt-out still exposes bundled function",
        );
        assert.equal(
          completionNamed(globals, "getActiveFlow")?.detail,
          "java.lang.String",
        );
        await server.shutdown();
      },
    );
  },
);
