import { describe, expect, it } from 'vitest'

import type { CartItem } from './cart'
import { computeCartTotals } from './cartTotals'
import type { ShippingRate } from './shipping'

// Mirrors the seed rates used across the app: three postage tiers where
// 'Large' is the unbounded catch-all (maxWeightGrams null).
const seedRates: ShippingRate[] = [
	{ name: 'Standard', maxWeightGrams: 1000, price: 4.5 },
	{ name: 'Medium', maxWeightGrams: 2000, price: 6.5 },
	{ name: 'Large', maxWeightGrams: null, price: 9.5 },
]

// Builds a postable cart line, mirroring the factory used in cart.test.ts.
function makePost(overrides: Partial<CartItem> = {}): CartItem {
	return {
		id: 'product-1',
		name: 'Amethyst Cluster',
		slug: 'amethyst-cluster',
		price: 24,
		weightInGrams: 400,
		image: { url: 'https://example.com/amethyst.jpg', alt: 'Amethyst cluster' },
		deliveryMethod: 'post',
		quantity: 1,
		...overrides,
	}
}

// Builds an arrange-only line (collection/courier arranged with the owner).
function makeArrange(overrides: Partial<CartItem> = {}): CartItem {
	return makePost({ deliveryMethod: 'arrange', ...overrides })
}

describe('computeCartTotals', () => {
	it('returns zeroed totals for an empty cart', () => {
		const totals = computeCartTotals([], seedRates)
		expect(totals).toEqual({
			count: 0,
			subtotal: 0,
			shippingTotal: 0,
			shippingLabel: 'To be arranged',
			needsArrangement: true,
			total: 0,
		})
	})

	it('counts units and subtotal across multiple post lines', () => {
		const totals = computeCartTotals(
			[
				makePost({ id: 'a', price: 24, quantity: 2 }),
				makePost({ id: 'b', price: 10, quantity: 3 }),
			],
			seedRates,
		)
		expect(totals.count).toBe(5)
		expect(totals.subtotal).toBe(24 * 2 + 10 * 3)
	})

	it('applies the matching shipping tier for a post-only cart within range', () => {
		const totals = computeCartTotals([makePost({ weightInGrams: 500 })], seedRates)
		expect(totals.needsArrangement).toBe(false)
		expect(totals.shippingTotal).toBe(4.5)
		expect(totals.shippingLabel).toBe('£4.50')
		expect(totals.total).toBe(24 + 4.5)
	})

	it('uses the catch-all rate for a heavy post-only cart', () => {
		const totals = computeCartTotals([makePost({ weightInGrams: 3000 })], seedRates)
		expect(totals.needsArrangement).toBe(false)
		expect(totals.shippingTotal).toBe(9.5)
		expect(totals.total).toBe(24 + 9.5)
	})

	it('handles an arrange-only cart as needing arrangement with no shipping', () => {
		const totals = computeCartTotals([makeArrange({ price: 100 })], seedRates)
		expect(totals.needsArrangement).toBe(true)
		expect(totals.shippingTotal).toBe(0)
		expect(totals.shippingLabel).toBe('To be arranged')
		expect(totals.total).toBe(100)
	})

	it('handles a mixed post + arrange cart as needing arrangement', () => {
		const totals = computeCartTotals(
			[makePost({ weightInGrams: 500 }), makeArrange({ id: 'arrange', price: 50 })],
			seedRates,
		)
		expect(totals.needsArrangement).toBe(true)
		expect(totals.shippingTotal).toBe(0)
		expect(totals.total).toBe(24 + 50)
	})

	it('treats a cart with no configured rates as needing arrangement', () => {
		const totals = computeCartTotals([makePost({ weightInGrams: 500 })], [])
		expect(totals.needsArrangement).toBe(true)
		expect(totals.shippingTotal).toBe(0)
		expect(totals.total).toBe(24)
	})
})
