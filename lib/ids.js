// Id + timestamp helpers. All ids are uuid v4 strings. Timestamps are
// ISO-8601 in the temple's timezone (Asia/Kolkata). "today" and "now"
// live here so tests can override.

export function newId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  // eslint-disable-next-line no-undef
  return require("node:crypto").randomUUID();
}

const APP_TZ = "Asia/Kolkata";

export function nowIso() {
  return new Date().toISOString();
}

export function todayInTz(tz = APP_TZ) {
  // Format YYYY-MM-DD in the target timezone regardless of server locale.
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(new Date());
  const y = parts.find(p => p.type === "year").value;
  const m = parts.find(p => p.type === "month").value;
  const d = parts.find(p => p.type === "day").value;
  return `${y}-${m}-${d}`;
}

export function daysBetween(a, b) {
  const da = new Date(a + "T00:00:00Z");
  const db = new Date(b + "T00:00:00Z");
  return Math.round((db - da) / (24 * 60 * 60 * 1000));
}
