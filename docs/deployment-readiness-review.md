# Deployment Readiness Review

## Scope

This review assesses whether the current CrystalShop implementation is robust
enough to deploy for a small independent crystal trader with relatively low
sales volume.

The current development setup uses:

- A Sanity development dataset.
- Stripe test or sandbox credentials.
- Netlify Functions for checkout and webhook processing.
- Stripe Checkout as the hosted payment experience.
- Sanity as the product catalogue and minimal sales log.

This review focuses primarily on code robustness, especially the checkout and
webhook path. It does not treat production data population, Stripe account
handover, or content preparation as code defects, although those operational
steps are included in the go-live checklist.

## Executive Verdict

The checkout architecture is well designed and close to production-ready. It
already includes several important safeguards that are often missing from
small e-commerce implementations:

- Prices and stock are re-fetched server-side rather than trusted from the
  browser.
- Shipping is calculated from the same shared logic on the client and server.
- Webhook signatures are verified before processing.
- Test and live Stripe events are gated against the configured dataset mode.
- Paid and delayed-payment events are handled separately.
- Webhook retries are made idempotent.
- Stock decrement and order creation happen in one Sanity transaction.
- The checkout and webhook functions have meaningful automated tests.

There was one real production bug in the checkout metadata path. It is now fixed
in the implementation on this branch:

> The checkout snapshot is now split across bounded `items0`, `items1`, … Stripe
> metadata values, and the webhook reassembles it. Existing sessions using the
> old single `items` value remain supported.

There is also an inherent overselling window for unique pieces because stock is
not reserved when a Checkout Session is created. For a low-volume trader this
is an acceptable trade-off if understood and operationally managed, but it is
worth shrinking with a short session expiry and owner notifications.

The remaining work is mostly low-cost hardening and production configuration.

## Findings

### Finding 1: Cart metadata can exceed Stripe's 500-character limit [Resolved]

**Severity:** High. Resolved in the current implementation; verify in deployment.

**Location:** `netlify/functions/create-checkout-session.mts:132-141`

The original checkout function stored the entire cart in one metadata value:

```ts
metadata: {
  items: JSON.stringify(
    items.map((item) => ({
      id: item.id,
      name: item.name,
      unitPrice: item.price,
      quantity: item.quantity,
    })),
  ),
},
```

Stripe limits metadata values to 500 characters. A typical Sanity product ID
is around 36 characters. Once the JSON syntax, product name, price, quantity,
and array punctuation are included, one item can occupy roughly 100 to 130
characters. Long product names make this worse.

As a result, a cart with enough products or long names could exceed the limit.
Stripe would then reject the Checkout Session creation request. The customer
would see the generic checkout error and the sale would be lost.

This is particularly relevant here because a customer buying several smaller
crystals or tumblestones is a normal use case, even if most orders contain only
one item.

#### Implemented fix

The checkout function now splits the serialized snapshot into sequential
`items0`, `items1`, and so on values, each conservatively below 500 characters.
The webhook sorts and reassembles contiguous chunks before applying the existing
validation. It also accepts the old `items` value so sessions created before the
deployment remain fulfillable. If the snapshot would require more metadata keys
than Stripe allows, checkout returns a clear client error instead of calling
Stripe.

This preserves the current snapshot:

- The product name recorded in the order remains the name at checkout time.
- The unit price recorded in the order remains the price paid.
- The webhook does not need to re-fetch product names or prices after payment.
- No pending order document or additional database lifecycle is required.

Tests now cover a deliberately large cart, assert that every metadata value is
below Stripe's limit, verify webhook reassembly, and reject incomplete chunk
sequences.

#### Alternatives considered

1. Store compact metadata such as `{ i, q }` and re-fetch names and prices in
   the webhook. This reduces the size substantially, but product prices or
   names could change between checkout creation and webhook processing.
2. Create a pending order document at checkout creation and store only its ID in
   Stripe metadata. This is more extensible but adds cleanup, abandoned-order,
   and state-management concerns that are unnecessary for this shop.
3. Split the current snapshot across multiple metadata keys. This is the
   implemented approach for the current architecture.

### Finding 2: Unique pieces are not reserved during checkout

**Severity:** Medium. Strongly recommended mitigation; acceptable trade-off for
low sales volume.

**Locations:**

- `netlify/functions/create-checkout-session.mts:95-109`
- `netlify/functions/stripe-webhook.mts:154-165`

The checkout function verifies current stock and creates a Stripe Checkout
Session, but it does not reserve the stock. Stock is only decremented after a
successful payment webhook.

This creates the following possible sequence:

1. Customer A starts checkout for the last unique piece.
2. Customer B starts checkout for the same piece before A pays.
3. Both customers pay successfully.
4. Both webhooks create orders.
5. Stock is clamped to zero, but the product has been sold twice.

The current `Math.max(0, current - requestedQuantity)` logic prevents negative
stock, but it cannot prevent both orders from being recorded. The second
customer would need a manual refund or an alternative fulfilment arrangement.

For a low-volume hobby trader, concurrent purchases of the same unique item are
unlikely. This does not justify building a complex reservation system, but the
risk should be understood.

#### Recommended mitigation

The checkout function now sets an explicit 30-minute `expires_at` on Checkout
Sessions, which is Stripe's minimum allowed expiry. This reduces the default
abandoned-session window and makes stale checkout links less problematic.

This does not reserve stock or eliminate the race between two active sessions,
but it limits how long an abandoned session can later be completed with a stale
cart snapshot.

The owner should also have a reliable sale notification so any oversell is
noticed quickly.

### Finding 3: Owner dispatch notification is still a TODO

**Severity:** Medium operational gap. Not necessarily a launch blocker if Stripe
notifications are verified.

**Location:** `netlify/functions/stripe-webhook.mts:210-210`

The webhook currently records the order and logs a message, but owner dispatch
notification is still deferred:

```ts
// TODO(owner dispatch): notify the owner of this sale — provider TBD
```

At present, the owner relies on Stripe's own account payment notifications and
the Stripe Dashboard. This can be sufficient for a small trader, but it must be
verified before launch.

This matters especially for orders containing `arrange` items. The buyer pays
online, but the owner must contact them to arrange collection or courier
delivery. The owner needs to know about the order promptly.

#### Minimum launch approach

Before launch, verify in the client's Stripe Dashboard that:

- Successful payment notifications are enabled for the account owner.
- Customer receipt emails are enabled.
- The owner knows where to view completed payments and customer contact details
  in Stripe.

A dedicated email from the webhook using a provider such as Resend or Postmark
would be a useful follow-up, but it is not essential for this low-volume
deployment if Stripe's notifications are reliable and the owner understands the
workflow.

### Finding 4: Add a defensive guard for a missing Checkout URL

**Severity:** Low. Cheap hardening.

**Locations:**

- `netlify/functions/create-checkout-session.mts:166-167`
- `src/hooks/useCartDrawer.ts:186-188`

The function returns `session.url` directly:

```ts
return jsonResponse(200, { url: session.url })
```

Stripe's type permits `url` to be `null`. For a normal hosted payment session
it should be present, but the endpoint should not return a successful response
that the browser cannot use.

The function should return a server error if the URL is absent. The client can
also validate that the response contains a non-empty string before calling
`window.location.assign()`.

### Finding 5: Reject oversized carts cleanly

**Severity:** Low. Cheap hardening.

**Location:** `netlify/functions/create-checkout-session.mts:31-42`

`parseItems()` validates the shape of each item, but there is no explicit limit
on the number of entries. Stripe Checkout has a maximum number of line items.
An unusually large or deliberately constructed request would currently reach
Stripe and produce a generic 500 response rather than a useful 400 response.

The endpoint should impose a reasonable maximum number of distinct products and
possibly a maximum quantity per product. This is useful for:

- Returning a clear client error for invalid requests.
- Avoiding unnecessarily large Sanity queries.
- Avoiding oversized Stripe metadata.
- Providing minor protection against endpoint abuse.

The server must continue to treat Sanity stock as authoritative; client-side
limits are not sufficient on their own.

### Finding 6: Persisted cart prices can become stale

**Severity:** Low UX inconsistency. Not a payment-security issue.

**Locations:**

- `src/lib/cart.ts:9-18`
- `src/lib/cartFreshness.ts:17-47`
- `src/queries/sanity.ts:97-99`

Cart lines persist the product name and price in local storage. The freshness
check updates stock availability but does not update the stored name or price.

If the owner changes a product price after a customer added it to their cart:

- The cart drawer can show the old price.
- The server-side checkout function correctly charges the current Sanity price.
- The customer can therefore see a different total in the cart from the total in
  Stripe Checkout.

The server-side price is correctly authoritative, so this is not a way for a
customer to underpay. It is nevertheless confusing and could lead to support
issues.

#### Recommended improvement

Include the current `name` and `price` in the availability query and update the
persisted cart line during the freshness check. This keeps the cart display
aligned with what checkout will charge.

### Finding 7: Refunds do not automatically restore stock

**Severity:** Low for this business model; operational limitation.

**Location:** `netlify/functions/stripe-webhook.mts`

The webhook handles successful and failed Checkout Session events, but does not
handle refund events. A refunded order therefore remains recorded as a sale and
its stock remains decremented.

This is already documented as deferred in `docs/plan-c-stripe-migration.md`.
For low sales volume, manual stock correction in Sanity is reasonable. The
owner should be told explicitly:

- If an order is refunded and the item is available for resale, manually restore
  its stock in Sanity.
- The order document is a sales log and should not be treated as a live stock
  reconciliation report.

Automatic refund handling can be added later if manual correction becomes a
problem.

## Existing Checkout Strengths

The following parts are already strong and do not need redesign for this
deployment.

### Server-side pricing and stock validation

`create-checkout-session.mts` ignores browser-provided prices and re-fetches
products from Sanity through `CHECKOUT_ITEMS_QUERY`. This prevents a modified
browser request from changing the amount charged.

It also:

- Rejects unknown products.
- Rejects products with no stock.
- Merges duplicate product IDs.
- Clamps requested quantities to current stock.
- Builds Stripe line items from server-side values.

This is the correct trust boundary.

### Shipping consistency

The shared `getCartShipping()` implementation in `src/lib/shipping.ts` is used
by both the client totals and the server checkout function.

The rule is explicit:

- Shipping is charged only when every item uses `post` delivery.
- The total weight must fit a configured tier.
- Any `arrange` item, overweight cart, or missing rates causes the whole order
  to be arranged with the owner.

This avoids the common problem where the customer-facing total differs from the
amount charged by the server.

### Webhook signature and payment gates

`stripe-webhook.mts` correctly:

- Rejects requests without a Stripe signature.
- Verifies the raw request body before parsing the event.
- Ignores events whose livemode does not match the configured environment.
- Skips `checkout.session.completed` events that are not paid.
- Handles `checkout.session.async_payment_succeeded`.
- Logs and ignores `checkout.session.async_payment_failed`.

This is an appropriate event model for Stripe Checkout.

### Webhook idempotency

The deterministic order ID, `order-${session.id}`, prevents the same Stripe
event from decrementing stock more than once. Order creation and stock patches
are committed in one Sanity transaction.

The concurrent-create race is also handled: if another invocation has already
created the order, the losing invocation checks for the order and treats the
event as successfully processed.

The webhook tests cover these behaviours, including retries, malformed paid
events, unpaid events, deleted products, and stock clamping.

### Secret handling

Stripe secret values are not prefixed with `PUBLIC_`, `.env` is ignored by Git,
and the functions read secrets through `Netlify.env.get()`.

The Sanity write token is only used in the webhook and seed scripts. The
checkout function uses a read-only Sanity client and does not need the write
token.

### Cart and form behaviour

The local cart is deliberately client-side and server validation remains the
source of truth. The freshness check removes sold-out items before checkout in
normal browsing, while the checkout endpoint performs the final authoritative
check.

The contact form uses the expected Netlify Forms static skeleton and includes a
honeypot field. It is suitable for the intended hosting platform.

## Production Go-Live Checklist

### Sanity

- Create or confirm the production dataset.
- Deploy the current schema to the production dataset.
- Run `pnpm typegen` after any final schema changes.
- Populate the production `siteSettings` document.
- Populate real shipping tiers and confirm weight boundaries and prices.
- Add genuine product data, including:
  - Product names and descriptions.
  - Correct prices in GBP.
  - Correct stock levels.
  - Correct `weightInGrams` values.
  - Correct `deliveryMethod` values.
  - Product images with alt text.
  - Unique-piece flags where appropriate.
- Add the deployed production site origin to Sanity CORS settings.
- Ensure the CORS configuration supports authenticated requests for the
  embedded Studio.
- Confirm the Sanity plan supports the required development and production
  datasets and expected low-volume API usage.

The production CORS origin is important because:

- The embedded Studio runs at `/admin` in the deployed site.
- `checkCartFreshness()` performs a browser-side Sanity request.

### Stripe

- Use the client's own Stripe account rather than the development sandbox.
- Create properly scoped live restricted API keys.
- Set `STRIPE_RESTRICTED_KEY` to the live restricted key.
- Register the production webhook endpoint:

  `https://<production-domain>/api/webhooks/stripe`

- Subscribe the endpoint to exactly the events currently handled:
  - `checkout.session.completed`
  - `checkout.session.async_payment_succeeded`
  - `checkout.session.async_payment_failed`
- Set `STRIPE_WEBHOOK_SECRET` to the signing secret generated for the deployed
  Dashboard endpoint. Do not use the local `stripe listen` secret.
- Set `STRIPE_EXPECTED_MODE=live`.
- Enable successful-payment notifications for the owner.
- Enable customer receipt emails, because the success page promises the buyer a
  Stripe receipt.
- Complete Apple Pay domain registration if Apple Pay is desired.
- Confirm the account's payment, refund, and customer-contact workflow with the
  owner.

### Netlify

Set the production environment variables together so that the dataset and
Stripe livemode cannot drift:

```text
PUBLIC_SANITY_STUDIO_PROJECT_ID=<production Sanity project ID>
PUBLIC_SANITY_STUDIO_DATASET=production
SANITY_WRITE_TOKEN=<production Sanity write token>
STRIPE_RESTRICTED_KEY=rk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_EXPECTED_MODE=live
```

Then:

- Deploy the site from the production branch.
- Confirm the Netlify build uses the intended Node version.
- Confirm `/admin` loads and the owner can sign in.
- Confirm product pages and listings use the production dataset.
- Confirm `/api/checkout` creates a live-mode Checkout Session.
- Confirm `/api/webhooks/stripe` receives and processes live events.
- Confirm Netlify function logs are accessible to the owner or maintainer.
- Confirm the contact form appears in Netlify Forms after deployment.

There is currently no `netlify.toml`. This is not inherently a deployment
problem because Netlify and the Astro adapter can use the project defaults, but
a small configuration file could make the build command, publish directory,
and Node version explicit and reproducible.

### End-to-end production verification

Before directing real customers to the site:

- Complete a low-value real purchase with the client's Stripe account.
- Confirm the customer is redirected to the success page.
- Confirm the owner receives a Stripe payment notification.
- Confirm the customer receives the expected receipt.
- Confirm the webhook creates exactly one order document.
- Confirm stock decrements exactly once.
- Resend or replay the webhook event and confirm stock does not decrement again.
- Test an all-post order with real shipping rates.
- Test an arrange-only order and confirm no shipping step is presented.
- Test a mixed order and confirm the whole order is treated as arranged.
- Confirm a cancelled Checkout Session leaves the cart intact.
- Confirm a sold-out product cannot be purchased after its stock is set to zero.
- Confirm a cart with several items, including enough items to exercise the
  metadata-size fix, reaches Stripe successfully.

## Recommended Implementation Order

Before launch, the practical order of work is:

1. Verify the Stripe metadata chunking fix and large-cart test in deployment.
2. Add the missing Checkout URL guard.
3. Add a reasonable item-count limit and return a clean 400 for oversized
   requests.
4. Verify the 30-minute Checkout Session expiry in deployment.
5. Decide whether to refresh persisted cart names and prices during freshness
   checks. This is a UX improvement rather than a security fix.
6. Verify Stripe owner notifications and customer receipt settings.
7. Complete the production Sanity, Stripe, Netlify, CORS, and end-to-end
   checklist above.

## Bottom Line

The current implementation does not need a fundamental checkout redesign. Its
security and payment-flow foundations are sound for a small low-volume trader.

The cart metadata limit was the main code-level deployment blocker because it
could prevent ordinary multi-item carts from reaching Stripe. The chunking fix
removes that blocker; the remaining code changes are inexpensive hardening. The lack of stock
reservation and dedicated owner notification are operational trade-offs rather
than reasons to build a larger commerce system, provided the owner understands
the rare oversell scenario and Stripe notification settings are confirmed.
