import test from "node:test";
import assert from "node:assert/strict";
import { memoryStore } from "../lib/store-memory.js";
import { assertStoreShape, STORE_METHODS } from "../lib/store.js";

test("memoryStore satisfies STORE_METHODS", () => {
  const s = memoryStore();
  assertStoreShape(s);
  for (const m of STORE_METHODS) assert.equal(typeof s[m], "function", m);
});

test("createPerson + personById + personByPhone", async () => {
  const s = memoryStore();
  const p = await s.createPerson({ legal_name: "Ravi", phone: "+919999900001" });
  assert.ok(p.id);
  assert.equal((await s.personById(p.id)).legal_name, "Ravi");
  assert.equal((await s.personByPhone("+919999900001")).id, p.id);
  assert.equal(await s.personByPhone("nope"), null);
});

test("updatePerson logs stage transitions", async () => {
  const s = memoryStore();
  const p = await s.createPerson({ legal_name: "Ravi", phone: "1" });
  await s.updatePerson(p.id, { status: "daily" }, "user-1");
  const p2 = await s.personById(p.id);
  assert.equal(p2.status, "daily");
  assert.equal(s._tables.person_stage_log.length, 1);
  assert.equal(s._tables.person_stage_log[0].from_status, "chanter");
  assert.equal(s._tables.person_stage_log[0].to_status, "daily");
});

test("bulkCreatePeople dedupes by phone and reports errors", async () => {
  const s = memoryStore();
  await s.createPerson({ legal_name: "existing", phone: "1" });
  const r = await s.bulkCreatePeople([
    { legal_name: "A", phone: "2" },
    { legal_name: "B", phone: "1" },              // duplicate
    { phone: "3" },                                // no name
    { legal_name: "D" },                           // no phone
    { legal_name: "E", phone: "4" },
    { legal_name: "F", phone: "2" },              // dup within batch
  ]);
  assert.equal(r.created.length, 2);
  assert.equal(r.duplicates.length, 2);
  assert.equal(r.errors.length, 2);
});

test("groups + memberships + peopleInGroup", async () => {
  const s = memoryStore();
  const g = await s.createGroup({ name: "NJY-001", kind: "njy_group" });
  const p = await s.createPerson({ legal_name: "Ravi", phone: "1" });
  await s.addMembership({ person_id: p.id, group_id: g.id, role: "member" });
  const roll = await s.peopleInGroup(g.id);
  assert.equal(roll.length, 1);
  assert.equal(roll[0].id, p.id);
});

test("daily chant upsert is idempotent", async () => {
  const s = memoryStore();
  const p = await s.createPerson({ legal_name: "Ravi", phone: "1" });
  await s.upsertChant({ person_id: p.id, entry_date: "2026-08-16", chanted: 1 });
  await s.upsertChant({ person_id: p.id, entry_date: "2026-08-16", chanted: 1, rounds: 16 });
  assert.equal(s._tables.daily_chant_log.length, 1);
  assert.equal(s._tables.daily_chant_log[0].rounds, 16);
});

test("feature gates round-trip", async () => {
  const s = memoryStore();
  await s.setFeatureGate("sadhana_chart", ["hk_leader", "servant_leader"], "u1");
  const gates = await s.featureGates();
  assert.deepEqual(gates.sadhana_chart, ["hk_leader", "servant_leader"]);
});
