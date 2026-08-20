import {
	type PickAnimated,
	type TransitionFn,
	useReducedMotion,
	useTransition,
} from '@react-spring/web'
import { type RefObject, useEffect, useMemo, useRef, useState } from 'react'
// `CheckoutState` lives in the component that renders it (`CartTotals`);
// importing the type here lets the hook own the state without duplicating the
// union in a second place.
import type { CheckoutState } from '../components/CartTotals'
import type { CartItem } from '../lib/cart'
import { useCartStore } from '../lib/cart'
import { type CartTotals, computeCartTotals } from '../lib/cartTotals'
import type { ShippingRate } from '../lib/shipping'
import { lockScroll, unlockScroll } from '../utils/scrollLock'

// Selector for every element inside the drawer that keyboard users can Tab to.
// Disabled controls are skipped, and [tabindex="-1"] elements (the backdrop) are
// deliberately excluded so Tab never lands on the invisible full-screen overlay.
const FOCUSABLE_SELECTOR =
	'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

// Returns every focusable element inside the drawer in DOM order, used by both
// the initial-focus and focus-trap effects.
function getFocusableElements(container: HTMLElement): HTMLElement[] {
	return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
}

// The complete contract between the hook and the UI layer. `CartDrawer` wires
// these into the trigger (triggerRef, totals.count, openCart) and hands the rest
// to `CartDrawerPanel` (transitions, drawerRef, items, limits, quantity/remove
// handlers, totals, checkoutState, closeCart, handleCheckout).
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

// The exact spring shape the drawer animates (slide-in x + fade). Naming the
// concrete transition type lets `CartDrawerPanel` accept the same type the hook
// produces, so the animated `style` values stay fully typed there too.
export type DrawerSpringState = { x: number; opacity: number }
export type DrawerTransitions = TransitionFn<boolean, PickAnimated<DrawerSpringState>>

/**
 * Owns the entire cart drawer lifecycle — open/close, Escape handling, scroll
 * locking, focus management, the spring animation, and cart totals — plus the
 * checkout flow.
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
	const [open, setOpen] = useState(false)
	const [checkoutState, setCheckoutState] = useState<CheckoutState>('idle')

	const triggerRef = useRef<HTMLButtonElement>(null)
	const drawerRef = useRef<HTMLDivElement>(null)
	// The element focus should return to when the drawer closes (the Cart button).
	const restoreFocusRef = useRef<HTMLElement | null>(null)
	// Keeps the latest `open` value readable inside the spring's onRest callback,
	// which is a closure that would otherwise capture a stale value.
	const openRef = useRef(open)
	openRef.current = open

	const reduceMotion = useReducedMotion()
	const transitions: DrawerTransitions = useTransition(open, {
		// The drawer slides in from the right (x: 384px) and fades.
		from: { x: 384, opacity: 0 },
		enter: { x: 0, opacity: 1 },
		leave: { x: 384, opacity: 0 },
		config: reduceMotion ? { duration: 0 } : { tension: 210, friction: 26 },
		// onRest fires every time an animation settles. When the leave animation
		// finishes (open is now false), the drawer node is about to unmount — this
		// is the right moment to hand focus back to the Cart button so it isn't
		// lost when the drawer tears down. The guard skips the enter animation.
		onRest: () => {
			if (openRef.current) return
			restoreFocusRef.current?.focus()
			restoreFocusRef.current = null
		},
	})

	// All cart arithmetic (count, subtotal, shipping, total) lives in the pure
	// `computeCartTotals` helper so it's independently testable; this memo just
	// recomputes it when the cart or shipping rates change.
	const totals = useMemo(() => computeCartTotals(items, shippingRates), [items, shippingRates])

	// On open: remember where focus was (the Cart button) and move focus into the
	// drawer — the first focusable element is the ✕ close button.
	useEffect(() => {
		if (!open) return
		restoreFocusRef.current = triggerRef.current
		const container = drawerRef.current
		if (!container) return
		const focusables = getFocusableElements(container)
		;(focusables[0] ?? container).focus()
	}, [open])

	// While open: trap keyboard focus inside the drawer, lock page scroll, and
	// close on Escape. The Tab handler wraps focus between the first and last
	// focusable elements, and also pulls focus back in if it ever ends up
	// outside the drawer.
	useEffect(() => {
		if (!open) return
		function onKeyDown(event: KeyboardEvent) {
			if (event.key === 'Escape') {
				setOpen(false)
				return
			}
			if (event.key !== 'Tab') return
			const container = drawerRef.current
			if (!container) return
			const focusables = getFocusableElements(container)
			if (focusables.length === 0) return
			const first = focusables[0]
			const last = focusables[focusables.length - 1]
			const current = document.activeElement
			if (event.shiftKey) {
				// Shift+Tab from the first element (or when focus escaped) → last.
				if (current === first || !container.contains(current)) {
					event.preventDefault()
					last.focus()
				}
			} else if (current === last || !container.contains(current)) {
				// Tab from the last element (or when focus escaped) → first.
				event.preventDefault()
				first.focus()
			}
		}
		document.addEventListener('keydown', onKeyDown)
		lockScroll()
		return () => {
			document.removeEventListener('keydown', onKeyDown)
			unlockScroll()
		}
	}, [open])

	function openCart() {
		setOpen(true)
	}

	// Closes the drawer and resets checkout state so a failed attempt isn't
	// replayed the next time it opens.
	function closeCart() {
		setOpen(false)
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
		transitions,
		triggerRef,
		drawerRef,
		totals,
		items,
		limits,
		setQuantity,
		remove,
	}
}
