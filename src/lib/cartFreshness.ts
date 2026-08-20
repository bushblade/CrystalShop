import { createClient } from '@sanity/client'
import { PRODUCT_AVAILABILITY_QUERY } from '../queries/sanity'
import { SANITY_API_VERSION } from './apiVersions'
import { type CartItem, useCartStore } from './cart'

export type ProductAvailability = {
	name: string
	price: number
	stockLevel: number | null
	isUniquePiece: boolean | null
}

export type PruneResult = {
	items: CartItem[]
	limits: Record<string, number>
	removedItems: string[]
}

export function pruneCartToAvailability(
	items: CartItem[],
	limits: Record<string, number>,
	requestedIds: string[],
	availability: Record<string, ProductAvailability>,
): PruneResult | null {
	const newItems: CartItem[] = []
	const newLimits: Record<string, number> = {}
	const removedItems: string[] = []
	let changed = false

	for (const line of items) {
		if (!requestedIds.includes(line.id)) {
			newItems.push(line)
			if (line.id in limits) newLimits[line.id] = limits[line.id]
			continue
		}
		const product = availability[line.id]
		if (!product || (product.stockLevel ?? 0) <= 0) {
			removedItems.push(line.name)
			changed = true
			continue
		}
		const clampedQuantity = Math.min(line.quantity, product.stockLevel ?? 0)
		if (
			clampedQuantity !== line.quantity ||
			line.name !== product.name ||
			line.price !== product.price
		) {
			changed = true
		}
		newItems.push({
			...line,
			name: product.name,
			price: product.price,
			quantity: clampedQuantity,
		})
		newLimits[line.id] = product.stockLevel ?? 0
	}

	if (!changed) return null
	return { items: newItems, limits: newLimits, removedItems }
}

export async function checkCartFreshness(): Promise<string[]> {
	const state = useCartStore.getState()
	if (state.items.length === 0) return []

	const requestedIds = [...new Set(state.items.map((line) => line.id))]
	const client = createClient({
		projectId: import.meta.env.PUBLIC_SANITY_STUDIO_PROJECT_ID,
		dataset: import.meta.env.PUBLIC_SANITY_STUDIO_DATASET,
		apiVersion: SANITY_API_VERSION,
		useCdn: false,
	})

	const matches = await client.fetch(PRODUCT_AVAILABILITY_QUERY, { ids: requestedIds })
	const availability: Record<string, ProductAvailability> = Object.fromEntries(
		matches.map((match) => [
			match._id,
			{
				name: match.name,
				price: match.price,
				stockLevel: match.stockLevel,
				isUniquePiece: match.isUniquePiece,
			},
		]),
	)

	const current = useCartStore.getState()
	const result = pruneCartToAvailability(current.items, current.limits, requestedIds, availability)
	if (!result) return []

	useCartStore.setState({ items: result.items, limits: result.limits })
	return result.removedItems
}
