import test from "node:test";
import assert from "node:assert/strict";
import {
  hashPassword, verifyPassword, signSession, verifySession,
  parseCookies, sessionCookieHeader,
} from "../lib/auth.js";

test("hashPassword produces distinct hashes for same input (salt)", async () => {
  const a = await hashPassword("hare-krsna");
  const b = await hashPassword("hare-krsna");
  assert.notEqual(a, b);
  assert.match(a, /^pbkdf2\$sha256\$\d+\$/);
});

test("verifyPassword accepts correct and rejects wrong", async () => {
  const h = await hashPassword("janmashtami25");
  assert.equal(await verifyPassword("janmashtami25", h), true);
  assert.equal(await verifyPassword("janmashtami26", h), false);
  assert.equal(await verifyPassword("", h), false);
  assert.equal(await verifyPassword("janmashtami25", "garbage"), false);
});

test("session sign/verify round-trip", async () => {
  const t = await signSession({ userId: "u1", role: "hk_leader" }, "secret");
  const p = await verifySession(t, "secret");
  assert.ok(p);
  assert.equal(p.userId, "u1");
  assert.equal(p.role, "hk_leader");
  assert.equal(typeof p.exp, "number");
});

test("session verify rejects wrong secret", async () => {
  const t = await signSession({ userId: "u1" }, "secret-a");
  assert.equal(await verifySession(t, "secret-b"), null);
});

test("session verify rejects tampered payload", async () => {
  const t = await signSession({ userId: "u1", role: "member" }, "secret");
  const [body, sig] = t.split(".");
  const bytes = new TextEncoder().encode(JSON.stringify({ userId: "u1", role: "hk_leader", exp: 9e9 }));
  const bin = String.fromCharCode(...bytes);
  const tampered = btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "") + "." + sig;
  assert.equal(await verifySession(tampered, "secret"), null);
});

test("session verify rejects expired", async () => {
  const orig = Date.now;
  try {
    Date.now = () => 1_000_000_000_000;
    const t = await signSession({ userId: "u1" }, "s");
    Date.now = () => 1_000_000_000_000 + (60 * 60 * 24 * 40 * 1000);
    assert.equal(await verifySession(t, "s"), null);
  } finally {
    Date.now = orig;
  }
});

test("parseCookies handles empty, single, multi", () => {
  assert.deepEqual(parseCookies(""), {});
  assert.deepEqual(parseCookies("a=1"), { a: "1" });
  assert.deepEqual(parseCookies("a=1; b=2;  c=3"), { a: "1", b: "2", c: "3" });
});

test("sessionCookieHeader has security attrs", () => {
  const h = sessionCookieHeader("tok");
  assert.match(h, /HttpOnly/);
  assert.match(h, /SameSite=Lax/);
  assert.match(h, /Secure/);
  assert.match(h, /Path=\//);
  assert.match(h, /Max-Age=\d+/);
});
