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

const api = async (path, opts = {}) => {
  const res = await fetch(path, {
    ...opts, credentials: "same-origin",
    headers: { "content-type": "application/json", ...(opts.headers || {}) },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) { const e = new Error(body.error || `http_${res.status}`); e.status = res.status; e.body = body; throw e; }
  return body;
};

const STATE_LABEL = ["uncontacted", "followed up", "responded", "needs visit"];
const humanRole = (r) => ({
  hk_leader: "HK Leader", njy_leader: "NJY Leader",
  njy_coordinator: "NJY Coordinator", circle_servant: "Circle Servant",
  sector_servant: "Sector Servant", servant_leader: "Servant Leader", member: "Member",
})[r] || r;

let ME = null, GATES = {};

// ------------------------------------------------------------ boot ---
let deferredInstall = null;
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredInstall = e;
  renderNav();
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
    } catch { $("login-err").textContent = "Wrong username or password."; $("login-err").hidden = false; }
  };
}

// ------------------------------------------------------------- app ---
async function showApp() {
  $("view-login").hidden = true;
  $("view-app").hidden = false;
  $("who-name").textContent = ME.display_name;
  $("who-role").textContent = " · " + humanRole(ME.role);
  $("logout").onclick = async (e) => { e.preventDefault(); await api("/api/logout", { method: "POST" }); location.hash = ""; location.reload(); };
  renderNav();
  renderRoute();
}

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
    { href: "#/",          label: "My roll",  when: () => can("coordinator_roll") && OWNS_ROLL.includes(ME.role) },
    { href: "#/leader",    label: "Team",     when: () => can("leader_dashboard") },
    { href: "#/hk",        label: "HK",       when: () => can("hk_dashboard") },
    { href: "#/duties",    label: "Duties",   when: () => true },
    { href: "#/events",    label: "Events",   when: () => can("event_attendance") },
    { href: "#/sadhana",   label: "Sadhana",  when: () => can("sadhana_chart") && SADHANA_ROLES.includes(ME.role) },
    { href: "#/bv",        label: "BV",       when: () => can("bv_structure_editor") && BV_ROLES.includes(ME.role) },
    { href: "#/admin",     label: "Admin",    when: () => can("feature_admin") },
  ];
  const here = location.hash || "#/";
  for (const it of items) {
    if (!it.when()) continue;
    const a = el("a", { href: it.href, class: (here === it.href ? "active" : "") }, it.label);
    nav.append(a);
  }
  if (deferredInstall) {
    const btn = el("a", { href: "#", style: "background:var(--tint-followed);border-color:var(--mark-followed);color:var(--mark-followed);margin-left:auto" }, "Install app");
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
  // When HK / NJY Leader land on "#/", send them to their proper home.
  if ((location.hash === "" || location.hash === "#/") &&
      (ME.role === "hk_leader" || ME.role === "njy_leader")) {
    const home = ME.role === "hk_leader" ? "#/hk" : "#/leader";
    location.replace(home);
    return;
  }
  const routes = {
    "":         renderCoordRoll,
    "leader":   renderLeaderDashboard,
    "hk":       renderHkDashboard,
    "user":     () => renderUserDrill(arg),
    "duties":   renderDuties,
    "events":   () => arg ? renderEventAttendance(arg) : renderEvents(view),
    "sadhana":  () => renderSadhana(arg),
    "bv":       renderBvStructure,
    "admin":    () => renderAdmin(arg || "gates"),
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
    view.append(tallyStrip(tally, ["assigned","chanted_today","followed_up","needs_visit"]));
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

function tallyStrip(t, keys) {
  const map = { assigned: "Assigned", chanted_today: "Chanted today", followed_up: "Followed up", needs_visit: "Needs visit", responded: "Responded" };
  const row = el("div", { class: "tally" });
  for (const k of keys) {
    row.append(el("div", { class: "cell" },
      el("div", { class: "n" }, String(t[k] ?? 0)),
      el("div", { class: "k" }, map[k] || k),
    ));
  }
  return row;
}

function bead(state, onclick) {
  const b = el("button", { class: "bead", "data-state": String(state) });
  if (onclick) b.addEventListener("click", onclick);
  return b;
}

function garlandStrip(roll, editable) {
  const g = el("div", { class: "garland", "aria-label": "Roll at a glance" });
  roll.forEach((r) => {
    const b = bead(r.contact_state, editable ? async () => {
      const upd = await api("/api/roll/mark", { method: "POST", body: JSON.stringify({ person_id: r.id }) });
      r.contact_state = upd.contact_state; b.dataset.state = String(upd.contact_state);
      // resync any row-level bead with same id
      document.querySelectorAll(`.bead[data-person="${r.id}"]`).forEach(x => x.dataset.state = String(upd.contact_state));
    } : null);
    b.title = `${r.name} — ${STATE_LABEL[r.contact_state]}`;
    g.append(b);
  });
  return g;
}

function rollList(roll, editable) {
  const ul = el("ul", { class: "roll" });
  roll.forEach((r) => {
    const rowBead = bead(r.contact_state, editable ? async () => {
      const upd = await api("/api/roll/mark", { method: "POST", body: JSON.stringify({ person_id: r.id }) });
      r.contact_state = upd.contact_state;
      rowBead.dataset.state = String(upd.contact_state);
      document.querySelectorAll(`.bead[data-person="${r.id}"]`).forEach(x => x.dataset.state = String(upd.contact_state));
    } : null);
    rowBead.dataset.person = r.id;
    const chant = el("button", { class: "chant-tag" + (r.chanted_today ? " on" : "") },
      r.chanted_today ? "✓ chanted" : "chant?");
    if (editable) chant.addEventListener("click", async () => {
      const next = !r.chanted_today;
      await api("/api/roll/chant", { method: "POST", body: JSON.stringify({ person_id: r.id, chanted: next }) });
      r.chanted_today = next;
      chant.className = "chant-tag" + (next ? " on" : "");
      chant.textContent = next ? "✓ chanted" : "chant?";
    });
    const wa = el("a", { class: "wa", href: r.wa_url, target: "_blank", rel: "noopener" }, "WhatsApp");
    const name = el("div", { class: "name", html: esc(r.name) + `<span class="phone">${esc(r.phone || "")}</span>` });
    ul.append(el("li", {},
      el("div", { class: "bead-wrap" }, rowBead), name, chant, wa,
    ));
  });
  return ul;
}

// ------------------------------------------------- leader dashboard ---
async function renderLeaderDashboard(view) {
  view.append(el("h2", { class: "section" }, "Your coordinators"));
  try {
    const { coordinators } = await api("/api/leader/coordinators");
    if (!coordinators.length) return view.append(el("p", { class: "hint" }, "No coordinators visible yet."));
    const ul = el("ul", { class: "list" });
    for (const c of coordinators) {
      const pill = el("span", { class: "pill" + (c.chanted_today > 0 ? " on" : "") },
        `${c.chanted_today}/${c.assigned} today`);
      ul.append(el("li", {},
        el("div", {}, el("strong", {}, c.name),
          el("div", { class: "hint" }, `${c.assigned} chanters`)),
        pill,
        el("a", { class: "btn", href: `#/user/${c.user_id}` }, "Open"),
      ));
    }
    view.append(ul);
  } catch (err) {
    view.append(el("p", { class: "error" }, err.message));
  }
}

// -------------------------------------------------------- HK dashboard ---
async function renderHkDashboard(view) {
  try {
    const s = await api("/api/hk/summary");
    const grid = el("div", { class: "tally" });
    grid.append(
      el("div", { class: "cell" }, el("div", { class: "n" }, String(s.total_people)), el("div", { class: "k" }, "People")),
      el("div", { class: "cell" }, el("div", { class: "n" }, String(s.chanted_today)), el("div", { class: "k" }, "Chanted today")),
      el("div", { class: "cell" }, el("div", { class: "n" }, String(s.njy_leaders)), el("div", { class: "k" }, "NJY Leaders")),
      el("div", { class: "cell" }, el("div", { class: "n" }, String(s.njy_coordinators)), el("div", { class: "k" }, "Coordinators")),
    );
    view.append(grid);
    view.append(el("h2", { class: "section" }, "All coordinators"));
    const { coordinators } = await api("/api/leader/coordinators");
    if (!coordinators.length) return view.append(el("p", { class: "hint" }, "No coordinators yet. Create some in Admin → Users."));
    const ul = el("ul", { class: "list" });
    for (const c of coordinators) {
      ul.append(el("li", {},
        el("div", {}, el("strong", {}, c.name), el("div", { class: "hint" }, `${c.assigned} chanters · ${c.chanted_today} chanted today`)),
        el("span", { class: "pill" + (c.chanted_today > 0 ? " on" : "") }, c.assigned ? `${Math.round(100*c.chanted_today/c.assigned)}%` : "0%"),
        el("a", { class: "btn", href: `#/user/${c.user_id}` }, "Drill in"),
      ));
    }
    view.append(ul);
  } catch (err) {
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
    const rowBead = bead(r.contact_state, async () => {
      const upd = await api("/api/roll/mark", { method: "POST", body: JSON.stringify({ person_id: r.id }) });
      r.contact_state = upd.contact_state;
      rowBead.dataset.state = String(upd.contact_state);
    });
    rowBead.dataset.person = r.id;
    const chant = el("button", { class: "chant-tag" + (r.chanted_today ? " on" : "") },
      r.chanted_today ? "✓ chanted" : "chant?");
    chant.addEventListener("click", async () => {
      const next = !r.chanted_today;
      await api("/api/roll/chant", { method: "POST", body: JSON.stringify({ person_id: r.id, chanted: next }) });
      r.chanted_today = next;
      chant.className = "chant-tag" + (next ? " on" : "");
      chant.textContent = next ? "✓ chanted" : "chant?";
    });
    const wa = el("a", { class: "wa", href: r.wa_url, target: "_blank", rel: "noopener" }, "WhatsApp");
    const name = el("div", { class: "name", html: esc(r.name) + `<span class="phone">${esc(r.phone || "")}</span>` });

    const li = el("li", {}, el("div", { class: "bead-wrap" }, rowBead), name, chant, wa);
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
  const eligible = users.filter(u => ["njy_coordinator","servant_leader","hk_leader"].includes(u.role));
  const panel = el("div", { class: "manage" });

  // Reassign
  const assignSel = el("select", {},
    ...eligible.map(u =>
      el("option", { value: u.id, selected: u.id === currentOwnerUserId ? true : undefined },
        `${u.display_name} (${humanRole(u.role)})`)),
  );
  const assignBtn = el("button", { class: "mini-btn" }, "Move");
  assignBtn.addEventListener("click", async () => {
    try {
      await api(`/api/person/${person.id}/assign`, {
        method: "POST", body: JSON.stringify({ assigned_to_user_id: assignSel.value }),
      });
      alert("Moved. Refreshing.");
      renderRoute();
    } catch (err) { alert(err.message); }
  });
  panel.append(el("div", {},
    el("label", {}, "Reassign to"), assignSel,
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
  view.append(el("h2", { class: "section" }, "Your duties"));
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
  view.append(el("h2", { class: "section" }, "NJY yajnas & BG sessions"));
  try {
    const { events } = await api("/api/events");
    if (!events.length) return view.append(el("p", { class: "hint" }, "No events yet. HK Leader can create them in Admin → Events."));
    const ul = el("ul", { class: "list" });
    for (const ev of events) {
      ul.append(el("li", {},
        el("div", {}, el("strong", {}, ev.name),
          el("div", { class: "hint" }, `${ev.kind} · ${ev.event_date}${ev.venue ? " · " + esc(ev.venue) : ""}${ev.capacity ? " · cap " + ev.capacity : ""}`)),
        el("span", { class: "pill" }, ev.event_date),
        el("a", { class: "btn", href: `#/events/${ev.id}` }, "Attendance"),
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

    const searchCard = el("div", { class: "card" });
    searchCard.append(
      el("h3", { class: "section" }, "Search & mark"),
      el("p", { class: "hint" }, "Type at least 2 characters — matches name or phone digits. Tap to toggle attendance."),
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
        const toggle = el("button", { class: "chant-tag" + (isOn ? " on" : "") }, isOn ? "✓ attended" : "mark");
        toggle.addEventListener("click", async () => {
          const next = !attendedSet.has(p.id);
          try {
            await api(`/api/events/${encodeURIComponent(event.id)}/attendance`, {
              method: "POST", body: JSON.stringify({ person_id: p.id, attended: next }),
            });
            if (next) attendedSet.add(p.id); else attendedSet.delete(p.id);
            toggle.className = "chant-tag" + (next ? " on" : "");
            toggle.textContent = next ? "✓ attended" : "mark";
            b.dataset.state = next ? "2" : "0";
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
        F("m-email", "Email", person.email, { type: "email" }),
      ),
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

// ---------------------------------------------------------- admin ---
async function renderAdmin(tab) {
  const view = $("view");
  view.append(el("h2", { class: "section" }, "Admin"));
  const tabs = el("div", { class: "nav", style: "border:none" });
  const t = (key, label) => el("a", { class: tab === key ? "active" : "", href: `#/admin/${key}` }, label);
  tabs.append(t("gates", "Feature gates"), t("users", "Users"), t("import", "Bulk import"), t("events", "Events"));
  view.append(tabs);
  if (tab === "users") return renderAdminUsers(view);
  if (tab === "import") return renderAdminImport(view);
  if (tab === "events") return renderAdminEvents(view);
  return renderAdminGates(view);
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
      const li = el("li", {},
        el("div", {}, el("strong", {}, u.display_name || u.username),
          el("div", { class: "hint" }, `${u.username}${u.active ? "" : " · (inactive)"}`)),
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
        const save = el("button", { class: "primary" }, "Save");
        save.addEventListener("click", async () => {
          try {
            const body = { display_name: nm.value, role: rl.value, active: act.value === "1" };
            if (pw.value) body.password = pw.value;
            await api(`/api/admin/users/${u.id}`, { method: "POST", body: JSON.stringify(body) });
            renderRoute();
          } catch (err) { alert(err.message); }
        });
        p.append(
          el("div", {}, el("label", {}, "Display name"), nm),
          el("div", {}, el("label", {}, "Role"), rl),
          el("div", {}, el("label", {}, "Reset password"), pw),
          el("div", {}, el("label", {}, "Status"), act),
          el("div", { class: "full" }, save),
        );
        li.append(p);
      });
      ul.append(li);
    }
    view.append(ul);
    const form = el("form", { class: "card", method: "post", action: "javascript:void(0)" });
    form.append(
      el("h3", { class: "section" }, "New user"),
      el("div", { class: "grid2" },
        formField("Username", el("input", { id: "u-name", required: true })),
        formField("Display name", el("input", { id: "u-display", required: true })),
      ),
      el("div", { class: "grid2" },
        formField("Password", el("input", { id: "u-pass", type: "password", required: true })),
        formField("Role", el("select", { id: "u-role" },
          el("option", { value: "njy_coordinator" }, "NJY Coordinator"),
          el("option", { value: "njy_leader" }, "NJY Leader"),
          el("option", { value: "servant_leader" }, "Servant Leader"),
          el("option", { value: "sector_servant" }, "Sector Servant"),
          el("option", { value: "circle_servant" }, "Circle Servant"),
          el("option", { value: "hk_leader" }, "HK Leader"),
        )),
      ),
      el("p", {}, el("button", { class: "primary", type: "submit" }, "Create user"),
        " ", el("span", { class: "hint", id: "u-msg" })),
    );
    form.onsubmit = async (e) => {
      e.preventDefault();
      const body = { username: $("u-name").value, password: $("u-pass").value,
        display_name: $("u-display").value, role: $("u-role").value };
      try {
        await api("/api/admin/users", { method: "POST", body: JSON.stringify(body) });
        $("u-msg").textContent = "Created."; renderRoute();
      } catch (err) { $("u-msg").textContent = err.message; }
    };
    view.append(form);
  } catch (err) {
    view.append(el("p", { class: "error" }, err.message));
  }
}

async function renderAdminImport(view) {
  const card = el("form", { class: "card", method: "post", action: "javascript:void(0)" });
  card.append(
    el("h3", { class: "section" }, "Bulk import chanters"),
    el("p", { class: "hint" }, "Paste rows as CSV — one per line, header first. Minimum columns: legal_name, phone. Extra columns (dob, email, address, ...) are kept."),
    formField("CSV", el("textarea", { id: "imp-csv", rows: "12", placeholder: "legal_name,phone,email\nRavi,+919999000001,ravi@example.org" })),
    formField("Assign to coordinator user id (optional)", el("input", { id: "imp-user" })),
    el("p", {},
      el("button", { class: "ghost", type: "button", id: "imp-preview" }, "Preview"),
      " ",
      el("button", { class: "primary", type: "submit" }, "Commit"),
      " ", el("span", { class: "hint", id: "imp-msg" }),
    ),
    el("pre", { id: "imp-out", style: "font-family:var(--font-mono);font-size:.8rem;white-space:pre-wrap;color:var(--muted);margin-top:1rem" }),
  );
  const parse = () => {
    const raw = $("imp-csv").value.trim();
    if (!raw) return [];
    const [head, ...lines] = raw.split(/\r?\n/);
    const cols = head.split(",").map(s => s.trim());
    return lines.filter(Boolean).map(line => {
      const parts = line.split(",").map(s => s.trim());
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
      const rows = parse();
      const r = await api("/api/import/commit", { method: "POST", body: JSON.stringify({
        rows, assigned_to_user_id: $("imp-user").value || null,
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
