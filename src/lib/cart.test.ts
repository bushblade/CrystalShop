import { describe, expect, it } from 'vitest'

import { createJSONStorage, type StateStorage } from 'zustand/middleware'

import { type CartItem, createCartStore } from './cart'

function createFakeStorage(initial: Record<string, string> = {}) {
	const data: Record<string, string> = { ...initial }
	const storage: StateStorage = {
		getItem: (name) => data[name] ?? null,
		setItem: (name, value) => {
			data[name] = value
		},
		removeItem: (name) => {
			delete data[name]
		},
	}
	return { storage, data }
}

function makeStore() {
	const { storage } = createFakeStorage()
	return { store: createCartStore(createJSONStorage(() => storage)), storage }
}

function makeItem(overrides: Partial<CartItem> = {}): Omit<CartItem, 'quantity'> {
	return {
		id: 'product-1',
		name: 'Amethyst Cluster',
		price: 24,
		weightInGrams: 400,
		image: { url: 'https://example.com/amethyst.jpg', alt: 'Amethyst cluster' },
		deliveryMethod: 'post',
		...overrides,
	}
}

describe('add', () => {
	it('appends a new item with quantity 1', () => {
		const { store } = makeStore()
		store.getState().add(makeItem(), 3)
		expect(store.getState().items).toEqual([{ ...makeItem(), quantity: 1 }])
	})

	it('increments quantity when the same id is added again', () => {
		const { store } = makeStore()
		store.getState().add(makeItem(), 3)
		store.getState().add(makeItem(), 3)
		expect(store.getState().items).toHaveLength(1)
		expect(store.getState().items[0].quantity).toBe(2)
	})

	it('clamps quantity at maxQuantity', () => {
		const { store } = makeStore()
		store.getState().add(makeItem(), 2)
		store.getState().add(makeItem(), 2)
		store.getState().add(makeItem(), 2)
		expect(store.getState().items[0].quantity).toBe(2)
	})

	it('is a no-op when already at the cap', () => {
		const { store } = makeStore()
		store.getState().add(makeItem(), 1)
		store.getState().add(makeItem(), 1)
		expect(store.getState().items).toEqual([{ ...makeItem(), quantity: 1 }])
	})

	it('records the per-item limit', () => {
		const { store } = makeStore()
		store.getState().add(makeItem(), 2)
		expect(store.getState().limits).toEqual({ 'product-1': 2 })
	})
})

describe('setQuantity', () => {
	it('sets a quantity within the limit', () => {
		const { store } = makeStore()
		store.getState().add(makeItem(), 5)
		store.getState().setQuantity('product-1', 3)
		expect(store.getState().items[0].quantity).toBe(3)
	})

	it('clamps a quantity above the limit', () => {
		const { store } = makeStore()
		store.getState().add(makeItem(), 2)
		store.getState().setQuantity('product-1', 10)
		expect(store.getState().items[0].quantity).toBe(2)
	})

	it('caps unique pieces at 1', () => {
		const { store } = makeStore()
		store.getState().add(makeItem(), 1)
		store.getState().setQuantity('product-1', 2)
		expect(store.getState().items[0].quantity).toBe(1)
	})

	it('removes the line at quantity 0', () => {
		const { store } = makeStore()
		store.getState().add(makeItem(), 5)
		store.getState().setQuantity('product-1', 0)
		expect(store.getState().items).toEqual([])
		expect(store.getState().limits).toEqual({})
	})
})

describe('remove', () => {
	it('removes only the matching line and its limit', () => {
		const { store } = makeStore()
		store.getState().add(makeItem(), 3)
		store.getState().add(makeItem({ id: 'product-2', name: 'Rose Quartz' }), 1)
		store.getState().remove('product-1')
		expect(store.getState().items.map((line) => line.id)).toEqual(['product-2'])
		expect(store.getState().limits).toEqual({ 'product-2': 1 })
	})
})

describe('clear', () => {
	it('empties items and limits', () => {
		const { store } = makeStore()
		store.getState().add(makeItem(), 2)
		store.getState().add(makeItem({ id: 'product-2', name: 'Rose Quartz' }), 1)
		store.getState().clear()
		expect(store.getState().items).toEqual([])
		expect(store.getState().limits).toEqual({})
	})
})

describe('persistence', () => {
	it('rehydrates items and limits on a new store over the same storage', () => {
		const { storage } = createFakeStorage()
		const first = createCartStore(createJSONStorage(() => storage))
		first.getState().add(makeItem(), 2)
		first.getState().add(makeItem({ id: 'product-2', name: 'Rose Quartz' }), 1)

		const second = createCartStore(createJSONStorage(() => storage))
		expect(second.getState().items).toHaveLength(2)
		expect(second.getState().items[0]).toEqual({ ...makeItem(), quantity: 1 })
		expect(second.getState().limits).toEqual({ 'product-1': 2, 'product-2': 1 })
	})

	it('loads empty when the stored value is corrupt', () => {
		const { storage } = createFakeStorage({ 'eclipsia:cart': 'not-json{' })
		const store = createCartStore(createJSONStorage(() => storage))
		expect(store.getState().items).toEqual([])
		expect(store.getState().limits).toEqual({})
	})
})
