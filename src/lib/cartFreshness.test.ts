import { describe, expect, it } from 'vitest'

import type { CartItem } from './cart'
import { type ProductAvailability, pruneCartToAvailability } from './cartFreshness'

function makeItem(overrides: Partial<CartItem> = {}): CartItem {
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

function makeAvailability(overrides: Partial<ProductAvailability> = {}): ProductAvailability {
	return {
		name: 'Amethyst Cluster',
		price: 24,
		stockLevel: 5,
		isUniquePiece: false,
		...overrides,
	}
}

describe('pruneCartToAvailability', () => {
	it('removes a sold-out item and records its name', () => {
		const result = pruneCartToAvailability([makeItem()], { 'product-1': 1 }, ['product-1'], {
			'product-1': makeAvailability({ stockLevel: 0, isUniquePiece: true }),
		})
		expect(result).toEqual({ items: [], limits: {}, removedItems: ['Amethyst Cluster'] })
	})

	it('removes a product missing from availability (deleted)', () => {
		const result = pruneCartToAvailability([makeItem()], { 'product-1': 1 }, ['product-1'], {})
		expect(result).toEqual({ items: [], limits: {}, removedItems: ['Amethyst Cluster'] })
	})

	it('leaves items added after the request snapshot untouched', () => {
		const freshAdd = makeItem({
			id: 'product-2',
			name: 'Rose Quartz',
			quantity: 2,
		})
		const result = pruneCartToAvailability(
			[makeItem(), freshAdd],
			{ 'product-1': 1, 'product-2': 2 },
			['product-1'],
			{},
		)
		expect(result).toEqual({
			items: [freshAdd],
			limits: { 'product-2': 2 },
			removedItems: ['Amethyst Cluster'],
		})
	})

	it('clamps quantity and limit down to the available stock', () => {
		const result = pruneCartToAvailability(
			[makeItem({ quantity: 3 })],
			{ 'product-1': 3 },
			['product-1'],
			{ 'product-1': makeAvailability({ stockLevel: 1 }) },
		)
		expect(result).toEqual({
			items: [makeItem({ quantity: 1 })],
			limits: { 'product-1': 1 },
			removedItems: [],
		})
	})

	it('refreshes the stored price when the product price changed', () => {
		const result = pruneCartToAvailability(
			[makeItem({ price: 18 })],
			{ 'product-1': 1 },
			['product-1'],
			{ 'product-1': makeAvailability({ price: 22 }) },
		)
		expect(result).toEqual({
			items: [makeItem({ price: 22 })],
			limits: { 'product-1': 5 },
			removedItems: [],
		})
	})

	it('refreshes the stored name when the product name changed', () => {
		const result = pruneCartToAvailability(
			[makeItem({ name: 'Amethyst' })],
			{ 'product-1': 1 },
			['product-1'],
			{ 'product-1': makeAvailability({ name: 'Amethyst Cluster (2026)' }) },
		)
		expect(result).toEqual({
			items: [makeItem({ name: 'Amethyst Cluster (2026)' })],
			limits: { 'product-1': 5 },
			removedItems: [],
		})
	})

	it('returns null when nothing changed', () => {
		const result = pruneCartToAvailability(
			[makeItem({ quantity: 2 })],
			{ 'product-1': 2 },
			['product-1'],
			{ 'product-1': makeAvailability() },
		)
		expect(result).toBeNull()
	})

	it('updates price, name, and quantity in one pass', () => {
		const result = pruneCartToAvailability(
			[makeItem({ name: 'Amethyst', price: 18, quantity: 4 })],
			{ 'product-1': 4 },
			['product-1'],
			{ 'product-1': makeAvailability({ name: 'Amethyst Cluster', price: 22, stockLevel: 2 }) },
		)
		expect(result).toEqual({
			items: [makeItem({ name: 'Amethyst Cluster', price: 22, quantity: 2 })],
			limits: { 'product-1': 2 },
			removedItems: [],
		})
	})

	it('handles a mix of removal and clamping in one pass', () => {
		const result = pruneCartToAvailability(
			[
				makeItem(),
				makeItem({ id: 'product-2', name: 'Rose Quartz', quantity: 3 }),
				makeItem({
					id: 'product-3',
					name: 'Celestite',
					quantity: 2,
				}),
			],
			{ 'product-1': 1, 'product-2': 5, 'product-3': 2 },
			['product-1', 'product-2', 'product-3'],
			{
				'product-1': makeAvailability({ stockLevel: 0, isUniquePiece: true }),
				'product-2': makeAvailability({ name: 'Rose Quartz', stockLevel: 2 }),
				'product-3': makeAvailability({ name: 'Celestite', stockLevel: 2 }),
			},
		)
		expect(result).toEqual({
			items: [
				makeItem({ id: 'product-2', name: 'Rose Quartz', quantity: 2 }),
				makeItem({ id: 'product-3', name: 'Celestite', quantity: 2 }),
			],
			limits: { 'product-2': 2, 'product-3': 2 },
			removedItems: ['Amethyst Cluster'],
		})
	})
})
