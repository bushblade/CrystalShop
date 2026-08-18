import type { CartItem } from './cart'
import { formatPrice } from './format'
import { getCartShipping, type ShippingRate } from './shipping'

// Pure, presentation-independent summary of a cart. Every value here is derived
// from the cart's `items` plus the configured `shippingRates` — no store, no
// React, no environment — so the whole module is unit-testable in isolation.
//
// `CartDrawer` computes this once (memoized) and feeds the derived numbers into
// `CartTrigger` and `CartTotals`. Keeping the arithmetic here means the drawer
// stays focused on composition/presentation, and the totals can never drift
// from the shipping logic they're built on.
export interface CartTotals {
	// Total number of physical units across all line items (sum of quantities).
	count: number
	// Sum of price * quantity for every line, before shipping.
	subtotal: number
	// Shipping cost when a tier applies, otherwise 0 (order is arranged).
	shippingTotal: number
	// Human-readable shipping line: the formatted tier price, or
	// 'To be arranged' when no tier applies (empty/arrange/missing-rates carts).
	shippingLabel: string
	// True when the order can't go by standard postage (any arrange item,
	// overweight total, or unconfigured rates) — the owner arranges delivery.
	needsArrangement: boolean
	// Grand total the buyer pays: subtotal + shippingTotal.
	total: number
}

// Derives the full cart summary from the current line items and shipping rates.
export function computeCartTotals(items: CartItem[], shippingRates: ShippingRate[]): CartTotals {
	const count = items.reduce((sum, item) => sum + item.quantity, 0)
	const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0)
	const shipping = getCartShipping(items, shippingRates)
	const needsArrangement = !shipping.applies
	const shippingTotal = shipping.applies && shipping.rate ? shipping.rate.price : 0
	const shippingLabel =
		shipping.applies && shipping.rate ? formatPrice(shipping.rate.price) : 'To be arranged'
	const total = subtotal + shippingTotal

	return { count, subtotal, shippingTotal, shippingLabel, needsArrangement, total }
}
