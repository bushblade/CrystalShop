import { describe, expect, it } from 'vitest'

import {
	getCartShipping,
	pickShippingRate,
	type ShippableItem,
	type ShippingRate,
	totalShippableWeight,
} from './shipping'

const seedRates: ShippingRate[] = [
	{ name: 'Standard', maxWeightGrams: 1000, price: 4.5 },
	{ name: 'Medium', maxWeightGrams: 2000, price: 6.5 },
	{ name: 'Large', maxWeightGrams: null, price: 9.5 },
]

describe('pickShippingRate', () => {
	it('returns the first tier for a weight below its max', () => {
		expect(pickShippingRate(500, seedRates)?.name).toBe('Standard')
	})

	it('returns the first tier when weight is exactly at its max', () => {
		expect(pickShippingRate(1000, seedRates)?.name).toBe('Standard')
	})

	it('returns the second tier for a weight between tiers', () => {
		expect(pickShippingRate(1500, seedRates)?.name).toBe('Medium')
	})

	it('returns the second tier when weight is exactly at its max', () => {
		expect(pickShippingRate(2000, seedRates)?.name).toBe('Medium')
	})

	it('returns the open catch-all for a weight above the last closed tier', () => {
		expect(pickShippingRate(2500, seedRates)?.name).toBe('Large')
	})

	it('returns the open catch-all for a very heavy weight', () => {
		expect(pickShippingRate(50000, seedRates)?.name).toBe('Large')
	})

	it('returns the first tier for zero weight', () => {
		expect(pickShippingRate(0, seedRates)?.name).toBe('Standard')
	})

	it('returns the catch-all when maxWeightGrams is null (GROQ/seed shape)', () => {
		const nullRates: ShippingRate[] = [
			{ name: 'Standard', maxWeightGrams: 1000, price: 4.5 },
			{ name: 'Large', maxWeightGrams: null, price: 9.5 },
		]
		expect(pickShippingRate(2000, nullRates)?.name).toBe('Large')
	})

	it('returns null for empty rates', () => {
		expect(pickShippingRate(1000, [])).toBeNull()
	})

	it('returns null when no tier matches and there is no open band', () => {
		const closedRates: ShippingRate[] = [
			{ name: 'Standard', maxWeightGrams: 1000, price: 4.5 },
			{ name: 'Medium', maxWeightGrams: 2000, price: 6.5 },
		]
		expect(pickShippingRate(2500, closedRates)).toBeNull()
	})

	it('matches a single bounded tier within range', () => {
		const singleRate: ShippingRate[] = [{ name: 'Flat', maxWeightGrams: 500, price: 3 }]
		expect(pickShippingRate(499, singleRate)?.name).toBe('Flat')
	})

	it('returns null for a weight above a single bounded tier', () => {
		const singleRate: ShippingRate[] = [{ name: 'Flat', maxWeightGrams: 500, price: 3 }]
		expect(pickShippingRate(501, singleRate)).toBeNull()
	})
})

describe('totalShippableWeight', () => {
	const post = (weightInGrams: number, quantity?: number): ShippableItem => ({
		weightInGrams,
		deliveryMethod: 'post',
		quantity,
	})
	const arrange = (weightInGrams: number): ShippableItem => ({
		weightInGrams,
		deliveryMethod: 'arrange',
	})

	it('sums the weight of all post items', () => {
		expect(totalShippableWeight([post(500), post(1500)])).toBe(2000)
	})

	it('excludes arrange items', () => {
		expect(totalShippableWeight([post(500), arrange(12000)])).toBe(500)
	})

	it('returns 0 for an arrange-only cart', () => {
		expect(totalShippableWeight([arrange(12000), arrange(8000)])).toBe(0)
	})

	it('multiplies weight by quantity', () => {
		expect(totalShippableWeight([post(500, 2), post(1000, 3)])).toBe(4000)
	})

	it('treats a missing quantity as 1', () => {
		expect(totalShippableWeight([post(500), post(500, undefined)])).toBe(1000)
	})

	it('returns 0 for an empty list', () => {
		expect(totalShippableWeight([])).toBe(0)
	})
})

describe('getCartShipping', () => {
	const post = (weightInGrams: number, quantity?: number): ShippableItem => ({
		weightInGrams,
		deliveryMethod: 'post',
		quantity,
	})
	const arrange = (weightInGrams: number): ShippableItem => ({
		weightInGrams,
		deliveryMethod: 'arrange',
	})

	it('applies for an all-post cart within a tier', () => {
		const decision = getCartShipping([post(500), post(400)], seedRates)
		expect(decision.applies).toBe(true)
		expect(decision.rate?.name).toBe('Standard')
	})

	it('applies with the catch-all for a heavy all-post cart', () => {
		const decision = getCartShipping([post(3000)], seedRates)
		expect(decision.applies).toBe(true)
		expect(decision.rate?.name).toBe('Large')
	})

	it('does not apply when the cart has an arrange item', () => {
		expect(getCartShipping([post(500), arrange(12000)], seedRates).applies).toBe(false)
	})

	it('does not apply for an arrange-only cart', () => {
		expect(getCartShipping([arrange(12000)], seedRates).applies).toBe(false)
	})

	it('does not apply when the total weight exceeds every closed tier', () => {
		const closedRates: ShippingRate[] = [
			{ name: 'Standard', maxWeightGrams: 1000, price: 4.5 },
			{ name: 'Medium', maxWeightGrams: 2000, price: 6.5 },
		]
		expect(getCartShipping([post(2500)], closedRates).applies).toBe(false)
	})

	it('does not apply when rates are not configured', () => {
		expect(getCartShipping([post(500)], []).applies).toBe(false)
	})

	it('returns no rate when shipping does not apply', () => {
		const decision = getCartShipping([arrange(12000)], seedRates)
		expect(decision.applies).toBe(false)
		expect(decision.rate).toBeNull()
	})

	it('returns a rate only when shipping applies', () => {
		const decision = getCartShipping([post(1500)], seedRates)
		expect(decision.applies).toBe(true)
		expect(decision.rate).not.toBeNull()
	})

	it('does not apply for an empty cart', () => {
		expect(getCartShipping([], seedRates).applies).toBe(false)
	})
})
