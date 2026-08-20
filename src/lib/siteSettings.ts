import type { SITE_SETTINGS_QUERY_RESULT } from '../../sanity.types'
import type { ShippingRate } from './shipping'

/**
 * Extracts shipping rate config from site settings query result.
 *
 * @param siteSettings - Sanity query result containing `shippingRates` array
 * @returns Array of `ShippingRate` objects keyed by name and max weight
 */
export function extractShippingRates(siteSettings: SITE_SETTINGS_QUERY_RESULT): ShippingRate[] {
	return (siteSettings?.shippingRates ?? []).map((rate) => ({
		name: rate.name,
		maxWeightGrams: rate.maxWeightGrams ?? null,
		price: rate.price,
	}))
}
