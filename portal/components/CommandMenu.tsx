"use client";

import {
  useCallback, useDeferredValue, useEffect, useId, useMemo, useRef, useState, useSyncExternalStore,
  type CSSProperties,
} from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRightIcon, ComponentIcon, FileTextIcon, MagnifyingGlassIcon,
  PadlockLockedIcon, SparklesIcon, WavesIcon, XMarkIcon,
} from "@navikt/aksel-icons";
import { SEARCH_DOCUMENTS, SEARCH_INDEX } from "@/lib/search-catalogue";
import { normalize, searchDocuments, type SearchDocument, type SearchResult } from "@/lib/search";
import { START_PAGES } from "@/lib/navigation";
import styles from "./CommandMenu.module.css";

const FILTERS = [
  { id: "all", label: "Alt" },
  { id: "docs", label: "Dokumentasjon" },
  { id: "apps", label: "Applikasjoner" },
  { id: "live", label: "Sanntid og verktøy" },
] as const;
type Filter = typeof FILTERS[number]["id"];
const ICONS = { docs: FileTextIcon, apps: ComponentIcon, live: WavesIcon };
const SUGGESTIONS = ["journalføring", "RINA", "Kafka", "PDL"];
const START_RESULTS: SearchResult[] = START_PAGES.flatMap((href) => {
  const doc = SEARCH_DOCUMENTS.find((doc) => doc.href === href);
  return doc ? [{ ...doc, score: 0, excerpt: doc.description }] : [];
});
const subscribePlatform = () => () => {};
const isMacPlatform = () => /Mac|iPhone|iPad/.test(navigator.platform);

function Highlight({ text, query }: { text: string; query: string }) {
  const terms = normalize(query).split(/[^a-z0-9]+/).filter((term) => term.length >= 2);
  return text.split(/([\p{L}\p{N}-]+)/gu).map((part, i) =>
    terms.some((term) => normalize(part).includes(term))
      ? <mark key={i}>{part}</mark>
      : part,
  );
}

export function CommandMenu({ onNavigate }: { onNavigate: () => void }) {
  const router = useRouter();
  const isMac = useSyncExternalStore(subscribePlatform, isMacPlatform, () => true);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const id = useId();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [active, setActive] = useState(0);
  const deferredQuery = useDeferredValue(query);
  const hasQuery = Boolean(deferredQuery.trim());
  const matches = useMemo(
    () => hasQuery ? searchDocuments(SEARCH_INDEX, deferredQuery) : START_RESULTS,
    [hasQuery, deferredQuery],
  );
  const filtered = useMemo(() => {
    const source = !hasQuery && filter !== "all"
      ? SEARCH_DOCUMENTS.map((doc) => ({ ...doc, score: 0, excerpt: doc.description }))
      : matches;
    return source.filter((doc) => filter === "all" || doc.kind === filter);
  }, [matches, filter, hasQuery]);
  const results = filtered.slice(0, 30);
  const activeIndex = Math.min(active, Math.max(0, results.length - 1));
  const selected = results[activeIndex];

  const close = useCallback(() => dialogRef.current?.close(), []);
  const open = useCallback(() => {
    setQuery("");
    setFilter("all");
    setActive(0);
    dialogRef.current?.showModal();
    setIsOpen(true);
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k" && !event.isComposing) {
        event.preventDefault();
        if (event.repeat) return;
        if (dialogRef.current?.open) close();
        else open();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [close, open]);

  useEffect(() => {
    if (!isOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, [isOpen]);

  useEffect(() => {
    listRef.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, selected?.href]);

  function navigate(doc: SearchDocument) {
    close();
    onNavigate();
    const destination = new URL(doc.href, window.location.origin);
    if (destination.pathname === window.location.pathname && destination.hash) {
      // The service catalogue expands cards on hashchange, which Next's
      // same-page router.push does not emit.
      const sameHash = destination.hash === window.location.hash;
      window.location.assign(doc.href);
      if (sameHash) window.dispatchEvent(new HashChangeEvent("hashchange"));
    } else {
      router.push(doc.href);
    }
  }

  function updateQuery(value: string) {
    setQuery(value);
    setActive(0);
  }

  return (
    <>
      <button
        type="button"
        className={styles.trigger}
        data-color="neutral"
        onClick={open}
        aria-haspopup="dialog"
        aria-controls={`${id}-dialog`}
        aria-keyshortcuts="Meta+K Control+K"
      >
        <MagnifyingGlassIcon aria-hidden />
        <span>Søk i portalen</span>
        <kbd>{isMac ? "⌘" : "Ctrl"} K</kbd>
      </button>

      <dialog
        ref={dialogRef}
        id={`${id}-dialog`}
        className={styles.dialog}
        data-color="neutral"
        aria-labelledby={`${id}-title`}
        onClose={() => setIsOpen(false)}
        onClick={(event) => { if (event.target === event.currentTarget) close(); }}
      >
        <div className={styles.atmosphere} aria-hidden="true">
          <div className={styles.aurora} />
          <div className={styles.grid} />
          {Array.from({ length: 18 }, (_, i) => (
            <span
              className={styles.star}
              key={i}
              style={{
                "--x": `${(i * 37 + 7) % 100}%`,
                "--y": `${(i * 23 + 11) % 100}%`,
                "--delay": `${(i % 6) * -0.8}s`,
              } as CSSProperties}
            />
          ))}
        </div>

        <div className={styles.panel}>
          <div className={styles.eyebrow}>
            <span><SparklesIcon aria-hidden /> TEAM EESSI <span className={styles.separator}>/</span> FINN FRAM</span>
            <button type="button" onClick={close} className={styles.close} aria-label="Lukk søk">
              <XMarkIcon aria-hidden /><kbd>esc</kbd>
            </button>
          </div>
          <h2 id={`${id}-title`} className="aksel-sr-only">Søk i portalen</h2>
          <div className={styles.search}>
            <MagnifyingGlassIcon aria-hidden className={styles.searchIcon} />
            <input
              ref={inputRef}
              type="text"
              role="combobox"
              aria-label="Søk i dokumentasjon, applikasjoner og prosesser"
              aria-autocomplete="list"
              aria-expanded="true"
              aria-controls={`${id}-results`}
              aria-activedescendant={selected ? `${id}-result-${activeIndex}` : undefined}
              aria-describedby={`${id}-help`}
              autoComplete="off"
              spellCheck={false}
              placeholder="Hva leter du etter?"
              value={query}
              onChange={(event) => updateQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.nativeEvent.isComposing) return;
                if (["ArrowDown", "ArrowUp", "Enter"].includes(event.key)) event.preventDefault();
                if (event.key === "ArrowDown") setActive((activeIndex + 1) % Math.max(1, results.length));
                if (event.key === "ArrowUp") setActive((activeIndex - 1 + results.length) % Math.max(1, results.length));
                if (event.key === "Enter" && selected) navigate(selected);
              }}
            />
            {query && <button type="button" className={styles.clear} aria-label="Tøm søk" onClick={() => { updateQuery(""); inputRef.current?.focus(); }}><XMarkIcon aria-hidden /></button>}
          </div>
          <p className={styles.subheading} id={`${id}-help`}>Fra det store bildet til den lille detaljen. Litt skrivefeil går fint.</p>

          <div className={styles.filters} role="group" aria-label="Avgrens søket">
            {FILTERS.map((item) => (
              <button
                key={item.id}
                type="button"
                aria-pressed={filter === item.id}
                onClick={() => { setFilter(item.id); setActive(0); }}
              >{item.label}</button>
            ))}
          </div>

          <div className={styles.workspace}>
            <div className={styles.resultsPane}>
              <div className={styles.resultsLabel} aria-hidden="true">
                <span>{hasQuery ? "SØKERESULTATER" : filter === "all" ? "GODE STEDER Å STARTE" : "UTFORSK"}</span>
                <span>{hasQuery ? `${filtered.length} treff` : "Hopp rett inn"}</span>
              </div>
              <p role="status" className="aksel-sr-only" aria-atomic="true">
                {hasQuery ? `${filtered.length} treff for ${deferredQuery}` : `${filtered.length} forslag`}
              </p>
              <div ref={listRef} className={styles.results} id={`${id}-results`} role="listbox" aria-label="Søkeresultater" aria-busy={query !== deferredQuery}>
                {results.map((doc, i) => {
                  const Icon = ICONS[doc.kind];
                  return (
                    <div
                      key={doc.href}
                      id={`${id}-result-${i}`}
                      role="option"
                      aria-selected={activeIndex === i}
                      className={styles.result}
                      onPointerMove={() => setActive(i)}
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => navigate(doc)}
                    >
                      <span className={styles.resultIcon} data-kind={doc.kind}><Icon aria-hidden /></span>
                      <span className={styles.resultCopy}>
                        <span className={styles.resultTitle}><Highlight text={doc.title} query={deferredQuery} /></span>
                        <span className={styles.resultGroup}>{doc.group}{doc.requiresLogin ? " · Krever innlogging" : ""}</span>
                        {hasQuery && <span className={styles.resultExcerpt}><Highlight text={doc.excerpt} query={deferredQuery} /></span>}
                      </span>
                      {doc.requiresLogin ? <PadlockLockedIcon className={styles.resultArrow} title="Krever innlogging" /> : <ArrowRightIcon aria-hidden className={styles.resultArrow} />}
                    </div>
                  );
                })}
              </div>
              {!results.length && (
                <div className={styles.empty}>
                  <MagnifyingGlassIcon aria-hidden />
                  <strong>Ingen treff ennå</strong>
                  <p>Prøv et kortere søk eller en annen kategori.<br />Du kan søke etter både begreper og tjenester.</p>
                  <button type="button" onClick={() => { setFilter("all"); updateQuery(""); inputRef.current?.focus(); }}>Tilbake til start</button>
                </div>
              )}
              {filtered.length > results.length && <p className={styles.limit}>Viser de {results.length} beste treffene. Skriv litt mer for å avgrense.</p>}
            </div>

            <aside className={styles.preview} aria-label="Forhåndsvisning">
              {selected ? (
                <>
                  <span className={styles.previewEyebrow}>{selected.kind === "apps" ? "TJENESTE I PLATTFORMEN" : selected.href.includes("#") ? "RETT TIL AVSNITTET" : "UTFORSK PORTALEN"}</span>
                  <div className={styles.previewArt} aria-hidden><span /><span /><span /><SparklesIcon /></div>
                  <span className={styles.previewGroup}>{selected.group}</span>
                  <h3>{selected.title}</h3>
                  <p><Highlight text={hasQuery ? selected.excerpt : selected.description} query={deferredQuery} /></p>
                  {selected.requiresLogin && <p className={styles.loginNote}><PadlockLockedIcon aria-hidden /> Krever innlogging med Nav-bruker.</p>}
                  <button type="button" onClick={() => navigate(selected)} className={styles.openResult}>
                    {selected.href.includes("#") ? "Gå til avsnitt" : "Åpne side"}<ArrowRightIcon aria-hidden />
                  </button>
                  <span className={styles.destination}>{selected.href}</span>
                </>
              ) : (
                <div className={styles.previewEmpty}><SparklesIcon aria-hidden /><p>Det du trenger, er kanskje bare ett søkeord unna.</p></div>
              )}
            </aside>
          </div>
          {!hasQuery && (
            <div className={styles.suggestions}>
              <span>Prøv</span>
              {SUGGESTIONS.map((word) => <button type="button" key={word} onClick={() => { updateQuery(word); inputRef.current?.focus(); }}>{word}<ArrowRightIcon aria-hidden /></button>)}
            </div>
          )}
          <footer className={styles.footer}>
            <span><kbd>↑</kbd><kbd>↓</kbd> naviger <kbd>↵</kbd> åpne</span>
            <span><span className={styles.footerDot} /> Alt søkes lokalt</span>
          </footer>
        </div>
        <p className={styles.outsideHint} aria-hidden="true">Mindre leting. Mer sammenheng.</p>
      </dialog>
    </>
  );
}
