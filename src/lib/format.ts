const priceFormatter = new Intl.NumberFormat('en-GB', {
	style: 'currency',
	currency: 'GBP',
})

/**
 * Formats a number as GBP currency string using en-GB locale.
 * Uses `Intl.NumberFormat` with `style: 'currency'` and `currency: 'GBP'`.
 *
 * @param price - Price in pounds sterling (major units, e.g. 12.5 for £12.50).
 * Stripe's minor-unit conversion happens at the single seam `toPence` in
 * `src/lib/money.ts`.
 * @returns Formatted GBP string (e.g., "£12.50")
 */
export function formatPrice(price: number): string {
	return priceFormatter.format(price)
}

/**
 * Converts grams to human-readable kg/g format.
 * If `weightInGrams` is less than 1000, returns grams only (e.g., "250g").
 * Otherwise returns whole kilograms, and if there's a remainder, a decimal
 * fraction with 3-digit padding (e.g., "1.500kg" or "1kg 500g").
 *
 * @param weightInGrams - Weight in grams
 * @returns Human-readable weight string
 */
export function formatWeight(weightInGrams: number): string {
	if (weightInGrams < 1000) return `${weightInGrams} g`
	const wholeKg = Math.floor(weightInGrams / 1000)
	const remainder = weightInGrams % 1000
	if (remainder === 0) return `${wholeKg} kg`
	const grams = String(remainder).padStart(3, '0').replace(/0+$/, '')
	return grams ? `${wholeKg}.${grams} kg` : `${wholeKg} kg`
}

/**
 * Formats a weight range string.
 * - If `upperGrams` is `null`, returns "Over {formatted lower}".
 * - If `lowerGrams` is `0`, returns "Up to {formatted upper}".
 * - Otherwise returns "{lower}–{upper}" with both bounds formatted.
 *
 * @param lowerGrams - Lower bound in grams
 * @param upperGrams - Upper bound in grams, or `null` for "over" case
 * @returns Formatted weight range string (e.g., "1.5kg–2.3kg", "Over 500g", "Up to 3kg")
 */
export function formatWeightBand(lowerGrams: number, upperGrams: number | null): string {
	if (upperGrams === null) return `Over ${formatWeight(lowerGrams)}`
	if (lowerGrams === 0) return `Up to ${formatWeight(upperGrams)}`
	return `${formatWeight(lowerGrams)}–${formatWeight(upperGrams)}`
}
