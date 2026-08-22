export type PurchasableProduct = {
	isUniquePiece?: boolean | null
	stockLevel?: number | null
}

/**
 * Returns how many units of a product a shopper may buy — the purchasable
 * quantity. Unique 1-of-1 pieces cap at 1 even if stock is higher; other
 * products cap at current stock. Unknown stock counts as none.
 *
 * @param product - Product facts; missing or null fields treated conservatively
 * @returns Maximum purchasable quantity, never below 0
 */
export function maxPurchasableQuantity(product: PurchasableProduct): number {
	const stock = Math.max(0, product.stockLevel ?? 0)
	return product.isUniquePiece === true ? Math.min(1, stock) : stock
}
