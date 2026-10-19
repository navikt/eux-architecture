export type SearchDocument = {
  href: string;
  title: string;
  group: string;
  kind: "docs" | "apps" | "live";
  description: string;
  content: string;
  requiresLogin: boolean;
};

export type SearchResult = SearchDocument & { score: number; excerpt: string };

export function normalize(text: string): string {
  return text.toLowerCase().replace(/æ/g, "ae").replace(/ø/g, "o")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

const words = (text: string) => normalize(text).split(/[^a-z0-9]+/).filter(Boolean);

// Bounded Damerau-Levenshtein: adjacent swapped letters count as one typo.
function distance(a: string, b: string, limit: number): number {
  if (Math.abs(a.length - b.length) > limit) return limit + 1;
  let previousPrevious: number[] = [];
  let previous = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const current = [i];
    for (let j = 1; j <= b.length; j++) {
      current[j] = Math.min(
        current[j - 1] + 1, previous[j] + 1,
        previous[j - 1] + Number(a[i - 1] !== b[j - 1]),
      );
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        current[j] = Math.min(current[j], previousPrevious[j - 2] + 1);
      }
    }
    if (Math.min(...current) > limit) return limit + 1;
    previousPrevious = previous;
    previous = current;
  }
  return previous[b.length];
}

function wordScore(term: string, candidates: string[]): number {
  let best = 0;
  for (const candidate of candidates) {
    if (candidate === term) return 12;
    if (candidate.startsWith(term)) best = Math.max(best, 9);
    else if (term.length >= 3 && candidate.includes(term)) best = Math.max(best, 6);
    else if (term.length >= 4) {
      const limit = term.length >= 8 ? 2 : 1;
      if (distance(term, candidate, limit) <= limit) best = Math.max(best, 4);
    }
  }
  return best;
}

export function createSearchIndex(documents: SearchDocument[]) {
  return documents.map((doc) => ({
    doc,
    titleWords: words(doc.title),
    groupWords: words(doc.group),
    contentWords: [...new Set(words(`${doc.description} ${doc.content}`))],
  }));
}

export function excerptFor(doc: SearchDocument, query: string): string {
  const content = doc.content || doc.description;
  const terms = words(query);
  const tokens = [...content.matchAll(/[\p{L}\p{N}-]+/gu)];
  const match = tokens.find((token) => terms.some((term) => wordScore(term, words(token[0])) > 0));
  const index = match?.index ?? 0;
  const start = Math.max(0, content.lastIndexOf(" ", Math.max(0, index - 65)));
  return `${start > 0 ? "…" : ""}${content.slice(start, start + 220).trim()}${content.length > start + 220 ? "…" : ""}`;
}

export function searchDocuments(index: ReturnType<typeof createSearchIndex>, query: string): SearchResult[] {
  const terms = [...new Set(words(query.slice(0, 160)))];
  if (!terms.length) return [];
  const results: SearchResult[] = [];
  for (const { doc, titleWords, groupWords, contentWords } of index) {
    let score = 0;
    let matched = true;
    for (const term of terms) {
      const weight = Math.max(wordScore(term, titleWords) * 5, wordScore(term, groupWords) * 2, wordScore(term, contentWords));
      if (!weight) { matched = false; break; }
      score += weight;
    }
    if (!matched) continue;
    if (normalize(doc.title).includes(normalize(query.trim()))) score += 35;
    if (!doc.href.includes("#")) score += 2;
    results.push({ ...doc, score, excerpt: excerptFor(doc, query) });
  }
  return results.sort((a, b) => b.score - a.score || a.title.localeCompare(b.title, "no"));
}
