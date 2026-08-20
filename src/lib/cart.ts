import { create } from 'zustand'
import { createJSONStorage, type PersistStorage, persist } from 'zustand/middleware'

export type CartImage = {
	url: string
	alt: string
}

export type CartItem = {
	id: string
	name: string
	slug: string
	price: number
	weightInGrams: number
	image: CartImage
	deliveryMethod: 'post' | 'arrange'
	quantity: number
}

type CartState = {
	items: CartItem[]
	limits: Record<string, number>
	addMany: (item: Omit<CartItem, 'quantity'>, quantity: number, maxQuantity: number) => void
	setQuantity: (id: string, quantity: number) => void
	remove: (id: string) => void
	clear: () => void
}

type PersistedCart = Pick<CartState, 'items' | 'limits'>

export const CART_STORAGE_KEY = 'eclipsia:cart'
const CART_VERSION = 2

/**
 * Parses cart from localStorage JSON, validates version and structure.
 * Expected JSON format includes `version` field (must match `CART_VERSION`),
 * and `state` with `items` array and `limits` object. Returns `null` if
 * the version is outdated or the structure is invalid.
 *
 * @param raw - JSON string from localStorage
 * @returns Persisted cart state `{items, limits}`, or `null` if invalid
 */
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

/**
 * Syncs cart state between persisted versions.
 * Compares `current` and `incoming` carts by JSON-stringifying both.
 * Returns `incoming` if the carts differ, or `null` if they are identical
 * (no sync needed).
 *
 * @param current - Current cart state from store
 * @param incoming - Incoming cart state from storage event
 * @returns `incoming` if different, `null` if identical
 */
export function syncCartFromStorage(
	current: PersistedCart,
	incoming: PersistedCart,
): PersistedCart | null {
	const currentJson = JSON.stringify(current)
	const incomingJson = JSON.stringify(incoming)
	if (currentJson === incomingJson) return null
	return incoming
}

/**
 * Creates Zustand cart store with persistence middleware.
 *
 * @param storage - zustand `PersistStorage` instance (typically
 *   `createJSONStorage(() => localStorage)`)
 * @returns Configured `CartState` store with persistence
 */
export function createCartStore(storage: PersistStorage<PersistedCart> | undefined) {
	return create<CartState>()(
		persist(
			(set) => ({
				items: [],
				limits: {},
				addMany: (item, quantity, maxQuantity) =>
					set((state) => {
						const limit = Math.max(1, maxQuantity)
						const amount = Math.max(1, Math.min(quantity, limit))
						const existing = state.items.find((line) => line.id === item.id)
						if (existing) {
							if (existing.quantity >= limit) return state
							return {
								items: state.items.map((line) =>
									line.id === item.id
										? { ...line, quantity: Math.min(existing.quantity + amount, limit) }
										: line,
								),
							}
						}
						return {
							items: [...state.items, { ...item, quantity: amount }],
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
