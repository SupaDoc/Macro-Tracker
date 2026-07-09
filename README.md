# 22nd Century Caveman (22CC) — V0.1

Single-file React app (no build step) + Supabase (Postgres/Auth/RLS) + Netlify
Functions (USDA FoodData Central proxy).

V0.1 scope: auth, Block builder (USDA-backed ingredients), Block list, Meal
assembly (named sets of Blocks with per-Block serving counts), and a vertical
"Today" totem view with live macro totals walking the full Block→ingredient
chain. Week plan building, recipe import, The Arena, and The Mirror are not
in this cut.

## 1. Push to GitHub

```
git init
git add .
git commit -m "22CC V0.1 skeleton"
git branch -M main
git remote add origin <your-repo-url>
git push -u origin main
```

All further feature work should land on `feature/<name>` branches with a
self-PR review before merging to `main`, per the existing workflow.

## 2. Apply the Supabase schema

In the Supabase dashboard: SQL Editor → paste the contents of
`supabase/schema.sql` → Run. It's idempotent (safe to re-run).

This creates `blocks`, `meal_plans` (used for Meal/Day/Week composition in
later phases), and `log_entries`, all with RLS scoped to `auth.uid()`.

Confirm email auth (magic link) is enabled: Authentication → Providers →
Email, and that Authentication → URL Configuration → Site URL matches your
Netlify domain (needed for the magic-link redirect).

## 3. Fill in client config

```
cp config.example.js config.js
```

Edit `config.js` with your Supabase project URL and **anon/publishable**
key (Project Settings → API). This key is safe to ship client-side — RLS is
what actually protects the data. `config.js` is gitignored.

## 4. Connect Netlify

Link the repo as a Netlify site (New site → Import from Git). `netlify.toml`
already points Netlify at `netlify/functions` and serves the repo root as a
static site — no build command needed.

Set one environment variable in Netlify (Site configuration → Environment
variables):

```
USDA_API_KEY = <your USDA FoodData Central API key>
```

This is only read server-side by the two functions in `netlify/functions/`
(`usda-search.js`, `usda-food.js`) — it's never exposed to the browser.

Deploy. Netlify will serve `index.html` at the root and the two functions at
`/.netlify/functions/usda-search` and `/.netlify/functions/usda-food`.

## 5. Smoke test

1. Open the deployed URL, enter your email, click the magic link.
2. Blocks tab → New Block → search an ingredient (e.g. "chicken breast raw")
   → pick a result → enter grams → Add to Block → Save.
3. Meals tab → New Meal → add two Blocks with serving counts → Save.
4. Today tab → Log a Meal → confirm the macro bar updates (computed by
   walking Meal → Block → ingredient, never stored as a total).
5. Refresh the page — log, Meal list, and Block list persist via Supabase,
   gated by RLS to your `auth.uid()`.

## Notes on what's deliberately simplified in V0.1

- **`meal_plans` is a single generic table** (`type`: `meal`/`day`/`week`,
  `items`: jsonb list of `{ref_type, ref_id, servings}`) rather than three
  separate tables. V0.1 uses `type='meal'` for Meal assembly; Day/Week Plan
  UI is deferred. `log_entries` supports `ref_type='block'` (direct Block
  logging) and `ref_type='meal_plan'` (Meal logging); day totals walk both.
- **Macros are never stored pre-summed.** Each ingredient row on a Block
  already carries its scaled-to-quantity macros; all totals (Block, day) are
  computed client-side at render time by summing and multiplying by
  servings. Don't add a "total_calories" column to `blocks` later without
  revisiting this invariant.
- **USDA macro extraction** reads nutrient numbers 208/203/204/205/291
  (calories/protein/fat/carbs/fiber) from the full food-detail endpoint and
  assumes they're per-100g, which holds for Foundation, SR Legacy, and
  Branded data types. Branded foods also return `labelNutrients` in the
  proxy response if you want to prefer label-declared serving values later.
- **`log_entries.client_key`** is a client-generated UUID with a unique
  constraint on `(user_id, client_key)` — a retried insert (flaky network,
  double-tap) will fail the unique constraint instead of duplicating the log
  line. The client currently generates a fresh key per call and doesn't yet
  retry on conflict; that's the next hardening step if it matters in
  practice with a 5-10 person user base.
- **Timezone:** "today" is computed from the browser's local date, not UTC,
  and passed explicitly on insert/query — don't rely on `log_entries.log_date`'s
  DB-side default, which is UTC.

## What's next

- Day Plan / Week Plan builder UI on top of `meal_plans`
- Recipe import (share-target manifest entry → Netlify Function → Claude API
  parses caption text into a Block)
- The Arena, The Mirror
- Per-user feature flags
