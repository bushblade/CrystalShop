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
2. **Sanity Schemas:** Store schema definitions in `src/schemaTypes/`.
3. **Product Queries:** Use `src/queries/sanity.ts` for type-safe GROQ queries.

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

