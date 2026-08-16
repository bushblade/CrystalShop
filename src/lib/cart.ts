import { create } from 'zustand'
import { createJSONStorage, type PersistStorage, persist } from 'zustand/middleware'

export type CartImage = {
	url: string
	alt: string
}

export type CartItem = {
	id: string
	name: string
	price: number
	weightInGrams: number
	image: CartImage
	deliveryMethod: 'post' | 'arrange'
	quantity: number
}

type CartState = {
	items: CartItem[]
	limits: Record<string, number>
	add: (item: Omit<CartItem, 'quantity'>, maxQuantity: number) => void
	setQuantity: (id: string, quantity: number) => void
	remove: (id: string) => void
	clear: () => void
}

type PersistedCart = Pick<CartState, 'items' | 'limits'>

export const CART_STORAGE_KEY = 'eclipsia:cart'
const CART_VERSION = 1

export function parsePersistedCart(raw: string): PersistedCart | null {
	try {
		const parsed = JSON.parse(raw) as {
			state?: { items?: unknown; limits?: unknown }
			version?: unknown
		}
		if (parsed.version !== CART_VERSION) return null
		const state = parsed.state
		if (
			!state ||
			!Array.isArray(state.items) ||
			typeof state.limits !== 'object' ||
			state.limits === null
		) {
			return null
		}
		return { items: state.items as CartItem[], limits: state.limits as Record<string, number> }
	} catch {
		return null
	}
}

export function syncCartFromStorage(
	current: PersistedCart,
	incoming: PersistedCart,
): PersistedCart | null {
	const currentJson = JSON.stringify(current)
	const incomingJson = JSON.stringify(incoming)
	if (currentJson === incomingJson) return null
	return incoming
}

export function createCartStore(storage: PersistStorage<PersistedCart> | undefined) {
	return create<CartState>()(
		persist(
			(set) => ({
				items: [],
				limits: {},
				add: (item, maxQuantity) =>
					set((state) => {
						const limit = Math.max(1, maxQuantity)
						const existing = state.items.find((line) => line.id === item.id)
						if (existing) {
							if (existing.quantity >= limit) return state
							return {
								items: state.items.map((line) =>
									line.id === item.id ? { ...line, quantity: line.quantity + 1 } : line,
								),
							}
						}
						return {
							items: [...state.items, { ...item, quantity: 1 }],
							limits: { ...state.limits, [item.id]: limit },
						}
					}),
				setQuantity: (id, quantity) =>
					set((state) => {
						if (quantity <= 0) {
							const limits = { ...state.limits }
							delete limits[id]
							return {
								items: state.items.filter((line) => line.id !== id),
								limits,
							}
						}
						const limit = state.limits[id]
						const clamped = limit === undefined ? quantity : Math.min(quantity, limit)
						return {
							items: state.items.map((line) =>
								line.id === id ? { ...line, quantity: clamped } : line,
							),
						}
					}),
				remove: (id) =>
					set((state) => {
						const limits = { ...state.limits }
						delete limits[id]
						return {
							items: state.items.filter((line) => line.id !== id),
							limits,
						}
					}),
				clear: () => set({ items: [], limits: {} }),
			}),
			{
				name: CART_STORAGE_KEY,
				version: CART_VERSION,
				partialize: (state) => ({ items: state.items, limits: state.limits }),
				storage,
			},
		),
	)
}

export const useCartStore = createCartStore(createJSONStorage(() => localStorage))

if (typeof window !== 'undefined') {
	window.addEventListener('storage', (event) => {
		if (event.storageArea !== window.localStorage || event.key !== CART_STORAGE_KEY) return
		const parsed =
			event.newValue === null ? { items: [], limits: {} } : parsePersistedCart(event.newValue)
		if (!parsed) return
		const update = syncCartFromStorage(useCartStore.getState(), parsed)
		if (update) useCartStore.setState(update)
	})
}
