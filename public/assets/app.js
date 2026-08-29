// NJY — single-page client with hash routing. Views are role-gated
// on the server (via feature_gates); we mirror the check in the UI so
// only relevant nav items render, but the server remains authoritative.

const $ = (id) => document.getElementById(id);
const el = (tag, attrs = {}, ...children) => {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") e.className = v;
    else if (k === "html") e.innerHTML = v;
    else if (k.startsWith("on") && typeof v === "function") e.addEventListener(k.slice(2), v);
    else if (v === true) e.setAttribute(k, "");
    else if (v != null && v !== false) e.setAttribute(k, v);
  }
  for (const c of children.flat()) {
    if (c == null || c === false) continue;
    e.append(typeof c === "string" ? document.createTextNode(c) : c);
  }
  return e;
};
const esc = (s) => String(s ?? "").replace(/[&<>"']/g,
  c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[c]));

// Turn a raw error code from the server (or an in-app validation code)
// into a friendly, actionable sentence the operator can act on. Add a
// case here whenever the backend introduces a new bad(...) code, so the
// UI never falls back to opaque "http_500" or "duplicate_phone".
const ERROR_MESSAGES = {
  // Auth
  invalid_credentials: "Wrong username or password.",
  missing_credentials: "Type both username and password.",
  wrong_current_password: "Current password is wrong.",
  password_too_short: "New password must be at least 6 characters.",
  both_passwords_required: "Fill in both current and new password.",
  session_secret_missing: "Server misconfigured (SESSION_SECRET not set). Contact admin.",
  unauthorized: "You need to sign in again.",
  forbidden: "You don't have permission for this action.",
  // Not found
  not_found: "Nothing found at this path.",
  user_not_found: "That user doesn't exist.",
  target_user_not_found: "The user you're trying to update doesn't exist.",
  person_not_found: "That chanter doesn't exist.",
  event_not_found: "That event doesn't exist.",
  leader_not_found: "That NJY Leader doesn't exist.",
  duty_not_found: "That duty doesn't exist.",
  not_your_roll: "That chanter belongs to a different coordinator.",
  // Users
  username_taken: "That username is already used — pick another.",
  missing_fields: "One or more required fields are blank.",
  bad_role: "Role must be one of: hk_leader, njy_leader, njy_coordinator, servant_leader, sector_servant, circle_servant.",
  manager_not_found: "manager_username points to a leader that doesn't exist yet — did you import the leader row first?",
  // Chanter import
  duplicate_phone: "A chanter with that phone number already exists.",
  duplicate_coupon: "A chanter with that coupon number already exists.",
  duplicate_sl_no: "That serial number is already used.",
  coupon_or_range_required: "Enter a coupon number, or ask HK Leader to assign your coord an sl_range.",
  range_exhausted_or_missing: "Your assigned sl_no range is exhausted — ask HK Leader to widen it.",
  name_and_mobile_required: "Both name and mobile are required.",
  // Bulk
  rows_required: "The request had no rows to import.",
  bad_body: "The request body was malformed.",
  bad_status: "That status value isn't allowed.",
  no_templates: "Nothing was changed — WhatsApp templates were empty.",
  bad_subscription: "Push subscription data was incomplete.",
  endpoint_required: "Push endpoint missing.",
  person_id_required: "Missing person_id.",
  group_id_required: "Missing group_id.",
  // Network / HTTP
  http_400: "The server rejected the request (400 Bad Request). Check your input.",
  http_401: "Session expired — sign in again.",
  http_403: "You don't have permission for this action.",
  http_404: "Not found.",
  http_409: "That conflicts with existing data (usually a duplicate).",
  http_500: "The server hit an error. Try again in a minute; if it repeats, check dev console for the exact cause.",
  http_502: "Server unreachable (bad gateway). Cloudflare may still be deploying — wait 60 seconds and retry.",
  http_503: "Server temporarily unavailable. Retry shortly.",
};
function humanizeError(err) {
  if (!err) return "Something went wrong.";
  if (typeof err === "string") return ERROR_MESSAGES[err] || err;
  const code = err.body?.error || err.error || err.message || "";
  if (ERROR_MESSAGES[code]) return ERROR_MESSAGES[code];
  if (err.status) {
    const gen = ERROR_MESSAGES[`http_${err.status}`];
    if (gen) return `${gen} (code: ${code})`;
  }
  return code || String(err);
}
window.humanizeError = humanizeError;

const api = async (path, opts = {}) => {
  const method = (opts.method || "GET").toUpperCase();
  try {
    const res = await fetch(path, {
      ...opts, credentials: "same-origin",
      headers: { "content-type": "application/json", ...(opts.headers || {}) },
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      // Structured console log for every API failure — the top ask
      // was "why nothing in console??? everytime it comes error, must
      // be in console across everywhere". So we ALWAYS log the path,
      // status, and full server payload with a group so it's easy to
      // scan in devtools.
      console.groupCollapsed(`%c[api] ${method} ${path} → ${res.status}`, "color:#c02020;font-weight:600");
      console.log("error:", body.error || "(none)");
      console.log("body:", body);
      console.log("request opts:", opts);
      console.groupEnd();
      // Raw code preserved for exact-match branches (e.g. some UIs
      // still branch on wrong_current_password). But err.message is
      // now the FRIENDLY sentence, so every "catch (err) { view.append
      // (err.message) }" spot upgrades automatically without touching
      // 30 call sites.
      const code = body.error || `http_${res.status}`;
      const friendly = humanizeError({ body, status: res.status });
      const e = new Error(friendly);
      e.code = code;
      e.status = res.status; e.body = body; e.path = path; e.method = method;
      throw e;
    }
    // Successful non-200 (like 207 partial), or a 200 with an `errors`
    // array (common on bulk endpoints) — surface it too.
    if (Array.isArray(body.errors) && body.errors.length) {
      console.groupCollapsed(`%c[api] ${method} ${path} → 200 with ${body.errors.length} row error(s)`, "color:#c07a00;font-weight:600");
      body.errors.slice(0, 10).forEach((e, i) => console.log(`row ${i}:`, e));
      if (body.errors.length > 10) console.log(`…${body.errors.length - 10} more`);
      console.groupEnd();
    }
    return body;
  } catch (netErr) {
    if (netErr && netErr.status != null) throw netErr; // already logged above
    console.error(`[api] ${method} ${path} — network/JS error:`, netErr);
    throw netErr;
  }
};

// Global safety net — any promise rejection or JS error that reaches
// the runtime unwrapped goes to console with context. Without this a
// silent await in an event handler dies with no trace.
window.addEventListener("unhandledrejection", (e) => {
  console.error("[unhandledrejection]", e.reason);
});
window.addEventListener("error", (e) => {
  console.error("[window.error]", e.message, "at", e.filename + ":" + e.lineno, e.error);
});

const STATE_LABEL = ["uncontacted", "contacted", "responded"];
const LIFECYCLE = ["chanter","daily","njy1","njy2","njy3","manjari","bv_member","dropped"];

// Compute the 5-color bead on the client after a mark/chant tap. The
// server does the authoritative first render (including the 3-day-miss
// red state); after that, tap-driven updates use this cheap local
// recompute so we don't refetch on every click.
function recomputeBead(r) {
  // Red survives a mark tap only if the server flagged it originally
  // and the person hasn't chanted since. Simplest: assume red persists
  // until the next render refresh unless the user just chanted.
  if (r.bead_color === "red" && !r.chanted_today) return "red";
  if (r.chanted_today) return "green";
  if (r.contact_state === 2) return "orange";
  if (r.contact_state === 1) return "yellow";
  return "white";
}
const humanRole = (r) => t("role." + r) !== "role." + r ? t("role." + r) : r;

let ME = null, GATES = {};

// ------------------------------------------------------------ boot ---
let deferredInstall = null;
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredInstall = e;
  // Only re-render the nav if we're actually signed in — otherwise
  // ME is still null and renderNav() reads ME.role and crashes.
  if (ME) renderNav();
});
(async function boot() {
  if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => {});
  try {
    const me = await api("/api/me");
    if (me.user) { ME = me.user; GATES = me.gates; return showApp(); }
  } catch (_) {}
  showLogin();
})();

window.addEventListener("hashchange", () => { if (ME) renderRoute(); });

// ----------------------------------------------------------- login ---
function showLogin() {
  $("view-app").hidden = true;
  $("view-login").hidden = false;
  // Translate login screen
  if ($("login-title")) $("login-title").textContent = t("btn.sign_in");
  if ($("login-u-label")) $("login-u-label").textContent = t("field.username");
  if ($("login-p-label")) $("login-p-label").textContent = t("field.password");
  if ($("login-btn")) $("login-btn").textContent = t("btn.sign_in");
  // Wire the eye toggle on the login password
  const eye = $("login-eye");
  if (eye && !eye._wired) {
    eye._wired = true;
    eye.addEventListener("click", () => {
      const p = $("p");
      if (p.type === "password") { p.type = "text"; eye.textContent = "🙈"; }
      else { p.type = "password"; eye.textContent = "👁"; }
    });
  }
  $("login-form").onsubmit = async (e) => {
    e.preventDefault();
    $("login-err").hidden = true;
    try {
      await api("/api/login", { method: "POST", body: JSON.stringify({
        username: $("u").value.trim(), password: $("p").value,
      })});
      const me = await api("/api/me");
      ME = me.user; GATES = me.gates;
      showApp();
    } catch { $("login-err").textContent = t("msg.wrong_password"); $("login-err").hidden = false; }
  };
}

// ------------------------------------------------------------- app ---
async function showApp() {
  $("view-login").hidden = true;
  $("view-app").hidden = false;
  $("who-name").textContent = ME.display_name;
  $("who-role").textContent = " · " + humanRole(ME.role);
  $("logout").textContent = t("nav.sign_out");
  $("logout").onclick = async (e) => { e.preventDefault(); await api("/api/logout", { method: "POST" }); location.hash = ""; location.reload(); };
  // Language quick-toggle in header
  const langBtn = $("lang-toggle");
  if (langBtn) {
    const cur = getLang();
    const other = window.LANGS.find(l => l.code !== cur);
    langBtn.textContent = "🌐 " + other.label;
    langBtn.onclick = (e) => { e.preventDefault(); setLang(other.code); };
  }
  renderNav();
  renderRoute();
  refreshPointsChip();
  refreshLbSide();
  maybeShowOnboardingTour();
}

// Show a 5-slide onboarding tour to a coordinator the first time they
// sign in. Dismissal is remembered in localStorage per user id so the
// tour never nags. They can re-run it by clearing browser storage.
function maybeShowOnboardingTour() {
  if (ME.role !== "njy_coordinator") return;
  const key = "njy-tour-done-" + ME.id;
  try { if (localStorage.getItem(key)) return; } catch { /* private mode */ }

  const slides = [
    {
      emoji: "🙏 🌸",
      title: "Welcome, coordinator",
      body: "This app helps you keep track of the chanters you talk with — who's chanted today, who needs a nudge, and how everyone's doing. It's very simple. Let's walk through the four things you'll do most.",
    },
    {
      emoji: "⚪ 🟡 🟠 🟢 🔴",
      title: "The bead beside each name",
      body: "White = fresh (nothing marked). <strong>Tap once</strong> = you contacted them (yellow). <strong>Tap again</strong> = they responded (orange). The bead resets to white every morning. Red means a daily chanter hasn't chanted for 3+ days — needs your attention.",
    },
    {
      emoji: "✓ chanted",
      title: "The 'chant?' button",
      body: "When someone tells you they chanted today, tap this button — it turns gold with a tick. The bead also turns green. It's disabled unless the person's status is <strong>daily</strong> (change status via the dropdown next to their name).",
    },
    {
      emoji: "💬",
      title: "WhatsApp button",
      body: "Tap the green <strong>WhatsApp</strong> button on any row — WhatsApp opens with a Tamil + English message ready to send to that chanter. You can add a personal line before hitting send. You can also customise your default message in the Settings tab.",
    },
    {
      emoji: "🪙 🏆",
      title: "Your points and leaderboard",
      body: "Every action earns points — chanting marks, follow-ups, event attendance. See your live points in the coin chip at the top-right. The <strong>Leaderboard</strong> tab shows how you rank. The <strong>Janmashtami</strong> tab is where you add new chanters on the big day. Tap the <strong>📅</strong> button on any row to see 14 days of chant history.",
    },
  ];

  const overlay = el("div", { class: "tour-overlay" });
  const card = el("div", { class: "tour-card", role: "dialog", "aria-modal": "true" });
  overlay.append(card);
  document.body.append(overlay);

  let i = 0;
  const render = () => {
    const s = slides[i];
    card.innerHTML = "";
    card.append(
      el("div", { class: "tour-emoji-row" }, s.emoji),
      el("h3", {}, s.title),
      el("p", { class: "tour-body", html: s.body }),
      el("div", { class: "tour-progress" },
        ...slides.map((_, idx) => el("span", { class: idx === i ? "on" : "" })),
      ),
      el("div", { class: "tour-actions" },
        el("button", { class: "tour-skip" }, "Skip tour"),
        el("button", { class: "primary" }, i === slides.length - 1 ? "Got it — start using" : "Next →"),
      ),
    );
    card.querySelector(".tour-skip").addEventListener("click", done);
    card.querySelector(".primary").addEventListener("click", () => {
      if (i === slides.length - 1) done();
      else { i++; render(); }
    });
  };
  const done = () => {
    try { localStorage.setItem(key, "1"); } catch {}
    overlay.remove();
  };
  render();
}
// Expose a way to relaunch the tour from anywhere (for testing).
window.replayTour = () => {
  try { localStorage.removeItem("njy-tour-done-" + ME.id); } catch {}
  maybeShowOnboardingTour();
};

// Header points chip — small oval showing today's and overall points
// for the signed-in coordinator. Silently ignored for other roles.
async function refreshPointsChip() {
  const chip = $("pts-chip");
  if (!chip) return;
  if (ME.role !== "njy_coordinator") { chip.hidden = true; return; }
  try {
    const p = await api("/api/me/points");
    if (!p.applicable) { chip.hidden = true; return; }
    chip.innerHTML = "";
    chip.append(
      t("chip.today") + " ", el("span", { class: "pts-num" }, String(p.daily || 0)),
      el("span", { class: "pts-sep" }, " · "),
      t("chip.overall") + " ", el("span", { class: "pts-num" }, String(p.overall || 0)),
    );
    chip.hidden = false;
  } catch (_) { chip.hidden = true; }
}
window.refreshPointsChip = refreshPointsChip;

// Floating leaderboard sidebar — desktop-only, always visible while
// scrolling. Shows today's top 3 coords + your own rank if you're
// competing. Refreshes every 45 seconds so numbers stay live.
let _lbSideTimer = null;
async function refreshLbSide() {
  const side = $("lb-side");
  const strip = $("lb-strip");
  if (!side && !strip) return;
  const isCompetitor = ["njy_coordinator","njy_leader","hk_leader"].includes(ME.role);
  if (!isCompetitor) {
    if (side) side.hidden = true;
    if (strip) strip.hidden = true;
    return;
  }
  try {
    const { rows } = await api("/api/leaderboard/daily");
    // --- mobile strip: top 3 + you (compact, single row) ---
    if (strip) {
      strip.innerHTML = "";
      const inner = el("div", { class: "lb-strip-inner" });
      const top3s = rows.slice(0, 3);
      const medalsS = ["🥇","🥈","🥉"];
      if (!top3s.length) {
        inner.append(el("span", { class: "lb-strip-empty" }, "No points yet today"));
      } else {
        top3s.forEach((r, i) => {
          inner.append(el("span", { class: "lb-strip-slot" + (r.user_id === ME.id ? " me" : "") },
            el("span", {}, medalsS[i]),
            el("span", { class: "nm", title: r.name }, r.name),
            el("span", { class: "pt" }, String(r.pts)),
          ));
        });
        const myIdx = rows.findIndex(r => r.user_id === ME.id);
        if (myIdx >= 3) {
          inner.append(el("span", { class: "lb-strip-slot you" },
            el("span", {}, "🪙"),
            el("span", { class: "nm" }, `You #${myIdx + 1}`),
            el("span", { class: "pt" }, String(rows[myIdx].pts)),
          ));
        }
      }
      inner.append(el("a", { class: "lb-strip-more", href: "#/leaderboard/daily" }, "Full →"));
      strip.append(inner);
      strip.hidden = false;
    }
    if (!side) {
      clearTimeout(_lbSideTimer);
      _lbSideTimer = setTimeout(refreshLbSide, 45_000);
      return;
    }
    side.innerHTML = "";
    side.append(el("h4", {}, "Today's leaders", el("span", { style: "font-size:.7rem;color:var(--muted)" }, "🏆")));
    const top3 = rows.slice(0, 3);
    if (!top3.length) {
      side.append(el("p", { class: "hint", style: "font-size:.75rem" }, "No points yet today."));
      side.hidden = false;
      return;
    }
    const container = el("div", { class: "lb-rows" });
    const medals = ["🥇","🥈","🥉"];
    top3.forEach((r, i) => {
      container.append(el("div", { class: "lb-row" + (r.user_id === ME.id ? " me" : "") },
        el("span", {}, medals[i]),
        el("span", { class: "name", title: r.name }, r.name),
        el("span", { class: "pts" }, String(r.pts)),
      ));
    });
    side.append(container);
    // Always show a dedicated "You" row so the coord sees where they
    // stand — even if they're in the top three, they see it here in
    // the golden coin style, not just implicit.
    const myIdx = rows.findIndex(r => r.user_id === ME.id);
    if (ME.role === "njy_coordinator" && myIdx >= 0) {
      const me = rows[myIdx];
      side.append(el("div", { class: "lb-you-row" },
        el("span", { class: "lb-you-label" }, "You"),
        el("span", { class: "lb-you-rank" }, `#${myIdx + 1}`),
        el("span", { class: "lb-you-pts" }, `${me.pts} pts`),
      ));
    }
    side.append(el("a", { class: "lb-open", href: "#/leaderboard/daily" }, "Full leaderboard →"));
    side.hidden = false;
  } catch (_) { side.hidden = true; }
  clearTimeout(_lbSideTimer);
  _lbSideTimer = setTimeout(refreshLbSide, 45_000);
}
window.refreshLbSide = refreshLbSide;

function can(feature) {
  if (ME.role === "hk_leader") return true;
  return (GATES[feature] || []).includes(ME.role);
}

function renderNav() {
  const nav = $("nav"); nav.innerHTML = "";
  // Nav visibility is CURATED per role — separate from feature-gate
  // access. HK Leader still has permission to visit every URL directly,
  // but tabs only appear when they're part of that role's day-to-day
  // work. Rule of thumb:
  //   - "My roll"   → the person who *owns* a chanter list
  //   - "Sadhana"   → BV Member (self-fills) or Servant Leader (reviews)
  //   - "BV"        → structure editors (CS/SS + HK for setup)
  const OWNS_ROLL = ["njy_coordinator", "servant_leader", "member"];
  const SADHANA_ROLES = ["servant_leader", "member", "sector_servant", "circle_servant"];
  const BV_ROLES = ["hk_leader", "circle_servant", "sector_servant", "servant_leader"];
  const items = [
    { href: "#/",          label: t("nav.my_roll"),  when: () => can("coordinator_roll") && OWNS_ROLL.includes(ME.role) },
    { href: "#/leader",    label: t("nav.team"),     when: () => can("leader_dashboard") },
    // HK tab hidden for HK Leader — the Team tab now carries the 4 KPI
    // tiles + all coordinators. Other roles (if ever granted hk_dashboard
    // by feature-gate) still see it.
    { href: "#/hk",        label: t("nav.hk"),       when: () => can("hk_dashboard") && ME.role !== "hk_leader" },
    { href: "#/duties",    label: t("nav.duties"),   when: () => true },
    { href: "#/events",    label: t("nav.events"),   when: () => can("event_attendance") },
    { href: "#/sadhana",   label: t("nav.sadhana"),  when: () => can("sadhana_chart") && SADHANA_ROLES.includes(ME.role) },
    { href: "#/bv",        label: t("nav.bv"),       when: () => can("bv_structure_editor") && BV_ROLES.includes(ME.role) },
    { href: "#/janmashtami", label: t("nav.janmashtami"), when: () => ["njy_coordinator","njy_leader","hk_leader"].includes(ME.role) },
    { href: "#/leaderboard", label: t("nav.leaderboard"), when: () => ["njy_coordinator","njy_leader","hk_leader"].includes(ME.role) },
    { href: "#/profile",     label: t("nav.profile"), when: () => ME.role === "njy_coordinator" },
    { href: "#/settings",  label: t("nav.settings"), when: () => ["njy_coordinator","njy_leader","hk_leader","servant_leader","manjari_servant_leader"].includes(ME.role) },
    { href: "#/admin",     label: t("nav.admin"),    when: () => can("feature_admin") },
  ];
  const here = location.hash || "#/";
  for (const it of items) {
    if (!it.when()) continue;
    const a = el("a", { href: it.href, class: (here === it.href ? "active" : "") }, it.label);
    nav.append(a);
  }
  if (deferredInstall) {
    const btn = el("a", { href: "#", style: "background:var(--tint-followed);border-color:var(--mark-followed);color:var(--mark-followed);margin-left:auto" }, t("nav.install"));
    btn.addEventListener("click", async (e) => {
      e.preventDefault();
      deferredInstall.prompt();
      await deferredInstall.userChoice.catch(() => {});
      deferredInstall = null; renderNav();
    });
    nav.append(btn);
  }
}

// ------------------------------------------------------ router ---
function renderRoute() {
  renderNav();
  const view = $("view"); view.innerHTML = "";
  const h = location.hash || "#/";
  const [path, ...rest] = h.slice(2).split("/"); // strip "#/"
  const arg = rest.join("/");
  // Auto-land each role on their most-useful tab ONLY the very first
  // time we render after login. If the user later clicks "My roll"
  // (which is href="#/"), we don't bounce them back to their home tab.
  if (!window._njyLandedOnce && (location.hash === "" || location.hash === "#/")) {
    window._njyLandedOnce = true;
    let home = null;
    if (ME.role === "hk_leader") home = "#/leader";
    else if (ME.role === "njy_leader") home = "#/leader";
    else if (ME.role === "njy_coordinator") home = "#/janmashtami";
    if (home) { location.replace(home); return; }
  } else if (location.hash === "" || location.hash === "#/") {
    // second and later empty-hash renders → treat as "My roll" (or
    // whatever renderCoordRoll shows for this role).
    window._njyLandedOnce = true;
  }
  const routes = {
    "":         renderCoordRoll,
    "leader":   () => arg ? renderLeaderDrill(arg) : renderLeaderDashboard($("view")),
    "hk":       renderHkDashboard,
    "user":     () => renderUserDrill(arg),
    "duties":   renderDuties,
    "events":   () => arg ? renderEventAttendance(arg) : renderEvents(view),
    "sadhana":  () => renderSadhana(arg),
    "bv":       renderBvStructure,
    "admin":    () => renderAdmin(arg || "gates"),
    "settings": renderSettings,
    "janmashtami": renderJanmashtami,
    "leaderboard": () => renderLeaderboard(arg || "daily", rest.join("/")),
    "profile":      () => renderProfile(arg),
    "points-rules": () => renderPointsRules(view),
    "member":   () => renderMemberDetails(arg),
    "group-report": () => renderGroupReport(arg),
  };
  const fn = routes[path] || renderCoordRoll;
  fn(view);
}

// ============================================================ views

// ---------------------------------------------- coordinator roll ---
async function renderCoordRoll(view) {
  try {
    const { roll, tally } = await api("/api/roll");
    // Coord banner: show who their NJY Leader is (or a nudge if unassigned)
    if (ME.role === "njy_coordinator") {
      const line = ME.manager_display_name
        ? el("p", { class: "hint" }, t("hd.your_leader"), ": ", el("strong", {}, ME.manager_display_name))
        : el("p", { class: "hint" }, t("msg.no_leader"));
      view.append(line);
    }
    view.append(tallyStrip(tally, ["assigned","chanted_today","followed_up","needs_visit"]));
    view.append(beadLegend());
    view.append(garlandStrip(roll, /* editable */ true));
    view.append(rollList(roll, /* editable */ true));
    if (!roll.length) {
      view.append(el("p", { class: "hint" }, "No chanters assigned yet. Ask your NJY Leader to assign your list, or (if you are the HK Leader) use bulk import from Admin."));
    }
  } catch (err) {
    if (err.status === 403) view.append(el("p", { class: "hint" }, "You don't have a coordinator roll. Try the Team or HK tabs."));
    else view.append(el("p", { class: "error" }, "Could not load roll: " + err.message));
  }
}

// Small legend explaining what the bead colors mean, shown above the
// garland on any roll view. Compact — fits on one line most screens.
function beadLegend() {
  const item = (c, label) => el("span", { class: "item" },
    el("span", { class: "swatch", "data-c": c }), label);
  return el("div", { class: "bead-legend" },
    item("white", t("bead.fresh")),
    item("yellow", t("bead.contacted")),
    item("orange", t("bead.responded")),
    item("green", t("bead.chanted")),
    item("red", t("bead.needs_attn")),
  );
}

// A one-liner "what this tab is for" note. Shown right under the h2
// on every tab so non-technical users know what they can do here.
function helpBanner(text) {
  return el("div", { class: "help-banner" }, text);
}

// Pulsing "Loading…" line to show while async fetches complete.
function loadingLine(text = "Loading…") {
  return el("p", { class: "loading-line" }, text);
}

function tallyStrip(tally, keys) {
  const map = {
    assigned: t("hd.assigned"),
    chanted_today: t("hd.chanted_today"),
    followed_up: t("hd.followed_up"),
    needs_visit: t("hd.needs_visit"),
    responded: t("bead.responded"),
  };
  const row = el("div", { class: "tally" });
  for (const k of keys) {
    row.append(el("div", { class: "cell" },
      el("div", { class: "n" }, String(tally[k] ?? 0)),
      el("div", { class: "k" }, map[k] || k),
    ));
  }
  return row;
}

// Human-readable label for a bead color — used in tooltips.
function beadColorLabel(c) {
  return ({
    white: "fresh, not marked today",
    yellow: "contacted today",
    orange: "responded today",
    green: "chanted today",
    red: "needs attention — 3+ days no chant",
  })[c] || "fresh";
}

// Build a 14-day history strip for one person. Each day is a small
// clickable dot — grey for "not chanted", green for "chanted", ringed
// for today. Tap any dot to toggle that day. Backfilling past dates
// covers the "they forgot to mark yesterday" case.
async function buildHistoryStrip(personId) {
  const strip = el("div", { class: "history-strip" });
  strip.append(el("div", { class: "hint", style: "grid-column:1/-1;font-size:.7rem" }, "Loading history…"));
  try {
    const { history } = await api(`/api/roll/${encodeURIComponent(personId)}/history?days=14`);
    strip.innerHTML = "";
    for (const d of history) {
      // Format short date label: "26" for the day, "Aug" for the month
      const [_, m, day] = d.date.split("-");
      const monthName = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][parseInt(m, 10) - 1];
      const cell = el("div", {
        class: "history-day" + (d.chanted ? " chanted" : "") + (d.is_today ? " today" : ""),
        title: `${d.date} — ${d.chanted ? "chanted" : "not chanted"}${d.is_today ? " (today)" : ""}. Tap to toggle.`,
      },
        el("div", { class: "label" }, day),
        el("div", { class: "month" }, monthName),
        el("div", { class: "dot" }),
      );
      cell.addEventListener("click", async () => {
        const next = !d.chanted;
        try {
          await api("/api/roll/chant", { method: "POST", body: JSON.stringify({
            person_id: personId, chanted: next, entry_date: d.date,
          }) });
          d.chanted = next;
          cell.classList.toggle("chanted", next);
        } catch (err) { alert(err.message || "Could not update"); }
      });
      strip.append(cell);
    }
  } catch (err) {
    strip.innerHTML = "";
    strip.append(el("p", { class: "hint", style: "grid-column:1/-1;font-size:.7rem" }, "Could not load: " + err.message));
  }
  return strip;
}

// Bead now takes a color name — one of white/yellow/orange/green/red.
// The old numeric state param still works (falls back to yellow/orange
// mapping) for callers that haven't been updated yet.
function bead(colorOrState, onclick) {
  const attrs = { class: "bead" };
  if (typeof colorOrState === "string") attrs["data-color"] = colorOrState;
  else attrs["data-color"] = ["white", "yellow", "orange", "white"][Number(colorOrState) || 0] || "white";
  const b = el("button", attrs);
  if (onclick) b.addEventListener("click", onclick);
  return b;
}

function garlandStrip(roll, editable) {
  const g = el("div", { class: "garland", "aria-label": "Roll at a glance" });
  roll.forEach((r) => {
    const b = bead(r.bead_color || "white", editable ? async () => {
      const upd = await api("/api/roll/mark", { method: "POST", body: JSON.stringify({ person_id: r.id }) });
      r.contact_state = upd.contact_state;
      r.bead_color = recomputeBead(r);
      // sync all beads for this person (row bead + this garland bead)
      document.querySelectorAll(`.bead[data-person="${r.id}"]`).forEach(x => x.dataset.color = r.bead_color);
    } : null);
    // Tagging garland beads with data-person so row-tap can update them too
    b.dataset.person = r.id;
    b.title = `${r.name} — ${beadColorLabel(r.bead_color)}`;
    g.append(b);
  });
  return g;
}

function rollList(roll, editable) {
  const ul = el("ul", { class: "roll" });
  roll.forEach((r) => {
    const li = el("li", {});

    const rowBead = bead(r.bead_color || "white", editable ? async () => {
      const upd = await api("/api/roll/mark", { method: "POST", body: JSON.stringify({ person_id: r.id }) });
      r.contact_state = upd.contact_state;
      r.bead_color = recomputeBead(r);
      rowBead.dataset.color = r.bead_color;
      document.querySelectorAll(`.bead[data-person="${r.id}"]`).forEach(x => x.dataset.color = r.bead_color);
    } : null);
    rowBead.dataset.person = r.id;

    const name = el("div", { class: "name" });
    name.innerHTML = esc(r.name) + `<span class="phone">${esc(r.phone || "")}</span>`;

    // Lifecycle status dropdown — the source of truth for the "daily
    // chanter commitment" (was previously a Manage-panel dropdown, now
    // inline). When status is not "daily", the chant toggle is disabled.
    const lifecycle = el("select", { class: "lifecycle", "data-status": r.status || "chanter" },
      ...LIFECYCLE.map(s => el("option", { value: s, selected: r.status === s ? true : undefined }, s)),
    );

    const chant = el("button", { class: "chant-tag" + (r.chanted_today ? " on" : "") },
      r.chanted_today ? t("btn.chanted") : t("btn.chant_q"));
    if (r.status !== "daily") chant.setAttribute("disabled", "");
    if (editable) chant.addEventListener("click", async () => {
      if (r.status !== "daily") return;
      const next = !r.chanted_today;
      await api("/api/roll/chant", { method: "POST", body: JSON.stringify({ person_id: r.id, chanted: next }) });
      r.chanted_today = next;
      chant.className = "chant-tag" + (next ? " on" : "");
      chant.textContent = next ? t("btn.chanted") : t("btn.chant_q");
      r.bead_color = recomputeBead(r);
      rowBead.dataset.color = r.bead_color;
      document.querySelectorAll(`.bead[data-person="${r.id}"]`).forEach(x => x.dataset.color = r.bead_color);
    });

    if (editable) lifecycle.addEventListener("change", async () => {
      try {
        await api(`/api/person/${r.id}/status`, {
          method: "POST", body: JSON.stringify({ status: lifecycle.value }),
        });
        r.status = lifecycle.value;
        lifecycle.dataset.status = r.status;
        if (r.status === "daily") chant.removeAttribute("disabled");
        else { chant.setAttribute("disabled", ""); }
      } catch (err) {
        alert(err.message || "Could not update status");
        lifecycle.value = r.status || "chanter";
      }
    });

    const wa = el("a", { class: "wa", href: r.wa_url, target: "_blank", rel: "noopener" }, t("btn.whatsapp"));

    // "History" button — expands a 14-day chant strip below the row
    const historyBtn = el("button", { class: "history-btn", title: "Show 14-day chant history" }, "📅");
    historyBtn.addEventListener("click", async () => {
      const existing = li.querySelector(".history-strip");
      if (existing) { existing.remove(); return; }
      const strip = await buildHistoryStrip(r.id);
      li.append(strip);
    });

    li.append(el("div", { class: "bead-wrap" }, rowBead), name, lifecycle, chant, wa, historyBtn);
    ul.appendChild(li);
  });
  return ul;
}

// ------------------------------------------------- leader dashboard ---
async function renderLeaderDashboard(view) {
  view.append(el("h2", { class: "section" }, t("nav.team")));
  // HK Leader: hierarchical view — NJY Leaders first, drill to their coords.
  if (ME.role === "hk_leader") return renderHkLeadersList(view);
  view.append(helpBanner(t("help.team")));
  const loader = loadingLine("Loading your coordinators…");
  view.append(loader);
  try {
    const { coordinators } = await api("/api/leader/coordinators");
    loader.remove();
    if (!coordinators.length) {
      return view.append(el("p", { class: "hint" }, t("msg.no_coords_leader")));
    }
    view.append(el("h3", { class: "section" }, t("hd.your_coords")));
    const ul = el("ul", { class: "list" });
    for (const c of coordinators) {
      ul.append(el("li", {}, coordCard(c)));
    }
    view.append(ul);
  } catch (err) {
    loader.remove();
    view.append(el("p", { class: "error" }, err.message));
  }
}

// HK Leader home — the leaders list with per-leader aggregates. Each row
// drills into a leader-detail page showing that leader's coords.
async function renderHkLeadersList(view) {
  view.append(helpBanner(t("help.hk_leaders_list")));
  const loader = loadingLine("Loading leaders…");
  view.append(loader);
  try {
    // KPI tiles first (fast — single query behind the scenes)
    try {
      const s = await api("/api/hk/summary");
      const grid = el("div", { class: "tally" });
      grid.append(
        el("div", { class: "cell" }, el("div", { class: "n" }, String(s.total_people)), el("div", { class: "k" }, t("hd.people"))),
        el("div", { class: "cell" }, el("div", { class: "n" }, String(s.chanted_today)), el("div", { class: "k" }, t("hd.chanted_today"))),
        el("div", { class: "cell" }, el("div", { class: "n" }, String(s.njy_leaders)), el("div", { class: "k" }, t("hd.njy_leaders"))),
        el("div", { class: "cell" }, el("div", { class: "n" }, String(s.njy_coordinators)), el("div", { class: "k" }, t("hd.coordinators"))),
      );
      view.append(grid);
    } catch (_) {}
    const { leaders } = await api("/api/hk/leaders");
    loader.remove();
    view.append(el("h3", { class: "section" }, t("hd.hk_leaders_list")));
    if (!leaders.length) return view.append(el("p", { class: "hint" }, t("msg.no_coords_hk")));
    const ul = el("ul", { class: "list" });
    for (const l of leaders) ul.append(el("li", {}, leaderRowCard(l)));
    view.append(ul);
  } catch (err) {
    loader.remove();
    view.append(el("p", { class: "error" }, err.message));
  }
}

function leaderRowCard(l) {
  const activePct = l.coord_count ? Math.round(100 * l.active_coords_today / l.coord_count) : 0;
  const chantedPct = l.assigned ? Math.round(100 * l.chanted_today / l.assigned) : 0;
  return el("div", { style: "width:100%;display:grid;grid-template-columns:1fr auto;gap:.5rem;align-items:center" },
    el("div", {},
      el("div", { class: "spread" },
        el("strong", {}, l.name),
        el("a", { class: "btn", href: `#/leader/${l.user_id}` }, t("btn.open")),
      ),
      el("div", { class: "hint", style: "margin-top:.2rem" },
        `${l.coord_count} ${t("hd.coordinators").toLowerCase()} · ${l.assigned} ${t("hd.people").toLowerCase()}`,
      ),
      el("div", { class: "progress-line", style: "margin-top:.55rem" },
        el("span", {}, t("hd.coords_active_today")),
        el("span", { class: "fraction" }, `${l.active_coords_today} of ${l.coord_count}`),
      ),
      el("div", { class: "pbar", "data-mid": String(activePct >= 60 ? 0 : (activePct >= 30 ? 1 : 2)), style: `--pct:${activePct}%` }),
      el("div", { class: "progress-line", style: "margin-top:.4rem" },
        el("span", {}, t("hd.chanted_today")),
        el("span", { class: "fraction" }, `${l.chanted_today} of ${l.assigned}`),
      ),
      el("div", { class: "pbar", "data-mid": String(chantedPct >= 60 ? 0 : (chantedPct >= 30 ? 1 : 2)), style: `--pct:${chantedPct}%` }),
    ),
  );
}

// HK drills into a specific NJY Leader — sees that leader's coords with
// the same coordCard used elsewhere, PLUS an assign button that opens
// a picker to move coords under this leader.
async function renderLeaderDrill(leaderId) {
  const view = $("view");
  const backHref = ME.role === "hk_leader" ? "#/leader" : "#/";
  const loader = loadingLine("Loading…");
  view.append(loader);
  try {
    const target = await api(`/api/user/${encodeURIComponent(leaderId)}`).catch(() => null);
    // Fall back to enumerating leaders if the single-user endpoint isn't there.
    const [{ leaders }, { users }] = await Promise.all([
      api("/api/hk/leaders").catch(() => ({ leaders: [] })),
      api("/api/admin/users").catch(() => ({ users: [] })),
    ]);
    const leader = leaders.find(l => l.user_id === leaderId) || {};
    const leaderUser = users.find(u => u.id === leaderId);
    const name = leader.name || leaderUser?.display_name || leaderUser?.username || "Leader";
    loader.remove();
    view.append(el("div", { class: "spread" },
      el("h2", { class: "section" }, `${name} · ${humanRole("njy_leader")}`),
      el("a", { class: "btn", href: backHref }, t("btn.back")),
    ));
    // KPI strip for this leader
    const grid = el("div", { class: "tally" });
    grid.append(
      el("div", { class: "cell" }, el("div", { class: "n" }, String(leader.coord_count || 0)), el("div", { class: "k" }, t("hd.coords_in_team"))),
      el("div", { class: "cell" }, el("div", { class: "n" }, String(leader.active_coords_today || 0)), el("div", { class: "k" }, t("hd.coords_active_today"))),
      el("div", { class: "cell" }, el("div", { class: "n" }, String(leader.assigned || 0)), el("div", { class: "k" }, t("hd.people"))),
      el("div", { class: "cell" }, el("div", { class: "n" }, String(leader.chanted_today || 0)), el("div", { class: "k" }, t("hd.chanted_today"))),
    );
    view.append(grid);

    // Assign button
    if (ME.role === "hk_leader") {
      const assignBtn = el("button", { class: "primary" }, t("btn.assign_coords"));
      assignBtn.addEventListener("click", () => openAssignCoordsModal(leaderId, name, users));
      view.append(el("p", { style: "margin:.6rem 0" }, assignBtn));
    }

    // This leader's coords — fetch the per-leader coord list. The
    // /api/leader/coordinators endpoint filters by the CURRENT user, so
    // we filter client-side from all coordinators against manager_user_id.
    const myCoords = users.filter(u => u.role === "njy_coordinator" && u.active && u.manager_user_id === leaderId);
    view.append(el("h3", { class: "section" }, t("hd.currently_assigned")));
    if (!myCoords.length) {
      view.append(el("p", { class: "hint" }, "No coordinators assigned to this leader yet."));
      return;
    }
    // Enrich each with the same shape coordCard expects. Cheapest path:
    // reuse /api/leader/coordinators (HK sees all) and filter.
    try {
      const { coordinators } = await api("/api/leader/coordinators");
      const wanted = new Set(myCoords.map(c => c.id));
      const rows = coordinators.filter(c => wanted.has(c.user_id));
      const ul = el("ul", { class: "list" });
      for (const c of rows) ul.append(el("li", {}, coordCard(c)));
      view.append(ul);
    } catch (err) {
      view.append(el("p", { class: "error" }, err.message));
    }
  } catch (err) {
    loader.remove();
    view.append(el("p", { class: "error" }, err.message));
  }
}

// Modal to bulk-assign coords under a leader. Shows currently-assigned
// as ticked, and unassigned coords with a ✱ so HK can see who's floating.
function openAssignCoordsModal(leaderId, leaderName, allUsers) {
  const backdrop = el("div", {
    style: "position:fixed;inset:0;background:rgba(0,0,0,.35);z-index:100;display:flex;align-items:flex-start;justify-content:center;padding:2rem 1rem;overflow-y:auto",
  });
  const box = el("div", {
    style: "background:var(--surface);border:1px solid var(--line);border-radius:var(--radius);max-width:520px;width:100%;padding:1rem 1.2rem;box-shadow:var(--shadow)",
  });
  box.append(el("div", { class: "spread" },
    el("h3", { class: "section", style: "margin:0" }, t("hd.assign_coords_title") + " " + leaderName),
    el("button", { class: "ghost", type: "button", id: "am-close" }, "✕"),
  ));
  box.append(el("p", { class: "hint" }, t("help.assign_coords")));

  const coords = allUsers.filter(u => u.role === "njy_coordinator" && u.active);
  const assigned = coords.filter(c => c.manager_user_id === leaderId);
  const otherAssigned = coords.filter(c => c.manager_user_id && c.manager_user_id !== leaderId);
  const unassigned = coords.filter(c => !c.manager_user_id);

  const list = el("div", { style: "max-height:50vh;overflow-y:auto;margin-top:.6rem" });
  const section = (title, items, ticked) => {
    if (!items.length) return null;
    const wrap = el("div", { style: "margin-bottom:.7rem" });
    wrap.append(el("h4", { style: "margin:.4rem 0 .3rem;color:var(--peacock-deep);font-size:.9rem" }, title));
    for (const c of items) {
      const cb = el("input", { type: "checkbox", value: c.id, style: "flex:0 0 auto;margin:0" });
      if (ticked) cb.checked = true;
      const row = el("label", {
        style: "display:flex;align-items:center;gap:.6rem;padding:.4rem .1rem;font-size:.9rem;border-bottom:1px dashed var(--line);cursor:pointer;line-height:1.3",
      },
        cb,
        el("span", { style: "flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;text-align:left" },
          el("strong", { style: "font-weight:500;color:var(--ink-2)" }, c.display_name || c.username),
          el("span", { class: "hint", style: "margin-left:.4rem;font-size:.8rem" }, `· ${c.username}`),
        ),
      );
      wrap.append(row);
    }
    list.append(wrap);
  };
  section(t("hd.currently_assigned"), assigned, true);
  section("Unassigned ✱", unassigned, false);
  if (otherAssigned.length) {
    section("Currently under another leader", otherAssigned, false);
  }
  box.append(list);

  const msg = el("span", { class: "hint", style: "margin-left:.6rem" });
  const save = el("button", { class: "primary" }, t("btn.save_assignments"));
  box.append(el("p", { style: "margin-top:.7rem" }, save, msg));

  save.addEventListener("click", async () => {
    save.disabled = true;
    const checked = Array.from(box.querySelectorAll("input[type=checkbox]:checked")).map(x => x.value);
    const unchecked = Array.from(box.querySelectorAll("input[type=checkbox]:not(:checked)")).map(x => x.value);
    // Unassign coords that WERE this leader's but are now unchecked
    const toRelease = assigned.map(c => c.id).filter(id => unchecked.includes(id));
    try {
      if (checked.length) {
        await api(`/api/hk/leader/${leaderId}/assign`, { method: "POST",
          body: JSON.stringify({ coord_user_ids: checked }) });
      }
      if (toRelease.length) {
        await api(`/api/hk/leader/${leaderId}/assign`, { method: "POST",
          body: JSON.stringify({ coord_user_ids: toRelease, unassign: true }) });
      }
      msg.textContent = t("msg.assign_saved");
      // Refresh the drill page
      setTimeout(() => { backdrop.remove(); renderRoute(); }, 500);
    } catch (err) {
      msg.textContent = err.message || "Failed.";
      save.disabled = false;
    }
  });
  box.querySelector("#am-close").addEventListener("click", () => backdrop.remove());
  backdrop.addEventListener("click", (e) => { if (e.target === backdrop) backdrop.remove(); });
  backdrop.append(box);
  document.body.append(backdrop);
}

// Reusable per-coordinator progress card. SKJ-cohort focused (initially
// 100 daily-committed chanters). Two progress bars:
//   - SKJ chanted today → daily-committed people who chanted today
//   - Consistency       → daily-committed people with at least one chant
//                          in the last 3 days (3+ consecutive misses
//                          means they've been disqualified from the
//                          streak).
// Denominators for both = total daily-committed chanters, NOT whole roll.
function coordCard(c) {
  const dailyTotal = c.daily_chanter_total || 0;
  const denom = Math.max(1, dailyTotal);
  const daily_chanted = c.daily_chanted_today || 0;
  const consistent = c.consistent_daily ?? c.one_month_daily ?? 0;
  const disqualified = Math.max(0, dailyTotal - consistent);
  const pctToday = Math.min(100, Math.round(100 * daily_chanted / denom));
  const pctConsistent = Math.min(100, Math.round(100 * consistent / denom));
  const midToday = pctToday >= 60 ? 0 : (pctToday >= 30 ? 1 : 2);
  const midConsistent = pctConsistent >= 60 ? 0 : (pctConsistent >= 30 ? 1 : 2);
  return el("div", { style: "width:100%;display:grid;grid-template-columns:1fr auto;gap:.5rem;align-items:center" },
    el("div", {},
      el("div", { class: "spread" },
        el("strong", {}, c.name),
        el("a", { class: "btn", href: `#/user/${c.user_id}` }, "Open"),
      ),
      el("div", { class: "hint", style: "margin-top:.2rem" },
        `${dailyTotal} SKJ daily-committed · ${c.assigned || 0} in whole roll`,
      ),
      el("div", { class: "progress-line", style: "margin-top:.55rem" },
        el("span", { title: "How many of the daily-committed chanters chanted today" }, "SKJ chanted today"),
        el("span", { class: "fraction" }, `${daily_chanted} of ${dailyTotal}`),
      ),
      el("div", { class: "pbar", "data-mid": String(midToday), style: `--pct:${pctToday}%` }),
      el("div", { class: "progress-line", style: "margin-top:.4rem" },
        el("span", { title: "Daily-committed chanters still on the streak. 3+ consecutive missed days = disqualified." }, "Consistency streak"),
        el("span", { class: "fraction" }, `${consistent} of ${dailyTotal}${disqualified ? ` · ${disqualified} out` : ""}`),
      ),
      el("div", { class: "pbar", "data-mid": String(midConsistent), style: `--pct:${pctConsistent}%` }),
    ),
  );
}

// -------------------------------------------------------- HK dashboard ---
async function renderHkDashboard(view) {
  view.append(el("h2", { class: "section" }, t("hd.hk_dashboard")));
  view.append(helpBanner(t("help.hk_dashboard")));
  const loader = loadingLine("Loading dashboard numbers…");
  view.append(loader);
  try {
    const s = await api("/api/hk/summary");
    loader.remove();
    const grid = el("div", { class: "tally" });
    grid.append(
      el("div", { class: "cell" }, el("div", { class: "n" }, String(s.total_people)), el("div", { class: "k" }, t("hd.people"))),
      el("div", { class: "cell" }, el("div", { class: "n" }, String(s.chanted_today)), el("div", { class: "k" }, t("hd.chanted_today"))),
      el("div", { class: "cell" }, el("div", { class: "n" }, String(s.njy_leaders)), el("div", { class: "k" }, t("hd.njy_leaders"))),
      el("div", { class: "cell" }, el("div", { class: "n" }, String(s.njy_coordinators)), el("div", { class: "k" }, t("hd.coordinators"))),
    );
    view.append(grid);
    view.append(el("h2", { class: "section" }, "All coordinators"));
    const { coordinators } = await api("/api/leader/coordinators");
    if (!coordinators.length) return view.append(el("p", { class: "hint" }, "No coordinators yet. Create some in Admin → Users."));
    const ul = el("ul", { class: "list" });
    for (const c of coordinators) {
      ul.append(el("li", {}, coordCard(c)));
    }
    view.append(ul);
  } catch (err) {
    loader.remove();
    view.append(el("p", { class: "error" }, err.message));
  }
}

// ------------------------------------------------------ user drill-in ---
let ALL_USERS_CACHE = null;
async function loadAllUsers() {
  if (ALL_USERS_CACHE) return ALL_USERS_CACHE;
  try {
    const { users } = await api("/api/admin/users");
    ALL_USERS_CACHE = users;
  } catch { ALL_USERS_CACHE = []; }
  return ALL_USERS_CACHE;
}

async function renderUserDrill(userId) {
  const view = $("view");
  try {
    const { target, roll, tally } = await api(`/api/user/${encodeURIComponent(userId)}/roll`);
    view.append(el("div", { class: "spread" },
      el("h2", { class: "section" }, `${target.name} · ${humanRole(target.role)}`),
      el("a", { class: "btn", href: ME.role === "hk_leader" ? "#/hk" : "#/leader" }, "← Back"),
    ));
    view.append(tallyStrip(tally, ["assigned","chanted_today","followed_up","needs_visit"]));
    view.append(beadLegend());
    view.append(garlandStrip(roll, /* editable */ true));
    view.append(rollListManageable(roll, target.id));
  } catch (err) {
    view.append(el("p", { class: "error" }, err.message));
  }
}

// A roll list where each row has a Manage button that opens an inline
// admin panel for reassign / lifecycle status / soft-delete. Only shown
// to hk_leader / njy_leader.
function rollListManageable(roll, currentOwnerUserId) {
  const canManage = (ME.role === "hk_leader" || ME.role === "njy_leader");
  const ul = el("ul", { class: "roll" });
  roll.forEach((r) => {
    const rowBead = bead(r.bead_color || "white", async () => {
      const upd = await api("/api/roll/mark", { method: "POST", body: JSON.stringify({ person_id: r.id }) });
      r.contact_state = upd.contact_state;
      r.bead_color = recomputeBead(r);
      // sync all beads for this person across garland strip AND row
      document.querySelectorAll(`.bead[data-person="${r.id}"]`).forEach(x => x.dataset.color = r.bead_color);
    });
    rowBead.dataset.person = r.id;

    const name = el("div", { class: "name" });
    name.innerHTML = esc(r.name) + `<span class="phone">${esc(r.phone || "")}</span>`;

    const lifecycle = el("select", { class: "lifecycle", "data-status": r.status || "chanter" },
      ...LIFECYCLE.map(s => el("option", { value: s, selected: r.status === s ? true : undefined }, s)),
    );

    const chant = el("button", { class: "chant-tag" + (r.chanted_today ? " on" : "") },
      r.chanted_today ? t("btn.chanted") : t("btn.chant_q"));
    if (r.status !== "daily") chant.setAttribute("disabled", "");
    chant.addEventListener("click", async () => {
      if (r.status !== "daily") return;
      const next = !r.chanted_today;
      await api("/api/roll/chant", { method: "POST", body: JSON.stringify({ person_id: r.id, chanted: next }) });
      r.chanted_today = next;
      chant.className = "chant-tag" + (next ? " on" : "");
      chant.textContent = next ? t("btn.chanted") : t("btn.chant_q");
      r.bead_color = recomputeBead(r);
      document.querySelectorAll(`.bead[data-person="${r.id}"]`).forEach(x => x.dataset.color = r.bead_color);
    });

    lifecycle.addEventListener("change", async () => {
      try {
        await api(`/api/person/${r.id}/status`, {
          method: "POST", body: JSON.stringify({ status: lifecycle.value }),
        });
        r.status = lifecycle.value;
        lifecycle.dataset.status = r.status;
        if (r.status === "daily") chant.removeAttribute("disabled");
        else { chant.setAttribute("disabled", ""); }
      } catch (err) {
        alert(err.message || "Could not update status");
        lifecycle.value = r.status || "chanter";
      }
    });

    const wa = el("a", { class: "wa", href: r.wa_url, target: "_blank", rel: "noopener" }, t("btn.whatsapp"));

    const historyBtn = el("button", { class: "history-btn", title: "Show 14-day chant history" }, "📅");
    historyBtn.addEventListener("click", async () => {
      const existing = li.querySelector(".history-strip");
      if (existing) { existing.remove(); return; }
      const strip = await buildHistoryStrip(r.id);
      li.append(strip);
    });

    const li = el("li", {}, el("div", { class: "bead-wrap" }, rowBead), name, lifecycle, chant, wa, historyBtn);
    ul.append(li);

    if (canManage) {
      const mgr = el("button", { class: "mini-btn" }, "Manage ▾");
      li.append(mgr);
      mgr.addEventListener("click", async () => {
        const existing = li.querySelector(".manage");
        if (existing) { existing.remove(); return; }
        const panel = await buildManagePanel(r, currentOwnerUserId, () => li.querySelector(".manage")?.remove());
        li.append(panel);
      });
    }
  });
  return ul;
}

async function buildManagePanel(person, currentOwnerUserId, onDone) {
  const users = await loadAllUsers();
  const REASSIGN_ROLES = ["njy_coordinator", "njy_leader", "manjari_servant_leader", "servant_leader", "hk_leader"];
  const panel = el("div", { class: "manage" });

  // Reassign — two-step picker: pick role, then a filtered name list.
  const currentUser = users.find(u => u.id === currentOwnerUserId);
  const roleSel = el("select", {},
    ...REASSIGN_ROLES.map(r =>
      el("option", { value: r, selected: currentUser && currentUser.role === r ? true : undefined },
        humanRole(r))),
  );
  const userSel = el("select", {});
  function fillUserSel() {
    userSel.innerHTML = "";
    const filtered = users.filter(u => u.role === roleSel.value && u.active);
    if (!filtered.length) {
      userSel.append(el("option", { value: "" }, "— no active users in this role —"));
      return;
    }
    filtered.forEach(u => {
      userSel.append(el("option", { value: u.id, selected: u.id === currentOwnerUserId ? true : undefined },
        u.display_name || u.username));
    });
  }
  roleSel.addEventListener("change", fillUserSel);
  fillUserSel();

  const assignBtn = el("button", { class: "mini-btn" }, "Move");
  assignBtn.addEventListener("click", async () => {
    if (!userSel.value) return alert("Pick a user to move this person to.");
    try {
      await api(`/api/person/${person.id}/assign`, {
        method: "POST", body: JSON.stringify({ assigned_to_user_id: userSel.value }),
      });
      alert("Moved. Refreshing.");
      renderRoute();
    } catch (err) { alert(err.message); }
  });
  panel.append(el("div", {},
    el("label", {}, "Reassign — role"), roleSel,
    el("label", { style: "margin-top:.4rem" }, "then pick who"), userSel,
    el("div", { style: "margin-top:.4rem" }, assignBtn),
  ));

  // Status change
  const statusSel = el("select", {},
    ...["chanter","qualified","daily","njy1","njy2","njy3","manjari","bv_member","dropped"]
      .map(s => el("option", { value: s, selected: person.status === s ? true : undefined }, s)),
  );
  const statusBtn = el("button", { class: "mini-btn" }, "Set status");
  statusBtn.addEventListener("click", async () => {
    try {
      await api(`/api/person/${person.id}/status`, {
        method: "POST", body: JSON.stringify({ status: statusSel.value }),
      });
      alert(`Status now: ${statusSel.value}`);
    } catch (err) { alert(err.message); }
  });
  panel.append(el("div", {},
    el("label", {}, "Lifecycle status"), statusSel,
    el("div", { style: "margin-top:.4rem" }, statusBtn),
  ));

  // Delete
  const del = el("button", { class: "danger" }, "Delete this person");
  del.addEventListener("click", async () => {
    if (!confirm(`Delete ${person.name}? This is a soft-delete — history is kept, but they will no longer appear in active lists.`)) return;
    try {
      await api(`/api/member/${person.id}`, { method: "DELETE" });
      alert("Deleted.");
      renderRoute();
    } catch (err) { alert(err.message); }
  });
  panel.append(el("div", { class: "full" }, del));
  return panel;
}

// -------------------------------------------------------- duties ---
async function renderDuties(view) {
  view.append(el("h2", { class: "section" }, t("nav.duties")));
  view.append(helpBanner(t("help.duties")));
  try {
    const { duties } = await api("/api/duties");
    if (!duties.length) return view.append(el("p", { class: "hint" }, "No pending duties. Duties are auto-generated from the BV Action Timeline as roles get assigned. (Auto-generator not yet built — HK Leader can add duties manually via SQL for now.)"));
    const ul = el("ul", { class: "list" });
    for (const d of duties) {
      const done = el("button", { class: "primary" }, "Done");
      done.addEventListener("click", async () => {
        await api(`/api/duties/${d.id}/done`, { method: "POST" });
        renderRoute();
      });
      const li = el("li", {},
        el("div", {}, el("strong", {}, d.kind.replace(/_/g," ")),
          el("div", { class: "hint" }, `due ${d.due_date}${d.notes ? " · " + esc(d.notes) : ""}`)),
        el("div", {}), done,
      );
      // HK Leader also gets a delete option (mis-generated duty cleanup)
      if (ME.role === "hk_leader") {
        const del = el("button", { class: "danger", style: "margin-left:.4rem" }, "Delete");
        del.addEventListener("click", async () => {
          if (!confirm("Delete this duty?")) return;
          try {
            await api(`/api/duties/${d.id}`, { method: "DELETE" });
            renderRoute();
          } catch (err) { alert(err.message); }
        });
        li.children[2].append(del);
      }
      ul.append(li);
    }
    view.append(ul);
  } catch (err) {
    view.append(el("p", { class: "error" }, err.message));
  }
}

// -------------------------------------------- events list clickable ---
// Each row links to its per-event attendance page.
async function renderEvents(view) {
  view.innerHTML = "";
  view.append(el("h2", { class: "section" }, t("hd.events")));
  view.append(helpBanner(t("help.events")));
  try {
    const { events } = await api("/api/events");
    if (!events.length) return view.append(el("p", { class: "hint" }, "No events yet. HK Leader can create them in Admin → Events."));
    const ul = el("ul", { class: "list" });
    for (const ev of events) {
      ul.append(el("li", {},
        el("div", {}, el("strong", {}, ev.name),
          el("div", { class: "hint" }, `${ev.kind} · ${ev.event_date}${ev.venue ? " · " + esc(ev.venue) : ""}${ev.capacity ? " · cap " + ev.capacity : ""}`)),
        el("span", { class: "pill" }, ev.event_date),
        el("a", { class: "btn", href: `#/events/${ev.id}` }, t("btn.attendance")),
      ));
    }
    view.append(ul);
  } catch (err) {
    view.append(el("p", { class: "error" }, err.message));
  }
}

// ----------------------------------------- per-event attendance ---
async function renderEventAttendance(eventId) {
  const view = $("view");
  try {
    const { event, attended_ids, attended_count } = await api(`/api/events/${encodeURIComponent(eventId)}`);
    view.append(el("div", { class: "spread" },
      el("div", {}, el("h2", { class: "section" }, event.name),
        el("div", { class: "hint" }, `${event.kind} · ${event.event_date}${event.venue ? " · " + esc(event.venue) : ""}`)),
      el("a", { class: "btn", href: "#/events" }, "← Back"),
    ));
    const attendedSet = new Set(attended_ids);

    const tally = el("div", { class: "tally" });
    const capCell = el("div", { class: "cell" },
      el("div", { class: "n" }, String(event.capacity || "—")),
      el("div", { class: "k" }, "Capacity"));
    const nCell = el("div", { class: "cell" },
      el("div", { class: "n", id: "att-n" }, String(attended_count)),
      el("div", { class: "k" }, "Attended"));
    tally.append(nCell, capCell);
    view.append(tally);

    // Per-coordinator attendance card — now interactive. Each coord
    // row expands in place to show that coord's roll as a mark-present
    // checklist. Coordinators can only expand their own row (server
    // enforces via /api/user/:userId/roll access rules).
    const breakdown = (arguments && (await api(`/api/events/${encodeURIComponent(eventId)}`)).breakdown) || [];
    if (breakdown.length) {
      const card = el("div", { class: "card" });
      card.append(el("h3", { class: "section" }, "Attendance by coordinator"));
      card.append(el("p", { class: "hint" }, ME.role === "njy_coordinator"
        ? "Tap your row to expand and mark your chanters present."
        : "Tap any coordinator's row to expand and mark their chanters. You can also use the search fallback below."));
      const bul = el("ul", { class: "list" });
      for (const b of breakdown) {
        // Progress bar measured against the coord's real roll size,
        // not a hardcoded target.
        const denom = Math.max(1, b.assigned || 0);
        const pct = Math.min(100, Math.round(100 * b.attended / denom));
        const mid = pct >= 60 ? 0 : (pct >= 30 ? 1 : 2);
        const bodyId = `att-body-${b.user_id}`;
        const isSelf = b.user_id === ME.id;
        const header = el("div", {
          style: "cursor:pointer;width:100%",
          role: "button",
          "aria-expanded": "false",
        },
          el("div", { class: "spread" },
            el("strong", {}, b.name + (isSelf ? " (you)" : "")),
            el("span", { class: "hint" }, `${b.attended}/${b.assigned} in roll · tap to expand`),
          ),
          el("div", { class: "progress-line", style: "margin-top:.4rem" },
            el("span", {}, "Attended"),
            el("span", { class: "fraction" }, `${b.attended} of ${b.assigned || 0}`),
          ),
          el("div", { class: "pbar", "data-mid": String(mid), style: `--pct:${pct}%` }),
        );
        const body = el("div", { id: bodyId, style: "display:none;margin-top:.75rem" });
        header.addEventListener("click", async () => {
          const shown = body.style.display === "block";
          if (shown) { body.style.display = "none"; header.setAttribute("aria-expanded", "false"); return; }
          if (!body.dataset.loaded) {
            try {
              const { roll } = await api(`/api/user/${encodeURIComponent(b.user_id)}/roll`);
              const ul = el("ul", { class: "roll" });
              for (const p of roll) {
                const isOn = attendedSet.has(p.id);
                const bd = bead(isOn ? "green" : "white", null);
                bd.title = isOn ? "attended" : "not attended";
                const nameEl = el("div", { class: "name" });
                nameEl.innerHTML = esc(p.name) + `<span class="phone">${esc(p.phone || "")}</span>`;
                const toggle = el("button", { class: "chant-tag" + (isOn ? " on" : "") },
                  isOn ? "✓ Present · tap to undo" : "Mark present");
                toggle.addEventListener("click", async (ev) => {
                  ev.stopPropagation();
                  const next = !attendedSet.has(p.id);
                  try {
                    await api(`/api/events/${encodeURIComponent(event.id)}/attendance`, {
                      method: "POST", body: JSON.stringify({ person_id: p.id, attended: next }),
                    });
                    if (next) attendedSet.add(p.id); else attendedSet.delete(p.id);
                    toggle.className = "chant-tag" + (next ? " on" : "");
                    toggle.textContent = next ? "✓ Present · tap to undo" : "Mark present";
                    bd.dataset.color = next ? "green" : "white";
                    $("att-n").textContent = String(attendedSet.size);
                  } catch (err) { alert(err.message); }
                });
                ul.append(el("li", {}, el("div", { class: "bead-wrap" }, bd), nameEl, el("span", {}), toggle, el("span", {})));
              }
              body.append(ul);
              body.dataset.loaded = "1";
            } catch (err) {
              body.append(el("p", { class: "hint" }, err.status === 403
                ? "You can't mark attendance on someone else's roll. This coordinator will mark their own people."
                : "Could not load roll: " + err.message));
              body.dataset.loaded = "1";
            }
          }
          body.style.display = "block";
          header.setAttribute("aria-expanded", "true");
        });
        bul.append(el("li", {}, el("div", { style: "width:100%" }, header, body)));
        // Auto-expand the coord's own row so they land straight into it
        if (isSelf) queueMicrotask(() => header.click());
      }
      card.append(bul);
      view.append(card);
    }

    const searchCard = el("div", { class: "card" });
    searchCard.append(
      el("h3", { class: "section" }, "Search & mark (alternative)"),
      el("p", { class: "hint" }, "For walk-in attendees whose coordinator you don't know. Type at least 2 characters — matches name or phone digits."),
      formField("Search", el("input", { id: "att-q", placeholder: "Ravi   or   9999000001", autocapitalize: "none", autocorrect: "off" })),
    );
    const results = el("ul", { class: "roll", id: "att-results" });
    searchCard.append(results);
    view.append(searchCard);

    const doSearch = debounce(async () => {
      const q = $("att-q").value.trim();
      results.innerHTML = "";
      if (q.length < 2) return;
      const { people } = await api(`/api/people/search?q=${encodeURIComponent(q)}`);
      if (!people.length) { results.append(el("li", {}, el("span", { class: "hint" }, "No match."))); return; }
      for (const p of people) {
        const isOn = attendedSet.has(p.id);
        const b = bead(isOn ? 2 : 0, null);
        b.title = isOn ? "attended" : "not attended";
        const name = el("div", { class: "name", html: esc(p.name) + `<span class="phone">${esc(p.phone || "")}</span>` });
        const toggle = el("button", { class: "chant-tag" + (isOn ? " on" : "") },
          isOn ? "✓ Present · tap to undo" : "Mark present");
        toggle.addEventListener("click", async () => {
          const next = !attendedSet.has(p.id);
          try {
            await api(`/api/events/${encodeURIComponent(event.id)}/attendance`, {
              method: "POST", body: JSON.stringify({ person_id: p.id, attended: next }),
            });
            if (next) attendedSet.add(p.id); else attendedSet.delete(p.id);
            toggle.className = "chant-tag" + (next ? " on" : "");
            toggle.textContent = next ? "✓ Present · tap to undo" : "Mark present";
            b.dataset.color = next ? "green" : "white";
            $("att-n").textContent = String(attendedSet.size);
          } catch (err) { alert(err.message); }
        });
        results.append(el("li", {}, el("div", { class: "bead-wrap" }, b), name, toggle, el("span", {})));
      }
    }, 250);

    searchCard.querySelector("#att-q").addEventListener("input", doSearch);
  } catch (err) {
    view.append(el("p", { class: "error" }, err.message));
  }
}
function debounce(fn, ms) {
  let t;
  return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
}

// ------------------------------------- Excel + CSV upload helper -----
// Lazy-load SheetJS (full build — needed for template generation too)
// only when the user first clicks upload or "Download template".
let _xlsxPromise = null;
function loadXlsx() {
  if (_xlsxPromise) return _xlsxPromise;
  _xlsxPromise = new Promise((resolve, reject) => {
    if (window.XLSX) return resolve(window.XLSX);
    const s = document.createElement("script");
    s.src = "https://cdn.sheetjs.com/xlsx-latest/package/dist/xlsx.full.min.js";
    s.async = true;
    s.onload = () => resolve(window.XLSX);
    s.onerror = () => reject(new Error("Could not load Excel parser (offline?)"));
    document.head.appendChild(s);
  });
  return _xlsxPromise;
}

// Build and download an .xlsx template with the "mobile" column
// pre-formatted as Text — this stops Excel from auto-converting long
// numbers to scientific notation.
async function downloadXlsxTemplate() {
  // Legacy default — the chanter template (kept for old call sites).
  return downloadChanterTemplate();
}

async function downloadChanterTemplate() {
  const XLSX = await loadXlsx();
  const data = [
    ["coupon_no", "name", "mobile", "pincode", "is_daily", "coord_username"],
    [1, "Ravi Kumar",    "9999000001", "625001", "yes", "coord01"],
    [2, "Priya Sundari", "9999000002", "625002", "no",  "coord01"],
    [3, "Anand Gopal",   "9999000003", "625003", "yes", "coord02"],
  ];
  const ws = XLSX.utils.aoa_to_sheet(data);
  const range = XLSX.utils.decode_range(ws["!ref"]);
  // Mobile column (index 2) as text
  for (let r = range.s.r; r <= range.e.r; r++) {
    const addr = XLSX.utils.encode_cell({ r, c: 2 });
    if (ws[addr]) { ws[addr].t = "s"; ws[addr].z = "@"; }
  }
  ws["!cols"] = [{ wch: 10 }, { wch: 22 }, { wch: 18 }, { wch: 10 }, { wch: 10 }, { wch: 16 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Chanters");
  XLSX.writeFile(wb, "chanter-template.xlsx");
}

async function downloadUsersTemplate() {
  const XLSX = await loadXlsx();
  const data = [
    ["username", "password", "display_name", "phone", "role", "manager_username"],
    ["leader01", "pass1234", "Bhakti Vinod Leader",      "9999000101", "njy_leader", ""],
    ["coord01",  "pass1234", "Sri Krsna Coordinator",    "9999000201", "njy_coordinator", "leader01"],
    ["coord02",  "pass1234", "Radha Priya Coordinator",  "9999000202", "njy_coordinator", "leader01"],
    ["coord03",  "pass1234", "Gopala Coordinator",       "9999000203", "njy_coordinator", "leader01"],
  ];
  const ws = XLSX.utils.aoa_to_sheet(data);
  const range = XLSX.utils.decode_range(ws["!ref"]);
  // Phone column (index 3) as text
  for (let r = range.s.r; r <= range.e.r; r++) {
    const addr = XLSX.utils.encode_cell({ r, c: 3 });
    if (ws[addr]) { ws[addr].t = "s"; ws[addr].z = "@"; }
  }
  ws["!cols"] = [{ wch: 14 }, { wch: 14 }, { wch: 24 }, { wch: 14 }, { wch: 18 }, { wch: 16 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Users");
  XLSX.writeFile(wb, "users-template.xlsx");
}

// Read an .xlsx/.xls/.csv file into an array of row objects. First row
// is the header; each subsequent row is mapped to {headerName: value}.
async function readSpreadsheetFile(file) {
  const XLSX = await loadXlsx();
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  return XLSX.utils.sheet_to_json(sheet, { defval: "" });
}

// Build a "Upload Excel / CSV" widget that:
//   1. Lets the user pick a file
//   2. Parses client-side, shows a preview table
//   3. Confirm button submits parsed rows to a caller-supplied handler
//
// mapRow(rowObj) → { name, mobile, pincode, ... } (or whatever the API
// expects). onCommit(mappedRows) does the actual API call.
function excelUploadWidget({ helperText, mapRow, onCommit, templateBuilder, templateLabel, previewCols, isValidRow, emptyMessage, previewRow }) {
  const wrap = el("div", {});
  const tplLabel = templateLabel || t("btn.download_template");
  const tplBtn = el("button", { type: "button", class: "ghost" }, tplLabel);
  tplBtn.addEventListener("click", async () => {
    tplBtn.disabled = true;
    tplBtn.textContent = "Generating…";
    try {
      await (templateBuilder || downloadXlsxTemplate)();
      tplBtn.textContent = tplLabel;
    } catch (err) {
      tplBtn.textContent = "Failed — try again";
    } finally {
      tplBtn.disabled = false;
    }
  });
  wrap.append(
    el("p", { class: "hint" }, helperText),
    el("p", {}, tplBtn,
      el("span", { class: "hint" }, " — mobile column is pre-formatted as text, so 10-digit numbers keep their form. Fill your rows in Excel, save, then upload."),
    ),
  );
  const fileInput = el("input", { type: "file", accept: ".xlsx,.xls,.csv" });
  const previewBox = el("div", { style: "margin-top:.7rem" });
  const commitBtn = el("button", { class: "primary", type: "button", disabled: true }, "Confirm import");
  const msg = el("span", { class: "hint", style: "margin-left:.6rem" });

  let parsedRows = [];

  fileInput.addEventListener("change", async () => {
    previewBox.innerHTML = "";
    commitBtn.disabled = true;
    if (!fileInput.files[0]) return;
    msg.textContent = "Parsing…";
    try {
      const raw = await readSpreadsheetFile(fileInput.files[0]);
      const rowIsValid = isValidRow || ((r) => r.name && r.mobile);
      const mapped = raw.map(mapRow);
      parsedRows = mapped.filter(rowIsValid);
      // Console-log everything about the parse so client-side rejects
      // aren't invisible. The complaint was "nothing here as well" —
      // now every parse dump shows header keys, kept count, and each
      // rejected row with its reason.
      const droppedCount = mapped.length - parsedRows.length;
      console.groupCollapsed(`%c[import parse] raw:${raw.length}  kept:${parsedRows.length}  dropped:${droppedCount}`,
        droppedCount ? "color:#c07a00;font-weight:600" : "color:#0a7b52;font-weight:600");
      console.log("first raw row (sheet columns as-is):", raw[0] || "(empty)");
      console.log("first mapped row (after column rename):", mapped[0] || "(empty)");
      console.log("validator check:", rowIsValid.toString());
      if (droppedCount) {
        console.log("dropped rows (first 20):");
        let shown = 0;
        for (let i = 0; i < mapped.length && shown < 20; i++) {
          if (!rowIsValid(mapped[i])) {
            console.log(`  row ${i}: raw=`, raw[i], " mapped=", mapped[i]);
            shown++;
          }
        }
      }
      console.groupEnd();
      if (!parsedRows.length) {
        // Print header keys the sheet actually had so operator can
        // eyeball spelling issues (e.g. "Coupon_no" vs "coupon_no").
        const headers = raw[0] ? Object.keys(raw[0]) : [];
        previewBox.append(el("p", { class: "error" }, emptyMessage
          || "No usable rows found. Make sure the file has 'name' and 'mobile' columns."));
        if (headers.length) {
          previewBox.append(el("p", { class: "hint", style: "font-family:var(--font-mono);font-size:.75rem;color:var(--muted)" },
            "Headers found in the file: ", el("code", {}, headers.join(", "))));
        }
        msg.textContent = "";
        return;
      }
      msg.textContent = `Parsed ${parsedRows.length} row(s). Preview:`;
      const table = el("table", { style: "width:100%;border-collapse:collapse;font-size:.85rem;margin-top:.4rem" });
      // Default preview is chanter-shaped; each caller can override with
      // previewCols (header labels) + previewRow (row -> [cell values]).
      const cols = previewCols || ["Name", "Mobile", "Pincode"];
      const rowFn = previewRow || ((r) => [r.name || "", r.mobile || "", r.pincode || ""]);
      const head = el("tr", {}, ...cols.map(c =>
        el("th", { style: "text-align:left;border-bottom:1px solid var(--line);padding:.3rem" }, c)));
      table.append(head);
      parsedRows.slice(0, 8).forEach(r => {
        table.append(el("tr", {},
          ...rowFn(r).map(v =>
            el("td", { style: "padding:.3rem;border-bottom:1px solid var(--line)" }, String(v ?? ""))),
        ));
      });
      previewBox.append(table);
      if (parsedRows.length > 8) previewBox.append(el("p", { class: "hint" }, `…and ${parsedRows.length - 8} more.`));
      commitBtn.disabled = false;
    } catch (err) {
      previewBox.append(el("p", { class: "error" }, err.message || "Could not read the file."));
      msg.textContent = "";
    }
  });

  const errBox = el("div", { style: "margin-top:.6rem" });
  commitBtn.addEventListener("click", async () => {
    commitBtn.disabled = true;
    msg.textContent = "Importing…";
    errBox.innerHTML = "";
    try {
      const result = await onCommit(parsedRows);
      const created = result.created ?? parsedRows.length;
      const errs = result.errors || [];
      msg.textContent = `Imported ${created}${errs.length ? ` · ${errs.length} row error(s)` : ""}`;

      // Case A — some rows failed on the backend. Render each with a
      // friendly reason (humanizeError translates codes like
      // "username_taken" → "That username is already used…").
      if (errs.length) {
        const card = el("div", { class: "card", style: "border-color:#c02020;background:#fff5f5;margin-top:.5rem" });
        card.append(el("h4", { style: "color:#c02020;margin:0 0 .3rem" }, `${errs.length} row(s) rejected by the server:`));
        const ul = el("ul", { style: "margin:.2rem 0 0;padding-left:1.2rem;font-size:.85rem" });
        errs.slice(0, 20).forEach(e => {
          const label = e.row?.username || e.username || e.row?.name || e.name || e.row?.legal_name || e.legal_name || `row #${(e.index ?? "?") + 1}`;
          const rawReason = e.error || e.reason || (e.message ? e.message : "");
          const friendly = humanizeError({ body: { error: rawReason }, status: 400 });
          ul.append(el("li", { style: "margin-bottom:.2rem" },
            el("strong", {}, label), " — ",
            el("span", {}, friendly),
            el("span", { class: "hint", style: "margin-left:.4rem;font-family:var(--font-mono);font-size:.7rem" }, `[${rawReason}]`),
          ));
        });
        if (errs.length > 20) ul.append(el("li", { class: "hint" }, `…and ${errs.length - 20} more (see browser console)`));
        card.append(ul);
        errBox.append(card);
        console.groupCollapsed(`%c[import] ${errs.length} row error(s)`, "color:#c02020;font-weight:600");
        errs.forEach((e, i) => console.log(`row ${i}:`, e));
        console.groupEnd();
      }

      // Case B — the server returned created:0 with NO row-errors. Very
      // suspicious (usually means all rows were silently filtered or the
      // endpoint returned an unexpected shape). Surface it loudly.
      if (created === 0 && !errs.length) {
        const card = el("div", { class: "card", style: "border-color:#c07a00;background:#fff8ee;margin-top:.5rem" });
        card.append(el("h4", { style: "color:#c07a00;margin:0 0 .3rem" }, "0 rows imported, but the server didn't return any row errors."));
        card.append(el("p", { style: "margin:0;font-size:.85rem" },
          "This usually means: (1) the file's rows didn't map to any usable data, (2) they were all duplicates the server silently skipped, or (3) the endpoint returned an unexpected shape. ",
          "Open the browser console (F12) for full request/response detail — every API call logs there now.",
        ));
        errBox.append(card);
      }

      previewBox.innerHTML = "";
      fileInput.value = "";
      parsedRows = [];
      commitBtn.disabled = created > 0;
    } catch (err) {
      // Whole-request failure (network, 500, 403, etc). Show friendly
      // message on-screen AND full detail in the error box + console.
      const friendly = humanizeError(err);
      msg.textContent = "Import failed: " + friendly;
      const card = el("div", { class: "card", style: "border-color:#c02020;background:#fff5f5;margin-top:.5rem" });
      card.append(el("h4", { style: "color:#c02020;margin:0 0 .3rem" }, "Import failed"));
      card.append(el("p", { style: "margin:0 0 .3rem;font-size:.9rem" }, friendly));
      const detail = err.body?.error || err.message || "unknown";
      card.append(el("p", { class: "hint", style: "margin:0;font-family:var(--font-mono);font-size:.75rem" },
        `Raw: HTTP ${err.status || "?"} · ${detail}`));
      errBox.append(card);
      console.error("[import commit] failed:", err);
      commitBtn.disabled = false;
    }
  });

  wrap.append(fileInput, previewBox, el("p", { style: "margin-top:.6rem" }, commitBtn, msg), errBox);
  return wrap;
}

// --------------------------------------------------------- sadhana ---
// Two modes:
//   #/sadhana                → browse-mode: recent entries across everyone,
//                              plus a person picker. For HK Leader, SL, SS,
//                              CS reviewing their tier.
//   #/sadhana/<person_id>    → entry-mode: the 124-pt/day form for that
//                              person. Filled by the BV Member (self)
//                              or their Servant Leader on their behalf.
async function renderSadhana(personId) {
  const view = $("view");
  if (!personId) return renderSadhanaBrowse(view);
  view.append(el("div", { class: "spread" },
    el("h2", { class: "section" }, "Sadhana Chart · daily entry"),
    el("a", { class: "btn", href: "#/sadhana" }, "← Browse"),
  ));
  view.append(el("p", { class: "hint" }, "The 124-pt/day chart from the Bhakti-Vrksa manual. Chanting points auto-compute from time-of-day round buckets: ×4 before 7am, ×3 7–8am, ×2 8–10am, ×1 after 10am."));
  const card = el("form", { class: "card", method: "post", action: "javascript:void(0)" });
  const today = new Date().toISOString().slice(0, 10);
  card.append(
    formField("Person id", el("input", { id: "sd-person", value: personId || "", required: true, readonly: true })),
    formField("Date", el("input", { id: "sd-date", type: "date", value: today })),
    el("div", { class: "grid2" },
      formField("Wake-up time (HH:MM)", el("input", { id: "sd-wake", placeholder: "05:15" })),
      formField("Wake-up pts", el("input", { id: "sd-wake-pts", type: "number", min: "0", max: "10", value: "0" })),
    ),
    formField("Mangala-arati pts (0 or 10)", el("input", { id: "sd-mangala", type: "number", value: "0", min: "0", max: "10" })),
    el("h3", { class: "section" }, "Rounds chanted"),
    el("div", { class: "grid2" },
      formField("Before 7am (×4)", el("input", { id: "sd-r-1", type: "number", value: "0", min: "0" })),
      formField("7–8am (×3)", el("input", { id: "sd-r-2", type: "number", value: "0", min: "0" })),
      formField("8–10am (×2)", el("input", { id: "sd-r-3", type: "number", value: "0", min: "0" })),
      formField("After 10am (×1)", el("input", { id: "sd-r-4", type: "number", value: "0", min: "0" })),
    ),
    el("h3", { class: "section" }, "Sravanam & other seva"),
    el("div", { class: "grid2" },
      formField("Reading mins", el("input", { id: "sd-read-min", type: "number", value: "0" })),
      formField("Reading pts", el("input", { id: "sd-read-pts", type: "number", value: "0" })),
      formField("Hearing mins", el("input", { id: "sd-hear-min", type: "number", value: "0" })),
      formField("Hearing pts", el("input", { id: "sd-hear-pts", type: "number", value: "0" })),
      formField("Temple seva pts", el("input", { id: "sd-seva", type: "number", value: "0", max: "10" })),
      formField("Preaching pts", el("input", { id: "sd-preach", type: "number", value: "0", max: "10" })),
    ),
    el("p", { style: "margin-top:1rem" },
      el("button", { type: "submit", class: "primary" }, "Save entry"),
      " ", el("span", { class: "hint", id: "sd-msg" }),
    ),
  );
  card.onsubmit = async (e) => {
    e.preventDefault();
    const body = {
      person_id: $("sd-person").value.trim(),
      entry_date: $("sd-date").value,
      wake_up_time: $("sd-wake").value || null,
      wake_up_pts: +$("sd-wake-pts").value,
      mangala_arati_pts: +$("sd-mangala").value,
      rounds_before_7: +$("sd-r-1").value,
      rounds_7_8: +$("sd-r-2").value,
      rounds_8_10: +$("sd-r-3").value,
      rounds_after_10: +$("sd-r-4").value,
      reading_mins: +$("sd-read-min").value,
      reading_pts: +$("sd-read-pts").value,
      hearing_mins: +$("sd-hear-min").value,
      hearing_pts: +$("sd-hear-pts").value,
      seva_pts: +$("sd-seva").value,
      preaching_pts: +$("sd-preach").value,
    };
    try {
      const r = await api("/api/sadhana", { method: "POST", body: JSON.stringify(body) });
      $("sd-msg").textContent = `Saved · ${r.entry.total_pts} / 124 pts`;
    } catch (err) { $("sd-msg").textContent = "Error: " + err.message; }
  };
  view.append(card);
}

function formField(labelText, control) {
  const l = el("label", {}, labelText);
  return el("div", {}, l, control);
}

// Password field with an eye 👁 button that toggles between hidden and
// shown. Used in Settings > Change password and could be reused on the
// sign-in page in future.
function passwordFieldWithEye(id, labelText) {
  const input = el("input", { id, type: "password", required: true, autocomplete: "new-password" });
  const eye = el("button", { type: "button", class: "eye-btn", "aria-label": "Show / hide password" }, "👁");
  eye.addEventListener("click", () => {
    if (input.type === "password") { input.type = "text"; eye.textContent = "🙈"; }
    else { input.type = "password"; eye.textContent = "👁"; }
  });
  const inputWrap = el("div", { class: "eye-wrap" }, input, eye);
  const wrap = el("div", {}, el("label", {}, labelText), inputWrap);
  return { wrap, input, eye };
}

// -------------------------------------------- sadhana browse mode ---
async function renderSadhanaBrowse(view) {
  view.append(el("h2", { class: "section" }, "Sadhana Chart · browse"));
  view.append(el("p", { class: "hint" }, "Review recent entries filled by BV members and their Servant Leaders. Click any row to see that member's full history."));

  const search = el("div", { class: "card" });
  search.append(
    el("h3", { class: "section" }, "Find a member"),
    formField("Search", el("input", { id: "sd-q", placeholder: "name or phone digits", autocapitalize: "none" })),
    el("ul", { class: "roll", id: "sd-results" }),
  );
  view.append(search);
  const doSearch = debounce(async () => {
    const q = $("sd-q").value.trim();
    const ul = $("sd-results"); ul.innerHTML = "";
    if (q.length < 2) return;
    const { people } = await api(`/api/people/search?q=${encodeURIComponent(q)}`);
    if (!people.length) return ul.append(el("li", {}, el("span", { class: "hint" }, "No match.")));
    for (const p of people) {
      ul.append(el("li", {},
        el("div", { class: "bead-wrap" }, bead(0)),
        el("div", { class: "name", html: esc(p.name) + `<span class="phone">${esc(p.phone || "")}</span>` }),
        el("a", { class: "wa", href: `#/sadhana/${p.id}` }, "Open"),
        el("span", {}),
      ));
    }
  }, 250);
  search.querySelector("#sd-q").addEventListener("input", doSearch);

  view.append(el("h3", { class: "section" }, "Recent entries"));
  try {
    const { entries } = await api("/api/sadhana?limit=20");
    if (!entries.length) return view.append(el("p", { class: "hint" }, "No entries yet. Once BV members start filling their charts, they show up here newest-first."));
    const ul = el("ul", { class: "list" });
    for (const e of entries) {
      const li = el("li", {},
        el("div", {}, el("strong", {}, e.person_name),
          el("div", { class: "hint" }, `${e.entry_date} · rounds ${(e.rounds_before_7||0)+(e.rounds_7_8||0)+(e.rounds_8_10||0)+(e.rounds_after_10||0)}`)),
        el("span", { class: "score" }, `${e.total_pts || 0} / 124`),
        el("div", {}),
      );
      const actions = li.lastChild;
      const open = el("a", { class: "mini-btn", href: `#/sadhana/${e.person_id}` }, "Open");
      const del = el("button", { class: "danger", style: "margin-left:.4rem" }, "Delete");
      del.addEventListener("click", async () => {
        if (!confirm(`Delete this sadhana entry for ${e.person_name} on ${e.entry_date}?`)) return;
        try {
          await api(`/api/sadhana/${e.id}`, { method: "DELETE" });
          renderRoute();
        } catch (err) { alert(err.message); }
      });
      actions.append(open, del);
      ul.append(li);
    }
    view.append(ul);
  } catch (err) {
    view.append(el("p", { class: "error" }, err.message));
  }
}

// -------------------------------------------------- BV structure ---
async function renderBvStructure(view) {
  view.append(el("h2", { class: "section" }, "Bhakti-Vrksa structure"));
  view.append(helpBanner(
    "The Circle → Sector → BV Group hierarchy for Phase 4 (Feb 2027 " +
    "onward). Six circles, four sectors each, three BV groups per " +
    "sector. Right now HK Leader seeds it here; later, Servant Leaders " +
    "run their own BV groups against it."
  ));
  view.append(el("p", { class: "hint" }, "Six named circles from the docs: Krsna, Balarama, Gauranga, Nityananda, Nrsimha, Laksmi. Under Plan 2 (updated): 4 sectors of 3 BV groups each = 72 groups at Week 1, expected to drop to ~50 groups by Week 64. Create/edit groups here."));
  try {
    const { circles, sectors, bv_groups } = await api("/api/bv/structure");
    view.append(el("h3", { class: "section" }, `Circles (${circles.length})`));
    view.append(structureList(circles));
    view.append(el("h3", { class: "section" }, `Sectors (${sectors.length})`));
    view.append(structureList(sectors));
    view.append(el("h3", { class: "section" }, `BV groups (${bv_groups.length})`));
    view.append(structureList(bv_groups));
    view.append(newGroupForm());
  } catch (err) {
    view.append(el("p", { class: "error" }, err.message));
  }
}
function structureList(groups) {
  if (!groups.length) return el("p", { class: "hint" }, "None yet.");
  const ul = el("ul", { class: "list" });
  for (const g of groups) {
    const li = el("li", {},
      el("div", {}, el("strong", {}, g.name),
        el("div", { class: "hint" }, `${g.kind}${g.meeting_day ? " · " + g.meeting_day : ""}${g.meeting_time ? " " + g.meeting_time : ""}`)),
      el("span", { class: "pill" }, g.target_strength ? `${g.target_strength} target` : ""),
      el("div", {}),
    );
    const actions = li.lastChild;
    const editBtn = el("button", { class: "mini-btn" }, "Edit");
    const delBtn = el("button", { class: "danger", style: "margin-left:.4rem" }, "Delete");
    actions.append(editBtn, delBtn);
    editBtn.addEventListener("click", () => {
      const existing = li.querySelector(".manage");
      if (existing) { existing.remove(); return; }
      const p = el("div", { class: "manage" },
        formField("Name", el("input", { id: `ge-name-${g.id}`, value: g.name })),
        formField("Meeting day", el("input", { id: `ge-day-${g.id}`, value: g.meeting_day || "" })),
        formField("Meeting time", el("input", { id: `ge-time-${g.id}`, value: g.meeting_time || "" })),
        formField("Meeting venue", el("input", { id: `ge-venue-${g.id}`, value: g.meeting_venue || "" })),
        formField("Target strength", el("input", { id: `ge-str-${g.id}`, type: "number", value: g.target_strength || "" })),
      );
      const save = el("button", { class: "primary" }, "Save");
      save.addEventListener("click", async () => {
        try {
          await api("/api/bv/group", { method: "POST", body: JSON.stringify({
            id: g.id, name: $(`ge-name-${g.id}`).value, kind: g.kind,
            meeting_day: $(`ge-day-${g.id}`).value,
            meeting_time: $(`ge-time-${g.id}`).value,
            meeting_venue: $(`ge-venue-${g.id}`).value,
            target_strength: $(`ge-str-${g.id}`).value ? +$(`ge-str-${g.id}`).value : null,
          }) });
          renderRoute();
        } catch (err) { alert(err.message); }
      });
      p.append(el("div", { class: "full" }, save));
      li.append(p);
    });
    delBtn.addEventListener("click", async () => {
      if (!confirm(`Delete group "${g.name}"? Members are unlinked; the group is soft-deleted (history kept). Continue?`)) return;
      try {
        await api(`/api/bv/group/${g.id}`, { method: "DELETE" });
        renderRoute();
      } catch (err) { alert(err.message); }
    });
    ul.append(li);
  }
  return ul;
}
function newGroupForm() {
  const card = el("form", { class: "card", method: "post", action: "javascript:void(0)" });
  card.append(
    el("h3", { class: "section" }, "New group"),
    formField("Name", el("input", { id: "g-name", required: true })),
    formField("Kind", el("select", { id: "g-kind" },
      el("option", { value: "bv_group" }, "BV Group"),
      el("option", { value: "sector" }, "Sector"),
      el("option", { value: "circle" }, "Circle"),
      el("option", { value: "manjari" }, "Manjari"),
      el("option", { value: "njy_group" }, "NJY Group"),
    )),
    el("div", { class: "grid2" },
      formField("Meeting day", el("input", { id: "g-day", placeholder: "Sun" })),
      formField("Meeting time", el("input", { id: "g-time", placeholder: "18:00" })),
    ),
    formField("Venue", el("input", { id: "g-venue" })),
    formField("Target strength", el("input", { id: "g-strength", type: "number" })),
    el("p", {}, el("button", { class: "primary", type: "submit" }, "Save group"),
      " ", el("span", { class: "hint", id: "g-msg" })),
  );
  card.onsubmit = async (e) => {
    e.preventDefault();
    const body = {
      name: $("g-name").value, kind: $("g-kind").value,
      meeting_day: $("g-day").value, meeting_time: $("g-time").value,
      meeting_venue: $("g-venue").value,
      target_strength: $("g-strength").value ? +$("g-strength").value : null,
    };
    try {
      await api("/api/bv/group", { method: "POST", body: JSON.stringify(body) });
      $("g-msg").textContent = "Saved."; renderRoute();
    } catch (err) { $("g-msg").textContent = err.message; }
  };
  return card;
}

// -------------------------------------------------- member details ---
async function renderMemberDetails(personId) {
  const view = $("view");
  view.append(el("h2", { class: "section" }, "Member details"));
  if (!personId) return view.append(el("p", { class: "hint" }, "Open via a person row (feature comes online with BV phase)."));
  try {
    const { person } = await api(`/api/member/${encodeURIComponent(personId)}`);
    const card = el("form", { class: "card", method: "post", action: "javascript:void(0)" });
    const F = (id, label, val, extra = {}) =>
      formField(label, el("input", { id, value: val || "", ...extra }));
    card.append(
      el("h3", { class: "section" }, "Personal"),
      F("m-name", "Legal name", person.legal_name),
      el("div", { class: "grid2" },
        F("m-gender", "Gender", person.gender, { placeholder: "Male/Female" }),
        F("m-dob", "DOB", person.dob, { type: "date" }),
      ),
      el("div", { class: "grid2" },
        F("m-marital", "Marital status", person.marital_status),
        F("m-children", "Number of children", person.num_children, { type: "number" }),
      ),
      F("m-spouse", "Spouse name", person.spouse_name),
      el("div", { class: "grid2" },
        F("m-spouse-dob", "Spouse DOB", person.spouse_dob, { type: "date" }),
        F("m-anniv", "Wedding anniversary", person.wedding_anniversary, { type: "date" }),
      ),
      F("m-addr", "Address", person.address),
      el("div", { class: "grid2" },
        F("m-phone", "Phone", person.phone),
        F("m-pincode", "Pincode", person.pincode, { placeholder: "e.g. 625001" }),
      ),
      F("m-email", "Email", person.email, { type: "email" }),
      el("h3", { class: "section" }, "Work"),
      el("div", { class: "grid2" },
        F("m-edu", "Education", person.education),
        F("m-occ", "Occupation", person.occupation),
        F("m-org", "Organization", person.organization),
        F("m-des", "Designation", person.designation),
      ),
      F("m-lang", "Languages known", person.languages_known),
      el("h3", { class: "section" }, "Notes"),
      formField("Notes", el("textarea", { id: "m-notes" }, person.notes || "")),
      el("p", {}, el("button", { class: "primary", type: "submit" }, "Save"),
        " ", el("span", { class: "hint", id: "m-msg" })),
    );
    card.onsubmit = async (e) => {
      e.preventDefault();
      const body = {
        legal_name: $("m-name").value, gender: $("m-gender").value,
        dob: $("m-dob").value || null, marital_status: $("m-marital").value,
        num_children: $("m-children").value ? +$("m-children").value : null,
        spouse_name: $("m-spouse").value,
        spouse_dob: $("m-spouse-dob").value || null,
        wedding_anniversary: $("m-anniv").value || null,
        address: $("m-addr").value, phone: $("m-phone").value,
        pincode: $("m-pincode").value || null,
        email: $("m-email").value,
        education: $("m-edu").value, occupation: $("m-occ").value,
        organization: $("m-org").value, designation: $("m-des").value,
        languages_known: $("m-lang").value,
        notes: $("m-notes").value,
      };
      try {
        await api(`/api/member/${encodeURIComponent(personId)}`, { method: "POST", body: JSON.stringify(body) });
        $("m-msg").textContent = "Saved.";
      } catch (err) { $("m-msg").textContent = err.message; }
    };
    view.append(card);
  } catch (err) {
    view.append(el("p", { class: "error" }, err.message));
  }
}

// -------------------------------------------------- group report ---
async function renderGroupReport(groupId) {
  const view = $("view");
  view.append(el("h2", { class: "section" }, "Group planning sheet"));
  view.append(el("p", { class: "hint" }, "Periodic report by a Servant Leader (per Bhakti-Vrksa manual). 22 parameters across attendance, shiksha, preaching, temple services."));
  if (!groupId) return view.append(el("p", { class: "hint" }, "Open with a group id in the URL: #/group-report/<group_id>"));
  const num = (id, label) => formField(label, el("input", { id, type: "number", min: "0", value: "0" }));
  const card = el("form", { class: "card", method: "post", action: "javascript:void(0)" });
  card.append(
    formField("Report date", el("input", { id: "gr-date", type: "date", value: new Date().toISOString().slice(0,10), required: true })),
    formField("Week number", el("input", { id: "gr-wk", type: "number" })),
    el("h3", { class: "section" }, "A · Member attendance"),
    el("div", { class: "grid3" },
      num("gr-avg", "Avg attendance"),
      num("gr-high", "Highest"),
      num("gr-irr", "Irregular"),
      num("gr-child", "Children avg"),
      num("gr-bvlc", "BVLC avg"),
    ),
    el("h3", { class: "section" }, "B · Shiksha level"),
    el("div", { class: "grid3" },
      num("gr-brah", "Brahmana init."),
      num("gr-hari", "Harinama init."),
      num("gr-guru", "Guru-ashraya"),
      num("gr-sp", "Prabhupada-ashraya"),
      num("gr-sadh", "Sadhaka"),
      num("gr-sev", "Sevaka"),
      num("gr-shr", "Shraddhavan"),
      num("gr-pot", "Potential leaders"),
    ),
    el("h3", { class: "section" }, "C · Preaching"),
    el("div", { class: "grid3" },
      num("gr-h2h", "House-to-house"),
      num("gr-nag", "Nagara sankirtan"),
      num("gr-out", "Outreach"),
    ),
    formField("Other preaching", el("input", { id: "gr-other-p" })),
    el("h3", { class: "section" }, "D · Temple services"),
    el("div", { class: "grid3" },
      num("gr-eng", "Services engaged"),
      num("gr-mon", "Monthly contributors"),
      num("gr-amt", "Amount"),
      num("gr-life", "Life members"),
    ),
    formField("Service details", el("input", { id: "gr-svc-d" })),
    formField("Other contribution", el("input", { id: "gr-oth-c" })),
    el("p", { style: "margin-top:1rem" },
      el("button", { class: "primary", type: "submit" }, "Save report"),
      " ", el("span", { class: "hint", id: "gr-msg" })),
  );
  card.onsubmit = async (e) => {
    e.preventDefault();
    const body = {
      group_id: groupId,
      report_date: $("gr-date").value,
      week_number: +($("gr-wk").value || 0) || null,
      avg_attendance: +$("gr-avg").value, highest_attendance: +$("gr-high").value,
      irregular_members: +$("gr-irr").value, children_program_avg: +$("gr-child").value,
      bvlc_avg: +$("gr-bvlc").value,
      brahmana_initiated: +$("gr-brah").value, harinama_initiated: +$("gr-hari").value,
      guru_ashraya: +$("gr-guru").value, prabhupada_ashraya: +$("gr-sp").value,
      krishna_sadhaka: +$("gr-sadh").value, krishna_sevaka: +$("gr-sev").value,
      shraddhavan: +$("gr-shr").value, potential_leaders: +$("gr-pot").value,
      h2h_programs: +$("gr-h2h").value, nagara_sankirtans: +$("gr-nag").value,
      outreach_programs: +$("gr-out").value, other_preaching: $("gr-other-p").value,
      temple_services_engaged: +$("gr-eng").value, monthly_contributors: +$("gr-mon").value,
      contribution_amount: +$("gr-amt").value, life_members: +$("gr-life").value,
      service_details: $("gr-svc-d").value, other_contribution: $("gr-oth-c").value,
    };
    try {
      await api("/api/group-reports", { method: "POST", body: JSON.stringify(body) });
      $("gr-msg").textContent = "Saved.";
    } catch (err) { $("gr-msg").textContent = err.message; }
  };
  view.append(card);
}

// ---------------------------------------------------- Leaderboard ---
// Generation token so a stale in-flight fetch doesn't append rows into
// a view that has already been re-rendered for a different tab.
let leaderboardGen = 0;
async function renderLeaderboard(kind, rest) {
  const myGen = ++leaderboardGen;
  const view = $("view");
  view.append(el("h2", { class: "section" }, "Leaderboard"));

  // Route shape: #/leaderboard/<kind>[/leaders]
  //   kind = "daily" | "overall"
  //   suffix "/leaders" flips to the NJY-Leader board
  // Router passes `kind` as the entire arg after "leaderboard/", which
  // can be "daily/leaders" — split it here so both halves work.
  const [actualKind, ...suffixParts] = String(kind || "daily").split("/");
  const suffix = suffixParts.join("/") || (rest || "");
  const canSeeLeadersBoard = ["hk_leader", "njy_leader"].includes(ME.role);
  const isLeadersBoard = suffix === "leaders" && canSeeLeadersBoard;

  const tabs = el("div", { class: "nav", style: "border:none" });
  const t = (k, label, extra) => el("a", { class: (actualKind === k && !!extra === isLeadersBoard) ? "active" : "",
    href: `#/leaderboard/${k}${extra ? "/leaders" : ""}` }, label);
  tabs.append(
    t("daily", "Coords · Today"),
    t("overall", "Coords · Overall"),
  );
  if (canSeeLeadersBoard) {
    tabs.append(
      t("daily", "Leaders · Today", "leaders"),
      t("overall", "Leaders · Overall", "leaders"),
    );
  }
  tabs.append(el("a", { href: "#/points-rules", style: "margin-left:auto" }, "How points work ↗"));
  view.append(tabs);

  const hint = isLeadersBoard
    ? (actualKind === "daily"
        ? "NJY Leaders ranked by sum of their coords' today points. Only HK Leader and NJY Leaders see this board."
        : "NJY Leaders ranked by sum of their coords' Phase-1+2 points. Only HK Leader and NJY Leaders see this board.")
    : (actualKind === "daily"
        ? "Coords ranked by today's points — resets every midnight IST. Chant a chanter = +10 · Follow up = +5 · NJY attendance = +50 · Perfect day = +50."
        : "Coords ranked cumulatively (Phase 1 + Phase 2). Adds Janmashtami entry/commit tier bonuses and milestone bonuses. Tap the rules link for the full matrix.");
  view.append(el("p", { class: "hint" }, hint));

  const loader = el("p", { class: "hint" }, "Loading…");
  view.append(loader);

  const url = isLeadersBoard
    ? `/api/leaderboard/leaders/${actualKind}`
    : `/api/leaderboard/${actualKind}`;

  try {
    const { rows } = await api(url);
    if (myGen !== leaderboardGen) return;
    loader.remove();

    // HK's own summary row on top of the LEADERS board — sum-of-all so
    // HK Leader sees the whole-org total in one line.
    if (isLeadersBoard && ME.role === "hk_leader" && rows.length) {
      const orgTotal = rows.reduce((s, r) => s + (r.pts || 0), 0);
      const orgCoords = rows.reduce((s, r) => {
        const c = (r.breakdown || []).find(b => b.k === "coords_in_team");
        return s + (c ? c.n : 0);
      }, 0);
      const summary = el("div", { class: "card", style: "margin-bottom:.7rem;background:linear-gradient(180deg,var(--tint-responded),var(--tint-followed));border-color:var(--mark-responded)" },
        el("div", { class: "spread" },
          el("div", {}, el("strong", {}, "🏛 HK Leader · Whole org"),
            el("div", { class: "hint" }, `${rows.length} NJY Leaders · ${orgCoords} coords`)),
          el("span", { class: "score" }, `${orgTotal} pts`),
        ),
      );
      view.append(summary);
    }

    if (!rows.length) {
      return view.append(el("p", { class: "hint" }, isLeadersBoard ? "No NJY Leaders yet." : "No coordinators yet."));
    }
    const ul = el("ul", { class: "list" });
    const medals = ["🥇", "🥈", "🥉"];
    rows.forEach((r, i) => {
      const label = medals[i] || `#${i + 1}`;
      const breakdownText = (r.breakdown || [])
        .filter(b => b.pts !== 0 || b.n != null)
        .map(b => b.n != null && b.pts === 0 ? `${prettyPointKind(b.k)}: ${b.n}` : `${prettyPointKind(b.k)}: ${b.pts}`)
        .join(" · ");
      // Coord board keeps the "open profile" link. Leaders board goes to
      // that leader's drill-in page instead of profile (leaders don't
      // have a personal coord-style profile page).
      const openHref = isLeadersBoard
        ? `#/leader/${r.user_id}`
        : `#/profile/${r.user_id}`;
      const li = el("li", {},
        el("div", {}, el("strong", {}, `${label}  ${r.name}`),
          el("div", { class: "hint", style: "margin-top:.15rem" }, breakdownText || "—")),
        el("span", { class: "score" }, `${r.pts} pts`),
        r.user_id === ME.id
          ? el("a", { class: "pill on", href: openHref, style: "text-decoration:none" }, "you — open")
          : el("a", { class: "btn", href: openHref }, "Open"),
      );
      ul.append(li);
    });
    view.append(ul);
  } catch (err) {
    if (myGen !== leaderboardGen) return;
    loader.remove();
    if (err.status === 403) {
      view.append(el("p", { class: "hint" }, "Leaders leaderboard is only visible to HK Leader and NJY Leaders."));
    } else {
      view.append(el("p", { class: "error" }, err.message));
    }
  }
}

// Turn the internal point-kind slugs into short human labels.
function prettyPointKind(k) {
  return ({
    chanted: "chanted today",
    follow_up: "follow-ups",
    njy_attend: "NJY attends",
    perfect_day: "perfect day",
    chant_days: "chant days",
    follow_ups: "follow-ups",
    njy_attends: "NJY attends",
    njy_triple: "3-NJY streak",
    jm_entries: "Janmashtami entries",
    jm_daily_commits: "daily commits",
    milestone_35_one_month: "milestone 35 one-month",
    milestone_16_njy2: "milestone 16 NJY-2",
    milestone_12_njy3: "milestone 12 NJY-3",
    coords_in_team: "coords in team",
    coords_scoring: "coords scoring",
    sum_of_coord_pts: "team total",
  })[k] || k.replace(/_/g, " ");
}

// ---------------------------------------------------- Profile ---
// A coord's own "how am I doing" page. LeetCode-style transaction view
// showing every point-earning bucket with its count and total.
async function renderProfile(userId) {
  const view = $("view");
  const target = userId || ME.id;
  view.append(el("h2", { class: "section" }, "Profile"));
  const loader = el("p", { class: "hint" }, "Loading…");
  view.append(loader);
  try {
    // Fetch both boards; find this user's row.
    const [dailyRes, overallRes] = await Promise.all([
      api("/api/leaderboard/daily"),
      api("/api/leaderboard/overall"),
    ]);
    loader.remove();
    const daily = dailyRes.rows.find(r => r.user_id === target);
    const overall = overallRes.rows.find(r => r.user_id === target);
    const name = daily?.name || overall?.name || "Coordinator";
    const dailyRank = dailyRes.rows.findIndex(r => r.user_id === target) + 1;
    const overallRank = overallRes.rows.findIndex(r => r.user_id === target) + 1;

    view.append(el("div", { class: "spread" },
      el("h3", { class: "section", style: "margin:0" }, name),
      el("a", { class: "btn", href: "#/leaderboard/overall" }, "← Back to leaderboard"),
    ));

    // Show the coord's own NJY Leader so they know who to escalate to.
    // Only meaningful when viewing your OWN profile (userId undefined).
    if (!userId && ME.manager_display_name) {
      view.append(el("p", { class: "hint", style: "margin:.2rem 0 .8rem" },
        "Your NJY Leader: ", el("strong", {}, ME.manager_display_name),
      ));
    }

    // KPI strip
    const kpis = el("div", { class: "tally" });
    kpis.append(
      el("div", { class: "cell" },
        el("div", { class: "n" }, String(daily?.pts || 0)),
        el("div", { class: "k" }, "Today's points")),
      el("div", { class: "cell" },
        el("div", { class: "n" }, String(overall?.pts || 0)),
        el("div", { class: "k" }, "Overall points")),
      el("div", { class: "cell" },
        el("div", { class: "n" }, dailyRank ? `#${dailyRank}` : "—"),
        el("div", { class: "k" }, "Rank today")),
      el("div", { class: "cell" },
        el("div", { class: "n" }, overallRank ? `#${overallRank}` : "—"),
        el("div", { class: "k" }, "Rank overall")),
    );
    view.append(kpis);

    // Two breakdown lists, side by side on desktop / stacked on phone.
    const grid = el("div", { class: "grid2", style: "margin-top:1rem" });
    grid.append(pointsBreakdownCard("Today", daily?.breakdown));
    grid.append(pointsBreakdownCard("Overall (P1+P2)", overall?.breakdown));
    view.append(grid);

    view.append(el("p", { style: "margin-top:1rem" },
      el("a", { class: "btn", href: "#/points-rules" }, "See full points rules →"),
    ));
  } catch (err) {
    loader.remove();
    view.append(el("p", { class: "error" }, err.message));
  }
}

function pointsBreakdownCard(title, breakdown) {
  const card = el("div", { class: "card", style: "margin:0" });
  card.append(el("h3", { class: "section", style: "margin-top:0" }, title));
  if (!breakdown || !breakdown.length) {
    card.append(el("p", { class: "hint" }, "No points yet in this scope."));
    return card;
  }
  const total = breakdown.reduce((s, b) => s + (b.pts || 0), 0);
  const ul = el("ul", { class: "list" });
  for (const b of breakdown) {
    ul.append(el("li", {},
      el("div", {}, el("strong", {}, prettyPointKind(b.k)),
        el("div", { class: "hint" }, b.n ? `${b.n} × action` : "milestone")),
      el("span", { class: "score" }, `+${b.pts}`),
      el("span", {}),
    ));
  }
  card.append(ul);
  card.append(el("p", { style: "text-align:right;font-family:var(--font-mono);color:var(--peacock-deep);margin-top:.4rem" },
    "Total ", el("strong", {}, `${total} pts`)));
  return card;
}

// ---------------------------------------------------- Points rules ---
// A static reference — the full "how points are earned" table so
// coordinators know what to do to climb.
function renderPointsRules(view) {
  view.append(el("h2", { class: "section" }, "How points are earned"));
  view.append(el("p", { class: "hint" }, "This is the full point matrix for Phase 1 and Phase 2. Keep an eye on the milestone bonuses — they're the biggest earners."));

  const daily = el("div", { class: "card" });
  daily.append(
    el("h3", { class: "section", style: "margin-top:0" }, "Daily leaderboard (resets midnight IST)"),
    el("ul", { class: "list" },
      pointRow("Chanter marked chanted today", "+10"),
      pointRow("Follow-up (contact-state change today)", "+5"),
      pointRow("Chanter attended an NJY event", "+50"),
      pointRow("Same chanter attended ALL 3 NJYs (one-time)", "+100"),
      pointRow("Chanter hits 7-day chanting streak", "+20"),
      pointRow("Chanter hits 30-day chanting streak", "+50"),
      pointRow("Perfect day — all your chanters chanted today", "+50"),
    ),
  );
  view.append(daily);

  const overall = el("div", { class: "card" });
  overall.append(
    el("h3", { class: "section", style: "margin-top:0" }, "Overall leaderboard (cumulative P1 + P2)"),
    el("p", { class: "hint" }, "Everything above accumulates. Plus these one-off Janmashtami-day bonuses:"),
    el("h3", { class: "section" }, "Janmashtami entries"),
    el("ul", { class: "list" },
      pointRow("Each new person entered", "+5"),
      pointRow("Tier bonus at 25 entries", "+25"),
      pointRow("Tier bonus at 50 entries", "+50"),
      pointRow("Tier bonus at 75 entries", "+75"),
      pointRow("Tier bonus at 100 entries", "+100"),
    ),
    el("h3", { class: "section" }, "Daily-chanter commits (on Janmashtami)"),
    el("ul", { class: "list" },
      pointRow("Each person set to daily on Janmashtami", "+10"),
      pointRow("Tier bonus at 15 daily commits", "+30"),
      pointRow("Tier bonus at 25 daily commits", "+50"),
      pointRow("Tier bonus at 50 daily commits", "+100"),
    ),
    el("h3", { class: "section" }, "Milestones (one-off, permanent)"),
    el("ul", { class: "list" },
      pointRow("35 of your 50 chanters stayed daily for a month", "+200"),
      pointRow("16 of your 50 attended NJY 2", "+200"),
      pointRow("12 of your 50 attended NJY 3", "+400"),
    ),
  );
  view.append(overall);

  view.append(el("p", { style: "margin-top:1rem" },
    el("a", { class: "btn", href: "#/leaderboard/overall" }, "← Back to leaderboard"),
  ));
}

function pointRow(label, points) {
  return el("li", {},
    el("div", {}, el("strong", {}, label)),
    el("span", { class: "score" }, points),
    el("span", {}),
  );
}

// ---------------------------------------------------- Janmashtami ---
// Two rapid-entry paths on Janmashtami day:
//   A. Single-row quick-add form (name / mobile / pincode) — one save
//      picks the next sl_no from the caller's assigned range.
//   B. Paste-many textarea — one row per line, tab OR comma separated.
//      Excel copies as tab-separated by default, so paste-from-Excel
//      just works. Google Sheets / CSV also work.
async function renderJanmashtami(view) {
  view.append(el("h2", { class: "section" }, "Janmashtami rapid entry"));

  const progressWrap = el("div", { style: "display:flex;gap:.5rem;flex-wrap:wrap;margin-bottom:1rem" });
  view.append(progressWrap);

  async function refreshProgress() {
    try {
      const p = await api("/api/me/janmashtami-progress");
      progressWrap.innerHTML = "";
      const b1 = el("span", { class: "tier-badge" },
        el("span", { class: "num" }, String(p.entries_today)),
        p.next_entry_tier ? ` entries — next tier at ${p.next_entry_tier}` : " entries",
      );
      const b2 = el("span", { class: "tier-badge warm" },
        el("span", { class: "num" }, String(p.committed_today)),
        p.next_commit_tier ? ` daily-commits — next tier at ${p.next_commit_tier}` : " daily-commits",
      );
      progressWrap.append(b1, b2);
    } catch (err) { /* silent */ }
  }
  await refreshProgress();

  // --- Path A: single-row rapid form
  const cardA = el("div", { class: "card" });
  cardA.append(el("h3", { class: "section" }, t("hd.quick_add")));
  cardA.append(el("p", { class: "hint" }, t("help.quick_add")));
  const form = el("form", { class: "rapid-form", method: "post", action: "javascript:void(0)" });
  const couponI = el("input", { placeholder: "e.g. 1234", required: true, inputmode: "numeric", autocomplete: "off" });
  const nameI = el("input", { placeholder: t("field.name"), required: true, autocapitalize: "words" });
  const mobI  = el("input", { placeholder: t("field.mobile"), required: true, inputmode: "tel" });
  const pinI  = el("input", { placeholder: t("field.pincode"), inputmode: "numeric" });
  const submitBtn = el("button", { class: "primary", type: "submit" }, t("btn.add"));
  form.append(
    el("div", {}, el("label", {}, "Coupon #"), couponI),
    el("div", {}, el("label", {}, t("field.name")), nameI),
    el("div", {}, el("label", {}, t("field.mobile")), mobI),
    el("div", {}, el("label", {}, t("field.pincode")), pinI),
    el("div", {}, el("label", { style: "visibility:hidden" }, "."), submitBtn),
  );
  const feedback = el("p", { class: "hint", style: "margin-top:.6rem" }, "");
  // "Recent entries" moves to its own card at the bottom of the page;
  // the quick-add card just prepends new rows into that far-down list.
  const recentUl = el("ul", { class: "list", id: "jm-recent" });
  cardA.append(form, feedback);
  form.onsubmit = async (e) => {
    e.preventDefault();
    submitBtn.disabled = true;
    feedback.textContent = "Saving…";
    try {
      const r = await api("/api/janmashtami/entry", { method: "POST", body: JSON.stringify({
        coupon_no: couponI.value, name: nameI.value, mobile: mobI.value, pincode: pinI.value,
      }) });
      const p = r.person;
      feedback.textContent = `Saved · coupon ${p.sl_no} · ${p.legal_name}`;
      recentUl.prepend(el("li", {},
        el("div", {}, el("strong", {}, p.legal_name),
          el("div", { class: "hint" }, `coupon ${p.sl_no} · ${p.phone}${p.pincode ? " · " + p.pincode : ""}`)),
        el("span", {}), el("span", {}),
      ));
      couponI.value = ""; nameI.value = ""; mobI.value = ""; pinI.value = "";
      couponI.focus();
      refreshProgress();
    } catch (err) {
      feedback.textContent = "Error: " + (err.body?.hint || err.message);
    } finally {
      submitBtn.disabled = false;
    }
  };
  view.append(cardA);

  // --- Path B: Excel/CSV file upload with preview
  const cardB = el("div", { class: "card" });
  cardB.append(el("h3", { class: "section" }, t("hd.upload_excel")));
  cardB.append(excelUploadWidget({
    helperText: "Attach a .xlsx or .csv file. Columns: coupon_no, name, mobile, pincode, is_daily (optional 'yes'/'no'). Preview → confirm.",
    mapRow: (row) => ({
      coupon_no: String(row.coupon_no || row.coupon || row.Coupon || row["Coupon #"] || row["Coupon No"] || "").trim(),
      name: String(row.name || row.Name || row.NAME || "").trim(),
      mobile: String(row.mobile || row.Mobile || row.MOBILE || row.phone || "").trim(),
      pincode: String(row.pincode || row.Pincode || row.PINCODE || row.pin || "").trim(),
      is_daily: String(row.is_daily || row["Daily?"] || row.daily || "").trim().toLowerCase(),
    }),
    onCommit: async (rows) => {
      const r = await api("/api/janmashtami/bulk", { method: "POST", body: JSON.stringify({ rows }) });
      refreshProgress();
      loadTodayEntries();
      return r;
    },
  }));
  view.append(cardB);

  // --- Path C: paste-many (kept as a fallback)
  const cardC = el("div", { class: "card" });
  cardC.append(
    el("h3", { class: "section" }, t("hd.paste_excel")),
    el("p", { class: "hint" }, "Ctrl-C rows in Excel (copies as tab-separated), then paste here. One person per line: name, mobile, pincode."),
    formField("Paste here", el("textarea", { id: "jm-paste", rows: "6",
      placeholder: "1\tRavi\t9876543210\t625001\tyes\n2\tPriya\t9876543211\t625002\tno" })),
    el("p", {},
      el("button", { class: "primary", type: "button", id: "jm-paste-go" }, "Import"),
      " ", el("span", { class: "hint", id: "jm-paste-msg" }),
    ),
  );
  view.append(cardC);

  // --- Path D: today's entries — moved to bottom so the upload options
  // are what you see first when the tab loads.
  const cardD = el("div", { class: "card" });
  cardD.append(el("h3", { class: "section" }, t("hd.today_entries")));
  cardD.append(el("p", { class: "hint" }, "Everything you've added today lands here. Scroll down to double-check before the day ends."));
  cardD.append(recentUl);
  view.append(cardD);

  $("jm-paste-go").addEventListener("click", async () => {
    const raw = $("jm-paste").value.trim();
    if (!raw) return;
    // Column order for paste: coupon_no, name, mobile, pincode, is_daily
    const rows = raw.split(/\r?\n/).map(line => {
      const parts = line.split(/\t|,/);
      return {
        coupon_no: (parts[0] || "").trim(),
        name:      (parts[1] || "").trim(),
        mobile:    (parts[2] || "").trim(),
        pincode:   (parts[3] || "").trim(),
        is_daily:  (parts[4] || "").trim().toLowerCase(),
      };
    }).filter(r => r.name && r.mobile);
    try {
      const r = await api("/api/janmashtami/bulk", { method: "POST", body: JSON.stringify({ rows }) });
      $("jm-paste-msg").textContent = `Imported ${r.created} · ${r.errors.length} error(s)`;
      $("jm-paste").value = "";
      refreshProgress();
      loadTodayEntries();
    } catch (err) {
      $("jm-paste-msg").textContent = err.message;
    }
  });

  // Fetch today's Janmashtami entries in insertion order (newest first)
  // via the dedicated endpoint. Rendered in the bottom card so the
  // coord can double-check their most recent adds.
  async function loadTodayEntries() {
    try {
      const { entries } = await api("/api/me/janmashtami-entries");
      recentUl.innerHTML = "";
      if (!entries.length) {
        recentUl.append(el("li", {}, el("span", { class: "hint" }, t("msg.no_entries_today"))));
        return;
      }
      entries.forEach(r => {
        const meta = [
          r.sl_no ? `sl ${r.sl_no}` : null,
          r.phone,
          r.pincode || null,
        ].filter(Boolean).join(" · ");
        recentUl.append(el("li", {},
          el("div", {}, el("strong", {}, r.name),
            el("div", { class: "hint" }, meta)),
          el("span", {}), el("span", {}),
        ));
      });
    } catch (_) { /* silent */ }
  }
  loadTodayEntries();
}

// ------------------------------------------------------ settings ---
// A coordinator's own preferences. Right now: the two WhatsApp
// templates that fill the pre-populated message text on the roll's
// WhatsApp buttons. Anyone with a roll gets this screen.
async function renderSettings(view) {
  view.append(el("h2", { class: "section" }, t("hd.settings_title")));
  view.append(helpBanner(t("help.settings")));

  // --- Change my password
  const pwCard = el("form", { class: "card", method: "post", action: "javascript:void(0)" });
  pwCard.append(el("h3", { class: "section", style: "margin-top:0" }, t("hd.change_pw")));
  pwCard.append(el("p", { class: "hint" }, t("help.change_pw")));
  const pwCur = passwordFieldWithEye("cur-pw", t("field.current_pw"));
  const pwNew = passwordFieldWithEye("new-pw", t("field.new_pw"));
  pwCard.append(pwCur.wrap, pwNew.wrap);
  const pwSave = el("button", { class: "primary", type: "submit" }, t("btn.save"));
  const pwMsg = el("span", { class: "hint", id: "pw-msg", style: "margin-left:.5rem" });
  pwCard.append(el("p", { style: "margin-top:.6rem" }, pwSave, pwMsg));
  pwCard.onsubmit = async (e) => {
    e.preventDefault();
    try {
      await api("/api/me/password", { method: "POST", body: JSON.stringify({
        current_password: pwCur.input.value, new_password: pwNew.input.value,
      }) });
      pwMsg.textContent = t("msg.pw_updated");
      pwCur.input.value = ""; pwNew.input.value = "";
    } catch (err) {
      pwMsg.textContent = err.body?.error === "wrong_current_password"
        ? t("msg.pw_wrong_current")
        : (err.message || "Could not update.");
    }
  };
  view.append(pwCard);

  // --- Language picker
  const langCard = el("div", { class: "card" });
  langCard.append(el("h3", { class: "section", style: "margin-top:0" }, t("hd.language")));
  langCard.append(el("p", { class: "hint" }, t("msg.pick_lang")));
  const cur = getLang();
  const langBtns = el("div", { style: "display:flex;gap:.5rem;flex-wrap:wrap" });
  for (const l of window.LANGS) {
    const active = l.code === cur;
    const btn = el("button", { class: active ? "primary" : "ghost", type: "button" }, l.label);
    btn.addEventListener("click", () => { if (!active) setLang(l.code); });
    langBtns.append(btn);
  }
  langCard.append(langBtns);
  view.append(langCard);
  view.append(el("p", { class: "hint" }, t("help.wa_templates")));

  const card = el("form", { class: "card", method: "post", action: "javascript:void(0)" });
  const daily = el("textarea", { id: "wa-daily", rows: "5",
    placeholder: "Hare Krsna {name}, did you complete your daily japa today? 🌸" });
  const nondaily = el("textarea", { id: "wa-nondaily", rows: "5",
    placeholder: "Hare Krsna {name}! Are you interested in daily chanting? Reply YES and we'll share the mantra card." });
  daily.value = ME.wa_template_daily || "";
  nondaily.value = ME.wa_template_nondaily || "";
  card.append(
    el("h3", { class: "section" }, t("hd.wa_daily")),
    daily,
    el("h3", { class: "section" }, t("hd.wa_nondaily")),
    nondaily,
    el("p", { style: "margin-top:1rem" },
      el("button", { type: "submit", class: "primary" }, t("btn.save")),
      " ", el("span", { class: "hint", id: "wa-msg" }),
    ),
  );
  card.onsubmit = async (e) => {
    e.preventDefault();
    try {
      await api("/api/me/wa-templates", { method: "POST", body: JSON.stringify({
        wa_template_daily: daily.value, wa_template_nondaily: nondaily.value,
      }) });
      ME.wa_template_daily = daily.value;
      ME.wa_template_nondaily = nondaily.value;
      $("wa-msg").textContent = t("msg.saved");
    } catch (err) {
      $("wa-msg").textContent = err.message || "Save failed";
    }
  };
  view.append(card);
}

// ---------------------------------------------------------- admin ---
async function renderAdmin(tab) {
  const view = $("view");
  view.append(el("h2", { class: "section" }, "Admin"));
  view.append(helpBanner(
    "Administrative controls — HK Leader only. Feature gates toggle " +
    "which roles see which parts of the app (no redeploy needed). " +
    "Users lets you create logins and assign SL ranges. Bulk import " +
    "brings chanter lists in from Excel. Events lets you create NJY / " +
    "BG sessions with their real dates."
  ));
  const tabs = el("div", { class: "nav", style: "border:none" });
  // Each sub-tab is now individually gate-able. HK Leader always sees
  // everything (can() short-circuits). For any other role, only the
  // sub-tabs their gate allows show up here — and route access is guarded
  // below in case they hit the URL directly.
  const subGates = [
    { key: "gates",       gate: "admin_gates",           label: "Feature gates",      render: renderAdminGates },
    { key: "users",       gate: "admin_users",           label: "Users",              render: renderAdminUsers },
    { key: "users-bulk",  gate: "admin_users_bulk",      label: "Bulk create users",  render: renderAdminUsersBulk },
    { key: "import",      gate: "admin_import_chanters", label: "Bulk import chanters", render: renderAdminImport },
    { key: "events",      gate: "admin_events",          label: "Events",             render: renderAdminEvents },
  ];
  const visible = subGates.filter(s => can(s.gate));
  const mkTab = (key, label) => el("a", { class: tab === key ? "active" : "", href: `#/admin/${key}` }, label);
  for (const s of visible) tabs.append(mkTab(s.key, s.label));
  view.append(tabs);
  const target = subGates.find(s => s.key === tab) || subGates[0];
  if (!can(target.gate)) {
    return view.append(el("p", { class: "hint" }, "You don't have access to this admin section."));
  }
  return target.render(view);
}

// Bulk-create coord/leader accounts from Excel or paste.
async function renderAdminUsersBulk(view) {
  view.append(el("h3", { class: "section" }, t("hd.admin_bulk_users")));
  view.append(helpBanner(t("help.admin_bulk_users")));

  // Path A — Excel upload
  const upload = el("div", { class: "card" });
  upload.append(el("h3", { class: "section", style: "margin-top:0" }, t("hd.upload_excel_csv")));
  upload.append(excelUploadWidget({
    helperText: "Columns: username, password, display_name, phone, role, manager_username.",
    templateBuilder: downloadUsersTemplate,
    templateLabel: t("btn.download_users_template"),
    isValidRow: (r) => r.username && r.display_name,
    emptyMessage: "No usable rows found. Make sure the file has 'username' and 'display_name' columns filled in.",
    previewCols: ["Username", "Display name", "Role", "Phone", "Manager"],
    previewRow: (r) => [r.username, r.display_name, r.role, r.phone, r.manager_username],
    mapRow: (row) => ({
      username: String(row.username || row.Username || "").trim(),
      password: String(row.password || row.Password || "").trim(),
      display_name: String(row.display_name || row["Display name"] || row.name || row.Name || "").trim(),
      phone: String(row.phone || row.Phone || row.mobile || "").trim(),
      role: String(row.role || row.Role || "njy_coordinator").trim(),
      manager_username: String(row.manager_username || row["Manager username"] || row.manager || "").trim(),
    }),
    onCommit: async (rows) => {
      const r = await api("/api/admin/users/bulk", { method: "POST", body: JSON.stringify({ rows }) });
      return { created: r.created.length, errors: r.errors };
    },
  }));
  view.append(upload);

  // Path B — Paste
  const paste = el("div", { class: "card" });
  paste.append(
    el("h3", { class: "section", style: "margin-top:0" }, t("hd.paste_rows")),
    el("p", { class: "hint" }, "One user per line, tab-separated: username, password, display_name, phone, role, manager_username."),
    formField("Paste", el("textarea", { id: "ub-paste", rows: "8",
      placeholder: "leader1\tpass123\tRadha Priya\t9876500001\tnjy_leader\t\ncoord01\tpass123\tSri Coord\t9876500002\tnjy_coordinator\tleader1" })),
    el("p", {}, el("button", { class: "primary", type: "button", id: "ub-go" }, t("btn.import")),
      " ", el("span", { class: "hint", id: "ub-msg" })),
    el("pre", { id: "ub-out", style: "font-family:var(--font-mono);font-size:.75rem;color:var(--muted);white-space:pre-wrap" }),
  );
  view.append(paste);
  $("ub-go").addEventListener("click", async () => {
    const raw = $("ub-paste").value.trim();
    if (!raw) return;
    const rows = raw.split(/\r?\n/).map(line => {
      const parts = line.split(/\t|,/).map(s => s.trim());
      return {
        username: parts[0] || "",
        password: parts[1] || "",
        display_name: parts[2] || "",
        phone: parts[3] || "",
        role: parts[4] || "njy_coordinator",
        manager_username: parts[5] || "",
      };
    }).filter(r => r.username);
    try {
      const r = await api("/api/admin/users/bulk", { method: "POST", body: JSON.stringify({ rows }) });
      $("ub-msg").textContent = `Created ${r.created.length} · ${r.errors.length} error(s)`;
      $("ub-out").textContent = JSON.stringify(r, null, 2);
    } catch (err) { $("ub-msg").textContent = err.message; }
  });
}

async function renderAdminGates(view) {
  const { gates } = await api("/api/me");
  const ROLES = ["hk_leader","njy_leader","njy_coordinator","circle_servant","sector_servant","servant_leader","member"];
  const card = el("div", { class: "card" });
  card.append(el("h3", { class: "section" }, "Feature visibility"));
  card.append(el("p", { class: "hint" }, "Widen a feature to more roles without a redeploy. HK Leader implicitly sees all features."));
  for (const [key, allowed] of Object.entries(gates)) {
    const row = el("div", { style: "margin:.6rem 0;padding:.5rem 0;border-bottom:1px solid var(--line)" });
    row.append(el("strong", {}, key));
    const chips = el("div", { class: "row", style: "flex-wrap:wrap;gap:.3rem;margin-top:.3rem" });
    ROLES.forEach((r) => {
      const on = allowed.includes(r);
      const b = el("button", { class: "pill" + (on ? " on" : ""), style: "cursor:pointer" }, r);
      b.addEventListener("click", async () => {
        const next = on ? allowed.filter(x => x !== r) : allowed.concat(r);
        try {
          await api("/api/admin/feature-gate", { method: "POST",
            body: JSON.stringify({ feature_key: key, allowed_roles: next }) });
          renderRoute();
        } catch (err) { alert(err.message); }
      });
      chips.append(b);
    });
    row.append(chips);
    card.append(row);
  }
  view.append(card);
}

async function renderAdminUsers(view) {
  ALL_USERS_CACHE = null;
  try {
    const { users } = await api("/api/admin/users");
    const ROLES = ["hk_leader","njy_leader","njy_coordinator","circle_servant","sector_servant","servant_leader","member"];
    const ul = el("ul", { class: "list" });
    for (const u of users) {
      const rangeText = (u.sl_range_start != null && u.sl_range_end != null)
        ? ` · sl ${u.sl_range_start}-${u.sl_range_end}` : "";
      const mgr = users.find(x => x.id === u.manager_user_id);
      const mgrText = mgr ? ` · under ${mgr.display_name || mgr.username}` : "";
      const li = el("li", {},
        el("div", {}, el("strong", {}, u.display_name || u.username),
          el("div", { class: "hint" }, `${u.username}${rangeText}${mgrText}${u.active ? "" : " · (inactive)"}`)),
        el("span", { class: "pill" }, humanRole(u.role)),
        el("button", { class: "mini-btn" }, "Edit"),
      );
      const editBtn = li.lastChild;
      editBtn.addEventListener("click", () => {
        const existing = li.querySelector(".manage");
        if (existing) { existing.remove(); return; }
        const p = el("div", { class: "manage" });
        const nm = el("input", { value: u.display_name || "" });
        const rl = el("select", {}, ...ROLES.map(r =>
          el("option", { value: r, selected: r === u.role ? true : undefined }, humanRole(r))));
        const pw = el("input", { type: "password", placeholder: "(leave blank to keep)" });
        const act = el("select", {},
          el("option", { value: "1", selected: u.active ? true : undefined }, "Active"),
          el("option", { value: "0", selected: !u.active ? true : undefined }, "Inactive"),
        );
        const rs = el("input", { type: "number", value: u.sl_range_start ?? "", placeholder: "e.g. 10000" });
        const re = el("input", { type: "number", value: u.sl_range_end ?? "", placeholder: "e.g. 10099" });
        const autoBtn = el("button", { class: "mini-btn", type: "button" }, "Auto-fill next range");
        autoBtn.addEventListener("click", async () => {
          try {
            const r = await api("/api/admin/next-sl-range");
            rs.value = r.start; re.value = r.end;
          } catch (err) { alert(err.message); }
        });
        const save = el("button", { class: "primary" }, "Save");
        save.addEventListener("click", async () => {
          try {
            const body = {
              display_name: nm.value, role: rl.value, active: act.value === "1",
              sl_range_start: rs.value, sl_range_end: re.value,
              manager_user_id: mgrSel.value || null,
            };
            if (pw.value) body.password = pw.value;
            await api(`/api/admin/users/${u.id}`, { method: "POST", body: JSON.stringify(body) });
            renderRoute();
          } catch (err) { alert(err.message); }
        });
        // Manager dropdown — only NJY leaders show up; empty for HK/leader themselves.
        const leaders = users.filter(x => x.role === "njy_leader" && x.active);
        const mgrSel = el("select", {},
          el("option", { value: "" }, "— no manager —"),
          ...leaders.map(l => el("option", {
            value: l.id, selected: l.id === u.manager_user_id ? true : undefined,
          }, l.display_name || l.username)),
        );
        p.append(
          el("div", {}, el("label", {}, "Display name"), nm),
          el("div", {}, el("label", {}, "Role"), rl),
          el("div", {}, el("label", {}, "Reset password"), pw),
          el("div", {}, el("label", {}, "Status"), act),
          el("div", {}, el("label", {}, "SL range start"), rs),
          el("div", {}, el("label", {}, "SL range end"), re),
          el("div", { class: "full" }, el("label", {}, "Manager (NJY Leader — only for coordinators)"), mgrSel),
          el("div", { class: "full" }, autoBtn, " ", save),
        );
        li.append(p);
      });
      ul.append(li);
    }
    view.append(ul);
    // Leaders list drives the Manager dropdown — only NJY Leaders are
    // valid managers (a coord's boss).
    const leaders = users.filter(u => u.role === "njy_leader" && u.active);
    const form = el("form", { class: "card", method: "post", action: "javascript:void(0)" });
    const roleSel = el("select", { id: "u-role" },
      el("option", { value: "njy_coordinator" }, "NJY Group Coordinator"),
      el("option", { value: "njy_leader" }, "NJY Leader"),
      el("option", { value: "servant_leader" }, "Servant Leader"),
      el("option", { value: "sector_servant" }, "Sector Servant"),
      el("option", { value: "circle_servant" }, "Circle Servant"),
      el("option", { value: "hk_leader" }, "HK Leader"),
    );
    const mgrSel = el("select", { id: "u-manager" },
      el("option", { value: "" }, "— no manager —"),
      ...leaders.map(l => el("option", { value: l.username }, l.display_name || l.username)),
    );
    const mgrRow = el("div", { id: "u-manager-row" },
      formField("Manager (NJY Leader)", mgrSel),
    );
    const updateMgrVisibility = () => {
      mgrRow.style.display = (roleSel.value === "njy_coordinator") ? "" : "none";
    };
    roleSel.addEventListener("change", updateMgrVisibility);
    form.append(
      el("h3", { class: "section" }, "New user"),
      el("p", { class: "hint" }, "Add a single leader or coordinator. Use Bulk create users when you have many at once."),
      el("div", { class: "grid2" },
        formField("Username", el("input", { id: "u-name", required: true, autocapitalize: "none", autocomplete: "off" })),
        formField("Display name", el("input", { id: "u-display", required: true })),
      ),
      el("div", { class: "grid2" },
        formField("Password", el("input", { id: "u-pass", type: "password", required: true })),
        formField("Phone", el("input", { id: "u-phone", inputmode: "numeric", placeholder: "10-digit or +91…" })),
      ),
      el("div", { class: "grid2" },
        formField("Role", roleSel),
        mgrRow,
      ),
      el("p", {}, el("button", { class: "primary", type: "submit" }, "Create user"),
        " ", el("span", { class: "hint", id: "u-msg" })),
    );
    updateMgrVisibility();
    form.onsubmit = async (e) => {
      e.preventDefault();
      const body = {
        username: $("u-name").value.trim(),
        password: $("u-pass").value,
        display_name: $("u-display").value.trim(),
        role: $("u-role").value,
        phone: $("u-phone").value.trim() || undefined,
        manager_username: (roleSel.value === "njy_coordinator" && mgrSel.value) ? mgrSel.value : undefined,
      };
      try {
        await api("/api/admin/users", { method: "POST", body: JSON.stringify(body) });
        $("u-msg").textContent = "Created."; renderRoute();
      } catch (err) {
        $("u-msg").textContent = err.body?.error === "username_taken" ? "That username is already taken."
          : err.body?.error === "manager_not_found" ? "Manager not found — pick again."
          : (err.message || "Could not create.");
      }
    };
    view.append(form);
  } catch (err) {
    view.append(el("p", { class: "error" }, err.message));
  }
}

async function renderAdminImport(view) {
  view.append(helpBanner(t("help.admin_bulk_chanters")));

  // Coord list for the dropdown (data-entry team picks which coord to
  // assign a batch to; per-row coord_username in the sheet also works
  // and OVERRIDES this batch default).
  let coordUsers = [];
  try {
    const { users } = await api("/api/admin/users");
    coordUsers = users.filter(u => u.role === "njy_coordinator" && u.active);
  } catch { /* ok — leave empty */ }

  // Path A — Excel/CSV file upload
  const uploadCard = el("div", { class: "card" });
  uploadCard.append(el("h3", { class: "section" }, t("hd.upload_excel_file")));

  // Coordinator picker for the whole batch (fallback when the sheet
  // doesn't specify coord_username per row).
  const coordSel = el("select", { id: "imp-assign-file" },
    el("option", { value: "" }, "— pick coordinator for this batch (or use coord_username column) —"),
    ...coordUsers.map(c => el("option", { value: c.id }, `${c.display_name || c.username} (${c.username})`)),
  );
  uploadCard.append(el("div", { style: "margin:.4rem 0 .7rem" },
    el("label", { style: "display:block;font-size:.85rem;color:var(--muted);margin-bottom:.2rem" },
      "Assign to coordinator (batch default)"),
    coordSel,
  ));

  uploadCard.append(excelUploadWidget({
    helperText: "Attach a .xlsx or .csv file. Columns: coupon_no, name, mobile, pincode, is_daily, coord_username. coord_username per-row wins over the batch dropdown above.",
    templateBuilder: downloadChanterTemplate,
    templateLabel: t("btn.download_chanters_template"),
    isValidRow: (r) => r.legal_name && r.phone,
    emptyMessage: "No usable rows found. Make sure the file has 'name' and 'mobile' columns (case-insensitive) with non-empty values.",
    previewCols: ["Coupon #", "Name", "Mobile", "Pincode", "Daily?", "Coord"],
    previewRow: (r) => [r.coupon_no, r.legal_name, r.phone, r.pincode || "", r.is_daily || "", r.coord_username || ""],
    mapRow: (row) => ({
      legal_name: String(row.legal_name || row.name || row.Name || row.NAME || "").trim(),
      phone: String(row.phone || row.mobile || row.Mobile || "").trim(),
      pincode: String(row.pincode || row.Pincode || row.PINCODE || "").trim() || null,
      coupon_no: row.coupon_no || row["Coupon #"] || null,
      is_daily: String(row.is_daily || row["Daily?"] || "").trim().toLowerCase(),
      coord_username: String(row.coord_username || row["Coord username"] || "").trim(),
    }),
    onCommit: async (rows) => {
      // Resolve per-row coord_username → user id via the coord list we
      // already have. Rows without either wind up on the batch default.
      const byUsername = new Map(coordUsers.map(c => [c.username.toLowerCase(), c.id]));
      const enriched = rows.map(r => ({
        ...r,
        assigned_to_user_id: (r.coord_username && byUsername.get(r.coord_username.toLowerCase())) || coordSel.value || null,
      }));
      const r = await api("/api/import/commit", { method: "POST",
        body: JSON.stringify({ rows: enriched, assigned_to_user_id: coordSel.value || null }) });
      return { created: r.created, errors: r.errors };
    },
  }));
  view.append(uploadCard);

  // Path B — paste. Same coord picker as the file-upload path, so
  // the operator never has to type a raw user id.
  const card = el("form", { class: "card", method: "post", action: "javascript:void(0)" });
  const pasteCoordSel = el("select", { id: "imp-assign" },
    el("option", { value: "" }, "— pick coordinator for these pasted rows (or leave blank if coord_username is in the rows) —"),
    ...coordUsers.map(c => el("option", { value: c.id }, `${c.display_name || c.username} (${c.username})`)),
  );
  card.append(
    el("h3", { class: "section" }, t("hd.paste_rows")),
    el("p", { class: "hint" }, "Paste rows from Excel (Ctrl-C copies as tab-separated) OR as CSV. Header row first. Minimum columns: legal_name/name, phone/mobile. Optional: pincode, coupon_no, is_daily, coord_username."),
    formField("Paste here", el("textarea", { id: "imp-csv", rows: "12", placeholder: "coupon_no\tname\tmobile\tpincode\tis_daily\tcoord_username\n1001\tRavi\t9999000001\t625001\tyes\tcoord01" })),
    el("div", { style: "margin:.4rem 0" },
      el("label", { style: "display:block;font-size:.85rem;color:var(--muted);margin-bottom:.2rem" },
        "Assign to coordinator (batch default)"),
      pasteCoordSel,
    ),
    el("p", {},
      el("button", { class: "ghost", type: "button", id: "imp-preview" }, "Preview"),
      " ",
      el("button", { class: "primary", type: "submit" }, "Commit"),
      " ", el("span", { class: "hint", id: "imp-msg" }),
    ),
    el("pre", { id: "imp-out", style: "font-family:var(--font-mono);font-size:.8rem;white-space:pre-wrap;color:var(--muted);margin-top:1rem" }),
  );
  // Split on TAB first (Excel copy format) then fall back to COMMA.
  // A row can use either separator, and the header row's separator
  // choice sets the mode for the whole paste.
  const parse = () => {
    const raw = $("imp-csv").value.trim();
    if (!raw) return [];
    const [head, ...lines] = raw.split(/\r?\n/);
    const sep = head.includes("\t") ? /\t/ : /,/;
    const cols = head.split(sep).map(s => s.trim());
    return lines.filter(Boolean).map(line => {
      const parts = line.split(sep).map(s => s.trim());
      const obj = {};
      cols.forEach((c, i) => obj[c] = parts[i] || "");
      return obj;
    });
  };
  $("imp-preview") || null; // keep tree
  card.querySelector("#imp-preview").addEventListener("click", async () => {
    try {
      const rows = parse();
      const r = await api("/api/import/preview", { method: "POST", body: JSON.stringify({ rows }) });
      $("imp-out").textContent = JSON.stringify(r, null, 2);
    } catch (err) { $("imp-msg").textContent = err.message; }
  });
  card.onsubmit = async (e) => {
    e.preventDefault();
    try {
      const rawRows = parse();
      // Resolve per-row coord_username to user id, mirroring the file-upload path.
      const byUsername = new Map(coordUsers.map(c => [c.username.toLowerCase(), c.id]));
      const rows = rawRows.map(r => {
        const un = String(r.coord_username || "").trim().toLowerCase();
        return {
          ...r,
          legal_name: r.legal_name || r.name || "",
          phone: r.phone || r.mobile || "",
          assigned_to_user_id: (un && byUsername.get(un)) || pasteCoordSel.value || null,
        };
      });
      const r = await api("/api/import/commit", { method: "POST", body: JSON.stringify({
        rows, assigned_to_user_id: pasteCoordSel.value || null,
      }) });
      $("imp-out").textContent = JSON.stringify(r, null, 2);
      $("imp-msg").textContent = `Created ${r.created} record(s).`;
    } catch (err) { $("imp-msg").textContent = err.message; }
  };
  view.append(card);
}

async function renderAdminEvents(view) {
  try {
    const { events } = await api("/api/events");
    if (events.length) {
      const ul = el("ul", { class: "list" });
      for (const e of events) {
        const li = el("li", {},
          el("div", {}, el("strong", {}, e.name),
            el("div", { class: "hint" }, `${e.kind} · ${e.event_date}${e.venue ? " · " + esc(e.venue) : ""}${e.batch_number ? " · batch " + e.batch_number : ""}`)),
          el("span", { class: "pill" }, e.capacity ? `cap ${e.capacity}` : ""),
          el("div", {}),
        );
        const actions = li.lastChild;
        const attendance = el("a", { class: "mini-btn", href: `#/events/${e.id}` }, "Attendance");
        const del = el("button", { class: "danger", style: "margin-left:.4rem" }, "Delete");
        del.addEventListener("click", async () => {
          if (!confirm(`Delete event "${e.name}"? Attendance rows are kept for audit.`)) return;
          try {
            await api(`/api/events/${e.id}`, { method: "DELETE" });
            renderRoute();
          } catch (err) { alert(err.message); }
        });
        actions.append(attendance, del);
        ul.append(li);
      }
      view.append(ul);
    }
    const form = el("form", { class: "card", method: "post", action: "javascript:void(0)" });
    form.append(
      el("h3", { class: "section" }, "New event"),
      formField("Name", el("input", { id: "ev-name", required: true })),
      el("div", { class: "grid2" },
        formField("Kind", el("select", { id: "ev-kind" },
          el("option", { value: "njy1" }, "NJY 1"),
          el("option", { value: "njy2" }, "NJY 2"),
          el("option", { value: "njy3" }, "NJY 3"),
          el("option", { value: "bg_session" }, "BG session"),
          el("option", { value: "bvgm" }, "BVGM"),
          el("option", { value: "children_program" }, "Children program"),
          el("option", { value: "festival" }, "Festival"),
        )),
        formField("Date", el("input", { id: "ev-date", type: "date", required: true })),
      ),
      el("div", { class: "grid2" },
        formField("Time", el("input", { id: "ev-time", placeholder: "18:00" })),
        formField("Venue", el("input", { id: "ev-venue" })),
      ),
      el("div", { class: "grid2" },
        formField("Capacity", el("input", { id: "ev-cap", type: "number" })),
        formField("Batch number", el("input", { id: "ev-batch", type: "number" })),
      ),
      el("p", {}, el("button", { class: "primary", type: "submit" }, "Save event"),
        " ", el("span", { class: "hint", id: "ev-msg" })),
    );
    form.onsubmit = async (e) => {
      e.preventDefault();
      const body = {
        kind: $("ev-kind").value, name: $("ev-name").value,
        event_date: $("ev-date").value, event_time: $("ev-time").value,
        venue: $("ev-venue").value,
        capacity: $("ev-cap").value ? +$("ev-cap").value : null,
        batch_number: $("ev-batch").value ? +$("ev-batch").value : null,
      };
      try {
        await api("/api/events", { method: "POST", body: JSON.stringify(body) });
        $("ev-msg").textContent = "Saved."; renderRoute();
      } catch (err) { $("ev-msg").textContent = err.message; }
    };
    view.append(form);
  } catch (err) { view.append(el("p", { class: "error" }, err.message)); }
}
