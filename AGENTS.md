# Project Architectural Guidelines

**Dev environment:** Herdr · Fish shell · Ghostty terminal · Neovim

## Project Goal

Build a low-cost, low-maintenance e-commerce store for an artisan crystal seller. The site must be easy for a non-technical owner to manage via Sanity Studio, fast for shoppers (server-rendered Astro pages with client search/filtering), and incur zero fixed monthly infrastructure costs.

## Business & Domain Context

- **Product Type:** Natural crystals.
- **Inventory Model:** Many products are unique 1-of-1 physical pieces (`isUniquePiece: true`). Once sold out, they should not accept backorders.
- **Shipping:** Physical items vary by weight. Every product schema must record `weightInGrams` so Snipcart can calculate weight-based shipping at checkout.
- **Payments & Cart:** Handled entirely on the client by Snipcart via HTML data attributes (`data-item-id`, `data-item-price`, `data-item-weight`, etc.). No custom backend payment endpoints should be created.

## Core Tech Stack

- **Framework:** Astro (SSR / Hybrid mode with React islands) [Sanity Astro
  integration](https://raw.githubusercontent.com/sanity-io/sanity-astro/refs/heads/main/packages/sanity-astro/README.md)
- **CMS:** Embedded Sanity Studio inside Astro at `/admin` 
- **Payments & Cart:** Snipcart
- **Package Manager:** `pnpm` (DO NOT use npm or yarn)
- **Formatter & Linter:** Biome (DO NOT create `.eslintrc` or `.prettierrc`)
- **Language:** TypeScript (strict mode)
- **Styling:** Tailwind CSS, clean and minimal, mobile first
- **Deploy target:** Netlify

## Architecture Rules

1. **Embedded Studio:** 
2. **Sanity Schemas:** Store schema definitions in `src/schemaTypes/`. After any schema change, run `pnpm typegen` to regenerate `sanity.types.ts` (and `schema.json`) before committing.
3. **Product Queries:** Use `src/queries/sanity.ts` for type-safe GROQ queries.
4. **`sanity.config.ts` runs in two environments — never read env vars with a
   single API.** The embedded Studio bundles `sanity.config.ts` into the browser
   via the `sanity:studio` virtual module, while `pnpm typegen` executes it in
   Node. `process` doesn't exist in the browser and `import.meta.env` doesn't
   exist in Node, so a plain `process.env` or `import.meta.env` read breaks one
   of them. Always use the dual guard:

   ```ts
   function getRequiredEnvVar(name: string): string {
     const value =
       typeof process !== 'undefined'
         ? process.env[name]
         : import.meta.env[name]
     if (!value) {
       throw new Error(`Missing required environment variable: ${name}`)
     }
     return value
   }
   ```

   Do not "simplify" this to either single form — commit a5c06e0 did and broke
   the embedded Studio at `/admin` (`ReferenceError: process is not defined`).

## Routing

- **`/`** — Home. Featured products only (`isFeatured == true`, in stock, max 6), server-rendered with `ProductCard`; "Shop all" CTA → `/shop`.
- **`/shop`** — All in-stock products, server-rendered, embedding the `CatalogExplorer` React island (`src/components/CatalogExplorer.tsx`). Search / sort / pagination are client-side; state syncs to the URL via `history.replaceState` (`?q=&sort=&page=`).
- **`/shop/categories/[slug]`** — Server-rendered filtered list for one category (`PRODUCTS_BY_CATEGORY_QUERY`), embedding the same island. Category is a **path**, never a query param. Unknown slug → `Astro.redirect('/shop')`.
- **`/shop/product/[slug]`** — PDP: gallery, specs, Snipcart buy button (or "Sold out" badge when `stockLevel === 0`). Sold-out items stay reachable here but are filtered out of listings. Unknown slug → redirect to `/shop`.
- **`/about`, `/contact`, `/terms`** — Hardcoded static Astro pages.
- **`/admin`** — Embedded Sanity Studio (reserved, from the sanity integration).

Routing rules: product URLs are flat (never nested under category), so re-categorising never breaks links. All listing queries must filter `coalesce(stockLevel, 0) > 0`.

## Code Style

- **Conditional rendering**: Use ternary operators with `null` over logical AND (`&&`).
  ```astro
  {condition ? <Component /> : null}
  ```
- **React components**: Use function declarations, not arrow-function expressions.
  ```tsx
  function Gallery({ photos }: GalleryProps) { ... }
  ```
- **File and function naming**: Use descriptive file and function names so
  agents understand the purpose of the file or function and can find them
  easily.

- **Function definitions**: Use function definitions rather than function
  expressions except for inline anonymous functions for which arrow functions
  are fine.

## Styling Conventions

- **Tailwind CSS v4 (CSS-first)**: All styling is Tailwind utilities in
  markup. No `@apply`, no scoped `<style>` blocks in `.astro` files, no CSS
  modules. One styling mechanism.
- **Single CSS file**: All Tailwind setup lives in `src/styles/global.css`
  (`@import`, `@source`, `@plugin`, `@theme`, base layer). Do not add new CSS
  files; extend this one or split only if it outgrows its home.
- **Fonts**: Self-hosted via `@fontsource`. `Cormorant Garamond` is the display
  face (`--font-display`, applied to all headings in the base layer), `Inter`
  is the body face (`--font-sans`). Load weight CSS files in
  `src/layouts/Layout.astro`.
- **Accent colour**: Violet is the only accent colour — raw built-in utilities
  such as `violet-700` (interactive) and `violet-800` (hover). No custom
  accent tokens.
- **Extract repetition**: When the same class group repeats 3+ times, extract
  it into a small presentational component under `src/components/ui/` that
  owns those classes. Prefer descriptive component names.
- **Light-only**: No `dark:` variants. Mobile-first (`sm:`/`md:` breakpoints).
- **Content scanning**: Tailwind `@source` directives are constrained to
  `src/pages`, `src/components`, `src/layouts`. Add new template directories
  there — never let `src/queries`, `src/schemaTypes`, or generated types into
  the scan. Do not import `global.css` on `/admin` (Studio keeps its own CSS).

