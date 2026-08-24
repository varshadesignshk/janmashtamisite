// Role-based access + feature-gate registry check.
//
// Roles form a loose hierarchy where higher tiers implicitly can do
// anything the lower tiers can, but feature_gates rows are the
// authoritative source: if the row lists a role, that role sees it.
// HK Leader can promote a feature (widen its allowed_roles list) from
// the admin UI without a redeploy — that's the whole point of the
// registry.

export const ROLES = Object.freeze([
  "hk_leader",
  "njy_leader",
  "njy_coordinator",
  "manjari_servant_leader",   // Phase-3 role — permissions defined
                              // early so seed data can create these
                              // accounts before the reorg fires.
  "circle_servant",
  "sector_servant",
  "servant_leader",
  "member",
]);

const RANK = Object.fromEntries(ROLES.map((r, i) => [r, i]));

export function isValidRole(r) {
  return typeof r === "string" && Object.hasOwn(RANK, r);
}

// hk_leader outranks everyone. Beyond that, we do NOT infer permission
// from rank — we trust the feature_gates row. This keeps promotion
// predictable: what you see in the admin table is what gets enforced.
export function rankOf(role) {
  return RANK[role] ?? Infinity;
}

export function isHkLeader(role) {
  return role === "hk_leader";
}

export async function canAccess(store, role, featureKey) {
  if (!role) return false;
  if (isHkLeader(role)) return true;
  const gates = await store.featureGates();
  const allowed = gates[featureKey];
  if (!allowed) return false;
  return allowed.includes(role);
}

// Middleware-style helper: throws {status:403} if the caller can't
// access the feature. Handlers use `await requireFeature(...)` at top.
export async function requireFeature(store, role, featureKey) {
  if (!(await canAccess(store, role, featureKey))) {
    const err = new Error(`forbidden: ${featureKey}`);
    err.status = 403;
    throw err;
  }
}
