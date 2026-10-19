import pages from "./search-index.json";
import { NODES } from "@/components/architecture/data";
import { createSearchIndex, type SearchDocument } from "./search";

export const SEARCH_DOCUMENTS: SearchDocument[] = [
  ...pages.map((page): SearchDocument => ({
    ...page,
    kind: page.kind === "live" ? "live" : "docs",
  })),
  ...NODES.filter((node) => node.kind === "app" || node.kind === "job").map((node): SearchDocument => ({
    href: `/applications#${node.id}`,
    title: node.name,
    group: "Applikasjoner",
    kind: "apps",
    description: node.summary,
    content: [node.summary, ...(node.facts ?? []), node.lang, node.db ? "PostgreSQL database Flyway" : ""].join(" "),
    requiresLogin: false,
  })),
];

export const SEARCH_INDEX = createSearchIndex(SEARCH_DOCUMENTS);
