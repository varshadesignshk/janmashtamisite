// Password hashing + session cookies, portable to the Cloudflare Workers
// runtime (Web Crypto only — no Node-specific APIs).
//
// primitive/lib/auth.js used scrypt; the Web Crypto spec does not include
// scrypt, and primitive never deployed (see PAST.md §1) so no live hashes
// need migrating. We switch to PBKDF2-HMAC-SHA256 with a strong iteration
// count. Stored hash format keeps the pieces the caller may need:
//
//     pbkdf2$sha256$<iterations>$<saltB64>$<hashB64>
//
// Sessions are stateless HMAC-signed JSON:
//
//     <payloadB64Url>.<sigB64Url>
//
// where payload is UTF-8 JSON { userId, role, exp } and the signature is
// HMAC-SHA256(payloadB64Url, secret). Cookie is HttpOnly, Secure,
// SameSite=Lax, 30-day life, no server-side session table needed.

const enc = new TextEncoder();
const dec = new TextDecoder();

// Cloudflare Workers' SubtleCrypto caps PBKDF2 at 100_000 iterations
// (throws NotSupportedError above that). Node.js has no such cap, so
// tests would happily pass a higher value while production 500'd. We
// hold at exactly 100_000 — still meets OWASP's PBKDF2-SHA256 baseline.
const PBKDF2_ITERS = 100_000;
const PBKDF2_HASH = "SHA-256";
const PBKDF2_KEYLEN = 32;

const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;

// ---------- base64url helpers (URL-safe, no padding) ----------

function b64urlFromBytes(bytes) {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}
function bytesFromB64url(s) {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (s.length % 4)) % 4);
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
function b64FromBytes(bytes) {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}
function bytesFromB64(s) {
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

// ---------- passwords ----------

async function pbkdf2(password, salt, iterations = PBKDF2_ITERS, keylen = PBKDF2_KEYLEN) {
  const key = await crypto.subtle.importKey(
    "raw", enc.encode(password), { name: "PBKDF2" }, false, ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: PBKDF2_HASH, salt, iterations },
    key, keylen * 8,
  );
  return new Uint8Array(bits);
}

export async function hashPassword(plaintext) {
  if (typeof plaintext !== "string" || plaintext.length === 0) {
    throw new Error("password required");
  }
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await pbkdf2(plaintext, salt);
  return `pbkdf2$sha256$${PBKDF2_ITERS}$${b64FromBytes(salt)}$${b64FromBytes(hash)}`;
}

export async function verifyPassword(plaintext, stored) {
  if (typeof stored !== "string") return false;
  const parts = stored.split("$");
  if (parts.length !== 5 || parts[0] !== "pbkdf2" || parts[1] !== "sha256") return false;
  const iters = parseInt(parts[2], 10);
  if (!Number.isFinite(iters) || iters < 10_000) return false;
  const salt = bytesFromB64(parts[3]);
  const expected = bytesFromB64(parts[4]);
  const actual = await pbkdf2(plaintext, salt, iters, expected.length);
  return timingSafeEqual(actual, expected);
}

// ---------- sessions ----------

async function hmacKey(secret) {
  return crypto.subtle.importKey(
    "raw", enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"],
  );
}

export async function signSession(payload, secret) {
  if (!secret) throw new Error("session secret required");
  const withExp = { exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS, ...payload };
  const body = b64urlFromBytes(enc.encode(JSON.stringify(withExp)));
  const key = await hmacKey(secret);
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", key, enc.encode(body)));
  return `${body}.${b64urlFromBytes(sig)}`;
}

export async function verifySession(token, secret) {
  if (!token || !secret) return null;
  const dot = token.indexOf(".");
  if (dot < 0) return null;
  const body = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const key = await hmacKey(secret);
  const ok = await crypto.subtle.verify(
    "HMAC", key, bytesFromB64url(sig), enc.encode(body),
  );
  if (!ok) return null;
  let payload;
  try {
    payload = JSON.parse(dec.decode(bytesFromB64url(body)));
  } catch {
    return null;
  }
  if (!payload || typeof payload.exp !== "number") return null;
  if (payload.exp < Math.floor(Date.now() / 1000)) return null;
  return payload;
}

// ---------- cookie helpers ----------

export const SESSION_COOKIE = "njy_session";

export function parseCookies(header) {
  const out = {};
  if (!header) return out;
  for (const part of header.split(/;\s*/)) {
    const eq = part.indexOf("=");
    if (eq < 0) continue;
    out[part.slice(0, eq)] = decodeURIComponent(part.slice(eq + 1));
  }
  return out;
}

export function sessionCookieHeader(token, { secure = true } = {}) {
  const attrs = [
    `${SESSION_COOKIE}=${token}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${SESSION_TTL_SECONDS}`,
  ];
  if (secure) attrs.push("Secure");
  return attrs.join("; ");
}

export function clearSessionCookieHeader({ secure = true } = {}) {
  const attrs = [
    `${SESSION_COOKIE}=`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    "Max-Age=0",
  ];
  if (secure) attrs.push("Secure");
  return attrs.join("; ");
}
