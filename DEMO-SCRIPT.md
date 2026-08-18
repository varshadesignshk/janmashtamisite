# NJY App Demo — Guide for Prabhuji

## Login

URL: `https://njy-7jn.pages.dev`

| Role | Username | Password |
|---|---|---|
| HK Leader | `hk` | `janmashtami26` |
| NJY Leader | `demo-leader1` | `janmashtami26` |
| NJY Coordinator | `demo-coord1` | `janmashtami26` |

## Before the demo — set up two windows

1. Open Chrome → sign in as **`hk`**  (this is the "leader's view")
2. Open a **second window** (or Incognito, Ctrl-Shift-N) → sign in as **`demo-coord1`**  (this is the "coordinator's view")
3. Place them side by side. HK on the left, coordinator on the right.

Every step below tells you which window to look at.

## The 8-minute story

### 1. HK Dashboard (left window)

Say: *"This is the temple leader's view. 90 chanters, 6 coordinators, 3 leaders in this demo."*

- Point to the 4 stat cells at top: **People / Chanted today / NJY Leaders / Coordinators**
- Scroll to the coordinator list — each has **two progress bars**:
  - **Chanted today** (out of the 40-chanter Plan-2 target per group)
  - **One-month daily** (how many have chanted for the past month)

### 2. Drill into a coordinator (left window)

Click **Open** next to *Sri Coordinator*. Say:

*"Now I can see exactly what her roll looks like — every chanter, contact status, whether they chanted today."*

- The circular beads at top are her whole roll at a glance.
- Grey = uncontacted, teal = followed up, gold = responded, red-ring = needs visit.
- Tap any bead once → it cycles. *"I marked as leader, on her behalf."*
- Point at the **Manage ▾** button on any row → *"I can also reassign or delete from here."*

### 3. Coordinator's view (right window)

Switch to the right window (`demo-coord1`, incognito). Say:

*"This is what Sri Coordinator herself sees when she opens the app on her phone."*

- The same roll — but she has fewer tabs (no HK, no Admin).
- Show the top of the page — the garland strip is her whole 16-person list at a glance.

### 4. Mark someone chanted today (right window)

- Pick any row → tap the **chant?** button → it turns gold and reads **✓ chanted**.
- Point out the *Chanted today* stat cell at the top ticks up.

Say: *"That took her half a second. Every day, 12,000 chanters get marked this way — split across 300 coordinators."*

### 5. WhatsApp Padma (right window)

Scroll to Padma's row (she's alphabetically among the 16). Say:

*"Now watch — one tap opens WhatsApp on her actual phone."*

- Tap the **WhatsApp** button on Padma's row.
- WhatsApp opens with a pre-filled message ready to send to +91 8072776174.
- Say: *"The coordinator adds one personal line and hits send. No copy-paste, no wrong number."*

### 6. NJY events + attendance (left window)

Click **Events** in the top nav. Say:

*"These are the 6 NJY sessions Prabhuji planned — Oct 3, Oct 4, Oct 31, Nov 1, Dec 12, Dec 13. Plus a past Sunday School event."*

- Click **Attendance** next to the past Sunday School.
- Point to the **Attendance by coordinator** section — progress bars showing each coordinator's turnout against the 40-target.
- Type "Padma" in the search box → her row appears → tap **mark** → she's now marked attended. Counter above ticks up.

### 7. Feature gates (left window)

Click **Admin** → **Feature gates**. Say:

*"When we move from the NJY phase to the Bhakti-Vriksha phase in month 4, we don't need to redeploy anything. HK Leader just clicks these chips."*

- Find the `sadhana_chart` row. Point to it — currently only `hk_leader` chip is green (highlighted).
- Say: *"Right now, the Sadhana Chart is HK-Leader-only. When BV starts, I turn on member and servant_leader here."*
- (Don't actually click — this is a "look" moment.)

### 8. Install as an app (either window, on a phone)

Say: *"And this whole thing installs on their phone like a regular app."*

- If on desktop: point to the **Install app** button at the far right of the nav bar → click → Chrome's install dialog appears.
- If on phone: Chrome menu (⋮) → **Add to Home screen** → the NJY icon appears on the phone's home screen. Tap it → opens without any browser chrome, full app.

## Numbers Prabhuji should mention if asked

- **30,000** chanters targeted at Janmashtami
- **12,000** commit to daily chanting (month 1)
- **6,000 / 4,800 / 3,600** attend NJY 1 / 2 / 3
- **72 → 50** BV groups over 64 weeks
- **500 Guru-ashraya devotees** end goal

## What the app cost to build and run

- Built entirely on free tools — GitHub, Cloudflare
- Zero rupees per month for hosting and database
- Supports up to 3 million requests per month on the free tier — more than enough for 30k chanters

## If anything goes wrong live

- Blank page or stuck? → reload the tab. All state persists.
- Login says "wrong password"? → make sure it's `janmashtami26` exactly, all lowercase.
- Any 500 error? → screenshot, tell Varsha after the meeting. It won't cause data loss.

Hare Krsna.
