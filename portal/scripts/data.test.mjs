import assert from "node:assert/strict";
import { test } from "node:test";
import { NODE_BY_ID } from "../components/architecture/data.ts";
import { ENV_SERVICES } from "../components/miljoer/data.ts";
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
