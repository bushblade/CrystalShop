import { describe, expect, it } from 'vitest'
import type { SITE_SETTINGS_QUERY_RESULT } from '../../sanity.types'
import { extractShippingRates } from './siteSettings'

function settings(
	overrides: Partial<NonNullable<SITE_SETTINGS_QUERY_RESULT>> = {},
): SITE_SETTINGS_QUERY_RESULT {
	return {
		aboutBody: null,
		termsBody: null,
		contactEmail: 'shop@example.com',
		shippingRates: [],
		...overrides,
	}
}

describe('extractShippingRates', () => {
	it('returns an empty list when site settings are missing', () => {
		expect(extractShippingRates(null)).toEqual([])
	})

	it('returns an empty list when shipping rates are missing', () => {
		expect(extractShippingRates(settings({ shippingRates: null }))).toEqual([])
	})

	it('returns an empty list for an empty rates array', () => {
		expect(extractShippingRates(settings({ shippingRates: [] }))).toEqual([])
	})

	it('passes through name, price and maxWeightGrams', () => {
		const rates = [
			{ name: 'Standard', maxWeightGrams: 1000, price: 4.5 },
			{ name: 'Large', maxWeightGrams: null, price: 9.5 },
		]
		expect(extractShippingRates(settings({ shippingRates: rates }))).toEqual(rates)
	})
})
