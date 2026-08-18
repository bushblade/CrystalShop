const priceFormatter = new Intl.NumberFormat('en-GB', {
	style: 'currency',
	currency: 'GBP',
})

export function formatPrice(price: number): string {
	return priceFormatter.format(price)
}

export function formatWeight(weightInGrams: number): string {
	if (weightInGrams < 1000) return `${weightInGrams} g`
	const wholeKg = Math.floor(weightInGrams / 1000)
	const remainder = weightInGrams % 1000
	if (remainder === 0) return `${wholeKg} kg`
	const grams = String(remainder).padStart(3, '0').replace(/0+$/, '')
	return grams ? `${wholeKg}.${grams} kg` : `${wholeKg} kg`
}

export function formatWeightBand(lowerGrams: number, upperGrams: number | null): string {
	if (upperGrams === null) return `Over ${formatWeight(lowerGrams)}`
	if (lowerGrams === 0) return `Up to ${formatWeight(upperGrams)}`
	return `${formatWeight(lowerGrams)}–${formatWeight(upperGrams)}`
}
