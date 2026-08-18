// Pages Functions catch-all. Every request under /api/* lands here.

import { route } from "../../lib/handlers.js";
import { d1Store } from "../../lib/store-d1.js";
import { registerBuiltins } from "../../lib/notify.js";

let _built = false;
function ensureBuiltins() {
  if (_built) return;
  registerBuiltins();
  _built = true;
}

export async function onRequest(context) {
  ensureBuiltins();
  const { request, env } = context;
  const store = d1Store(env.DB);
  try {
    return await route(request, { store, env });
  } catch (err) {
    if (err && err.status) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: err.status,
        headers: { "content-type": "application/json" },
      });
    }
    console.error("unhandled", err && (err.stack || err.message || err));
    // Only echo the error message + stack in non-prod. Production
    // (Cloudflare Pages sets APP_ENV=production in the dashboard, or
    // we can gate on wrangler's is-remote metadata) returns opaque
    // "internal" so we don't leak file paths / code structure to
    // untrusted callers.
    const isDev = env.APP_ENV !== "production";
    const payload = isDev
      ? { error: "internal", message: String(err?.message || err),
          stack: String(err?.stack || "").split("\n").slice(0, 5).join(" | ") }
      : { error: "internal" };
    return new Response(JSON.stringify(payload), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
}
