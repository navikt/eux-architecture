import NextLink from "next/link";
import { ArrowRightIcon, ExternalLinkIcon } from "@navikt/aksel-icons";
import { ghHref } from "@/lib/links";

export type FurtherLink = { href: string; title: string; text: string; external?: boolean };

/** One "Kildekoden på GitHub" card per repository. */
export const repoLinks = (repos: readonly string[]): FurtherLink[] =>
  repos.map((r) => ({ href: ghHref(r), title: r, text: "Kildekoden på GitHub.", external: true }));

/** The "Videre lesing" link cards at the bottom of a page. External links open in a new tab. */
export function FurtherReading({ links }: { links: readonly FurtherLink[] }) {
  return (
    <div className="arch-further">
      {links.map((f) =>
        f.external ? (
          <a key={f.href} href={f.href} target="_blank" rel="noreferrer" className="arch-further__card">
            <strong>
              {f.title} <ExternalLinkIcon aria-hidden />
            </strong>
            <span>{f.text}</span>
          </a>
        ) : (
          <NextLink key={f.href} href={f.href} className="arch-further__card">
            <strong>
              {f.title} <ArrowRightIcon aria-hidden />
            </strong>
            <span>{f.text}</span>
          </NextLink>
        ),
      )}
    </div>
  );
}
