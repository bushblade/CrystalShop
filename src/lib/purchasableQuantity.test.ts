import { describe, expect, it } from 'vitest'

import { maxPurchasableQuantity } from './purchasableQuantity'

describe('maxPurchasableQuantity', () => {
	it.each([
		['unique piece with surplus stock caps at one', { isUniquePiece: true, stockLevel: 3 }, 1],
		['unique piece with single stock stays at one', { isUniquePiece: true, stockLevel: 1 }, 1],
		['unique piece sold out cannot be bought', { isUniquePiece: true, stockLevel: 0 }, 0],
		[
			'unique piece with unknown stock counts as none',
			{ isUniquePiece: true, stockLevel: null },
			0,
		],
		['regular product caps at stock', { isUniquePiece: false, stockLevel: 3 }, 3],
		['regular product with one left stays at one', { isUniquePiece: false, stockLevel: 1 }, 1],
		['regular product sold out cannot be bought', { isUniquePiece: false, stockLevel: 0 }, 0],
		[
			'regular product with unknown stock counts as none',
			{ isUniquePiece: false, stockLevel: null },
			0,
		],
	])('%s', (_label, product, expected) => {
		expect(maxPurchasableQuantity(product)).toBe(expected)
	})

	it('treats missing fields as absent', () => {
		expect(maxPurchasableQuantity({})).toBe(0)
	})
})
