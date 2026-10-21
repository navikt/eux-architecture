import type { ReactNode } from "react";
import { CheckmarkIcon, XMarkIcon } from "@navikt/aksel-icons";
import { Accordion, Table, Tag } from "@navikt/ds-react";
import type { Verification } from "./smokeTest";

function CheckTag({ ok, children }: { ok: boolean; children: ReactNode }) {
  return (
    <Tag
      size="small"
      variant="moderate"
      data-color={ok ? "success" : "danger"}
      icon={ok ? <CheckmarkIcon aria-hidden /> : <XMarkIcon aria-hidden />}
    >
      {children}
    </Tag>
  );
}

function groupByOrigin(verifications: Verification[]): [string, Verification[]][] {
  const groups = new Map<string, Verification[]>();
  for (const v of verifications) groups.set(v.group, [...(groups.get(v.group) ?? []), v]);
  return [...groups];
}

/** Field checks grouped by where they came from. Groups with a failed check start open. */
export function VerificationGroups({ verifications }: { verifications: Verification[] }) {
  return (
    <Accordion size="small" className="tst-checks">
      {groupByOrigin(verifications).map(([group, items]) => {
        const passed = items.filter((v) => v.ok).length;
        const allOk = passed === items.length;
        return (
          <Accordion.Item key={group} defaultOpen={!allOk}>
            <Accordion.Header>
              <span className="tst-checks__head">
                {group}
                <CheckTag ok={allOk}>
                  {passed}/{items.length} {allOk ? "alle matcher" : "avvik"}
                </CheckTag>
              </span>
            </Accordion.Header>
            <Accordion.Content>
              <div className="tst-scroll">
                <Table size="small">
                  <Table.Header>
                    <Table.Row>
                      <Table.HeaderCell scope="col">Felt</Table.HeaderCell>
                      <Table.HeaderCell scope="col">Forventet</Table.HeaderCell>
                      <Table.HeaderCell scope="col">Faktisk</Table.HeaderCell>
                      <Table.HeaderCell scope="col" align="right">
                        Resultat
                      </Table.HeaderCell>
                    </Table.Row>
                  </Table.Header>
                  <Table.Body>
                    {items.map((v) => (
                      <Table.Row key={v.label} className={v.ok ? undefined : "is-fail"}>
                        <Table.HeaderCell scope="row">{v.label}</Table.HeaderCell>
                        <Table.DataCell>
                          <code>{v.expected ?? "—"}</code>
                        </Table.DataCell>
                        <Table.DataCell>
                          <code className="tst-checks__actual">{v.actual ?? "(null)"}</code>
                        </Table.DataCell>
                        <Table.DataCell align="right">
                          <CheckTag ok={v.ok}>{v.ok ? "match" : "avvik"}</CheckTag>
                        </Table.DataCell>
                      </Table.Row>
                    ))}
                  </Table.Body>
                </Table>
              </div>
            </Accordion.Content>
          </Accordion.Item>
        );
      })}
    </Accordion>
  );
}
