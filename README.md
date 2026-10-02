# POS App — React + Node + Supabase

A point-of-sale web app with two audiences:

- **Admin** (logged in): dashboard, add/edit products, sell products (register/checkout),
  and publish products to the public client site.
- **Client** (public, no account): browses only *published* products, filterable by
  category, with a detail page per product.

UI text is in Khmer (ភាសាខ្មែរ). Code, comments, and variable names are in English so the
project stays easy to maintain for future developers.

## Why Supabase instead of plain SQLite

You asked for "online only," and that's the deciding factor. SQLite is a single file on
disk — great for a local desktop app, but there's no such thing as "SQLite hosted online"
in the normal sense; you'd need a separate service (like Turso/libSQL) built on top of it
just to get network access, and you'd still have to build your own auth and row-level
security by hand.

**Supabase** is a hosted **Postgres** database with three things a POS app needs out of
the box:

1. A real network-accessible SQL database (so admin and client can both reach the same
   data from anywhere).
2. Built-in authentication (admin login — no need to write password hashing/session code).
3. Row Level Security (RLS) — Postgres itself enforces "anonymous visitors can only read
   published products," so even if there were a bug in the frontend or API, the database
   still refuses to leak drafts.

It also has a generous free tier, which makes it a reasonable default for a small POS.

## How the pieces fit together

```
React (client/)  →  Node/Express API (server/)  →  Supabase (Postgres + Auth)
     admin login (direct to Supabase Auth) ─────────────────↗
```

- The **public catalog** pages call the Node API, which reads from Supabase using the
  public ("anon") key. RLS only lets that key see published products.
- **Admin login** happens directly between the React app and Supabase Auth
  (`supabase.auth.signInWithPassword`) — there's no reason to reinvent that.
- Every other **admin action** (add/edit/delete product, ring up a sale, view the
  dashboard) goes: React → Node API, with the admin's Supabase access token attached →
  Node forwards that same token to Supabase → Postgres RLS sees "this is a logged-in
  user" and allows it.
- The server **never needs Supabase's service-role key** — only the anon key — because
  it always acts *as* the signed-in admin, not as a superuser. That's a smaller attack
  surface than the usual "backend holds the master key" pattern.
- Checking out a sale calls a single Postgres function, `create_sale()` (see
  `supabase/schema.sql`), which creates the sale, creates its line items, and decrements
  stock all in one atomic transaction — so a network hiccup mid-checkout can't leave
  stock counts wrong.

## Project layout

```
pos-app/
  supabase/schema.sql     ← run this once in your Supabase project
  server/                 ← Node/Express API
  client/                 ← React (Vite) frontend — admin + public client site
```

## Setup

### 1. Create the Supabase project

1. Go to supabase.com → New project. Pick any name/region/password.
2. Once it's ready, open **SQL Editor** and paste in the entire contents of
   `supabase/schema.sql`, then run it. This creates the tables, security policies, and
   the `create_sale` checkout function, plus three starter categories.
3. Go to **Authentication → Users → Add user** and create your admin account (an email +
   password). That's the login you'll use for `/admin/login` — there's no separate
   admin sign-up flow by design, so admins are provisioned by you in the Supabase
   dashboard. Add one user per staff member who needs POS access.
4. Go to **Project Settings → API** and note down the **Project URL** and the
   **anon public key** — you'll need both twice (server and client).

### 2. Backend (server/)

```bash
cd server
cp .env.example .env      # then fill in SUPABASE_URL and SUPABASE_ANON_KEY
npm install
npm run dev                # starts on http://localhost:4000
```

Cloudflare R2 settings in `server/.env` are optional and are only needed for product image uploads.

### 3. Frontend (client/)

```bash
cd client
cp .env.example .env.local   # fill in VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_API_URL
npm install
npm run dev                   # starts on http://localhost:5173
```

Open `http://localhost:5173` for the public client catalog, and
`http://localhost:5173/admin/login` to sign in as admin.

> **Note on this build:** this project was written in a sandboxed environment that
> could not reach the npm package registry, so `npm install` could not be run or
> verified here. Every file was written by hand and syntax-checked (`node --check` for
> the backend, `tsc` for the frontend JSX), but you should run `npm install` yourself
> on a machine with normal internet access and try it end-to-end before relying on it.
> If anything doesn't compile, paste the error back and it's a quick fix.

## Using it

1. Sign in at `/admin/login` with the user you created in Supabase.
2. **Products** tab → "បញ្ចូលផលិតផលថ្មី" (add product): fill in name/price/stock/category,
   and check "ផ្សាយទៅទំព័រអតិថិជន" (publish to client site) when it's ready for the public
   to see it. Unpublished products stay visible to you in the admin list but never appear
   on `/`.
3. **Sell** tab → click products to add them to the cart, adjust quantities, and hit
   "បញ្ចប់ការលក់" (complete sale). Stock decrements automatically.
4. **Dashboard** shows today's total/count, low-stock items, and the last 30 days' best
   sellers.
5. **Sales History** lists every past sale with its line items.
6. The public site (`/`) needs no login — anyone can browse published products, filter
   by category, and open a product's detail page.

## Deploying it for real

- **Database**: already hosted (Supabase) — nothing to deploy.
- **Backend**: any Node host works — Render, Railway, Fly.io. Set `SUPABASE_URL`,
  `SUPABASE_ANON_KEY`, and `CLIENT_ORIGIN` (your deployed frontend's URL) as environment
  variables there.
- **Frontend**: build with `npm run build` inside `client/` and deploy the `dist/`
  folder to any static host (Netlify, Vercel, Cloudflare Pages, or your existing
  Namecheap domain via GitHub Pages, same pattern as your FFCC site) — just set
  `VITE_API_URL` to point at wherever the backend ends up.

## Extending later

Ideas that fit naturally on top of this foundation, if you want them:

- Receipt printing / PDF export for each sale.
- Multiple admin accounts with different permission levels (e.g. cashier vs. manager).
- Letting clients place orders online instead of just browsing (would need a cart +
  order table, similar shape to `sales`/`sale_items`).
