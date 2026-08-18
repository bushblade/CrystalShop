import type { SITE_SETTINGS_QUERY_RESULT } from '../../sanity.types'
import type { ShippingRate } from './shipping'

export function extractShippingRates(siteSettings: SITE_SETTINGS_QUERY_RESULT): ShippingRate[] {
	return (siteSettings?.shippingRates ?? []).map((rate) => ({
		name: rate.name,
		maxWeightGrams: rate.maxWeightGrams ?? null,
		price: rate.price,
	}))
}
