import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const parse = (path) => ts.createSourceFile(path, readFileSync(path, "utf8"), ts.ScriptTarget.Latest, true);
const clean = (text) => text.replace(/\s+/g, " ").trim();
const property = (node, name) => node.properties.find((p) => ts.isPropertyAssignment(p) && p.name.getText() === name)?.initializer;
const literal = (node) => node && ts.isStringLiteral(node) ? node.text : "";
const isText = (node) => ts.isStringLiteral(node) || ts.isTemplateLiteral(node);
const isConstant = (node) => ts.isStringLiteral(node) || ts.isNumericLiteral(node);
// A template's literal parts, with `${NAME}` filled in when NAME is a known constant.
function templateText(node, constants) {
  if (ts.isNoSubstitutionTemplateLiteral(node)) return node.text;
  return node.head.text + node.templateSpans.map((span) => {
    const value = ts.isIdentifier(span.expression) ? constants.get(span.expression.text) : undefined;
    return (value ?? " ") + span.literal.text;
  }).join("");
}
// Filled from lib/navigation.ts below; `page: "/href"` references index as the page's label.
const navLabels = new Map();
const textKeys = new Set(["title", "label", "text", "description", "summary", "lead", "what", "how", "note", "body", "name", "term", "meaning", "sub", "detail", "facts", "explanation"]);
const textAttributes = new Set(["title", "lead", "eyebrow", "term"]);

const isTextKey = (node) => ts.isPropertyAssignment(node) && textKeys.has(node.name.getText());
const isTextAttribute = (node) => ts.isJsxAttribute(node) && textAttributes.has(node.name.getText());
const isNodeCall = (node) => ts.isCallExpression(node) && ["app", "ext", "topic"].includes(node.expression.getText());
const words = (text) => text.split(/\s+/).filter((word) => /\p{L}/u.test(word)).length;

// Whether a string is visible copy.
function isTextPosition(node) {
  const parent = node.parent;
  return (
    isTextKey(parent) ||
    ts.isArrayLiteralExpression(parent) ||
    isNodeCall(parent) ||
    ts.isJsxExpression(parent) ||
    isTextAttribute(parent)
  );
}

// Templates are also class names, keys and code snippets, so only text properties (and their lists), text
// attributes and node arguments count, and only when they hold a phrase rather than a fragment like "Kopier ${id}".
function isTemplateTextPosition(node, text) {
  const parent = node.parent;
  return words(text) >= 3 && (
    isTextKey(parent) ||
    isNodeCall(parent) ||
    (ts.isArrayLiteralExpression(parent) && isTextKey(parent.parent)) ||
    (ts.isJsxExpression(parent) && isTextAttribute(parent.parent))
  );
}

function textOf(node, constants = new Map()) {
  const parts = [];
  function visit(child) {
    if (ts.isJsxText(child)) parts.push(child.text);
    if (ts.isJsxExpression(child) && child.expression) {
      const expression = child.expression;
      if (ts.isNumericLiteral(expression)) parts.push(expression.text);
      if (ts.isIdentifier(expression) && constants.has(expression.text)) parts.push(constants.get(expression.text));
    }
    if (isText(child)) {
      const text = ts.isStringLiteral(child) ? child.text : templateText(child, constants);
      const parent = child.parent;
      if (ts.isPropertyAssignment(parent) && parent.name.getText() === "page" && navLabels.has(text)) {
        parts.push(navLabels.get(text));
      } else if ((ts.isStringLiteral(child) ? isTextPosition(child) : isTemplateTextPosition(child, text)) && !/^(https?:|\/|@|#)/.test(text)) {
        parts.push(text);
      }
    }
    ts.forEachChild(child, visit);
  }
  visit(node);
  return clean(parts.join(" "));
}

// Exported string and number constants per module, so shared copy imported with `@/…` is indexed where it is rendered.
const stringExports = new Map();
function importedStrings(source) {
  const found = new Map();
  for (const statement of source.statements) {
    if (!ts.isImportDeclaration(statement) || !statement.moduleSpecifier.text.startsWith("@/")) continue;
    const names = statement.importClause?.namedBindings;
    if (!names || !ts.isNamedImports(names)) continue;
    const base = join(root, statement.moduleSpecifier.text.slice(2));
    const path = [".ts", ".tsx"].map((ext) => base + ext).find((candidate) => existsSync(candidate));
    if (!path) continue;
    if (!stringExports.has(path)) {
      const strings = new Map();
      for (const node of parse(path).statements) {
        if (!ts.isVariableStatement(node) || !node.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)) continue;
        for (const declaration of node.declarationList.declarations) {
          if (ts.isIdentifier(declaration.name) && declaration.initializer && isConstant(declaration.initializer)) {
            strings.set(declaration.name.text, declaration.initializer.text);
          }
        }
      }
      stringExports.set(path, strings);
    }
    for (const element of names.elements) {
      const value = stringExports.get(path).get((element.propertyName ?? element.name).text);
      if (value !== undefined) found.set(element.name.text, value);
    }
  }
  return found;
}

function filesIn(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? filesIn(path) : /\.tsx?$/.test(path) ? [path] : [];
  });
}

function descriptionOf(sources, constants) {
  let description = "";
  let lead = "";
  let afterTitle = false;
  for (const source of sources) {
    function visit(node) {
      if (ts.isPropertyAssignment(node) && node.name.getText() === "description") {
        description ||= literal(node.initializer);
      }
      if (ts.isJsxElement(node)) {
        const tag = node.openingElement.tagName.getText();
        if (tag === "Heading" && node.openingElement.attributes.properties.some((attr) =>
          ts.isJsxAttribute(attr) && attr.name.getText() === "level" && literal(attr.initializer) === "1",
        )) afterTitle = true;
        if (afterTitle && ["BodyLong", "BodyShort"].includes(tag)) lead ||= textOf(node, constants);
      }
      ts.forEachChild(node, visit);
    }
    visit(source);
  }
  return description || lead;
}

// Only documentation-owned components are indexed. Never follow imports into
// authentication, API handlers, fixtures, or live/user data.
const componentFolders = {
  "/": [],
  "/ny-i-teamet": ["ny-i-teamet"],
  "/architecture": ["architecture"],
  "/applications": [],
  "/environments": ["miljoer"],
  "/prosesser/automatisk-avslutning": ["avslutning"],
  "/prosesser/automatisk-sletting": ["sletting"],
  "/prosesser/journalfoering": ["journalfoering"],
  "/prosesser/adresseoppdatering": ["adresse"],
};

// lib/navigation.ts is the single page list; index every internal route in it.
const navigation = parse(join(root, "lib/navigation.ts"));
let sections;
function findNavigation(node) {
  if (ts.isVariableDeclaration(node) && node.name.getText() === "NAVIGATION") sections = node.initializer;
  ts.forEachChild(node, findNavigation);
}
findNavigation(navigation);
while (sections && (ts.isSatisfiesExpression(sections) || ts.isAsExpression(sections))) sections = sections.expression;
if (!sections || !ts.isArrayLiteralExpression(sections)) throw new Error("Cannot find NAVIGATION in lib/navigation.ts");
for (const section of sections.elements) {
  for (const item of property(section, "items").elements) navLabels.set(literal(property(item, "href")), literal(property(item, "label")));
}

const documents = [];
for (const section of sections.elements) {
  const group = literal(property(section, "heading")) || "Portalen";
  for (const item of property(section, "items").elements) {
    if (property(item, "external")?.kind === ts.SyntaxKind.TrueKeyword) continue;
    const href = literal(property(item, "href"));
    const title = literal(property(item, "label"));
    const requiresLogin = property(item, "requiresLogin")?.kind === ts.SyntaxKind.TrueKeyword;
    const page = parse(join(root, "app", href, "page.tsx"));
    const sources = [page];
    for (const folder of componentFolders[href] ?? []) {
      for (const path of filesIn(join(root, "components", folder))) sources.push(parse(path));
    }
    const declarations = new Map();
    const constants = new Map();
    for (const source of sources) {
      for (const [name, value] of importedStrings(source)) constants.set(name, value);
      for (const statement of source.statements) {
        if (ts.isVariableStatement(statement)) {
          for (const node of statement.declarationList.declarations) {
            if (ts.isIdentifier(node.name) && node.initializer) {
              declarations.set(node.name.text, node.initializer);
              if (isConstant(node.initializer)) constants.set(node.name.text, node.initializer.text);
            }
          }
        }
        if (ts.isFunctionDeclaration(statement) && statement.name) declarations.set(statement.name.text, statement);
      }
    }
    const content = requiresLogin ? title : [...new Set(sources.map((source) => textOf(source, constants)))].join(" ");
    documents.push({
      href, title, group, requiresLogin,
      kind: requiresLogin ? "live" : "docs",
      description: requiresLogin ? `${title}. Krever innlogging.` : descriptionOf(sources, constants) || content.slice(0, 240),
      content,
    });
    if (requiresLogin) continue;
    function referencedText(node, seen = new Set()) {
      const parts = [textOf(node, constants)];
      function visit(child) {
        if (ts.isIdentifier(child) && /^[A-Z]/.test(child.text) && !seen.has(child.text) && declarations.has(child.text)) {
          seen.add(child.text);
          parts.push(referencedText(declarations.get(child.text), seen));
        }
        ts.forEachChild(child, visit);
      }
      visit(node);
      return clean(parts.join(" "));
    }
    for (const source of sources) {
      function visit(node) {
        if (ts.isJsxElement(node) && node.openingElement.tagName.getText() === "Section") {
          const attrs = node.openingElement.attributes.properties;
          const attr = (name) => literal(attrs.find((a) => ts.isJsxAttribute(a) && a.name.getText() === name)?.initializer);
          const id = attr("id");
          const sectionTitle = attr("title");
          if (id && sectionTitle) {
            const sectionContent = referencedText(node);
            documents.push({
              href: `${href}#${id}`, title: sectionTitle, group: title,
              kind: "docs", requiresLogin: false,
              description: attr("lead") || sectionContent.slice(0, 240),
              content: sectionContent,
            });
          }
        }
        ts.forEachChild(node, visit);
      }
      visit(source);
    }
  }
}
const unique = [...new Map(documents.map((doc) => [doc.href, doc])).values()];
writeFileSync(join(root, "lib/search-index.json"), JSON.stringify(unique));
console.log(`Indexed ${unique.length} portal pages and sections`);
