// Minimal two-language dictionary. Add keys as you translate new
// screens — untranslated keys silently fall back to English so the
// app never shows raw keys to users.

const DICT = {
  en: {
    // Nav
    "nav.my_roll": "My roll",
    "nav.team": "Team",
    "nav.hk": "HK",
    "nav.duties": "Duties",
    "nav.events": "Events",
    "nav.sadhana": "Sadhana",
    "nav.bv": "BV",
    "nav.janmashtami": "Janmashtami",
    "nav.leaderboard": "Leaderboard",
    "nav.profile": "My profile",
    "nav.settings": "Settings",
    "nav.admin": "Admin",
    "nav.install": "Install app",
    "nav.sign_out": "Sign out",

    // Buttons
    "btn.add": "Add ↵",
    "btn.save": "Save",
    "btn.delete": "Delete",
    "btn.edit": "Edit",
    "btn.confirm": "Confirm import",
    "btn.download_template": "⬇ Download template (Excel)",
    "btn.mark_present": "Mark present",
    "btn.attended_undo": "✓ Present · tap to undo",
    "btn.chanted": "✓ chanted",
    "btn.chant_q": "chant?",
    "btn.whatsapp": "WhatsApp",
    "btn.open": "Open",
    "btn.back": "← Back",
    "btn.done": "Done",
    "btn.move": "Move",
    "btn.set_status": "Set status",
    "btn.manage": "Manage ▾",
    "btn.sign_in": "Sign in",

    // Beads
    "bead.fresh": "fresh",
    "bead.contacted": "contacted",
    "bead.responded": "responded",
    "bead.chanted": "chanted",
    "bead.needs_attn": "needs attention",

    // Fields
    "field.name": "Name",
    "field.mobile": "Mobile",
    "field.pincode": "Pincode",
    "field.username": "Username",
    "field.password": "Password",
    "field.search": "Search",
    "field.notes": "Notes",

    // Labels / headings
    "hd.quick_add": "Quick add",
    "hd.upload_excel": "Upload Excel or CSV file",
    "hd.paste_excel": "Or paste rows from Excel",
    "hd.today_entries": "Today's entries in your roll",
    "hd.chanted_today": "Chanted today",
    "hd.one_month_daily": "One-month daily",
    "hd.assigned": "Assigned",
    "hd.needs_visit": "Needs visit",
    "hd.followed_up": "Followed up",
    "hd.leaderboard_today": "Today's points",
    "hd.leaderboard_overall": "Overall (Phase 1 + 2)",
    "hd.your_coords": "Your coordinators",
    "hd.all_coords": "All coordinators",
    "hd.settings_title": "Settings",
    "hd.wa_daily": "Message to daily chanters",
    "hd.wa_nondaily": "Message to non-daily chanters",
    "hd.language": "Language",

    // Common phrases
    "msg.wrong_password": "Wrong username or password.",
    "msg.saved": "Saved.",
    "msg.loading": "Loading…",
    "msg.no_entries_today": "No entries yet today. Add your first person above.",
    "msg.pick_lang": "Choose the language you want the app to be shown in.",
    "msg.hare_krsna": "Hare Krsna 🙏",
  },

  ta: {
    // Nav
    "nav.my_roll": "என் பட்டியல்",
    "nav.team": "குழு",
    "nav.hk": "HK",
    "nav.duties": "கடமைகள்",
    "nav.events": "நிகழ்வுகள்",
    "nav.sadhana": "சாதனை",
    "nav.bv": "பக்திவ்ருக்ஷா",
    "nav.janmashtami": "ஜென்மாஷ்டமி",
    "nav.leaderboard": "தலைவர் பட்டியல்",
    "nav.profile": "என் பக்கம்",
    "nav.settings": "அமைப்புகள்",
    "nav.admin": "நிர்வாகம்",
    "nav.install": "செயலியை நிறுவு",
    "nav.sign_out": "வெளியேறு",

    // Buttons
    "btn.add": "சேர் ↵",
    "btn.save": "சேமி",
    "btn.delete": "நீக்கு",
    "btn.edit": "திருத்து",
    "btn.confirm": "இறக்குமதியை உறுதி செய்",
    "btn.download_template": "⬇ மாதிரி பதிவிறக்கு (Excel)",
    "btn.mark_present": "வந்துள்ளதைக் குறி",
    "btn.attended_undo": "✓ வந்துள்ளார் · மாற்ற தட்டவும்",
    "btn.chanted": "✓ ஜபித்தார்",
    "btn.chant_q": "ஜபித்தாரா?",
    "btn.whatsapp": "WhatsApp",
    "btn.open": "திற",
    "btn.back": "← பின்",
    "btn.done": "முடிந்தது",
    "btn.move": "மாற்று",
    "btn.set_status": "நிலை அமை",
    "btn.manage": "நிர்வகி ▾",
    "btn.sign_in": "உள்நுழை",

    // Beads
    "bead.fresh": "புதிது",
    "bead.contacted": "தொடர்பு கொண்டேன்",
    "bead.responded": "பதிலளித்தார்",
    "bead.chanted": "ஜபித்தார்",
    "bead.needs_attn": "கவனிக்க வேண்டும்",

    // Fields
    "field.name": "பெயர்",
    "field.mobile": "மொபைல்",
    "field.pincode": "பின்கோடு",
    "field.username": "பயனர் பெயர்",
    "field.password": "கடவுச்சொல்",
    "field.search": "தேடு",
    "field.notes": "குறிப்புகள்",

    // Labels / headings
    "hd.quick_add": "விரைவு சேர்",
    "hd.upload_excel": "Excel அல்லது CSV பதிவேற்று",
    "hd.paste_excel": "அல்லது Excel-லிருந்து ஒட்டு",
    "hd.today_entries": "இன்று சேர்த்தவர்கள்",
    "hd.chanted_today": "இன்று ஜபித்தவர்கள்",
    "hd.one_month_daily": "ஒரு மாத தினசரி",
    "hd.assigned": "ஒதுக்கப்பட்டவர்கள்",
    "hd.needs_visit": "பார்க்க வேண்டும்",
    "hd.followed_up": "தொடர்பில் உள்ளவர்",
    "hd.leaderboard_today": "இன்றைய புள்ளிகள்",
    "hd.leaderboard_overall": "மொத்தம் (கட்டம் 1 + 2)",
    "hd.your_coords": "உங்கள் ஒருங்கிணைப்பாளர்கள்",
    "hd.all_coords": "அனைத்து ஒருங்கிணைப்பாளர்கள்",
    "hd.settings_title": "அமைப்புகள்",
    "hd.wa_daily": "தினசரி ஜபிப்பவர்களுக்கு செய்தி",
    "hd.wa_nondaily": "தினசரி அல்லாதவர்களுக்கு செய்தி",
    "hd.language": "மொழி",

    // Common phrases
    "msg.wrong_password": "பயனர் பெயர் அல்லது கடவுச்சொல் தவறு.",
    "msg.saved": "சேமிக்கப்பட்டது.",
    "msg.loading": "ஏற்றுகிறது…",
    "msg.no_entries_today": "இன்று எந்த சேர்க்கையும் இல்லை. மேலே முதல் நபரைச் சேர்க்கவும்.",
    "msg.pick_lang": "செயலி காட்டப்பட வேண்டிய மொழியைத் தேர்ந்தெடுக்கவும்.",
    "msg.hare_krsna": "ஹரே கிருஷ்ண 🙏",
  },
};

// Read/write the user's language preference. Falls back to browser
// language if it looks like Tamil, otherwise English.
function detectDefaultLang() {
  const nav = (navigator.language || "en").toLowerCase();
  return nav.startsWith("ta") ? "ta" : "en";
}
let LANG = (() => {
  try { return localStorage.getItem("njy-lang") || detectDefaultLang(); }
  catch { return "en"; }
})();

window.t = function t(key) {
  return (DICT[LANG] && DICT[LANG][key]) || DICT.en[key] || key;
};
window.getLang = () => LANG;
window.setLang = (l) => {
  if (!DICT[l]) return;
  LANG = l;
  try { localStorage.setItem("njy-lang", l); } catch {}
  location.reload();  // simplest — re-render everything in the new language
};
window.LANGS = [{ code: "en", label: "English" }, { code: "ta", label: "தமிழ்" }];
