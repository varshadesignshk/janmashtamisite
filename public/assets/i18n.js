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
    "role.njy_coordinator": "NJY Group Coordinator",
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

    // Settings — password + templates
    "hd.change_pw": "Change my password",
    "help.change_pw": "Type your current password and a new one. Minimum 6 characters.",
    "field.current_pw": "Current password",
    "field.new_pw": "New password",
    "help.settings": "Personal settings for your own account. Choose the app language, and customise the WhatsApp templates that fill in when you tap the WhatsApp button on any chanter's row.",
    "help.wa_templates": "Customise the WhatsApp message your button pre-fills. Use {name} anywhere in your text — it gets replaced with each chanter's name at send time. You can write in English, Tamil, Hindi, or any script — no special setup needed.",
    "msg.pw_updated": "Password updated.",
    "msg.pw_wrong_current": "Current password is wrong.",

    // Profile / leader link
    "hd.your_leader": "Your NJY Leader",
    "msg.no_leader": "No leader assigned yet. Ask HK Leader to link you.",

    // Team / HK merged
    "help.team_hk": "Big-picture view — 4 stat tiles + every coordinator. Click Open on any row to drill into their roll.",
    "msg.no_coords_leader": "No coordinators visible yet. Ask HK Leader to link at least one coordinator to you (Admin → Users → Edit → Manager).",
    "msg.no_coords_hk": "No coordinators yet. Create some in Admin → Users or Admin → Bulk create users.",

    // Admin bulk
    "hd.admin_bulk_users": "Bulk create coordinators and leaders",
    "help.admin_bulk_users": "Paste rows OR upload an Excel file with columns: username, password, display_name, phone, role, manager_username (optional). Role must be one of: hk_leader, njy_leader, njy_coordinator. manager_username links a coord to their NJY leader — use the leader's username.",
    "hd.upload_excel_csv": "Upload Excel or CSV",
    "hd.paste_rows": "Or paste rows",
    "btn.import": "Import",
    "hd.admin_bulk_chanters": "Bulk import chanters",
    "help.admin_bulk_chanters": "Import chanters from the data-entry team's Excel. The coord_username column tells the app which coordinator each row belongs to — use the coordinator's login username.",
    "hd.upload_excel_file": "Upload Excel or CSV file",
    "btn.download_users_template": "⬇ Download users template (Excel)",
    "btn.download_chanters_template": "⬇ Download chanters template (Excel)",

    // Broadcast
    "hd.broadcast": "Broadcast",
    "hd.broadcast_today": "📢 Broadcast today's message",
    "hd.broadcast_running": "📢 Broadcast",
    "hd.broadcast_complete": "✅ Broadcast complete",
    "hd.broadcast_complete_card": "🌸 Broadcast complete",
    "hd.message": "Message",
    "hd.who_receives": "Who receives",
    "hd.skip_chanted": "Skip chanters who already chanted today",
    "hd.skip_disqualified": "Skip disqualified chanters",
    "msg.broadcast_access": "Broadcast mode is available to NJY Coordinators, NJY Leaders, and HK Leader.",
    "msg.type_msg_first": "Type a message first.",
    "msg.no_match_filter": "No recipients match your filters.",
    "chip.sent": "✅ Sent:",
    "chip.skipped": "⤵ Skipped:",
    "chip.remaining": "⏳ Remaining:",
    "btn.close": "Close",
    "btn.pause_exit": "Pause & exit",
    "btn.skip": "Skip",
    "btn.next": "Next →",
    "btn.mark_sent": "Sent ✓",
    "btn.wa_send": "Open WhatsApp",
    "confirm.pause_broadcast": "Pause broadcast?",

    // WA Group
    "hd.wa_group_page": "WhatsApp Group",
    "hd.my_wa_group": "💬 My WhatsApp Group",
    "hd.group_settings": "Group settings",
    "hd.send_msg_group": "Send a message to your group",
    "help.send_msg_group": "WhatsApp will let you pick which group to send to.",
    "help.wa_group_placeholder": "Hare Krsna! Reminder: Janmashtami practice tonight at 7 PM 🌸",
    "msg.wa_group_access": "This screen is for NJY Coordinators, NJY Leaders, and HK Leader.",
    "btn.test_link": "Test link",
    "btn.clear": "Clear",
    "btn.test_emoji": "Test emoji rendering",
    "msg.opened_pick_group": "Opened. Pick your group in WhatsApp.",
    "msg.paste_link_first": "Paste a link first.",
    "msg.cleared": "Cleared.",
    "msg.saved_short": "Saved.",
    "confirm.clear_group": "Clear the saved group link and name?",
    "confirm.no_link_placeholder": "Your message doesn't include {link}. Recipients won't get the join link. Continue anyway?",
    "help.invite_message": "Invite message. Use {name} for the recipient's name and {link} for the group link.",
    "msg.saved_link_first": "Paste and Save your group invite link first (top of this page).",
    "msg.select_at_least_one": "Select at least one recipient.",

    // Care moments / My Roll extras
    "msg.no_chanters_assigned": "No chanters assigned yet. Ask your NJY Leader to assign your list, or (if you are the HK Leader) use bulk import from Admin.",
    "msg.no_coord_roll": "You don't have a coordinator roll. Try the Team or HK tabs.",
    "msg.could_not_load": "Could not load: ",
    "msg.could_not_update": "Could not update",
    "msg.could_not_update_status": "Could not update status",
    "msg.could_not_load_recipients": "Could not load recipients: ",
    "title.chant_history": "Show 14-day chant history",

    // Team / HK dashboard
    "hd.all_coords_title": "All coordinators",
    "msg.no_coords_admin": "No coordinators yet. Create some in Admin → Users.",
    "msg.no_coords_leader_assigned": "No coordinators assigned to this leader yet.",
    "hd.leader_prefix": "HK Leader:",

    // Duties
    "msg.no_access_duties": "You don't have access to duties.",
    "msg.no_pending_duties": "No pending duties. Duties are auto-generated from the BV Action Timeline as roles get assigned. (Auto-generator not yet built — HK Leader can add duties manually via SQL for now.)",
    "btn.done_short": "Done",
    "confirm.delete_duty": "Delete this duty?",

    // Events
    "msg.no_access_events": "You don't have access to the events list.",
    "msg.no_events": "No events yet. HK Leader can create them in Admin → Events.",
    "hd.search_mark": "Search & mark (alternative)",
    "help.search_mark": "For walk-in attendees whose coordinator you don't know. Type at least 2 characters — matches name or phone digits.",
    "hd.new_event": "New event",
    "confirm.delete_event_prefix": "Delete event",
    "confirm.delete_event_suffix": "? Attendance rows are kept for audit.",

    // Sadhana
    "hd.sadhana_daily_entry": "Sadhana Chart · daily entry",
    "hd.sadhana_browse": "Sadhana Chart · browse",
    "help.sadhana_daily": "The 124-pt/day chart from the Bhakti-Vrksa manual. Chanting points auto-compute from time-of-day round buckets: ×4 before 7am, ×3 7–8am, ×2 8–10am, ×1 after 10am.",
    "help.sadhana_browse": "Review recent entries filled by BV members and their Servant Leaders. Click any row to see that member's full history.",
    "hd.rounds_chanted": "Rounds chanted",
    "hd.sravanam_seva": "Sravanam & other seva",
    "hd.find_member": "Find a member",
    "hd.recent_entries": "Recent entries",
    "msg.no_sadhana_entries": "No entries yet. Once BV members start filling their charts, they show up here newest-first.",
    "btn.save_entry": "Save entry",
    "confirm.delete_sadhana": "Delete this sadhana entry?",

    // Leaderboard
    "hd.leaderboard": "Leaderboard",
    "hd.hk_whole_org": "🏛 HK Leader · Whole org",
    "msg.no_leaders_yet": "No NJY Leaders yet.",
    "msg.no_coords_yet": "No coordinators yet.",
    "msg.leaders_lb_restricted": "Leaders leaderboard is only visible to HK Leader and NJY Leaders.",
    "hd.no_points_yet_today": "No points yet today.",
    "hd.no_points_scope": "No points yet in this scope.",
    "hd.today_leaders": "Today's leaders",
    "hd.how_points": "How points are earned",
    "help.how_points": "This is the full point matrix for Phase 1 and Phase 2. Keep an eye on the milestone bonuses — they're the biggest earners.",
    "lb.total": "Total",

    // Profile
    "hd.profile": "Profile",
    "hd.your_leader_prefix": "Your NJY Leader:",

    // Janmashtami rapid entry
    "hd.janmashtami_rapid": "Janmashtami rapid entry",
    "msg.no_access_janmashtami": "You don't have access to the Janmashtami rapid entry.",
    "field.coupon": "Coupon #",
    "msg.saving": "Saving…",
    "msg.parsing": "Parsing…",
    "msg.importing": "Importing…",
    "msg.error_prefix": "Error: ",

    // Admin
    "hd.admin": "Admin",
    "hd.new_user": "New user",
    "help.new_user": "Add a single leader or coordinator. Use Bulk create users when you have many at once.",
    "hd.feature_visibility": "Feature visibility",
    "msg.no_access_admin": "You don't have access to Admin. This section is restricted to HK Leader.",
    "help.admin_paste_users": "One user per line, tab-separated: username, password, display_name, phone, role, manager_username.",
    "help.admin_paste_chanters": "Paste rows from Excel (Ctrl-C copies as tab-separated) OR as CSV. Header row first. Minimum columns: legal_name/name, phone/mobile. Optional: pincode, coupon_no, is_daily, coord_username.",
    "btn.create_user": "Create user",
    "btn.save_event": "Save event",
    "btn.preview": "Preview",
    "btn.commit": "Commit",
    "btn.save_all": "Save all changes",
    "btn.save_section": "Save section",
    "btn.edit_short": "Edit",
    "btn.delete_short": "Delete",
    "field.display_name": "Display name",
    "field.role": "Role",
    "field.reset_password": "Reset password",
    "field.status": "Status",
    "field.sl_range_start": "SL range start",
    "field.sl_range_end": "SL range end",
    "field.manager": "Manager (NJY Leader — only for coordinators)",
    "opt.active": "Active",
    "opt.inactive": "Inactive",
    "btn.autofill_range": "Auto-fill next range",
    "msg.moved_refreshing": "Moved. Refreshing.",
    "msg.deleted_short": "Deleted.",
    "msg.no_active_users_role": "— no active users in this role —",
    "msg.no_manager": "— no manager —",
    "msg.pick_coord_batch": "— pick coordinator for this batch (or use coord_username column) —",
    "msg.pick_coord_paste": "— pick coordinator for these pasted rows (or leave blank if coord_username is in the rows) —",
    "hd.reassign_role": "Reassign — role",
    "hd.then_pick": "then pick who",
    "btn.move_short": "Move",
    "hd.lifecycle_status": "Lifecycle status",
    "btn.set_status_short": "Set status",
    "btn.delete_person": "Delete this person",
    "confirm.delete_person": "This is a soft-delete — history is kept, but they will no longer appear in active lists.",
    "confirm.pick_user_move": "Pick a user to move this person to.",
    "confirm.status_now": "Status now:",

    // BV structure
    "hd.bv_structure": "Bhakti-Vrksa structure",
    "help.bv_structure": "Six named circles from the docs: Krsna, Balarama, Gauranga, Nityananda, Nrsimha, Laksmi. Under Plan 2 (updated): 4 sectors of 3 BV groups each = 72 groups at Week 1, expected to drop to ~50 groups by Week 64. Create/edit groups here.",
    "hd.new_group": "New group",
    "btn.save_group": "Save group",
    "msg.none_yet": "None yet.",
    "confirm.delete_group_body": "Members are unlinked; the group is soft-deleted (history kept). Continue?",

    // Member details
    "hd.member_details": "Member details",
    "msg.open_via_row": "Open via a person row (feature comes online with BV phase).",
    "hd.personal": "Personal",
    "hd.work": "Work",
    "hd.notes": "Notes",

    // Group planning
    "hd.group_planning": "Group planning sheet",
    "help.group_planning": "Periodic report by a Servant Leader (per Bhakti-Vrksa manual). 22 parameters across attendance, shiksha, preaching, temple services.",
    "msg.open_group_id": "Open with a group id in the URL: #/group-report/<group_id>",
    "hd.member_attendance": "A · Member attendance",
    "hd.shiksha_level": "B · Shiksha level",
    "hd.preaching": "C · Preaching",
    "hd.temple_services": "D · Temple services",
    "btn.save_report": "Save report",

    // Tour
    "btn.skip_tour": "Skip tour",
    "btn.tour_next": "Next →",
    "btn.got_it": "Got it — start using",

    // HK-leader drill hierarchy
    "hd.hk_leaders_list": "NJY Leaders",
    "help.hk_leaders_list": "Every NJY Leader with their aggregate stats. Coords active today shows how many of that leader's coords have marked at least one chant today — a proxy for follow-up. Tap Open to see that leader's coordinators, assign new ones, or drill into any coord's roll.",
    "hd.coords_active_today": "Coords active today",
    "hd.coords_in_team": "Coordinators in team",
    "btn.assign_coords": "＋ Assign coordinators",
    "hd.assign_coords_title": "Assign coordinators to",
    "help.assign_coords": "Pick coordinators to move UNDER this leader. Currently-assigned coords are ticked and remain ticked; untick to release. Unassigned coords appear at the bottom with the ✱ mark.",
    "btn.save_assignments": "Save assignments",
    "msg.assign_saved": "Saved assignments.",
    "hd.currently_assigned": "Currently assigned",
    "hd.unassigned_coords": "Unassigned coordinators",
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
    "role.njy_coordinator": "NJY குழு ஒருங்கிணைப்பாளர்",
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

    // Settings — password + templates
    "hd.change_pw": "என் கடவுச்சொல்லை மாற்று",
    "help.change_pw": "உங்கள் தற்போதைய கடவுச்சொல்லையும் புதிய கடவுச்சொல்லையும் உள்ளிடவும். குறைந்தது 6 எழுத்துகள்.",
    "field.current_pw": "தற்போதைய கடவுச்சொல்",
    "field.new_pw": "புதிய கடவுச்சொல்",
    "help.settings": "உங்கள் கணக்குக்கான தனிப்பட்ட அமைப்புகள். செயலி மொழியைத் தேர்ந்தெடுங்கள், மற்றும் WhatsApp பொத்தானை தட்டும்போது நிரப்பப்படும் செய்தி வார்ப்புருக்களைத் தனிப்பயனாக்குங்கள்.",
    "help.wa_templates": "உங்கள் WhatsApp பொத்தான் முன்பே நிரப்பும் செய்தியை தனிப்பயனாக்கவும். {name} என்பதை உங்கள் உரையில் எங்கு வேண்டுமானாலும் பயன்படுத்தலாம் — அனுப்பும் போது ஒவ்வொரு ஜபிப்பவரின் பெயராக மாறும். நீங்கள் ஆங்கிலம், தமிழ், இந்தி அல்லது எந்த எழுத்திலும் எழுதலாம்.",
    "msg.pw_updated": "கடவுச்சொல் புதுப்பிக்கப்பட்டது.",
    "msg.pw_wrong_current": "தற்போதைய கடவுச்சொல் தவறு.",

    // Profile / leader link
    "hd.your_leader": "உங்கள் NJY தலைவர்",
    "msg.no_leader": "இன்னும் தலைவர் ஒதுக்கப்படவில்லை. HK தலைவரிடம் இணைக்கச் சொல்லவும்.",

    // Team / HK merged
    "help.team_hk": "முழு படம் — 4 புள்ளிவிவர பட்டைகள் + அனைத்து ஒருங்கிணைப்பாளர்கள். ஒருங்கிணைப்பாளரின் பட்டியலைப் பார்க்க திற என்பதைத் தட்டவும்.",
    "msg.no_coords_leader": "இன்னும் ஒருங்கிணைப்பாளர்கள் ஒதுக்கப்படவில்லை. HK தலைவரிடம் உங்களுக்கு குறைந்தது ஒரு ஒருங்கிணைப்பாளரை இணைக்கச் சொல்லவும் (நிர்வாகம் → பயனர்கள் → திருத்து → மேலாளர்).",
    "msg.no_coords_hk": "இன்னும் ஒருங்கிணைப்பாளர்கள் இல்லை. நிர்வாகம் → பயனர்கள் அல்லது நிர்வாகம் → பயனர்களை மொத்தமாக உருவாக்கு என்பதில் உருவாக்கவும்.",

    // Admin bulk
    "hd.admin_bulk_users": "ஒருங்கிணைப்பாளர்கள் மற்றும் தலைவர்களை மொத்தமாக உருவாக்கு",
    "help.admin_bulk_users": "வரிசைகளை ஒட்டவும் அல்லது Excel கோப்பை பதிவேற்றவும். நெடுவரிசைகள்: username, password, display_name, phone, role, manager_username (விருப்பம்). role ஒன்றாக இருக்க வேண்டும்: hk_leader, njy_leader, njy_coordinator. manager_username ஒரு ஒருங்கிணைப்பாளரை அவரது NJY தலைவரோடு இணைக்கிறது.",
    "hd.upload_excel_csv": "Excel அல்லது CSV பதிவேற்று",
    "hd.paste_rows": "அல்லது வரிசைகளை ஒட்டவும்",
    "btn.import": "இறக்குமதி",
    "hd.admin_bulk_chanters": "ஜபிப்பவர்களை மொத்தமாக இறக்குமதி செய்",
    "help.admin_bulk_chanters": "தரவு உள்ளீட்டு குழுவின் Excel கோப்பிலிருந்து ஜபிப்பவர்களை இறக்குமதி செய்யவும். coord_username நெடுவரிசை ஒவ்வொரு வரியும் எந்த ஒருங்கிணைப்பாளருக்குச் சொந்தமானது என்பதை செயலிக்குச் சொல்கிறது.",
    "hd.upload_excel_file": "Excel அல்லது CSV கோப்பை பதிவேற்று",
    "btn.download_users_template": "⬇ பயனர்கள் மாதிரி பதிவிறக்கு (Excel)",
    "btn.download_chanters_template": "⬇ ஜபிப்பவர்கள் மாதிரி பதிவிறக்கு (Excel)",

    // Broadcast
    "hd.broadcast": "பிராட்காஸ்ட்",
    "hd.broadcast_today": "📢 இன்றைய செய்தியை அனுப்பு",
    "hd.broadcast_running": "📢 பிராட்காஸ்ட்",
    "hd.broadcast_complete": "✅ பிராட்காஸ்ட் முடிந்தது",
    "hd.broadcast_complete_card": "🌸 பிராட்காஸ்ட் முடிந்தது",
    "hd.message": "செய்தி",
    "hd.who_receives": "யாருக்கு அனுப்பப்படும்",
    "hd.skip_chanted": "இன்று ஏற்கனவே ஜபித்தவர்களைத் தவிர்",
    "hd.skip_disqualified": "தகுதி இழந்தவர்களைத் தவிர்",
    "msg.broadcast_access": "பிராட்காஸ்ட் NJY ஒருங்கிணைப்பாளர்கள், NJY தலைவர்கள் மற்றும் HK தலைவருக்கு மட்டும்.",
    "msg.type_msg_first": "முதலில் ஒரு செய்தியை உள்ளிடவும்.",
    "msg.no_match_filter": "வடிகட்டியில் யாரும் பொருந்தவில்லை.",
    "chip.sent": "✅ அனுப்பப்பட்டது:",
    "chip.skipped": "⤵ தவிர்க்கப்பட்டது:",
    "chip.remaining": "⏳ மீதி:",
    "btn.close": "மூடு",
    "btn.pause_exit": "இடைநிறுத்து & வெளியேறு",
    "btn.skip": "தவிர்",
    "btn.next": "அடுத்தது →",
    "btn.mark_sent": "அனுப்பப்பட்டது ✓",
    "btn.wa_send": "WhatsApp திற",
    "confirm.pause_broadcast": "பிராட்காஸ்டை இடைநிறுத்தவா?",

    // WA Group
    "hd.wa_group_page": "WhatsApp குழு",
    "hd.my_wa_group": "💬 என் WhatsApp குழு",
    "hd.group_settings": "குழு அமைப்புகள்",
    "hd.send_msg_group": "உங்கள் குழுவிற்கு செய்தி அனுப்பவும்",
    "help.send_msg_group": "நீங்கள் எந்த குழுவிற்கு அனுப்ப வேண்டும் என்பதை WhatsApp தேர்ந்தெடுக்க அனுமதிக்கும்.",
    "help.wa_group_placeholder": "ஹரே கிருஷ்ணா! நினைவூட்டல்: இன்று இரவு 7 மணிக்கு ஜென்மாஷ்டமி பயிற்சி 🌸",
    "msg.wa_group_access": "இந்த திரை NJY ஒருங்கிணைப்பாளர்கள், NJY தலைவர்கள் மற்றும் HK தலைவருக்கு மட்டும்.",
    "btn.test_link": "இணைப்பை சோதி",
    "btn.clear": "அழி",
    "btn.test_emoji": "எமோஜி காட்சியை சோதி",
    "msg.opened_pick_group": "திறக்கப்பட்டது. WhatsApp-ல் உங்கள் குழுவைத் தேர்ந்தெடுக்கவும்.",
    "msg.paste_link_first": "முதலில் ஒரு இணைப்பை ஒட்டவும்.",
    "msg.cleared": "அழிக்கப்பட்டது.",
    "msg.saved_short": "சேமிக்கப்பட்டது.",
    "confirm.clear_group": "சேமிக்கப்பட்ட குழு இணைப்பு மற்றும் பெயரை அழிக்கவா?",
    "confirm.no_link_placeholder": "உங்கள் செய்தியில் {link} இல்லை. பெறுநர்களுக்கு சேர்க்கை இணைப்பு கிடைக்காது. தொடரவா?",
    "help.invite_message": "அழைப்பு செய்தி. பெறுநரின் பெயருக்கு {name} மற்றும் குழு இணைப்புக்கு {link} பயன்படுத்தவும்.",
    "msg.saved_link_first": "முதலில் மேலே உங்கள் குழு அழைப்பு இணைப்பை ஒட்டி சேமிக்கவும்.",
    "msg.select_at_least_one": "குறைந்தது ஒருவரையாவது தேர்ந்தெடுக்கவும்.",

    // Care moments / My Roll extras
    "msg.no_chanters_assigned": "இன்னும் ஜபிப்பவர்கள் ஒதுக்கப்படவில்லை. உங்கள் NJY தலைவரிடம் பட்டியலை ஒதுக்கச் சொல்லவும் (அல்லது HK தலைவராக இருந்தால், நிர்வாகத்தில் இருந்து மொத்த இறக்குமதி செய்யவும்).",
    "msg.no_coord_roll": "உங்களுக்கு ஒருங்கிணைப்பாளர் பட்டியல் இல்லை. குழு அல்லது HK டேபை முயற்சிக்கவும்.",
    "msg.could_not_load": "ஏற்ற முடியவில்லை: ",
    "msg.could_not_update": "புதுப்பிக்க முடியவில்லை",
    "msg.could_not_update_status": "நிலையை புதுப்பிக்க முடியவில்லை",
    "msg.could_not_load_recipients": "பெறுநர்களை ஏற்ற முடியவில்லை: ",
    "title.chant_history": "14-நாள் ஜப வரலாற்றைக் காட்டு",

    // Team / HK dashboard
    "hd.all_coords_title": "அனைத்து ஒருங்கிணைப்பாளர்கள்",
    "msg.no_coords_admin": "இன்னும் ஒருங்கிணைப்பாளர்கள் இல்லை. நிர்வாகம் → பயனர்களில் உருவாக்கவும்.",
    "msg.no_coords_leader_assigned": "இந்த தலைவருக்கு இன்னும் ஒருங்கிணைப்பாளர்கள் ஒதுக்கப்படவில்லை.",
    "hd.leader_prefix": "HK தலைவர்:",

    // Duties
    "msg.no_access_duties": "உங்களுக்கு கடமைகளுக்கான அணுகல் இல்லை.",
    "msg.no_pending_duties": "நிலுவை கடமைகள் இல்லை. BV Action Timeline-ல் இருந்து பாத்திரங்கள் ஒதுக்கப்படும்போது கடமைகள் தானாக உருவாக்கப்படும். (Auto-generator இன்னும் கட்டப்படவில்லை — HK தலைவர் SQL மூலம் கைமுறையாக சேர்க்கலாம்.)",
    "btn.done_short": "முடிந்தது",
    "confirm.delete_duty": "இந்த கடமையை நீக்கவா?",

    // Events
    "msg.no_access_events": "உங்களுக்கு நிகழ்வு பட்டியலுக்கான அணுகல் இல்லை.",
    "msg.no_events": "இன்னும் நிகழ்வுகள் இல்லை. HK தலைவர் நிர்வாகம் → நிகழ்வுகள் மூலம் உருவாக்கலாம்.",
    "hd.search_mark": "தேடி குறி (மாற்று)",
    "help.search_mark": "ஒருங்கிணைப்பாளர் தெரியாத நடந்து வந்தவர்களுக்கு. குறைந்தது 2 எழுத்துக்களை தட்டச்சு செய்யுங்கள் — பெயர் அல்லது மொபைல் எண்ணுடன் பொருந்தும்.",
    "hd.new_event": "புதிய நிகழ்வு",
    "confirm.delete_event_prefix": "நிகழ்வை நீக்கவா",
    "confirm.delete_event_suffix": "? கணக்கெடுப்பிற்காக வருகை பதிவுகள் வைக்கப்படும்.",

    // Sadhana
    "hd.sadhana_daily_entry": "சாதனை பட்டியல் · தினசரி பதிவு",
    "hd.sadhana_browse": "சாதனை பட்டியல் · உலாவு",
    "help.sadhana_daily": "Bhakti-Vrksa manual-ல் இருந்து 124-புள்ளி/நாள் அட்டவணை. ஜப புள்ளிகள் நேர வாரியாக தானாக கணக்கிடப்படும்: ×4 காலை 7 மணிக்கு முன், ×3 7–8am, ×2 8–10am, ×1 10am பிறகு.",
    "help.sadhana_browse": "BV உறுப்பினர்கள் மற்றும் Servant Leaders நிரப்பிய சமீபத்திய பதிவுகளைப் பாருங்கள். எந்த வரிசையையும் தட்டி அந்த உறுப்பினரின் முழு வரலாற்றைப் பாருங்கள்.",
    "hd.rounds_chanted": "ஜபித்த சுற்றுகள்",
    "hd.sravanam_seva": "ஸ்ரவணம் மற்றும் மற்ற சேவை",
    "hd.find_member": "உறுப்பினரைத் தேடு",
    "hd.recent_entries": "சமீபத்திய பதிவுகள்",
    "msg.no_sadhana_entries": "இன்னும் பதிவுகள் இல்லை. BV உறுப்பினர்கள் தங்கள் அட்டவணைகளை நிரப்பத் தொடங்கியவுடன், இங்கே புதியது-முதலில் என்ற வரிசையில் காட்டப்படும்.",
    "btn.save_entry": "பதிவை சேமி",
    "confirm.delete_sadhana": "இந்த சாதனை பதிவை நீக்கவா?",

    // Leaderboard
    "hd.leaderboard": "தலைவர் பட்டியல்",
    "hd.hk_whole_org": "🏛 HK தலைவர் · முழு அமைப்பு",
    "msg.no_leaders_yet": "இன்னும் NJY தலைவர்கள் இல்லை.",
    "msg.no_coords_yet": "இன்னும் ஒருங்கிணைப்பாளர்கள் இல்லை.",
    "msg.leaders_lb_restricted": "தலைவர் தலைவர் பட்டியல் HK தலைவர் மற்றும் NJY தலைவர்களுக்கு மட்டுமே தெரியும்.",
    "hd.no_points_yet_today": "இன்று இன்னும் புள்ளிகள் இல்லை.",
    "hd.no_points_scope": "இந்த வரம்பில் இன்னும் புள்ளிகள் இல்லை.",
    "hd.today_leaders": "இன்றைய தலைவர்கள்",
    "hd.how_points": "புள்ளிகள் எவ்வாறு கிடைக்கின்றன",
    "help.how_points": "Phase 1 மற்றும் Phase 2-க்கான முழு புள்ளி அட்டவணை. Milestone bonus-களைக் கவனிக்கவும் — அவை பெரிய புள்ளிகள்.",
    "lb.total": "மொத்தம்",

    // Profile
    "hd.profile": "என் பக்கம்",
    "hd.your_leader_prefix": "உங்கள் NJY தலைவர்:",

    // Janmashtami rapid entry
    "hd.janmashtami_rapid": "ஜென்மாஷ்டமி விரைவு பதிவு",
    "msg.no_access_janmashtami": "உங்களுக்கு ஜென்மாஷ்டமி விரைவு பதிவுக்கான அணுகல் இல்லை.",
    "field.coupon": "கூப்பன் #",
    "msg.saving": "சேமிக்கிறது…",
    "msg.parsing": "பகுப்பாய்வு செய்கிறது…",
    "msg.importing": "இறக்குமதி செய்கிறது…",
    "msg.error_prefix": "பிழை: ",

    // Admin
    "hd.admin": "நிர்வாகம்",
    "hd.new_user": "புதிய பயனர்",
    "help.new_user": "ஒரு தலைவர் அல்லது ஒருங்கிணைப்பாளரைச் சேர். பலரை ஒரே நேரத்தில் சேர்க்க Bulk create users பயன்படுத்தவும்.",
    "hd.feature_visibility": "அம்ச காட்சி கட்டுப்பாடு",
    "msg.no_access_admin": "உங்களுக்கு நிர்வாகத்திற்கான அணுகல் இல்லை. இந்த பகுதி HK தலைவருக்கு மட்டும்.",
    "help.admin_paste_users": "ஒரு பயனருக்கு ஒரு வரி, tab-separated: username, password, display_name, phone, role, manager_username.",
    "help.admin_paste_chanters": "Excel-ல் இருந்து வரிசைகளை ஒட்டவும் (Ctrl-C tab-separated-ஆக நகல் எடுக்கும்) அல்லது CSV-ஆக. முதல் வரி header. குறைந்தபட்ச நெடுவரிசைகள்: legal_name/name, phone/mobile. விருப்பம்: pincode, coupon_no, is_daily, coord_username.",
    "btn.create_user": "பயனரை உருவாக்கு",
    "btn.save_event": "நிகழ்வை சேமி",
    "btn.preview": "முன்னோட்டம்",
    "btn.commit": "செயல்படுத்து",
    "btn.save_all": "அனைத்து மாற்றங்களையும் சேமி",
    "btn.save_section": "பகுதியை சேமி",
    "btn.edit_short": "திருத்து",
    "btn.delete_short": "நீக்கு",
    "field.display_name": "காட்சி பெயர்",
    "field.role": "பாத்திரம்",
    "field.reset_password": "கடவுச்சொல்லை மீட்டமை",
    "field.status": "நிலை",
    "field.sl_range_start": "SL வரம்பு தொடக்கம்",
    "field.sl_range_end": "SL வரம்பு முடிவு",
    "field.manager": "மேலாளர் (NJY தலைவர் — ஒருங்கிணைப்பாளர்களுக்கு மட்டும்)",
    "opt.active": "செயலில்",
    "opt.inactive": "செயலற்ற",
    "btn.autofill_range": "அடுத்த வரம்பை தானாக நிரப்பு",
    "msg.moved_refreshing": "நகர்த்தப்பட்டது. புதுப்பிக்கிறது.",
    "msg.deleted_short": "நீக்கப்பட்டது.",
    "msg.no_active_users_role": "— இந்த பாத்திரத்தில் செயலில் உள்ள பயனர்கள் இல்லை —",
    "msg.no_manager": "— மேலாளர் இல்லை —",
    "msg.pick_coord_batch": "— இந்த தொகுதிக்கான ஒருங்கிணைப்பாளரைத் தேர்ந்தெடுக்கவும் (அல்லது coord_username நெடுவரிசையைப் பயன்படுத்தவும்) —",
    "msg.pick_coord_paste": "— இந்த ஒட்டப்பட்ட வரிசைகளுக்கான ஒருங்கிணைப்பாளரைத் தேர்ந்தெடுக்கவும் (அல்லது coord_username வரிசைகளில் இருந்தால் காலியாக விடவும்) —",
    "hd.reassign_role": "மறு ஒதுக்கீடு — பாத்திரம்",
    "hd.then_pick": "பின் யாரை தேர்ந்தெடு",
    "btn.move_short": "நகர்த்து",
    "hd.lifecycle_status": "வாழ்நாள் நிலை",
    "btn.set_status_short": "நிலை அமை",
    "btn.delete_person": "இந்த நபரை நீக்கு",
    "confirm.delete_person": "இது soft-delete — வரலாறு வைக்கப்படும், ஆனால் அவர்கள் செயலில் உள்ள பட்டியல்களில் தோன்றமாட்டார்கள்.",
    "confirm.pick_user_move": "இந்த நபரை நகர்த்த பயனரைத் தேர்ந்தெடுக்கவும்.",
    "confirm.status_now": "நிலை இப்போது:",

    // BV structure
    "hd.bv_structure": "பக்திவ்ருக்ஷா அமைப்பு",
    "help.bv_structure": "docs-ல் இருந்து ஆறு பெயரிடப்பட்ட circles: Krsna, Balarama, Gauranga, Nityananda, Nrsimha, Laksmi. Plan 2 (updated): 4 sectors × 3 BV groups = 72 groups Week 1-ல், ~50 groups-ஆக Week 64 வரை குறையும்.",
    "hd.new_group": "புதிய குழு",
    "btn.save_group": "குழுவைச் சேமி",
    "msg.none_yet": "இன்னும் எதுவும் இல்லை.",
    "confirm.delete_group_body": "உறுப்பினர்கள் இணைப்பு நீக்கப்படுவார்கள்; குழு soft-delete செய்யப்படும் (வரலாறு வைக்கப்படும்). தொடரவா?",

    // Member details
    "hd.member_details": "உறுப்பினர் விவரங்கள்",
    "msg.open_via_row": "நபர் வரிசை மூலம் திற (BV கட்டத்தில் இயங்கும்).",
    "hd.personal": "தனிப்பட்ட",
    "hd.work": "வேலை",
    "hd.notes": "குறிப்புகள்",

    // Group planning
    "hd.group_planning": "குழு திட்டமிடல் தாள்",
    "help.group_planning": "Servant Leader-ஆல் periodic report (Bhakti-Vrksa manual). வருகை, ஷிக்ஷா, prehead, temple services எனும் 22 parameters.",
    "msg.open_group_id": "URL-ல் group id-உடன் திற: #/group-report/<group_id>",
    "hd.member_attendance": "A · உறுப்பினர் வருகை",
    "hd.shiksha_level": "B · ஷிக்ஷா நிலை",
    "hd.preaching": "C · Preaching",
    "hd.temple_services": "D · கோயில் சேவைகள்",
    "btn.save_report": "அறிக்கையை சேமி",

    // Tour
    "btn.skip_tour": "சுற்றுப்பயணத்தை தவிர்",
    "btn.tour_next": "அடுத்தது →",
    "btn.got_it": "புரிந்தது — தொடங்கு",

    // HK-leader drill hierarchy
    "hd.hk_leaders_list": "NJY தலைவர்கள்",
    "help.hk_leaders_list": "ஒவ்வொரு NJY தலைவரின் மொத்த புள்ளிவிவரங்கள். இன்று செயல்பட்ட ஒருங்கிணைப்பாளர்கள் — அந்த தலைவரின் எத்தனை ஒருங்கிணைப்பாளர்கள் இன்று குறைந்தது ஒரு ஜபத்தை பதிவு செய்துள்ளனர் என்பதைக் காட்டுகிறது. திற என்பதைத் தட்டி தலைவரின் ஒருங்கிணைப்பாளர்களைப் பார்க்கவும், புதியவற்றை ஒதுக்கவும், அல்லது எந்த ஒருங்கிணைப்பாளரின் பட்டியலிலும் இறங்கவும்.",
    "hd.coords_active_today": "இன்று செயல்பட்ட ஒருங்கிணைப்பாளர்கள்",
    "hd.coords_in_team": "குழுவில் ஒருங்கிணைப்பாளர்கள்",
    "btn.assign_coords": "＋ ஒருங்கிணைப்பாளர்களை ஒதுக்கு",
    "hd.assign_coords_title": "ஒருங்கிணைப்பாளர்களை ஒதுக்கவும்:",
    "help.assign_coords": "இந்த தலைவரின் கீழ் நகர்த்த ஒருங்கிணைப்பாளர்களைத் தேர்ந்தெடுக்கவும். தற்போது ஒதுக்கப்பட்டவர்கள் தேர்வுசெய்யப்பட்டுள்ளனர்; விடுவிக்க தேர்வை நீக்கவும். ஒதுக்கப்படாதவர்கள் ✱ குறியுடன் கீழே வருவார்கள்.",
    "btn.save_assignments": "ஒதுக்கீடுகளை சேமி",
    "msg.assign_saved": "சேமிக்கப்பட்டது.",
    "hd.currently_assigned": "தற்போது ஒதுக்கப்பட்டவர்கள்",
    "hd.unassigned_coords": "ஒதுக்கப்படாத ஒருங்கிணைப்பாளர்கள்",
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
