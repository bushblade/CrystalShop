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
export function getCartShipping(items: ShippableItem[], rates: ShippingRate[]): ShippingDecision {
	if (items.length === 0 || rates.length === 0) return { applies: false, rate: null }
	if (items.some((item) => item.deliveryMethod !== 'post')) return { applies: false, rate: null }
	const rate = pickShippingRate(totalShippableWeight(items), rates)
	if (!rate) return { applies: false, rate: null }
	return { applies: true, rate }
}
