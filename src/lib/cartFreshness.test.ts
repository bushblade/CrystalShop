import { beforeEach, describe, expect, it, vi } from 'vitest'

import { type CartItem, useCartStore } from './cart'
import {
	checkCartFreshness,
	type ProductAvailability,
	pruneCartToAvailability,
} from './cartFreshness'

/**
 * Installs an in-memory localStorage stand-in before any import runs. The
 * cart store resolves its persist storage eagerly at module load, so the
 * stand-in must already be on `globalThis` by then — Node's built-in
 * localStorage exists but is unusable without `--localstorage-file`.
 */
// Runs before imports so the store's eager storage resolution finds it.
vi.hoisted(() => {
	const data: Record<string, string> = {}
	globalThis.localStorage = {
		getItem: (key: string) => data[key] ?? null,
		setItem: (key: string, value: string) => {
			data[key] = value
		},
		removeItem: (key: string) => {
			delete data[key]
		},
		clear: () => {
			for (const key of Object.keys(data)) delete data[key]
		},
		key: (index: number) => Object.keys(data)[index] ?? null,
		get length() {
			return Object.keys(data).length
		},
	} as Storage
})

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

	it('caps a unique piece at one even when stock is higher', () => {
		const result = pruneCartToAvailability(
			[makeItem({ quantity: 2 })],
			{ 'product-1': 2 },
			['product-1'],
			{ 'product-1': makeAvailability({ isUniquePiece: true, stockLevel: 5 }) },
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

describe('checkCartFreshness', () => {
	beforeEach(() => {
		globalThis.localStorage.clear()
		useCartStore.setState({ items: [], limits: {} })
	})

	it('returns no removals and skips fetching when the cart is empty', async () => {
		let fetchCalls = 0
		const removed = await checkCartFreshness(async () => {
			fetchCalls++
			return {}
		})
		expect(removed).toEqual([])
		expect(fetchCalls).toBe(0)
	})

	it('fetches once per distinct id and trims the store to availability', async () => {
		useCartStore.setState({
			items: [makeItem(), makeItem({ id: 'product-2', name: 'Rose Quartz', quantity: 3 })],
			limits: { 'product-1': 1, 'product-2': 3 },
		})
		const requestedIds: string[][] = []
		const removed = await checkCartFreshness(async (ids) => {
			requestedIds.push(ids)
			return {
				'product-1': makeAvailability({ stockLevel: 0 }),
				'product-2': makeAvailability({ name: 'Rose Quartz', stockLevel: 2 }),
			}
		})
		expect(requestedIds).toEqual([['product-1', 'product-2']])
		expect(removed).toEqual(['Amethyst Cluster'])
		expect(useCartStore.getState().items).toEqual([
			makeItem({ id: 'product-2', name: 'Rose Quartz', quantity: 2 }),
		])
		expect(useCartStore.getState().limits).toEqual({ 'product-2': 2 })
	})

	it('leaves the store untouched and reports nothing when everything matches', async () => {
		useCartStore.setState({ items: [makeItem()], limits: { 'product-1': 5 } })
		const removed = await checkCartFreshness(async () => ({
			'product-1': makeAvailability(),
		}))
		expect(removed).toEqual([])
		expect(useCartStore.getState().items).toEqual([makeItem()])
		expect(useCartStore.getState().limits).toEqual({ 'product-1': 5 })
	})

	it('keeps items added while the fetch was in flight', async () => {
		useCartStore.setState({ items: [makeItem()], limits: { 'product-1': 1 } })
		const freshAdd = makeItem({ id: 'product-2', name: 'Rose Quartz' })
		const removed = await checkCartFreshness(async () => {
			useCartStore.setState({
				items: [makeItem(), freshAdd],
				limits: { 'product-1': 1, 'product-2': 2 },
			})
			return {}
		})
		expect(removed).toEqual(['Amethyst Cluster'])
		expect(useCartStore.getState().items).toEqual([freshAdd])
		expect(useCartStore.getState().limits).toEqual({ 'product-2': 2 })
	})
})
