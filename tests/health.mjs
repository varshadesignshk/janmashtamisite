// Smoke test — proves the router mounts and /api/health responds. Real
// integration suite lands with task 12, mirroring primitive/tests/
// integration.mjs.

import test from "node:test";
import assert from "node:assert/strict";
import { route } from "../lib/handlers.js";

test("health endpoint responds ok:true", async () => {
  const req = new Request("http://x/api/health");
  const res = await route(req, { store: {}, env: {} });
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.deepEqual(body, { ok: true });
});

test("unknown route returns 404 json", async () => {
  const req = new Request("http://x/api/nope");
  const res = await route(req, { store: {}, env: {} });
  assert.equal(res.status, 404);
});
