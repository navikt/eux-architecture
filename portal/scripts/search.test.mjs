import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { createSearchIndex, excerptFor, normalize, searchDocuments } from "../lib/search.ts";
import { NODES } from "../components/architecture/data.ts";

const pages = JSON.parse(readFileSync(new URL("../lib/search-index.json", import.meta.url), "utf8"));
const index = createSearchIndex([
  ...pages,
  ...NODES.filter((node) => node.kind === "app" || node.kind === "job").map((node) => ({
    href: `/applications#${node.id}`, title: node.name, group: "Applikasjoner", kind: "apps",
    description: node.summary, content: [node.summary, ...(node.facts ?? []), node.lang].join(" "),
    requiresLogin: false,
  })),
]);
const search = (query) => searchDocuments(index, query);

test("matches Norwegian characters, ASCII equivalents, and case", () => {
  assert.equal(normalize("Æ Ø Å É"), "ae o a e");
  for (const query of ["journalføring", "journalforing", "JOURNALFØRING"]) {
    assert.equal(search(query)[0].href, "/prosesser/journalfoering");
  }
  assert.equal(search("miljoer")[0].href, "/environments");
});

test("tolerates missing, extra and adjacent transposed letters", () => {
  for (const query of ["journlføring", "journalfføring", "jorunalføring"]) {
    assert.equal(search(query)[0].href, "/prosesser/journalfoering", query);
  }
  assert.ok(search("arkitketur").some((doc) => doc.href === "/architecture"));
});

test("ranks exact service titles above references in documentation", () => {
  assert.equal(search("eux-rina-api")[0].href, "/applications#eux-rina-api");
  assert.equal(search("eux-nav-rinasak")[0].href, "/applications#eux-nav-rinasak");
});

test("finds content that is not present in page titles", () => {
  assert.ok(search("maximum-pool-size").some((doc) => doc.href === "/architecture#fallgruver"));
  assert.ok(search("FEILET_FERDIGSTILL").some((doc) => doc.href.startsWith("/prosesser/journalfoering")));
  assert.ok(search("Wonderwall").some((doc) => doc.href.startsWith("/applications#")));
});

test("finds matching sections and component data", () => {
  assert.ok(search("DLT").some((doc) => doc.href === "/architecture#fallgruver"));
  assert.ok(search("Slack").some((doc) => doc.href === "/ny-i-teamet#slack"));
  assert.ok(pages.some((doc) => doc.href === "/ny-i-teamet#forste-uke"));
});

test("requires every query term and supports partial words", () => {
  assert.ok(search("kafka journal").length > 0);
  assert.equal(search("kafka xyzzywombat").length, 0);
  assert.ok(search("journalf").some((doc) => doc.href === "/prosesser/journalfoering"));
});

test("empty and punctuation-only queries have no search results", () => {
  for (const query of ["", "  ", "?!", "🎉"]) assert.deepEqual(search(query), []);
});

test("short queries do not fuzzy-match unrelated words", () => {
  const docs = createSearchIndex([{ href: "/test", title: "RINA", group: "", content: "", description: "", kind: "docs", requiresLogin: false }]);
  assert.equal(searchDocuments(docs, "RIX").length, 0);
});

test("unknown queries are empty; long queries are bounded", () => {
  assert.deepEqual(search("xyzzywombat"), []);
  assert.deepEqual(search("z".repeat(10_000)), []);
});

test("excerpts show the matching passage rather than just the introduction", () => {
  const content = `${"Introduksjon. ".repeat(40)}Wonderwall håndterer innlogging. ${"Mer tekst. ".repeat(40)}`;
  const snippet = excerptFor({ content, description: "" }, "wonderwall");
  assert.match(snippet, /Wonderwall/);
  assert.ok(snippet.startsWith("…"));
  assert.ok(snippet.length <= 222);
});

test("index excludes hidden pages, external links, APIs and live payloads", () => {
  assert.equal(pages.some((doc) => doc.href.startsWith("/nytt-i-neessi")), false);
  assert.equal(pages.some((doc) => doc.href.startsWith("/api") || doc.href.startsWith("http")), false);
  for (const doc of pages.filter((doc) => doc.requiresLogin)) {
    assert.equal(doc.content, doc.title);
    assert.equal(doc.kind, "live");
  }
  assert.equal(new Set(pages.map((doc) => doc.href)).size, pages.length);
});

test("search stays responsive across the real documentation corpus", () => {
  const start = performance.now();
  for (const query of ["journalføring", "arkitketur", "kafka journal", "eux-rina-api", "PDL", "ukjent"]) search(query);
  assert.ok(performance.now() - start < 1500, "Six searches must complete within 1.5s");
});
