import { createClient } from '@sanity/client'
import { PRODUCT_AVAILABILITY_QUERY } from '../queries/sanity'
import { SANITY_API_VERSION } from './apiVersions'
import { type CartItem, useCartStore } from './cart'
import { maxPurchasableQuantity } from './purchasableQuantity'
import {
	resolveSanityCredentials,
	type SanityCredentials,
	serverTrustClientOptions,
} from './sanityEnvironment'

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

/**
 * Prunes cart items based on product availability, returns removed items.
 * Keeps items not in `requestedIds` unchanged. For requested items, clamps
 * quantity to the product's purchasable quantity (unique pieces cap at 1)
 * and removes items that are out of stock.
 * Returns `null` when no items needed removing (cart unchanged).
 *
 * @param items - Current cart line items
 * @param limits - Record of max quantities per product ID
 * @param requestedIds - IDs of products to check availability for
 * @param availability - Product availability keyed by product ID
 * @returns Pruned cart result, or `null` if no changes were needed
 */
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
		const maxQuantity = product ? maxPurchasableQuantity(product) : 0
		if (!product || maxQuantity <= 0) {
			removedItems.push(line.name)
			changed = true
			continue
		}
		const clampedQuantity = Math.min(line.quantity, maxQuantity)
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
		newLimits[line.id] = maxQuantity
	}

	if (!changed) return null
	return { items: newItems, limits: newLimits, removedItems }
}

/**
 * Fetches current product availability for the given product IDs.
 *
 * @param ids - Product IDs to look up
 * @returns Availability keyed by product ID (missing IDs are simply absent)
 */
export type FetchAvailability = (ids: string[]) => Promise<Record<string, ProductAvailability>>

/**
 * Maps Sanity query rows into the availability record used by pruning.
 *
 * @param matches - Rows returned by `PRODUCT_AVAILABILITY_QUERY`
 * @returns Availability keyed by product ID
 */
function toAvailabilityRecord(
	matches: Array<{
		_id: string
		name: string
		price: number
		stockLevel: number | null
		isUniquePiece: boolean | null
	}>,
): Record<string, ProductAvailability> {
	return Object.fromEntries(
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
}

/**
 * Fetches availability from Sanity using browser env vars. Reads published
 * content fresh from the API (never CDN, never drafts) so cart trimming can't
 * be driven by stale or unpublished data — same trust policy as checkout.
 *
 * @param ids - Product IDs to look up
 * @returns Availability keyed by product ID
 */
async function fetchAvailabilityFromSanity(
	ids: string[],
): Promise<Record<string, ProductAvailability>> {
	const credentials: SanityCredentials = resolveSanityCredentials((name) => import.meta.env[name])
	const client = createClient({
		...credentials,
		apiVersion: SANITY_API_VERSION,
		...serverTrustClientOptions,
	})
	const matches = await client.fetch(PRODUCT_AVAILABILITY_QUERY, { ids })
	return toAvailabilityRecord(matches)
}

/**
 * Fetches current product availability from Sanity and updates cart state.
 * Gets availability for all cart items via GROQ query, prunes the cart,
 * and updates the store. Returns array of removed item names.
 * Returns empty array if cart is empty or no items needed pruning.
 * The fetch step is injectable so tests can supply canned answers without
 * a network or env vars; production callers use the default unchanged.
 *
 * @param fetchAvailability - Availability source; defaults to live Sanity
 * @returns Promise array of removed item names, or empty array if no changes
 */
export async function checkCartFreshness(
	fetchAvailability: FetchAvailability = fetchAvailabilityFromSanity,
): Promise<string[]> {
	const state = useCartStore.getState()
	if (state.items.length === 0) return []

	const requestedIds = [...new Set(state.items.map((line) => line.id))]
	const availability = await fetchAvailability(requestedIds)

	const current = useCartStore.getState()
	const result = pruneCartToAvailability(current.items, current.limits, requestedIds, availability)
	if (!result) return []

	useCartStore.setState({ items: result.items, limits: result.limits })
	return result.removedItems
}
