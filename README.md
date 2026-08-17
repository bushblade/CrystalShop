# Eclipsia Crystals

A low-cost, low-maintenance e-commerce store for an artisan crystal seller. Managed by the owner via Sanity Studio, fast for shoppers (server-rendered Astro pages with client-side search/filtering), and hosted on Netlify at zero fixed monthly cost.

## Stack

- **Framework:** Astro (SSR) with React islands
- **CMS:** Embedded Sanity Studio at `/admin`
- **Deploy target:** Netlify
- **Package manager:** `pnpm`
- **Linter / formatter:** Biome

## Routes

| Route | Description |
| --- | --- |
| `/` | Home — up to 6 featured in-stock pieces, "Shop all" CTA |
| `/shop` | All in-stock products with client-side search, sort and pagination (`?q=&sort=&page=`) |
| `/shop/categories/[slug]` | Server-rendered list for one category |
| `/shop/product/[slug]` | Product detail — gallery, specs, Add to cart button (or "Sold out" badge) |
| `/about`, `/contact`, `/terms` | About & Terms render `siteSettings` portable text; Contact links to `siteSettings.contactEmail` (also in the footer) |
| `/admin` | Sanity Studio |

Many pieces are unique 1-of-1 items (`isUniquePiece`). When a piece sells out (`stockLevel === 0`) it stays visible on its product page with a "Sold out" badge, but is filtered out of `/shop` and category listings — no backorders.

## Payments & Checkout

Payments run on **Stripe Checkout** (GBP, UK-only shipping). Stripe is the source
of truth for orders and customer data; a minimal read-only `order` doc in Sanity
is an idempotency guard + sales log (no customer PII is ever stored).

Flow:

```
Cart (Zustand, localStorage) → POST /api/checkout → Stripe hosted Checkout
  → webhook /api/webhooks/stripe → order doc + stock decrement
```

- **`/api/checkout`** — `netlify/functions/create-checkout-session.mts`. Re-fetches
  price/stock/shipping from Sanity (never trusts browser-sent prices), rejects
  out-of-stock items (409), clamps quantities, and returns a Stripe Checkout URL.
- **`/api/webhooks/stripe`** — `netlify/functions/stripe-webhook.mts`. Verifies the
  Stripe signature, writes the `order` doc, and atomically decrements stock
  (`max(0, current - quantity)`) in one Sanity transaction. Idempotent — Stripe
  retries are at-least-once, and a duplicate delivery is ignored.
- **Webhook events subscribed:** `checkout.session.completed`,
  `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`.
  Only `paid` sessions are fulfilled (delayed methods like Bacs fire `completed`
  as `unpaid`, then succeed via `async_payment_succeeded`).
- **Livemode gating:** the webhook only processes events whose `livemode` matches
  `STRIPE_EXPECTED_MODE` — test keys write to the `development` dataset, live keys
  to `production`. Misconfiguring this means orders silently never land.
- **Shipping:** weight-band tiers from `siteSettings.shippingRates`. A shipping
  price is only charged when the whole cart is `post` items and the total weight
  fits a tier (shared `getCartShipping` in `src/lib/shipping.ts` — client and
  server use the same rule). Any `arrange` item, an overweight total, or unset
  rates means the whole order is arranged with the owner — no shipping step at
  checkout, buyer pays the item total online and the owner contacts them.

### Testing the webhook locally

```bash
# Terminal 1 — forward Stripe events to your local function
stripe listen --forward-to localhost:8888/api/webhooks/stripe

# Copy the printed whsec_... value into .env as STRIPE_WEBHOOK_SECRET
# (and keep STRIPE_EXPECTED_MODE=test), then:
pnpm dev:netlify
```

Then add an item, check out, and pay with test card `4242 4242 4242 4242`. The
CLI forwards the event to `localhost:8888/api/webhooks/stripe`, which creates the
`order` doc and decrements stock. Resend an event to test idempotency
(`stripe events resend <event_id>` or the Stripe dashboard Workbench).

## Commands

| Command | Action |
| --- | --- |
| `pnpm dev` | Start the local dev server |
| `pnpm build` | Build the production site to `dist/` |
| `pnpm preview` | Preview the build locally |
| `pnpm lint` | Run Biome checks |
| `pnpm typegen` | Regenerate `sanity.types.ts` after schema changes |
| `pnpm seed:dummy` | Create ~60 dummy products in the local dataset (Amethyst/Agate/Citrine) to test catalog pagination, search and sorting |
| `pnpm seed:dummy:delete` | Remove all dummy products created by the seed script |
| `pnpm seed:site-settings` | Upsert the `siteSettings` singleton (About/Terms portable text + contact email) — useful as default content for production |
| `pnpm seed:site-settings:delete` | Delete the `siteSettings` singleton |

## Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `PUBLIC_SANITY_STUDIO_PROJECT_ID` | Yes | Sanity project ID |
| `PUBLIC_SANITY_STUDIO_DATASET` | Yes | Sanity dataset (`development` locally, `production` on Netlify). Must match the livemode gate: `test` keys → `development`, `live` keys → `production` |
| `SANITY_WRITE_TOKEN` | Yes (functions) | Sanity writer token for `pnpm seed:dummy` **and** the webhook (writes `order` docs + decrements stock) |
| `STRIPE_RESTRICTED_KEY` | Yes (functions) | Restricted Stripe key (`rk_...`). Server-only — never `PUBLIC_`-prefixed. Used by `/api/checkout` and to verify webhook signatures |
| `STRIPE_PUBLISHABLE_KEY` | No (frontend) | Stripe publishable key (`pk_...`) — safe to expose to the client; used by Stripe.js |
| `STRIPE_WEBHOOK_SECRET` | Yes (webhook) | Webhook signing secret (`whsec_...`). Local testing: the value printed by `stripe listen` (see above). Production: set when the dashboard webhook endpoint is registered |
| `STRIPE_EXPECTED_MODE` | Yes (webhook) | `test` or `live`. Gates which Stripe events the webhook processes — must match the dataset |

See `.env.example` for a template.
