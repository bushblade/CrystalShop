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
