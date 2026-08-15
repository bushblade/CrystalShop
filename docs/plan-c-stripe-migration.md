# Plan C — Stripe Checkout Migration

Replaces Plan B (Snipcart). Move Snipcart out first, then build a Stripe Checkout
path in small, mergeable stages. Each stage is small enough for one agent session
without bloating its context window.

## Legend

- 🤖 Agent executes (code/CLI, autonomous)
- 👤 Human acts in a browser (Stripe dashboard, Netlify env, testing)
- 🤖+👤 Agent prepares, human provides/confirms

## Tracking mechanism

- Each stage has a checkbox + a git branch. **Tick the checkbox only when the
  human has reviewed the changes and told the agent to mark the stage complete.**
  The box is ticked on the stage's current feature/working branch; merging stays a
  separate human step.
- A fresh agent starts by reading the "Context & locked decisions" block below plus
  the single stage it's assigned — nothing else.
- Status key: `- [ ]` todo · `- [x]` done. Mark in-progress stages by leaving the
  box unchecked and noting `(in progress)` on the line.

## Context & locked decisions (read once, don't revisit)

- **Goal:** Replace Snipcart entirely with **Stripe Checkout**. Stripe is the
  gateway itself (Snipcart was a checkout layer on top of a gateway), so this
  removes the $20/mo fee (or 2% <$1k/mo). Stripe UK: £0/mo, 1.5% + 20p per card.
  Apple Pay / Google Pay / Stripe Link are included automatically.
- **Currency / region:** GBP, UK-only (`shipping_address_collection.allowed_countries = ["GB"]`).
- **Cart:** client-side, localStorage-backed, **add-to-cart only on the PDP**
  (matches today's behaviour — no add buttons on listing cards).
- **Shipping:** computed from `shippingRates` (weight-band tiers
  `{ name, maxWeightGrams, price }`, top band open-ended) stored on the
  `siteSettings` singleton — one settings doc, not a separate singleton.
  Postage is calculated on **shippable items only**
  (`deliveryMethod === 'post'`). Items with `deliveryMethod === 'arrange'` are
  heavy → buyer pays online, then arranges collection/courier (the PDP already
  shows a "Collection or local delivery — contact us" banner for these).
- **Order recording:** Stripe is the source of truth for orders and customer
  data. A minimal `order` doc in Sanity is only an **idempotency guard + sales
  log** (no PII: no names, emails, or addresses). Stripe auto-emails the buyer's
  receipt; the owner dispatch email is deferred (provider TBD).
- **Server trust:** Netlify Functions re-fetch price/stock/shipping from Sanity.
  **Never trust browser-sent prices.**
- **API keys:** Use **restricted API keys (RAK, `rk_`)** over secret keys (`sk_`)
  where possible — least privilege, one RAK per use. Secret keys must **not** be
  `PUBLIC_`-prefixed (Astro only exposes `PUBLIC_*` to the client; keep `STRIPE_*`
  un-prefixed so they stay server-only). Separate keys per environment.
- **API version:** Pin the `stripe` SDK (`^22`) and set
  `apiVersion: '2026-07-29.dahlia'` (latest). Instantiate `new Stripe(key, opts)`
  and call methods on the instance — never the deprecated global
  `stripe.api_key` pattern.
- **Tax:** do **not** enable `automatic_tax` — no active VAT registration. Leaving
  it on without a registration silently collects no tax while the owner believes
  it's on.
- **Dynamic payment methods:** never pass `payment_method_types` — omitting it
  auto-enables Apple Pay / Google Pay / Link / eligible methods.
- **Test mode:** Stripe test keys + test card `4242 4242 4242 4242`; local webhook
  testing via Stripe CLI (`stripe listen --forward-to localhost:8888/api/webhooks/stripe`).
  Webhook must gate on `event.livemode` so test purchases only touch the matching
  dataset (mirrors the old `SNIPCART_EXPECTED_MODE` pattern).

## Stage table

| # | Stage | Branch | Status |
|---|---|---|---|
| 1 | Remove Snipcart | `feat/remove-snipcart` | - [x] |
| 2 | Deps + env scaffolding | `feat/stripe-deps-env` | - [x] |
| 3 | Sanity models (shippingRates on siteSettings + order) | `feat/stripe-sanity-models` | - [x] |
| 4 | Shipping calculator lib | `feat/shipping-calculator` | - [x] |
| 5 | Client cart store | `feat/cart-store` | - [ ] |
| 6 | Cart UI (header button + drawer) | `feat/cart-ui` | - [ ] |
| 7 | PDP add-to-cart + shipping estimate | `feat/pdp-add-to-cart` | - [ ] |
| 8 | Checkout session function | `feat/create-checkout-session` | - [ ] |
| 9 | Webhook function (stock + idempotency) | `feat/stripe-webhook` | - [ ] |
| 10 | Success/cancel pages + Delivery section | `feat/checkout-pages` | - [ ] |
| 11 | Verify, test, docs | `chore/stripe-verify` | - [ ] |

**Dependencies:** `1 → 2` · `2 → 3,8,9` · `3 → 4,8,9` · `4 → 7,8` · `5 → 6,7` · `6 → 7` · `8,9 → 10` · `10 → 11`

**Parallelisable:** after Stage 3, the UI track (`4 → 5 → 6 → 7`) and the backend
track (`8`, `9`) are independent.

---

## Stage 1 — Remove Snipcart · `feat/remove-snipcart` · - [x]

Strip Snipcart before building anything new so there's never a dual checkout path.

Cleaning only — no placeholder buttons, no new visual elements. The PDP and header
keep their current look; only Snipcart wiring is removed.

**Files:**
- `src/layouts/Layout.astro` — delete the Snipcart bootstrap `<script>`/CSS block
  (currently ~lines 49-61), the `<link rel="preconnect">` hints, and the
  `snipcartApiKey` read. Keep the header Cart button, rendered unconditionally as
  "Cart 0" — drop the `snipcart-checkout` class and the `snipcart-items-count`
  span class.
- `src/pages/shop/product/[slug].astro` — keep the "Add to cart" button; remove
  the `snipcart-add-item` class and all `data-item-*` attributes, plus the
  `productUrl` / `heroImage` / `imageUrl` that only fed those attributes. Sold-out
  badge logic unchanged. No placeholder.
- `.env.example` — remove `PUBLIC_SNIPCART_API_KEY` and the Snipcart secret key
  comment.
- `README.md` / `AGENTS.md` — remove Snipcart references (the Payments & Cart
  stack lines, PDP "Snipcart buy button" wording, the `PUBLIC_SNIPCART_API_KEY`
  env row, and the weight/shipping phrasing). Stage 11 still adds the full Stripe
  documentation.

**Done when:** `rg snipcart` returns nothing in code, config, or `.env.example`
(README.md clean; only this plan and AGENTS.md's migration-context note still
mention it); the PDP still shows "Add to cart" and the header still shows "Cart"
with no Snipcart classes or attributes; gallery images fade in with no browser
console errors.

---

## Stage 2 — Deps + env scaffolding · `feat/stripe-deps-env` · - [x]

**Files:**
- `package.json` — add `stripe` `^22` (dependency) and `@netlify/functions` (devDependency).
- `.env.example` — add and comment: `STRIPE_RESTRICTED_KEY`, `STRIPE_PUBLISHABLE_KEY`,
  `STRIPE_WEBHOOK_SECRET`. Confirm `PUBLIC_SANITY_STUDIO_PROJECT_ID`,
  `PUBLIC_SANITY_STUDIO_DATASET`, and `SANITY_WRITE_TOKEN` are documented as
  required by the Netlify functions.
- **Keys:** use **restricted API keys (RAK, `rk_`)**, not full secret keys. Create
  two test-mode RAKs scoped to `checkout.sessions` read + write only (Stage 8) and
  `events` read (Stage 9). Keep them out of any `PUBLIC_`-prefixed var so they never
  reach the client.
- Netlify env (👤): set the Stripe keys on the dev site. Test keys only for now.

**Notes (stage 2 implementation):** Keys come from the isolated **"Crystal Shop
Dev" Stripe Sandbox**. Deviation from the locked "two scoped RAKs" decision: the
sandbox RAK was created with broader access (verified: answers 200 on `balance` /
`customers` too, not just `checkout.sessions` + `events`) — accepted for the dev
site since the sandbox is throwaway. Create properly-scoped `rk_` keys before
production go-live. `STRIPE_WEBHOOK_SECRET` is not set yet — the `whsec_` value
only exists once the webhook endpoint is registered (Stage 9).

**Done when:** `pnpm build` passes with the new deps; env vars documented.

---

## Stage 3 — Sanity models · `feat/stripe-sanity-models` · - [x]

**Decision (review):** shipping rates merge into the existing `siteSettings`
singleton as a `shippingRates` field — no separate `shippingSettings` doc, reuses
the pinned singleton + seed plumbing. Orders are webhook-written and read-only in
Studio (all fields `readOnly: true` — Studio-only guard; the API write token is
unaffected).

**Files:**
- `src/schemaTypes/documents/siteSettings.ts` — add `shippingRates` (array,
  ordered) of `{ name (string), maxWeightGrams (number, nullable = open top band),
  price (number, £) }`. Helpful descriptions for the non-technical owner (e.g.
  "Standard", "0–1000g", "£4.50"). Custom validation: at most one open-ended band
  and it must be last.
- `src/schemaTypes/documents/order.ts` — minimal `order` doc, **no PII**, all
  fields `readOnly: true`:
  - `sessionId` (string, required, unique — custom async validator mirroring the
    slug pattern in `product.ts`; Sanity has no native `unique()`. Real
    enforcement is the Stage 9 webhook idempotency check)
  - `paymentIntentId` (string — the `pi_...`; cross-references refunds. Single id
    per session is accepted: `mode: 'payment'` means multi-intent sessions are
    rare and only matter if a refund ever arrives for a non-stored intent)
  - `livemode` (boolean)
  - `total` (number), `currency` (string)
  - `items` (array of `orderItem`: `{ productId, productName, quantity, unitPrice }`)
  - `completedAt` (datetime)
- `src/schemaTypes/index.ts` — register `order`.
- `src/structure/index.ts` — pin a read-only **Orders** `documentList`
  (`schemaType: 'order'`, `completedAt desc`, `canHandleIntent` allows `edit`
  only so the read-only form opens but no create button).
- `scripts/seed-site-settings.mjs` — seed `shippingRates` with placeholder tiers
  (owner confirms real UK rates before go-live).
- Run `pnpm typegen`.

**Done when:** `pnpm typegen` passes; `schema.json` lists `order`;
`sanity.types.ts` `SiteSettings` includes `shippingRates`; Orders list in Studio
is read-only with no create button.

---

## Stage 4 — Shipping calculator · `feat/shipping-calculator` · - [x]

**Files:**
- `src/lib/shipping.ts` — pure, no I/O:
  - `pickShippingRate(totalWeightGrams, rates)` → matching tier object or `null`.
    Match the first tier where `totalWeightGrams <= maxWeightGrams`; the last tier
    with a `null` maxWeight is the catch-all.
  - `totalShippableWeight(items)` → sum of `weightInGrams` for items whose
    `deliveryMethod === 'post'` (heavy `arrange` items excluded).
- Reuse `formatPrice` from `src/lib/format.ts` where display is needed.

**Done when:** builds; boundary weights (exactly at a tier's max, above the last
tier, zero weight) return the expected tier.

---

## Stage 5 — Client cart store · `feat/cart-store` · - [ ]

**Files:**
- `src/lib/cart.ts` — localStorage-backed store, framework-agnostic:
  - `CartItem = { id, name, price, weightInGrams, image, deliveryMethod, quantity }`
  - `add(item)`, `remove(id)`, `setQuantity(id, qty)`, `clear()`, `subscribe(fn)`
  - Persist to `localStorage`; load on init; emit changes to subscribers
    (used by the React islands).
  - Enforce `quantity <= stockLevel` and `maxQuantity 1` for `isUniquePiece` at the
    call site (the PDP passes limits in).

**Done when:** add/remove/quantity round-trip through localStorage and subscribers
fire on change.

---

## Stage 6 — Cart UI · `feat/cart-ui` · - [ ]

**Files:**
- `src/components/CartDrawer.tsx` — React island (`client:load` in `Layout.astro`):
  - Header cart button with live count (subscribes to Stage 5 store).
  - Drawer listing items, quantity steppers, remove buttons.
  - Totals: item subtotal + shipping estimate (Stage 4 against the
    `siteSettings.shippingRates` — fetch them in `Layout.astro` server-side and
    pass as props).
  - Heavy-item notice when the cart contains any `deliveryMethod === 'arrange'` item:
    "Contains a piece too heavy for standard postage — we'll contact you to arrange
    collection or courier."
  - **Checkout** button that POSTs the cart to `/api/checkout` (Stage 8) and
    redirects to the returned `url`. Stub the fetch until Stage 8 lands.
- `src/layouts/Layout.astro` — mount the island in the header.

**Done when:** drawer opens, reflects store state, count updates, heavy-item notice
shows for mixed carts.

---

## Stage 7 — PDP add-to-cart + shipping estimate · `feat/pdp-add-to-cart` · - [ ]

**Files:**
- `src/pages/shop/product/[slug].astro` — wire the Stage 1 "Add to cart" button to
  the Stage 5 store (pass `maxQuantity`: `1` for unique pieces, else `stockLevel`).
  - Keep the sold-out badge (`stockLevel === 0`).
  - Show **"Shipping from £X"** computed via Stage 4 for this item's weight when
    `deliveryMethod === 'post'`; the existing heavy-item "contact us" banner stays
    for `arrange` items.

**Done when:** add-to-cart from the PDP updates the header count; estimate and
heavy-item note render.

---

## Stage 8 — Checkout session function · `feat/create-checkout-session` · - [ ]

**Files:**
- `netlify/functions/create-checkout-session.mts` — `config = { path: '/api/checkout', method: ['POST'] }`.
  - Read env via `Netlify.env.get()`: `STRIPE_RESTRICTED_KEY`, Sanity project/dataset, `SANITY_WRITE_TOKEN`.
  - Body: `{ items: [{ id, quantity }] }`.
  - Server-side: query Sanity for each item's `price`, `stockLevel`,
    `weightInGrams`, `deliveryMethod`, `name`, first image. **Never use client prices.**
  - Reject the whole request (4xx) if any item is out of stock — sold-out 1-of-1
    guard.
  - Shipping: `totalShippableWeight()` → `pickShippingRate()` → tier price.
    - Has shippable items: pass `shipping_options` with that rate + collect `["GB"]` addresses.
    - Only `arrange` items: omit shipping options and address collection (matches
      Snipcart's "skip shipping" behaviour).
  - Build Checkout Session: `mode: 'payment'`, `currency: 'gbp'`,
    `line_items` with `price_data` (unit amount in pence = `round(price * 100)`),
    `metadata` with the product ids/quantities for the webhook,
    `success_url` / `cancel_url` pointing at Stage 10's pages.
  - `apiVersion: '2026-07-29.dahlia'` on the `Stripe` client instance.
  - Omit `payment_method_types` entirely (dynamic payment methods — Apple Pay /
    Google Pay / Link enabled automatically). Do **not** set `automatic_tax`.
  - Pass `integration_identifier` (e.g. `"crystalshop-" + randomSuffix(8)`) to tag
    this checkout flow in the Dashboard.
  - Return `{ url }`.

**Done when:** with Stripe test keys, the function returns a session URL that opens
Stripe's hosted checkout with correct line items and shipping.

---

## Stage 9 — Webhook function · `feat/stripe-webhook` · - [ ]

**Files:**
- `netlify/functions/stripe-webhook.mts` — `config = { path: '/api/webhooks/stripe', method: ['POST'] }`.
  - Verify the `STRIPE_SIGNATURE` header with `STRIPE_WEBHOOK_SECRET` before doing
    anything else. Defense in depth: allowlist Stripe's webhook IPs on the endpoint.
  - Read env via `Netlify.env.get()`: `STRIPE_RESTRICTED_KEY`, `STRIPE_WEBHOOK_SECRET`,
    Sanity project/dataset, `SANITY_WRITE_TOKEN`.
  - Fulfill on **both** `checkout.session.completed` **and**
    `checkout.session.async_payment_succeeded` (delayed-notification methods like
    Bacs fire `completed` while `payment_status === 'unpaid'`, then succeed later):
    1. **Livemode gate:** only process events whose `livemode` matches the dataset
       the function writes to (mirror the old `SNIPCART_EXPECTED_MODE` pattern).
    2. **Payment gate:** on `checkout.session.completed`, fulfill only when the
       session's `payment_status === 'paid'`; skip `unpaid`. On
       `checkout.session.async_payment_succeeded`, fulfill.
    3. **Idempotency:** if an `order` doc with this `sessionId` exists → 200, stop
       (Stripe retries are at-least-once; never decrement twice).
    4. Create the `order` doc (no PII). Set `sessionId` from the event, and
       `paymentIntentId` from `event.data.object.payment_intent` when present
       (don't fail if absent — rare multi-intent sessions are accepted).
    5. Atomically decrement `stockLevel` for each item via a single Sanity
       transaction: `stockLevel = max(0, current - quantity)`.
  - Handle `checkout.session.async_payment_failed`: log only — no stock was
    reserved, so nothing to release.
  - Owner dispatch email: leave a clearly-marked stub (deferred, provider TBD).
  - Always return 200 with a JSON body; log failures.
- Register the webhook in the Stripe dashboard (👤): test mode →
  `https://<dev-site>/api/webhooks/stripe`, events `checkout.session.completed`,
  `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`.

**Done when:** a test purchase creates one `order` doc and decrements stock exactly
once; re-sending the same event (or Stripe retry) is ignored; an unpaid/completed
event does not decrement.

---

## Stage 10 — Success/cancel pages + Delivery section · `feat/checkout-pages` · - [ ]

**Files:**
- `src/pages/shop/checkout/success.astro` — confirmation copy. Note the stock update
  happens via webhook and can lag the redirect; don't display stock-sensitive claims.
- `src/pages/shop/checkout/cancel.astro` — "payment didn't complete, cart is safe" copy.
- **Delivery section** — new page/section (decided: PDP + a Delivery section) listing
  the `siteSettings.shippingRates` tiers (name, weight band, price) and the heavy-item policy.
  Fetch rates from Sanity server-side. Link from the PDP and footer.

**Done when:** pages render with real tier data from Sanity; success/cancel reachable
from a completed/cancelled checkout.

---

## Stage 11 — Verify, test, docs · `chore/stripe-verify` · - [ ]

- `pnpm lint`, `pnpm build`, `pnpm typegen` all pass.
- End-to-end test (👤): add an item → checkout with `4242 4242 4242 4242` →
  confirm success page, buyer receipt email, webhook decremented stock once, `order`
  doc created. Repeat for an `arrange`-only cart (no shipping step) and a mixed cart
  (heavy-item notice + shippable-only postage).
- Update `AGENTS.md` (Stripe architecture, function locations, `/api/checkout` +
  `/api/webhooks/stripe`, livemode gating) and `README.md` (env-var table, endpoints).
- Tick every checkbox in this plan.

**Done when:** full test purchase works end-to-end, docs are current, all boxes ticked.

---

## Deferred (do not start without owner input)

- **Owner dispatch email** — provider TBD (Resend free tier / Postmark). Webhook stub
  in Stage 9 awaits this.
- **Real UK postage rate values** — owner must decide; `siteSettings.shippingRates`
  is seeded with placeholders until then.
- **Apple Pay domain registration** — one-time Stripe dashboard step at go-live.
- **Refunds restoring stock** (`charge.refunded` webhook) — match the refund's
  `charge.payment_intent` against the order's `paymentIntentId` to find the sale.
- **VAT / `automatic_tax`** — leave `automatic_tax` off until/unless the owner
  registers for VAT; the most common Stripe Tax mistake is enabling it without a
  registration and collecting nothing.
- **Production go-live** — production Netlify site + live Stripe keys (RAKs) +
  `livemode` gate on the production dataset.
