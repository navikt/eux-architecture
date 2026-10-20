import type { ComponentType, SVGProps } from "react";
import {
  ArchiveIcon,
  CloudIcon,
  CodeIcon,
  ComponentIcon,
  FilesIcon,
  FolderFileIcon,
  HandShakeHeartIcon,
  HouseIcon,
  LayersIcon,
  LinkIcon,
  LocationPinIcon,
  TestFlaskIcon,
  TrashIcon,
  WavesIcon,
} from "@navikt/aksel-icons";

export type NavIcon = ComponentType<SVGProps<SVGSVGElement>>;

export type NavItem = {
  href: string;
  label: string;
  Icon: NavIcon;
  external?: boolean;
  /** Shows a padlock; the route must also be left out of `autoLoginIgnorePaths`. */
  requiresLogin?: boolean;
  /** Listed in the command menu before the user has typed anything. */
  start?: boolean;
};

export type NavSection = { heading?: string; items: readonly NavItem[] };

/**
 * The single list of portal pages. The sidebar renders it, the home page and
 * command menu pick pages from it by `PageHref`, and `scripts/search-index.mjs`
 * parses it to decide which routes to index, so keep it a plain literal.
 */
const NAVIGATION = [
  {
    items: [
      { href: "/", label: "Oversikt", Icon: HouseIcon },
      { href: "/ny-i-teamet", label: "Ny i teamet", Icon: HandShakeHeartIcon, start: true },
    ],
  },
  {
    heading: "Plattform",
    items: [
      { href: "/architecture", label: "Arkitektur", Icon: LayersIcon, start: true },
      { href: "/applications", label: "Applikasjoner", Icon: ComponentIcon, start: true },
      { href: "/environments", label: "Miljøer", Icon: CloudIcon, start: true },
    ],
  },
  {
    heading: "Prosesser",
    items: [
      { href: "/prosesser/automatisk-avslutning", label: "Automatisk avslutning", Icon: ArchiveIcon },
      { href: "/prosesser/automatisk-sletting", label: "Automatisk sletting", Icon: TrashIcon },
      { href: "/prosesser/journalfoering", label: "Journalføring", Icon: FolderFileIcon, start: true },
      { href: "/prosesser/adresseoppdatering", label: "Adresseoppdatering", Icon: LocationPinIcon },
    ],
  },
  {
    heading: "Kafka",
    items: [
      { href: "/kafka/sed-hendelser", label: "SED-hendelser", Icon: WavesIcon, requiresLogin: true },
      { href: "/kafka/sed-kobling", label: "SED-kobling", Icon: LinkIcon, requiresLogin: true },
    ],
  },
  {
    heading: "Nav-rinasak",
    items: [
      { href: "/nav-rinasak/sed-er", label: "SED-er i nEESSI", Icon: FilesIcon, requiresLogin: true },
    ],
  },
  {
    heading: "Verktøy",
    items: [
      { href: "/tests", label: "Smoke-test", Icon: TestFlaskIcon, requiresLogin: true },
    ],
  },
  {
    heading: "Ressurser",
    items: [
      { href: "https://github.com/navikt/eux-architecture", label: "GitHub", Icon: CodeIcon, external: true },
    ],
  },
] as const satisfies readonly NavSection[];

export const NAV_SECTIONS: readonly NavSection[] = NAVIGATION;

type NavLiteral = (typeof NAVIGATION)[number]["items"][number];

/** Every internal portal route, so a typo or removed page fails typecheck. */
export type PageHref = Exclude<NavLiteral, { external: true }>["href"];

const NAV_ITEMS = NAV_SECTIONS.flatMap((section) => section.items);

const PAGE_BY_HREF = new Map(NAV_ITEMS.map((item) => [item.href, item]));

export function navPage(href: PageHref): NavItem {
  return PAGE_BY_HREF.get(href)!;
}

export const START_PAGES = NAV_ITEMS.filter((item) => item.start).map((item) => item.href);
