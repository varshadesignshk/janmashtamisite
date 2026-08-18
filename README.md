# NJY app — Phase 1

The rebuild after `primitive/`. Coordinator-facing web app + PWA for the
ISKCON Thiruppalai Sri-Krsna-Janmastami Nama-Japa-Yajna programme.

- **Runs on** Cloudflare Pages (static assets + Pages Functions) with a
  Cloudflare D1 database.
- **Reuses from `primitive/`**: the design system (garland UI, validated
  palette, seva-register look), scrypt+HMAC auth pattern, and the storage
  boundary so the same handlers work against D1 in production and an
  in-memory fake in tests.
- **New in this build**: 4-tier hierarchy (HK Leader → NJY Leader → NJY
  Coordinator → Chanter, with BV roles overlaid), RBAC + a feature-gate
  registry (build everything now, expose progressively), a pluggable
  notification adapter (day-1 = `wa.me` deep-links + Web Push), and a
  proper relational schema instead of Sheets.

For plan and phasing rationale see `../PAST.md` and the WhatsApp
transcripts in `../req docs/`. This app targets **~330 authenticated
managers** who between them manage ~30,000 chanter records.

## Local dev

```
npm install
npm run db:init         # create local D1, apply schema, seed HK Leader
npm run dev             # wrangler pages dev
```

## Deploy

```
npm run db:migrate      # apply pending migrations to prod D1
npm run deploy          # wrangler pages deploy public
```
