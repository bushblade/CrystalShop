# Plan B — Snipcart Integration & Stock Sync

Builds on Plan A (the `deliveryMethod` field must exist first). Uses the Netlify
development site as the test environment — no ngrok.

## Legend

- 🤖 Agent executes (code/CLI, autonomous)
- 👤 Human acts in a browser
- 🤖+👤 Agent prepares, human provides/confirms

## Context & decisions

- **Environment:** Netlify dev site `https://eclipsiacrystalsdevelopment.netlify.app/`
  (site id `479f5317-d2e8-474e-a3f2-223ec0cdcad8`), Sanity dataset `development`.
  No production CrystalShop site exists yet — going live is handled later.
- **Currency:** GBP only (`currency: "gbp"` in `window.SnipcartSettings` + dashboard regional).
- **Shipping:** UK-only, weight-tier placeholder rates in £ so checkout completes. Real
  rates are the owner's decision before go-live (flag in `docs/snipcart.md`).
- **Heavy items** (`deliveryMethod === 'arrange'`): buyable online with
  `data-item-shippable="false"` — when every cart item is non-shippable Snipcart skips the
  shipping step entirely and the buyer pays online, then contacts the site to arrange
  collection / owner delivery / own courier. A £0 "Collection" custom method is NOT used
  (it would let buyers of normal items dodge postage).
- **Mixed carts** (heavy + normal item): shipping step reappears; weight interplay is
  undocumented. Accepted for now, must be tested in test mode; shipping webhook
  (`shippingrates.fetch`) is the documented future fix.
- **Stock sync:** `order.completed` webhook → Netlify Function → Sanity patch, with a
  `snipcartOrder` document as the idempotency guard + order history. No customer PII in
  Sanity (Snipcart is the source of truth for customer data).
- **Refunds** (`order.refund.created`): deferred, noted in `docs/snipcart.md`.
- **Tax:** none configured (small artisan, likely below VAT threshold).
- **Mode gating:** only process webhooks whose `mode` matches `SNIPCART_EXPECTED_MODE`
  (`Test` on dev site) so test purchases only touch the development dataset.

## Steps

### B1. Install bootstrap — 🤖

File: `src/layouts/Layout.astro`

Replace the pinned `v3.2.0` script + CSS block (currently lines ~49-61) with the official
`window.SnipcartSettings` bootstrap:

```html
<script is:inline>
  window.SnipcartSettings = {
    publicApiKey: "YOUR_API_KEY",
    loadStrategy: "on-user-interaction",
    version: "3.9.x", // pin a recent stable
    currency: "gbp",
  };
  // ...the IIFE loader from https://docs.snipcart.com/v3/setup/installation
</script>
```

- Place directly after `<body>` opening.
- Keep gated on `snipcartApiKey` being set.
- Keep the two `<link rel="preconnect">` hints; drop the old stylesheet/script tags (the
  bootstrap injects CSS/JS and the `<div id="snipcart" hidden>` itself; this also fixes the
  latent `data-api-key`-on-script bug in the v3.2.0 bundle).

### B2. Buy button — 🤖

File: `src/pages/shop/product/[slug].astro`

Add `data-item-shippable="false"` to the `snipcart-add-item` button when
`product.deliveryMethod === 'arrange'`. Normal items keep the existing attributes (id,
name, price, url, image, description, weight in grams, max-quantity) unchanged.

### B3. Netlify env vars (dev site) — 🤖+👤

Set on `eclipsiacrystalsdevelopment`:

| Variable | Value | Scope | Secret |
| --- | --- | --- | --- |
| `PUBLIC_SNIPCART_API_KEY` | Snipcart Test public key | builds + runtime | no |
| `SNIPCART_SECRET_API_KEY` | Snipcart secret key | functions | yes |
| `SANITY_WRITE_TOKEN` | Sanity write token (sanity.io/manage → API) | functions | yes |
| `SNIPCART_EXPECTED_MODE` | `Test` | functions | no |

Agent sets via Netlify tooling once you provide the key values; or you paste them in the
Netlify UI. Redeploy after setting.

### B4. Snipcart dashboard (Test mode) — 👤, agent supplies exact values

1. Register account at app.snipcart.com (Test mode is default; free forever, no card).
2. **Domains & URLs:** default website domain `eclipsiacrystalsdevelopment.netlify.app`;
   allow `main--eclipsiacrystalsdevelopment.netlify.app` (branch deploys).
3. **Shipping:** enable shipping, add a UK-only custom shipping method with placeholder
   weight-tier rates in £ (e.g. 0–1000g £5, 1000–2500g £8, >2500g £12) so checkout
   completes. Flag to the owner that real rates must be set before go-live.
4. **Account → Users:** add your email (test-mode emails only reach listed addresses).

### B5. `snipcartOrder` schema type — 🤖

New file `src/schemaTypes/documents/snipcartOrder.ts`, registered in
`src/schemaTypes/index.ts`. Fields (no PII):

- `orderToken` (string, required)
- `mode` (string: Test/Live)
- `invoiceNumber` (string)
- `completedAt` (datetime)
- `grandTotal` (number)
- `currency` (string)
- `items` (array of `{ productId, productName, quantity, unitPrice }`)

Run `pnpm typegen` after registering.

### B6. Webhook function — 🤖

New file `netlify/functions/snipcart-webhook.mts` (default-handler shape):

```ts
export const config = { path: '/api/webhooks/snipcart', method: ['POST'] }
```

Logic:

1. Read `SNIPCART_SECRET_API_KEY`, `SANITY_WRITE_TOKEN`, `PUBLIC_SANITY_STUDIO_PROJECT_ID`,
   `PUBLIC_SANITY_STUDIO_DATASET`, `SNIPCART_EXPECTED_MODE` via `Netlify.env.get()`.
2. Verify `X-Snipcart-RequestToken` via
   `GET https://app.snipcart.com/api/requestvalidation/{token}` with the secret key;
   reject on 404 (tokens valid 1h, single-use).
3. Idempotency: `*[_type == "snipcartOrder" && orderToken == $token][0]` exists → respond
   200 "already processed", stop.
4. Mode gate: only proceed when `content.mode` matches `SNIPCART_EXPECTED_MODE`.
5. Apply atomically in one `client.transaction()`:
   - `create` the `snipcartOrder` doc
   - for each `content.items[]` whose `id` matches a product `_id`:
     `stockLevel = max(0, current - quantity)` (unique pieces → 0)
6. Always respond `200` + JSON; log failures.

Note: this is not a payment endpoint — no payment processing happens server-side.

### B7. Register webhook — 👤

In the Snipcart dashboard (Test environment), register `order.completed` →
`https://eclipsiacrystalsdevelopment.netlify.app/.netlify/functions/snipcart-webhook`
(agent gives the exact URL; deploy B6 first so the function is live).

### B8. Dev payment testing — 👤 + 🤖

1. 👤 Deploy the dev site; confirm the cart button renders.
2. 👤 Add a product to cart → Snipcart checkout → pay `4242 4242 4242 4242` (any expiry/CVV).
3. 👤 Confirm the test order appears in the dashboard (mode Test) and the confirmation
   email arrives at the listed address.
4. 🤖 Verify via GROQ: `snipcartOrder` doc created + `stockLevel` decremented in the
   `development` dataset.
5. 👤 Click **"Send this hook again"** on the webhook detail page; 🤖 confirms the
   idempotency guard prevents double-decrement.
6. 👤+🤖 Test an `arrange` (heavy) item alone — shipping step should be skipped; then test
   a mixed cart (heavy + normal) to observe the shipping-step behaviour; record findings
   for the potential future shipping webhook.

### B9. Docs — 🤖

- Create `docs/snipcart.md`: full cited findings — install snippet, attributes, weight
  shipping, order validation / JSON crawler, test mode (4242 card, emails, webhooks),
  going-live steps, pricing conflict ($20/mo floor live, free test), dev-site testing flow,
  webhook stock-sync design, mixed-cart caveat, deferred refunds.
- Update `AGENTS.md`: pricing reality, webhook function location, `SNIPCART_EXPECTED_MODE`
  pattern, dev-site testing flow, `deliveryMethod` behaviour.
- Update `README.md`: env-var table additions, webhook endpoint, Studio stock views.

### B10. Verify — 🤖

`pnpm lint`, `pnpm build`, `pnpm typegen` all pass.

## Out of scope (later)

- Production Netlify site + `DATASET=production` + Live key + `SNIPCART_EXPECTED_MODE=Live`
- Registering the second `order.completed` webhook in the Snipcart Live environment
- `order.refund.created` stock restoration
- Real shipping rates and taxes
- Shipping webhook for mixed-cart correctness
- Order-validation JSON crawler (`stock: 0`) if over-selling risk matters at scale
