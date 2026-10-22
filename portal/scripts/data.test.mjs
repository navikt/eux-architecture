import assert from "node:assert/strict";
import { test } from "node:test";
import { NODE_BY_ID } from "../components/architecture/data.ts";
import { ENV_SERVICES } from "../components/miljoer/data.ts";

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
