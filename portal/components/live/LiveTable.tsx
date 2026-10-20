"use client";

import type { CSSProperties, ReactNode } from "react";
import { BodyShort, Skeleton, Table } from "@navikt/ds-react";
import { groupByDay, type LiveFeed } from "./hooks";

export interface LiveColumn<T> {
  header: string;
  cell: (row: T) => ReactNode;
  className?: string;
}

/** Extra modifiers and CSS variables for one row, on top of `live-row`. */
export interface LiveRowProps {
  className?: string;
  style?: CSSProperties;
}

/** Stagger index for row entry animations, capped so long tables do not lag. */
const rowStyle = (i: number, extra?: CSSProperties): CSSProperties =>
  ({ "--i": Math.min(i, 24), ...extra }) as CSSProperties;

/** The skeleton grid in globals.css (`.live-skel`) has seven columns. */
const SKELETON_COLS = 7;

/**
 * The table on a live page, with its loading, error, empty and no-hits states.
 * `rows` are the filtered rows, newest first, and are grouped by the day of
 * `time(row)`. `total` is the number of rows before filtering. Each row expands
 * to `details(row)`.
 */
export function LiveTable<T>({
  feed,
  rows,
  total,
  rowKey,
  time,
  columns,
  details,
  rowProps,
  unit,
  empty,
  className,
}: {
  feed: Pick<LiveFeed, "loading" | "error">;
  rows: T[];
  total: number;
  rowKey: (row: T) => string;
  time: (row: T) => string | null | undefined;
  columns: LiveColumn<T>[];
  details: (row: T) => ReactNode;
  rowProps?: (row: T) => LiveRowProps;
  /** Singular and plural unit for the day headings, e.g. ["hendelse", "hendelser"]. */
  unit: readonly [one: string, many: string];
  empty: { title: string; text: ReactNode };
  className?: string;
}) {
  if (feed.loading) return <TableSkeleton />;
  if (feed.error && total === 0) {
    return (
      <LiveMessage tone="danger" title="Fikk ikke kontakt med eux-portal-core">
        {feed.error}. Siden prøver å koble til strømmen igjen av seg selv.
      </LiveMessage>
    );
  }
  if (total === 0) return <LiveMessage title={empty.title}>{empty.text}</LiveMessage>;
  if (rows.length === 0) {
    return <LiveMessage title="Ingen treff">Prøv et annet søk, eller nullstill filtrene.</LiveMessage>;
  }

  let index = 0;
  return (
    <div className={`arch-table live-table${className ? ` ${className}` : ""}`}>
      <Table size="small">
        <Table.Header>
          <Table.Row>
            <Table.HeaderCell />
            {columns.map((c) => (
              <Table.HeaderCell key={c.header}>{c.header}</Table.HeaderCell>
            ))}
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {groupByDay(rows, time).flatMap((g) => [
            <DayRow
              key={`day-${g.key}`}
              heading={g.heading}
              count={g.rows.length}
              unit={g.rows.length === 1 ? unit[0] : unit[1]}
              colSpan={columns.length + 1}
            />,
            ...g.rows.map((row) => {
              const extra = rowProps?.(row);
              return (
                <Table.ExpandableRow
                  key={rowKey(row)}
                  expandOnRowClick
                  togglePlacement="left"
                  content={details(row)}
                  className={extra?.className ? `live-row ${extra.className}` : "live-row"}
                  style={rowStyle(index++, extra?.style)}
                >
                  {columns.map((c) => (
                    <Table.DataCell key={c.header} className={c.className}>
                      {c.cell(row)}
                    </Table.DataCell>
                  ))}
                </Table.ExpandableRow>
              );
            }),
          ])}
        </Table.Body>
      </Table>
    </div>
  );
}

function DayRow({ heading, count, unit, colSpan }: { heading: string; count: number; unit: string; colSpan: number }) {
  const [rel, ...rest] = heading.split(" · ");
  return (
    <Table.Row className="live-day">
      <Table.DataCell colSpan={colSpan}>
        <span className="live-day__inner">
          <strong>{rel}</strong>
          {rest.length > 0 && <span className="arch-subtle">{rest.join(" · ")}</span>}
          <span className="live-day__count">
            {count} {unit}
          </span>
        </span>
      </Table.DataCell>
    </Table.Row>
  );
}

function TableSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div className="arch-table live-table live-table--loading" aria-busy="true" aria-label="Laster">
      {Array.from({ length: rows }, (_, r) => (
        <div key={r} className="live-skel" style={{ "--i": r } as CSSProperties}>
          {Array.from({ length: SKELETON_COLS }, (_, c) => (
            <Skeleton key={c} variant="text" width={c === 0 ? "60%" : `${50 + ((r * 7 + c * 13) % 40)}%`} />
          ))}
        </div>
      ))}
    </div>
  );
}

function LiveMessage({ tone = "neutral", title, children }: { tone?: string; title: string; children?: ReactNode }) {
  return (
    <div className="live-msg" data-tone={tone} role={tone === "danger" ? "alert" : undefined}>
      <strong>{title}</strong>
      {children && <BodyShort size="small">{children}</BodyShort>}
    </div>
  );
}
