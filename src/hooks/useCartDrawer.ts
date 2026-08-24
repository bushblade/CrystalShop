import type { PickAnimated, TransitionFn } from '@react-spring/web'
import { type RefObject, useMemo, useState } from 'react'
// `CheckoutState` lives in the component that renders it (`CartTotals`);
// importing the type here lets the hook own the state without duplicating the
// union in a second place.
import type { CheckoutState } from '../components/CartTotals'
import type { CartItem } from '../lib/cart'
import { useCartStore } from '../lib/cart'
import { type CartTotals, computeCartTotals } from '../lib/cartTotals'
import type { ShippingRate } from '../lib/shipping'
import { useOverlay } from './useOverlay'

// The exact spring shape the drawer animates (slide-in x + fade). Naming the
// concrete transition type lets `CartDrawerPanel` accept the same type the hook
// produces, so the animated `style` values stay fully typed there too.
export type DrawerSpringState = { x: number; opacity: number }
export type DrawerTransitions = TransitionFn<boolean, PickAnimated<DrawerSpringState>>

export interface UseCartDrawerReturn {
	open: boolean
	openCart: () => void
	closeCart: () => void
	checkoutState: CheckoutState
	handleCheckout: () => Promise<void>
	transitions: DrawerTransitions
	triggerRef: RefObject<HTMLButtonElement | null>
	drawerRef: RefObject<HTMLDivElement | null>
	totals: CartTotals
	items: CartItem[]
	limits: Record<string, number>
	setQuantity: (id: string, quantity: number) => void
	remove: (id: string) => void
}

/**
 * Owns the cart drawer's own concerns — open/close wiring, cart items/limits
 * with their mutators, derived totals, and the checkout flow.
 *
 * Everything generic to floating panels (animation, focus management, Escape,
 * focus trap, scroll lock) lives in {@link useOverlay}; this hook only adapts
 * its output to the drawer's vocabulary and layers checkout on top.
 *
 * The component layer stays presentational: `CartDrawer` wires this hook's
 * output into `CartTrigger` and hands the rest to `CartDrawerPanel`, neither of
 * which holds any state, store access, or effects of its own.
 *
 * @param shippingRates The configured shipping tiers used to compute cart
 *   totals. Supplied by the server-rendered `Layout.astro` page data.
 * @returns Everything the trigger and drawer panel need to render and behave:
 *   open/close controls, checkout state and handler, the spring transition
 *   object, DOM refs, cart items/limits with their mutators, and derived totals.
 *   See {@link UseCartDrawerReturn} for the full shape.
 */
export function useCartDrawer(shippingRates: ShippingRate[]): UseCartDrawerReturn {
	const items = useCartStore((state) => state.items)
	const limits = useCartStore((state) => state.limits)
	const setQuantity = useCartStore((state) => state.setQuantity)
	const remove = useCartStore((state) => state.remove)
	const [checkoutState, setCheckoutState] = useState<CheckoutState>('idle')

	// The drawer slides in from the right (x: 384px) and fades; it traps focus
	// and locks page scroll while open — both are drawer-specific behaviours.
	const { open, openOverlay, closeOverlay, transitions, triggerRef, panelRef } = useOverlay<
		DrawerSpringState,
		HTMLDivElement
	>(
		{ from: { x: 384, opacity: 0 }, enter: { x: 0, opacity: 1 }, leave: { x: 384, opacity: 0 } },
		{ trapFocus: true, lockScroll: true },
	)

	// All cart arithmetic (count, subtotal, shipping, total) lives in the pure
	// `computeCartTotals` helper so it's independently testable; this memo just
	// recomputes it when the cart or shipping rates change.
	const totals = useMemo(() => computeCartTotals(items, shippingRates), [items, shippingRates])

	function openCart() {
		openOverlay()
	}

	// Closes the drawer and resets checkout state so a failed attempt isn't
	// replayed the next time it opens.
	function closeCart() {
		closeOverlay()
		setCheckoutState('idle')
	}

	// Sends the cart to the Netlify function that creates a Stripe Checkout
	// Session, then redirects to Stripe. On any failure the drawer stays open
	// and shows an inline error (checkoutState === 'error').
	async function handleCheckout() {
		setCheckoutState('loading')
		try {
			const response = await fetch('/api/checkout', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					items: items.map((item) => ({ id: item.id, quantity: item.quantity })),
				}),
			})
			if (!response.ok) throw new Error(`Checkout failed: ${response.status}`)
			const data = (await response.json()) as { url: string }
			if (typeof data.url !== 'string' || data.url.length === 0) {
				throw new Error('Checkout failed: missing URL')
			}
			window.location.assign(data.url)
		} catch {
			setCheckoutState('error')
		}
	}

	return {
		open,
		openCart,
		closeCart,
		checkoutState,
		handleCheckout,
		transitions: transitions as DrawerTransitions,
		triggerRef,
		drawerRef: panelRef,
		totals,
		items,
		limits,
		setQuantity,
		remove,
	}
}
