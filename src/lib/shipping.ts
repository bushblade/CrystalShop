export type ShippingRate = {
	name: string
	maxWeightGrams?: number | null
	price: number
}

function isWeightBounded(rate: ShippingRate): rate is ShippingRate & { maxWeightGrams: number } {
	return rate.maxWeightGrams !== undefined && rate.maxWeightGrams !== null
}

export type ShippableItem = {
	weightInGrams: number
	deliveryMethod: 'post' | 'arrange'
	quantity?: number
}

/**
 * Selects appropriate shipping rate tier based on total weight.
 *
 * Iterates configured rates looking for the first tier where the total weight
 * falls within the tier's `maxWeightGrams` bound. If no bounded tier matches,
 * falls back to a "catch-all" unbounded rate (if one exists), otherwise returns
 * `null`.
 *
 * @param totalWeightGrams - Total cart weight in grams
 * @param rates - Available shipping rate tiers
 * @returns Selected `ShippingRate` or `null` if no rate applies
 */
export function pickShippingRate(
	totalWeightGrams: number,
	rates: ShippingRate[],
): ShippingRate | null {
	for (const rate of rates) {
		if (isWeightBounded(rate) && totalWeightGrams <= rate.maxWeightGrams) {
			return rate
		}
	}
	const catchAll = rates.find((rate) => !isWeightBounded(rate))
	return catchAll ?? null
}

/**
 * Calculates total weight of `post`-delivery items in cart.
 * Only items with `deliveryMethod === 'post'` are counted; `arrange` items
 * are excluded. Each item's contribution is `weightInGrams * quantity`
 * (quantity defaults to `1` if unspecified).
 *
 * @param items - Cart items with weight and delivery method
 * @returns Total shippable weight in grams
 */
export function totalShippableWeight(items: ShippableItem[]): number {
	return items.reduce((total, item) => {
		if (item.deliveryMethod !== 'post') return total
		return total + item.weightInGrams * (item.quantity ?? 1)
	}, 0)
}

export type ShippingDecision = {
	applies: boolean
	rate: ShippingRate | null
}

// Shipping by tier only applies when the whole cart is post items AND the
// total weight fits a tier. Any arrange item, an overweight total, or an
// unconfigured rates list means the order is arranged with the owner instead
// (buyer pays the item total, owner contacts them for collection/courier).
/**
 * Determines if shipping applies and selects a rate for the cart.
 * Shipping by tier only applies when the whole cart consists of `post` items
 * AND the total shippable weight fits a configured rate tier.
 * Any `arrange` item, an overweight total, or unconfigured rates means the
 * order is arranged as a whole (no shipping step).
 *
 * @param items - Cart items with weight and delivery method
 * @param rates - Configured shipping rate tiers
 * @returns `{applies, rate}` — `applies` is true only when a weight-band tier
 *   matches the entire cart of `post` items
 */
export function getCartShipping(items: ShippableItem[], rates: ShippingRate[]): ShippingDecision {
	if (items.length === 0 || rates.length === 0) return { applies: false, rate: null }
	if (items.some((item) => item.deliveryMethod !== 'post')) return { applies: false, rate: null }
	const rate = pickShippingRate(totalShippableWeight(items), rates)
	if (!rate) return { applies: false, rate: null }
	return { applies: true, rate }
}
