import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import ts from "typescript";

// tsup's JSON Rollup plugin can leave JSON variable initializers inside .d.ts
// bundles. Convert only that JSON subset to ambient types, preserving the JS
// graphs and the widened string/number/boolean types of TypeScript JSON imports.
const printer = ts.createPrinter();
function jsonType(value: ts.Expression): ts.TypeNode {
  if (ts.isStringLiteral(value)) return ts.factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword);
  if (ts.isNumericLiteral(value)) return ts.factory.createKeywordTypeNode(ts.SyntaxKind.NumberKeyword);
  if (value.kind === ts.SyntaxKind.TrueKeyword || value.kind === ts.SyntaxKind.FalseKeyword) return ts.factory.createKeywordTypeNode(ts.SyntaxKind.BooleanKeyword);
  if (value.kind === ts.SyntaxKind.NullKeyword) return ts.factory.createLiteralTypeNode(ts.factory.createNull());
  if (ts.isIdentifier(value)) return ts.factory.createTypeQueryNode(value);
  if (ts.isObjectLiteralExpression(value)) return ts.factory.createTypeLiteralNode(value.properties.map(property => {
    if (!ts.isPropertyAssignment(property) || ts.isComputedPropertyName(property.name)) throw new Error("Unsupported JSON declaration property");
    return ts.factory.createPropertySignature(undefined, property.name, undefined, jsonType(property.initializer));
  }));
  throw new Error("Unsupported JSON declaration initializer");
}

for (const name of readdirSync("dist/naeil-locale").filter(name => name.endsWith(".d.ts"))) {
  const path = join("dist/naeil-locale", name);
  const text = readFileSync(path, "utf8");
  const source = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const replacements: { start: number; end: number; text: string }[] = [];
  for (const statement of source.statements) {
    if (!ts.isVariableStatement(statement) || !statement.declarationList.declarations.some(declaration => declaration.initializer)) continue;
    const declarations = statement.declarationList.declarations.map(declaration => {
      if (!declaration.initializer || !ts.isIdentifier(declaration.name)) throw new Error(`Unsupported JSON declaration in ${path}`);
      return ts.factory.updateVariableDeclaration(declaration, declaration.name, undefined, jsonType(declaration.initializer), undefined);
    });
    const ambient = ts.factory.updateVariableStatement(statement, [ts.factory.createModifier(ts.SyntaxKind.DeclareKeyword)], ts.factory.updateVariableDeclarationList(statement.declarationList, declarations));
    replacements.push({ start: statement.getStart(source), end: statement.end, text: printer.printNode(ts.EmitHint.Unspecified, ambient, source) });
  }
  let output = text;
  for (const replacement of replacements.reverse()) output = output.slice(0, replacement.start) + replacement.text + output.slice(replacement.end);
  if (output !== text) writeFileSync(path, output);
}
