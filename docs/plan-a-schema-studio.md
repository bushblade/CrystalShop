# Plan A — Product Schema & Sanity Studio

Prerequisite work for the Snipcart integration (Plan B). No Snipcart dependency. Must be
completed first so the site builds with the new schema.

## Legend

- 🤖 Agent executes (code/CLI, autonomous)
- 👤 Human acts in a browser
- 🤖+👤 Agent prepares, human provides/confirms

## Context & decisions

- Replace the `localPickupAvailable` boolean with a `deliveryMethod` options-list field.
  Rationale: it models the product property ("can this go by post?") rather than the buyer
  action, and it reads correctly whether fulfilment ends up as collection, owner
  hand-delivery, or the buyer's own courier.
- Add `orderings` to the `product` schema so the owner can sort product lists by stock level.
- Add In Stock / Out of Stock filtered document lists to the Studio structure.
- Show stock status in the product list preview subtitle.
- Dummy data is reseeded (the seed script is the single source of truth for it); any real
  (non-seed) documents, if they exist, get a tiny targeted patch instead.

## Steps

### A1. `deliveryMethod` field — 🤖

File: `src/schemaTypes/documents/product.ts`

- Remove the `localPickupAvailable` field (group: `PACKAGING_GROUP`).
- Add:

```ts
defineField({
  name: 'deliveryMethod',
  title: 'Delivery Method',
  type: 'string',
  group: PACKAGING_GROUP,
  description: 'How this piece reaches the buyer. Pick "Arrange" for pieces too heavy for standard postage.',
  initialValue: 'post',
  options: {
    list: [
      { title: 'Standard postage', value: 'post' },
      { title: 'Arrange collection or delivery', value: 'arrange' },
    ],
    layout: 'radio',
  },
  validation: (rule) => rule.required(),
})
```

### A2. `orderings` — 🤖

File: `src/schemaTypes/documents/product.ts`

Add to the `product` type:

```ts
orderings: [
  {
    title: 'Stock: low to high',
    name: 'stockLevelAsc',
    by: [{ field: 'stockLevel', direction: 'asc' }],
  },
  {
    title: 'Stock: high to low',
    name: 'stockLevelDesc',
    by: [{ field: 'stockLevel', direction: 'desc' }],
  },
]
```

### A3. Query projection — 🤖

File: `src/queries/sanity.ts`

Add `deliveryMethod` to the `PRODUCT_BY_SLUG_QUERY` projection so the PDP can read it.

### A4. PDP spec sheet — 🤖

File: `src/pages/shop/product/[slug].astro`

- Remove the `localPickupAvailable` spec row (currently lines ~63-68).
- When `product.deliveryMethod === 'arrange'`, render a notice (e.g. in the spec list or
  under the price): "Collection or local delivery — contact us to arrange." Link to the
  contact page.
- Required in this plan: removing the schema field otherwise breaks the build.

### A5. Seed script — 🤖

File: `scripts/seed-dummy-data.mjs`

- Replace `localPickupAvailable: item.pickup ?? false` with
  `deliveryMethod: item.pickup ? 'arrange' : 'post'`.
- Verify each `pickup: true` item still reads sensibly as an "arrange" piece.

### A6. Reseed dummy data — 🤖

Run against the development dataset:

```bash
pnpm seed:dummy:delete
pnpm seed:dummy
```

### A7. Patch real (non-seed) products — 🤖

The development dataset holds 5 real products (non-`seed-*` IDs) the seed script never
touches. Two still carry `localPickupAvailable: true` and must keep their "arrange"
semantics:

- `eb915efe-8fdb-41d9-9141-ebc02909310d` — Citrine Portal (2720 g) → `arrange`
- `f0df3380-98c6-4f61-8cc4-e533fa30174a` — Amethyst Church Cathedral 43.25kg Brazil → `arrange`

Apply a one-off patch to every non-seed product: set `deliveryMethod` to `'arrange'`
where `localPickupAvailable == true`, else `'post'`, then `unset` the
`localPickupAvailable` field. Run this before verifying — real docs otherwise lack the
required `deliveryMethod` field and their PDPs read `undefined`.

### A8. Studio structure — 🤖

File: `src/structure/index.ts`

- Build a "Products" group with three `S.documentList()` children:
  - **All Products** — schemaType `product`, default ordering by `stockLevel asc`
  - **In Stock** — filter `_type == "product" && coalesce(stockLevel, 0) > 0`
  - **Out of Stock** — filter `_type == "product" && coalesce(stockLevel, 0) == 0`
- Give each filtered list `.canHandleIntent(intentName, params) => intentName === 'edit' && params?.type === 'product'`.
- Keep "Featured Products" and "Site Settings".
- Exclude `product` and `siteSettings` from the remaining `...S.documentTypeListItems()`.

### A9. Preview subtitle — 🤖

File: `src/schemaTypes/documents/product.ts`

Update `preview.prepare` so the subtitle reads e.g. `£58 · In stock: 3` or `£58 · Out of
stock`, driven by the `stockLevel` selection.

### A10. Verify — 🤖 + 👤

- 🤖 `pnpm typegen`, `pnpm lint`, `pnpm build`
- 👤 Open `/admin` on the dev site and confirm:
  - Products group with All / In Stock / Out of Stock lists
  - Stock sort options available
  - Product form shows the Delivery Method radio (default "Standard postage")
  - A PDP on the dev site shows the "arrange" notice for a reseeded pickup item

## Out of scope (Plan B)

- `data-item-shippable="false"` on the buy button for `arrange` items
- Everything Snipcart
