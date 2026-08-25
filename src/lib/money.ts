/**
 * Converts pounds sterling to integer pence, rounding half-up.
 *
 * This is the only place money crosses from Sanity's unit convention
 * (pounds as 2dp doubles) to Stripe's (integer minor units). The invariant
 * that keeps floats harmless: round exactly once, per scalar, at this seam.
 * Every 2dp double within retail magnitudes lands within a thousandth of a
 * penny of its true integer after ×100, so half-up rounding recovers the
 * exact pence value (`19.99 → 1999`, never `1998.999…`). Never accumulate,
 * sum, or re-round amounts in pence space — charged totals are computed by
 * Stripe from per-line unit amounts, so no float arithmetic reaches a charge.
 *
 * @param pounds - Price in pounds sterling as held in Sanity (e.g. 12.5)
 * @returns Whole pence for Stripe APIs (e.g. 1250)
 */
export function toPence(pounds: number): number {
	return Math.round(pounds * 100)
}

/**
 * Converts Stripe's integer pence back into the pounds representation used
 * everywhere else in the app (Sanity docs, display, order records).
 *
 * Stripe always sends whole minor units, so a single division recovers the
 * canonical double; no rounding is applied on this direction.
 *
 * @param pence - Amount in pence as returned by Stripe (e.g. 3000)
 * @returns Pounds sterling (e.g. 30)
 */
export function toPounds(pence: number): number {
	return pence / 100
}
