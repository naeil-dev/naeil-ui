import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import ts from "typescript";

const root = resolve("dist/naeil-locale");
function graph(entry: string, dynamic = false) {
  const visited = new Set<string>();
  const externals = new Set<string>();
  function visit(file: string) {
    if (visited.has(file)) return;
    visited.add(file);
    const text = readFileSync(file, "utf8");
    const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true);
    const specifiers: string[] = [];
    function scan(node: ts.Node) {
      if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) specifiers.push(node.moduleSpecifier.text);
      if (dynamic && ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword && ts.isStringLiteral(node.arguments[0])) specifiers.push(node.arguments[0].text);
      ts.forEachChild(node, scan);
    }
    scan(source);
    for (const specifier of specifiers) {
      if (specifier.startsWith(".")) visit(resolve(dirname(file), specifier)); else externals.add(specifier);
    }
  }
  visit(resolve(root, entry));
  return { files: visited, externals, source: [...visited].map(file => readFileSync(file, "utf8")).join("\n").replace(/\\u([0-9a-f]{4})/gi, (_, code: string) => String.fromCharCode(Number.parseInt(code, 16))) };
}
const client = graph("client.js"), chrome = graph("chrome.js"), server = graph("server.js"), messages = graph("messages.js"), neutral = graph("index.js");
for (const bundle of [client, chrome, messages, neutral]) {
  for (const forbidden of ["server-only", "next/server", "next/headers", "next-intl/server", "next-intl/middleware"]) assert(!bundle.externals.has(forbidden), `Server dependency in client/neutral graph: ${forbidden}`);
}
assert(server.externals.has("server-only"), "Server entry lost its explicit boundary");
assert(client.externals.has("react") && client.externals.has("next-intl") && chrome.externals.has("react"), "Host React/Intl contexts were bundled");
const contextFiles = (bundle: ReturnType<typeof graph>) => [...bundle.files].filter(file => /NaeilMessages\s*=\s*createContext/.test(readFileSync(file, "utf8")));
assert.equal(contextFiles(client).length, 1, "Expected one client shared-message context");
assert.deepEqual(contextFiles(client), contextFiles(chrome), "Client/chrome use different shared-message context instances");
for (const bundle of [client, chrome, server, messages]) assert(!bundle.source.includes("Logging out…"), "All-language shared dictionaries were statically included outside standalone compatibility");
const fullMessages = graph("messages.js", true);
for (const phrase of ["Logging out…", "로그아웃 중…", "ログアウト中…"]) assert(fullMessages.source.includes(phrase), `Missing lazy shared dictionary: ${phrase}`);
assert.equal(readdirSync(root).filter(file => /^(?:en|ko|ja)-.*\.js$/.test(file)).length, 3, "Expected exactly one lazy chunk per shared locale");
console.log("Locale package PASS: shared client/chrome context, external React/Intl, separate server boundary, three lazy shared JSON chunks");
