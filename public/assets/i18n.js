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

    // Events tab
    "hd.events": "NJY yajnas & BG sessions",
    "help.events": "All the temple's Nama-Japa-Yajna and Bhagavad-Gita sessions. Tap 'Attendance' on any event to mark who came — you can expand your own row and tap-to-present each chanter.",
    "btn.attendance": "Attendance",
    "hd.attendance_by_coord": "Attendance by coordinator",
    "help.attendance_by_coord_coord": "Tap your row to expand and mark your chanters present.",
    "help.attendance_by_coord_leader": "Tap any coordinator's row to expand and mark their chanters. You can also use the search fallback below.",
    "btn.tap_expand": "tap to expand",
    "hd.attended_of": "Attended",

    // Roles
    "role.hk_leader": "HK Leader",
    "role.njy_leader": "NJY Leader",
    "role.njy_coordinator": "NJY Coordinator",
    "role.manjari_servant_leader": "Manjari Servant Leader",
    "role.circle_servant": "Circle Servant",
    "role.sector_servant": "Sector Servant",
    "role.servant_leader": "Servant Leader",
    "role.member": "Member",

    // Points chip
    "chip.today": "Today",
    "chip.overall": "Overall",

    // Team dashboard
    "help.team": "Your coordinators, each shown with two progress bars. Chanted today — how many of the coordinator's whole roll chanted today. One-month daily — how many of their daily-committed chanters have stuck with it for the past month (≥25 chants in the last 30 days). Tap Open to drill into any coordinator's roll and act on their behalf.",

    // HK dashboard
    "hd.hk_dashboard": "HK Leader dashboard",
    "help.hk_dashboard": "Big-picture view of the whole programme. Four stat tiles show the overall count of people, how many chanted today, and how many leaders / coordinators are active. Below, every coordinator's progress bars: today's chants and one-month daily chanters. Click Open on any row to drill into that coordinator's roll.",
    "hd.people": "People",
    "hd.njy_leaders": "NJY Leaders",
    "hd.coordinators": "Coordinators",

    // Duties
    "help.duties": "Weekly and monthly tasks assigned to you — coming from the Bhakti-Vrksa action timeline. Tap 'Done' when you complete one.",
    "msg.no_duties": "No pending duties.",

    // Janmashtami quick-add hints
    "help.quick_add": "Enter one person at a time. Their sl.no is auto-assigned from your assigned range.",
    "help.upload_excel": "Attach a .xlsx or .csv file with columns: name, mobile, pincode. Preview → confirm.",
    "help.paste_excel": "Ctrl-C rows in Excel (copies as tab-separated), then paste here. One person per line: name, mobile, pincode.",
    "help.today_entries": "Everything you've added today lands here. Scroll down to double-check before the day ends.",
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

    // Events tab
    "hd.events": "NJY யக்ஞங்கள் மற்றும் பகவத் கீதை",
    "help.events": "கோவிலின் அனைத்து நாம ஜப யக்ஞ மற்றும் பகவத் கீதை நிகழ்வுகள். எந்த நிகழ்விலும் 'வருகை' பொத்தானை தட்டவும் — உங்கள் வரிசையை விரிக்கலாம் மற்றும் ஒவ்வொரு ஜபிப்பவருக்கும் வந்துள்ளதாக குறிக்கலாம்.",
    "btn.attendance": "வருகை",
    "hd.attendance_by_coord": "ஒருங்கிணைப்பாளர் வாரியாக வருகை",
    "help.attendance_by_coord_coord": "உங்கள் வரிசையை தட்டி விரிவாக்கி உங்கள் ஜபிப்பவர்கள் வந்துள்ளதைக் குறிக்கவும்.",
    "help.attendance_by_coord_leader": "எந்த ஒருங்கிணைப்பாளர் வரிசையையும் தட்டி விரிவாக்கி அவரது ஜபிப்பவர்களைக் குறிக்கவும். கீழே தேடல் விருப்பமும் உள்ளது.",
    "btn.tap_expand": "விரிக்க தட்டவும்",
    "hd.attended_of": "வந்துள்ளார்",

    // Roles
    "role.hk_leader": "HK தலைவர்",
    "role.njy_leader": "NJY தலைவர்",
    "role.njy_coordinator": "NJY ஒருங்கிணைப்பாளர்",
    "role.manjari_servant_leader": "மஞ்சரி சேவக தலைவர்",
    "role.circle_servant": "வட்ட சேவகர்",
    "role.sector_servant": "பிரிவு சேவகர்",
    "role.servant_leader": "சேவக தலைவர்",
    "role.member": "உறுப்பினர்",

    // Points chip
    "chip.today": "இன்று",
    "chip.overall": "மொத்தம்",

    // Team dashboard
    "help.team": "உங்கள் ஒருங்கிணைப்பாளர்கள், ஒவ்வொருவருக்கும் இரண்டு முன்னேற்றப் பட்டைகளுடன். இன்று ஜபித்தவர்கள் — ஒருங்கிணைப்பாளரின் மொத்த பட்டியலில் இன்று எத்தனை பேர் ஜபித்தார்கள். ஒரு மாத தினசரி — கடந்த மாதத்தில் தொடர்ந்து ஜபித்தவர்கள். எந்த ஒருங்கிணைப்பாளரின் பட்டியலையும் பார்க்க திற என்பதைத் தட்டவும்.",

    // HK dashboard
    "hd.hk_dashboard": "HK தலைவர் டாஷ்போர்டு",
    "help.hk_dashboard": "முழு திட்டத்தின் பெரிய படம். நான்கு புள்ளிவிவரங்கள் மொத்த மக்கள், இன்று ஜபித்தவர்கள், செயலிலுள்ள தலைவர்கள் / ஒருங்கிணைப்பாளர்கள் எண்ணிக்கையைக் காட்டுகின்றன. கீழே ஒவ்வொரு ஒருங்கிணைப்பாளரின் முன்னேற்றப் பட்டைகள்.",
    "hd.people": "மக்கள்",
    "hd.njy_leaders": "NJY தலைவர்கள்",
    "hd.coordinators": "ஒருங்கிணைப்பாளர்கள்",

    // Duties
    "help.duties": "உங்களுக்கு ஒதுக்கப்பட்ட வாராந்திர மற்றும் மாதாந்திர பணிகள். ஒன்றை முடித்தவுடன் 'முடிந்தது' தட்டவும்.",
    "msg.no_duties": "நிலுவை பணிகள் இல்லை.",

    // Janmashtami quick-add hints
    "help.quick_add": "ஒரே நேரத்தில் ஒரு நபரைச் சேர்க்கவும். அவர்களின் sl.no உங்கள் ஒதுக்கப்பட்ட வரம்பிலிருந்து தானாக ஒதுக்கப்படும்.",
    "help.upload_excel": ".xlsx அல்லது .csv கோப்பை இணைக்கவும். நெடுவரிசைகள்: name, mobile, pincode. முன்னோட்டம் → உறுதி செய்.",
    "help.paste_excel": "Excel-ல் Ctrl-C செய்து இங்கே ஒட்டவும். ஒரு நபருக்கு ஒரு வரி: name, mobile, pincode.",
    "help.today_entries": "இன்று நீங்கள் சேர்த்த அனைவரும் இங்கே காட்டப்படுவார்கள். நாள் முடிவதற்குள் ஒருமுறை சரிபாருங்கள்.",
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
