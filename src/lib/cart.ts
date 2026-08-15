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
				name: 'eclipsia:cart',
				version: 1,
				partialize: (state) => ({ items: state.items, limits: state.limits }),
				storage,
			},
		),
	)
}

export const useCartStore = createCartStore(createJSONStorage(() => localStorage))
