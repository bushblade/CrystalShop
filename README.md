# Eclipsia Crystals

A low-cost, low-maintenance e-commerce store for an artisan crystal seller. Managed by the owner via Sanity Studio, fast for shoppers (server-rendered Astro pages with client-side search/filtering), and hosted on Netlify at zero fixed monthly cost.

## Stack

- **Framework:** Astro (SSR) with React islands
- **CMS:** Embedded Sanity Studio at `/admin`
- **Payments & Cart:** Snipcart (client-side, via HTML data attributes)
- **Deploy target:** Netlify
- **Package manager:** `pnpm`
- **Linter / formatter:** Biome

## Routes

| Route | Description |
| --- | --- |
| `/` | Home — up to 6 featured in-stock pieces, "Shop all" CTA |
| `/shop` | All in-stock products with client-side search, sort and pagination (`?q=&sort=&page=`) |
| `/shop/categories/[slug]` | Server-rendered list for one category |
| `/shop/product/[slug]` | Product detail — gallery, specs, Snipcart buy button (or "Sold out" badge) |
| `/about`, `/contact`, `/terms` | Static pages |
| `/admin` | Sanity Studio |

Many pieces are unique 1-of-1 items (`isUniquePiece`). When a piece sells out (`stockLevel === 0`) it stays visible on its product page with a "Sold out" badge, but is filtered out of `/shop` and category listings — no backorders.

## Commands

| Command | Action |
| --- | --- |
| `pnpm dev` | Start the local dev server |
| `pnpm build` | Build the production site to `dist/` |
| `pnpm preview` | Preview the build locally |
| `pnpm lint` | Run Biome checks |
| `pnpm typegen` | Regenerate `sanity.types.ts` after schema changes |

## Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `PUBLIC_SANITY_STUDIO_PROJECT_ID` | Yes | Sanity project ID |
| `PUBLIC_SANITY_STUDIO_DATASET` | Yes | Sanity dataset (`development` locally, `production` on Netlify) |
| `PUBLIC_SNIPCART_API_KEY` | No | Snipcart public key; enables the cart UI when set |

See `.env.example` for a template.
