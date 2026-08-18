# Deploy — Cloudflare Pages + D1

Everything below is one-time except step 8 (`git push`), which is how you
ship every subsequent change.

## Prerequisites

- A free Cloudflare account (https://dash.cloudflare.com/sign-up)
- The `app/` directory pushed to a GitHub repo (public or private, both
  work with Cloudflare Pages). Recommended layout: `app/` is the repo
  root — i.e. `git init` runs inside `app/`, not in `sixmore/`. This
  keeps the `req docs/` folder (which has WhatsApp transcripts with
  real names and phone numbers) out of the repo entirely.
- Node.js 20+ locally, which you already have

## 1. Log into Cloudflare from your terminal

```
cd C:/test2/sixmore/app
npx wrangler login
```

Opens a browser, you approve. One-time.

## 2. Create the D1 database

```
npx wrangler d1 create njy
```

The command prints something like:

```
[[d1_databases]]
binding = "DB"
database_name = "njy"
database_id = "abcd1234-..."
```

Copy the `database_id` value and paste it into `wrangler.toml` where it
currently says `REPLACE_ME`.

## 3. Apply the schema

```
npx wrangler d1 migrations apply DB --remote
```

This runs `schema/0001_init.sql` on your live D1. Repeat with future
migrations (`0002_*.sql`, etc.).

## 4. Seed the first HK Leader

```
node scripts/seed-prod.js "PickAStrongPassphrase2026"
```

Copy the SQL statement it prints, then:

```
npx wrangler d1 execute DB --remote --command "…paste SQL here…"
```

Now the account `hk` / `PickAStrongPassphrase2026` exists in production.

## 5. Generate a session secret

```
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

Copy the printed string — that's your `SESSION_SECRET`. Save it
somewhere you won't lose it (a password manager). If it changes, all
active sessions log out.

## 6. Connect the GitHub repo to Cloudflare Pages

1. Cloudflare dashboard → **Workers & Pages** → **Create** → **Pages**
   → **Connect to Git**.
2. Pick your repo. Production branch: `main` (or whatever you use).
3. Build settings:
   - **Framework preset**: None
   - **Build command**: *(leave blank)* — we ship raw HTML/CSS/JS.
   - **Build output directory**: `public`
   - **Root directory**: leave blank (or `/`) — the repo IS the app,
     since `git init` ran inside `app/`. Only set this to `app` if you
     ended up making the parent `sixmore/` folder the repo root.
4. **Environment variables** — add:
   - `SESSION_SECRET` = the string from step 5 (mark it as an encrypted
     secret, not a plain variable)
   - `APP_ENV` = `production` (plain variable). Without this the app
     will echo internal error messages to callers — fine locally, not
     what you want in prod.
5. **Save and Deploy**. First build takes ~30 seconds.

## 7. Bind the D1 database to the Pages project

In the Pages project → **Settings** → **Functions** → **D1 database
bindings**:

- Variable name: `DB`
- D1 database: `njy` (the one you created in step 2)

Save. This exposes `env.DB` to `functions/api/[[path]].js` at runtime.

## 8. Every future change

```
git add .
git commit -m "…"
git push
```

Cloudflare rebuilds and redeploys on push. Preview URLs are generated
for every PR automatically.

## Custom domain (optional, ~₹800/year)

Pages project → **Custom domains** → **Set up a custom domain**. Point
your DNS at Cloudflare (they'll walk you through the CNAME). HTTPS is
automatic; no extra config.

## Cost summary at Plan-2 scale

- Pages (static assets + Functions): free — 100k requests/day
- D1 (SQLite): free — 5 million reads/day, 100k writes/day, 5 GB
- Bandwidth: unlimited on Cloudflare Pages free
- **Total: ₹0/month**, unless you buy a custom domain

## Notes

- **npm audit** warnings on `wrangler` come from its dependency tree,
  not our code. They only affect the build machine, not what runs in
  production. Ignore or run `npm audit fix` at your discretion.
- **Cold starts**: none on D1 (Cloudflare keeps SQLite files hot).
  Workers themselves also cold-start in <1 s.
- **Backups**: Cloudflare doesn't automatically back up D1. Run
  `npx wrangler d1 export DB --remote --output=backup-YYYYMMDD.sql`
  weekly and keep the dumps somewhere safe.
