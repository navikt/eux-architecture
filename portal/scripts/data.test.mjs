import assert from "node:assert/strict";
import { test } from "node:test";
import { EDGES, NODES, NODE_BY_ID } from "../components/architecture/data.ts";
import { LINES, LINE_ORDER, SOURCE, STATIONS } from "../components/architecture/metro.ts";
import { JOBS as AVSLUTT_JOBS, JOB_BY_ID as AVSLUTT_JOB_BY_ID } from "../components/avslutning/data.ts";
import { ENV_SERVICES } from "../components/miljoer/data.ts";
import { cronTime, klokke } from "../components/process/time.ts";
import { capitalize, joinOg, tallord } from "../lib/text.ts";

test("every service in ENV_SERVICES is an app in the architecture model", () => {
  for (const { id } of ENV_SERVICES) {
    assert.ok(NODE_BY_ID[id], `${id} is not a node in components/architecture/data.ts`);
    assert.equal(NODE_BY_ID[id].kind, "app", `${id} is a ${NODE_BY_ID[id].kind}, not an app`);
  }
});

test("ENV_SERVICES lists each service once", () => {
  const ids = ENV_SERVICES.map((s) => s.id);
  assert.deepEqual(ids.filter((id, i) => ids.indexOf(id) !== i), []);
});

test("prose helpers write counts and lists in Norwegian", () => {
  assert.equal(tallord(9), "ni");
  assert.equal(tallord(13), "13");
  assert.equal(capitalize(tallord(7)), "Sju");
  assert.deepEqual([[], ["a"], ["a", "b"], ["a", "b", "c"]].map(joinOg), ["", "a", "a og b", "a, b og c"]);
});

test("the event metro has a station for every service on its topics", () => {
  const topics = new Set(LINE_ORDER.map((l) => LINES[l].name));
  const onTopics = EDGES.filter((e) => e.kind === "event")
    .flatMap((e) => (topics.has(e.from) ? [e.to] : topics.has(e.to) ? [e.from] : []))
    .filter((id) => id !== SOURCE);
  const stations = new Set(STATIONS.map((s) => s.id));
  for (const id of new Set(onTopics)) assert.ok(stations.has(id), `${id} reads or writes a metro topic but has no station in metro.ts`);
  for (const l of LINE_ORDER) assert.equal(NODE_BY_ID[LINES[l].name]?.kind, "topic", `${LINES[l].name} is not a topic in data.ts`);
  for (const s of STATIONS.filter((s) => !s.ghost)) {
    assert.ok(NODE_BY_ID[s.id], `${s.id} is not a node in data.ts`);
    assert.ok(s.lines.length > 0, `${s.id} is on no metro line`);
  }
});

test("each avslutning job runs after the job that writes what it reads", () => {
  for (const job of AVSLUTT_JOBS.filter((j) => j.after)) {
    const prev = AVSLUTT_JOB_BY_ID[job.after];
    const at = (j) => cronTime(j.sched.prod.cron);
    assert.ok(at(prev).h * 60 + at(prev).m < at(job).h * 60 + at(job).m, `${prev.id} does not run before ${job.id}`);
    assert.ok(job.from.some((s) => prev.to.includes(s)), `${prev.id} writes none of the statuses ${job.id} reads`);
  }
});

test("cronTime reads NAIS and Spring crons", () => {
  assert.deepEqual(cronTime("42 14 * * *"), { h: 14, m: 42, monthly: false });
  assert.deepEqual(cronTime("5 0 1 * *"), { h: 0, m: 5, monthly: true });
  assert.deepEqual(cronTime("0 0 22 * * ?"), { h: 22, m: 0, monthly: false });
});

test("services with a built-in @Scheduled job name its prod time in a fact", () => {
  for (const n of NODES.filter((n) => n.scheduled)) {
    const { h, m } = cronTime(n.scheduled);
    assert.ok(n.facts?.some((f) => f.includes(`kl. ${klokke(h, m)}`)), `no fact on ${n.id} says kl. ${klokke(h, m)}`);
  }
});
