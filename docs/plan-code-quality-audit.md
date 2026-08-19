# Code Quality Audit Plan

Tracks the remediation stages from the code-quality audit. Each stage is a small,
bite-sized chunk so a single agent can tackle it without being overwhelmed.
Work the stages in order — simplest first.

**Branching:** each stage is carried out on its own dedicated git branch (named
per stage below). Create the branch from `main`, merge it back with a PR, then
tick the stage's checkbox once merged.

Status markers:

- [ ] Pending
- [>] In progress
- [x] Complete

---

## Stage 1: Fix Shipping Catch-All Validation

Status: [x] Complete
Branch: `fix/shipping-catch-all-validation`

**Files:**
- `src/schemaTypes/documents/siteSettings.ts`

**Tasks:**
- Treat both `null` and `undefined` as an unbounded final tier.
- Preserve the requirement that only the final tier may be unbounded.
- Ensure the seeded catch-all (`maxWeightGrams: null`) passes validation.

**Done when:**
- Seeded settings pass schema validation.
- Invalid tier ordering is rejected.
- `pnpm typegen` completes successfully.

---

## Stage 2: Server-Render the Contact Email

Status: [x] Complete
Branch: `fix/contact-email-ssr`

**Files:**
- `src/pages/contact.astro`

**Tasks:**
- Fetch `SITE_SETTINGS_QUERY` in the Astro frontmatter.
- Render `contactEmail` as a `mailto:` link when present.
- Keep the existing fallback contact copy when no email is configured.
- Do not modify `public/__forms.html` — it already provides the static form
  signature Netlify needs to detect the form at build/deploy time.

**Done when:**
- The email is present in the server-rendered HTML.
- The React contact form continues posting to `/__forms.html`.
- The page remains usable when the CMS email is missing.

---

## Stage 3: Centralize API Version Constants

Status: [x] Complete
Branch: `refactor/api-version-constants`

**Files:**
- New shared constants module, likely `src/lib/apiVersions.ts`
- `netlify/functions/create-checkout-session.mts`
- `netlify/functions/stripe-webhook.mts`
- Sanity client/configuration files
- Seed scripts
- Schema validation files

**Tasks:**
- Extract repeated Sanity API version values (`2026-08-10`).
- Extract repeated Stripe API version values (`2026-07-29.dahlia`).
- Use descriptive names such as `SANITY_API_VERSION` and `STRIPE_API_VERSION`.
- Respect runtime boundaries — browser, Node, and Netlify runtime code must not
  be forced to import an unsuitable shared module.

**Done when:**
- Each API version has one source of truth per runtime boundary.
- No duplicated version literals remain without a documented reason.
- Existing build and type generation still pass.

---

## Stage 4: Extract Shared GROQ Image Projection

Status: [x] Complete
Branch: `refactor/groq-image-projection`

**Files:**
- `src/queries/sanity.ts`

**Tasks:**
- Extract the repeated image projection for `ProductCard` and `ProductGallery`.
- Preserve `url`, `alt`, dimensions, `dominantColor`, and `lqip`.
- Keep the query strings compatible with Sanity TypeGen.

**Done when:**
- Card and gallery queries use the shared projection.
- Generated types remain correct after `pnpm typegen`.
- Existing image behavior is unchanged.

---

## Stage 5: Extract Pure Site-Settings Mapping

Status: [x] Complete
Branch: `refactor/site-settings-mapping`

**Files:**
- New pure helper, likely `src/lib/siteSettings.ts`
- `src/layouts/Layout.astro`
- `src/pages/shop/product/[slug].astro`
- `src/pages/shipping.astro`
- Netlify checkout function if appropriate

**Tasks:**
- Extract nullable Sanity shipping-rate mapping into a pure function.
- Keep Sanity query execution separate — `sanity:client` in Astro SSR,
  browser-side clients, and Netlify functions each have their own environment.
- Continue sharing `SITE_SETTINGS_QUERY`.
- Do not create a universal client/loader abstraction across all runtimes.

**Done when:**
- Shipping-rate normalization exists in one reusable helper.
- Astro and Netlify code use the same mapping behavior.
- No runtime-specific environment handling is mixed into the pure helper.

---

## Stage 6: Remove About/Terms Rendering Duplication

Status: [x] Complete
Branch: `refactor/content-page-component`

**Files:**
- `src/pages/about.astro`
- `src/pages/terms.astro`
- New reusable content component or helper

**Tasks:**
- Extract the shared Portable Text-to-HTML rendering pattern.
- Preserve page-specific titles, descriptions, and body fields.
- Keep empty-content behavior unchanged.

**Done when:**
- About and Terms share the same rendering implementation.
- Each page still fetches and displays its own CMS field.
- Both routes build successfully.

---

## Stage 7: Improve Cart Drawer Focus Management

Status: [x] Complete
Branch: `fix/cart-drawer-focus`

**Files:**
- `src/components/CartDrawer.tsx`
- `src/components/CartTrigger.tsx`
- New hook if useful

**Tasks:**
- Move focus into the drawer when it opens.
- Trap Tab and Shift+Tab inside the dialog.
- Restore focus to the cart trigger when it closes.
- Preserve Escape-to-close behavior.
- Ensure focus restoration also works after checkout errors and animation teardown.

**Done when:**
- Keyboard users cannot tab behind the open drawer.
- Focus returns to the trigger after closing.
- Existing scroll locking and animation behavior remain intact.

---

## Stage 8: Make Tooltip Behavior Accessible

Status: [x] Complete
Branch: `fix/tooltip-accessibility`

**Files:**
- `src/components/ui/Tooltip.tsx`
- `src/components/AddToCartButton.tsx`

**Tasks:**
- Support keyboard focus in addition to hover.
- Connect tooltip content using `aria-describedby`.
- Ensure disabled buttons still expose useful status text.
- Avoid relying on hover over a disabled element.

**Implemented notes:** The tooltip only appears over the *disabled*
Add-to-Cart button, which cannot receive focus, so `aria-describedby` would be
dead for assistive tech. Instead the status is announced directly via an
`aria-live="polite"` `sr-only` region owned by `Tooltip` (single shared label),
independent of hover/focus. The visual tooltip remains a hover-only affordance.

**Done when:**
- Tooltip content is available to keyboard users.
- Screen readers receive the status message.
- Unique and non-unique product buttons retain their current behavior.

---

## Stage 9: Extract Cart Summary Logic

Status: [x] Complete
Branch: `refactor/cart-summary`

**Files:**
- `src/components/CartDrawer.tsx`
- New pure module, likely `src/lib/cartTotals.ts`
- New unit tests

**Tasks:**
- Move count, subtotal, shipping, arrangement, and total calculations into a
  pure function.
- Keep `CartDrawer` focused on composition and presentation.
- Add unit tests for:
  - Empty carts.
  - Post-only carts.
  - Arrange-only carts.
  - Mixed carts.
  - Missing shipping rates.
  - Catch-all rates.

**Done when:**
- Cart totals have no duplicated calculation logic.
- The helper is independently testable.
- Drawer output remains unchanged.

---

## Stage 10: Split Cart Drawer Responsibilities

Status: [x] Complete
Branch: `refactor/cart-drawer-split`

**Files:**
- `src/components/CartDrawer.tsx`
- New `src/hooks/useCartDrawer.ts`
- New `src/components/CartDrawerPanel.tsx`

**Tasks:**
- Move open/close, Escape handling, scroll locking, focus handling, and checkout
  state into `useCartDrawer`.
- Move drawer markup into `CartDrawerPanel`.
- Leave `CartDrawer` as the integration/orchestration component.
- Avoid extracting trivial presentational fragments unnecessarily.

**Done when:**
- Drawer lifecycle behavior is isolated and testable.
- Checkout behavior is isolated from most JSX.
- The main component is substantially easier to scan.

---

## Stage 11: Add Checkout Function Tests

Status: [ ] Pending
Branch: `test/checkout-function`

**Files:**
- `netlify/functions/create-checkout-session.mts`
- `tests/create-checkout-session.test.mts`
- Shared test helpers as needed

**Tasks:**
- Add tests for:
  - Invalid JSON.
  - `null` JSON.
  - Primitive JSON.
  - Missing or malformed `items`.
  - Duplicate product IDs.
  - Unknown products.
  - Out-of-stock products.
  - Quantities clamped to current stock.
  - Shipping-rate behavior.
  - Sanity failures.
  - Stripe failures.
  - Successful session creation.
- Keep backend validation as the authoritative cart validation.
- Do not add client-side persistence validation as a security mechanism.

**Done when:**
- Checkout edge cases are covered without requiring a real Stripe or Sanity
  environment.
- Failures return the documented status codes and response shapes.
- `pnpm test` passes.

---

## Stage 12: Clean Up Biome Scope

Status: [ ] Pending
Branch: `chore/biome-scope`

**Files:**
- `biome.json`
- `.gitignore` or Biome configuration if necessary

**Tasks:**
- Exclude `.agents/skills` and other external/tooling assets from the
  application lint scope.
- Decide whether `skills-lock.json` should be excluded or formatted
  independently.
- Keep project source, tests, scripts, and configuration covered.

**Done when:**
- `pnpm lint` passes.
- Application files remain fully checked.
- The configuration does not hide project source files.

---

## Stage 13: Add Integration and Concurrency-Adjacent Tests

Status: [ ] Pending
Branch: `test/webhook-concurrency`

**Files:**
- `tests/stripe-webhook.test.mts`
- New checkout/webhook test helpers

**Tasks:**
- Add webhook tests for:
  - Idempotent duplicate deliveries.
  - Concurrent duplicate deliveries.
  - Missing products.
  - Partial stock availability.
  - Sanity transaction failures.
- Document that these tests do not eliminate the pre-payment checkout race.

**Done when:**
- Webhook fulfillment behavior is explicitly covered.
- Failure and reconciliation behavior is documented.
- Tests pass reliably without external services.

---

## Stage 14: Revisit Checkout Inventory Reservations

Status: [ ] Pending
Branch: `feat/checkout-reservations`

This stage is intentionally deferred. The current pre-payment checkout race is
an accepted low-traffic risk and was flagged as optional to revisit later. It is
planned last so the simpler correctness, accessibility, duplication, and testing
stages ship first.

**Files likely involved:**
- `netlify/functions/create-checkout-session.mts`
- `netlify/functions/stripe-webhook.mts`
- Product/order schema
- New reservation schema or reservation fields
- Cleanup/release mechanism

**Tasks:**
- Decide whether stock must be reserved before creating a Stripe Checkout
  Session.
- Design reservation expiry and abandoned-session cleanup.
- Use an atomic or optimistic-concurrency-safe inventory update.
- Define behavior when payment succeeds but reservation finalization fails.
- Define refund/manual-resolution behavior.
- Add end-to-end tests for two simultaneous checkout attempts against one item.

**Recommended approach:**
- Reserve inventory before session creation.
- Store reservation metadata on the Stripe session.
- Finalize the reservation in the webhook.
- Release expired or cancelled reservations.
- Treat failed finalization as an operational exception requiring reconciliation,
  not as a silently successful order.

**Done when:**
- Two concurrent sessions cannot both obtain the same unique item.
- Abandoned sessions release inventory.
- Paid-but-unfulfillable orders have an explicit refund or manual-resolution path.
- End-to-end concurrency testing passes.

---

## Final Verification

Status: [ ] Pending

- [ ] `pnpm lint`
- [ ] `pnpm test`
- [ ] `pnpm build`
- [ ] `pnpm typegen`
- [ ] Manual keyboard test for the cart drawer
- [ ] Manual keyboard and screen-reader test for tooltips
- [ ] Manual contact form submission test
- [ ] Manual verification that the contact email appears in SSR HTML
- [ ] Update `README.md` or `AGENTS.md` if architecture changes
- [ ] Mark completed stages with `[x]`
