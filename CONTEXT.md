# Context

Domain glossary for CrystalShop. Terms are defined once here so agents and
humans use the same words for the same things. Architecture rules live in
AGENTS.md; this file records what terms *mean*.

## Purchasable quantity

How many units of a product a shopper may buy. Unique 1-of-1 pieces
(`isUniquePiece`) cap at 1 even when stock is higher; every other product caps
at its current `stockLevel`. Unknown stock counts as zero.

One implementation lives in `src/lib/purchasableQuantity.ts`; the PDP, the
add-to-cart button, the cart freshness pruner, and the checkout function all
derive their limits from it. Never restate the rule at a call site.
