// Notification adapter. Handlers call notify(kind, target, payload) and
// this module dispatches to whichever backends are registered.
//
// Day-1 backends registered from functions/api/[[path]].js:
//   'wa-deeplink' -> returns { url } for the UI to open. No network.
//   'web-push'    -> pushes to a subscription via VAPID (Workers-native
//                    web-push over crypto.subtle).
//
// Later backends slot in without touching call sites:
//   'wa-cloud'    -> Meta WhatsApp Cloud API (free ≤1000 conv/mo)
//   'twilio-wa'   -> Twilio WhatsApp
//   'msg91'       -> MSG91 SMS/WhatsApp
//
// A backend is just:  async (target, payload, ctx) => { ok, ... }

const backends = new Map();

export function registerBackend(kind, impl) {
  backends.set(kind, impl);
}

export function hasBackend(kind) {
  return backends.has(kind);
}

export function registeredKinds() {
  return [...backends.keys()];
}

export async function notify(kind, target, payload, ctx) {
  const impl = backends.get(kind);
  if (!impl) {
    const err = new Error(`no backend for ${kind}`);
    err.status = 501;
    throw err;
  }
  return impl(target, payload, ctx);
}

// -- built-in: wa.me deep-link --------------------------------------
// Pure function; no network. Returns the URL for the UI to open.
export function waDeepLink(phone, text) {
  const num = String(phone || "").replace(/[^\d]/g, "");
  const enc = encodeURIComponent(text || "");
  return `https://wa.me/${num}?text=${enc}`;
}

export function waDeeplinkBackend() {
  return async (target, payload /* {text}, ctx */) => {
    return { ok: true, kind: "wa-deeplink", url: waDeepLink(target, payload?.text) };
  };
}

// -- built-in: web-push (VAPID) --------------------------------------
// Real send is added in task 9 when we ship the service worker; for
// now this backend just records to the notifications outbox via ctx.
// Signature is stable so real impl slots in later.
export function webPushBackend() {
  return async (target /* {endpoint,p256dh,auth} */, payload, ctx) => {
    if (ctx?.store) {
      await ctx.store.recordNotification({
        kind: "web-push",
        target_user_id: ctx.userId || null,
        payload,
        status: "pending",
      });
    }
    return { ok: true, kind: "web-push", queued: true };
  };
}

// Register the always-on backends. Callers may register more (e.g.
// wa-cloud when Meta credentials are present in env).
export function registerBuiltins() {
  registerBackend("wa-deeplink", waDeeplinkBackend());
  registerBackend("web-push", webPushBackend());
}

// Suggested message templates. Bilingual defaults — English + Tamil in
// the same message, so a coord can send as-is without editing. Each
// coord can override in their Settings if they prefer only one script
// or a personal tone.
export const WA_TEMPLATES = Object.freeze({
  janmashtami_invite: (name) =>
    `Hare Krsna ${name || ""}! 🙏\n\n` +
    `Sri Krsna-Janmastami-க்கு ISKCON Thiruppalai-க்கு உங்களை அன்புடன் அழைக்கிறோம். ` +
    `We warmly invite you to celebrate Sri Krsna-Janmastami with us at ISKCON Thiruppalai.\n\n` +
    `விவரங்களுக்கு தயவுசெய்து பதிலளிக்கவும். / Reply to know more.`,

  daily_reminder: (name) =>
    `Hare Krsna ${name || ""}! 🌸\n\n` +
    `இன்று உங்கள் ஹரே கிருஷ்ண மகா மந்த்ர ஜபம் முடிந்ததா? ` +
    `Did you complete your Hare Krsna japa today? Even one round of the Mahamantra makes the day meaningful.`,

  yajna_invite: (name, date, venue) =>
    `Hare Krsna ${name || ""}! 🕉\n\n` +
    `Nama-Japa-Yajna${date ? " (" + date + ")" : ""}${venue ? " – " + venue : ""}-க்கு உங்களை அழைக்கிறோம். ` +
    `You are invited to the Nama-Japa-Yajna${date ? " on " + date : ""}${venue ? " at " + venue : ""}.\n\n` +
    `உங்கள் வருகையை உறுதிப்படுத்தவும். / Kindly confirm your attendance.`,

  followup: (name) =>
    `Hare Krsna ${name || ""}! 🙏\n\n` +
    `உங்களை நினைத்தேன் — எப்படி இருக்கிறீர்கள்? ஜபம் தொடர்ந்து செய்கிறீர்களா? ` +
    `Just checking in — how are you? Hope your daily chanting is going well. ` +
    `நான் எப்படி உதவ முடியும் என்று தெரிவிக்கவும். / Let me know how I can help.`,
});
