import { animated, useReducedMotion, useTransition } from '@react-spring/web'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useCartStore } from '../lib/cart'
import { computeCartTotals } from '../lib/cartTotals'
import type { ShippingRate } from '../lib/shipping'
import { lockScroll, unlockScroll } from '../utils/scrollLock'
import CartLineItem from './CartLineItem'
import CartTotals, { type CheckoutState } from './CartTotals'
import CartTrigger from './CartTrigger'

interface CartDrawerProps {
	shippingRates: ShippingRate[]
}

// Selector for every element inside the drawer that keyboard users can Tab to.
// Disabled controls are skipped, and [tabindex="-1"] elements (the backdrop) are
// deliberately excluded so Tab never lands on the invisible full-screen overlay.
const FOCUSABLE_SELECTOR =
	'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

function getFocusableElements(container: HTMLElement): HTMLElement[] {
	return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
}

export default function CartDrawer({ shippingRates }: CartDrawerProps) {
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
	const transitions = useTransition(open, {
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
			window.location.assign(data.url)
		} catch {
			setCheckoutState('error')
		}
	}

	return (
		<>
			<CartTrigger ref={triggerRef} count={totals.count} onOpen={openCart} />
			{/* useTransition keeps the drawer mounted during the leave animation, then
			    unmounts it — onRest (above) restores focus exactly at that point. */}
			{transitions((style, item) =>
				item ? (
					<div ref={drawerRef} className="fixed inset-0 z-50">
						{/* Click-away backdrop. tabIndex={-1} keeps it out of the Tab
						    order so the focus trap only cycles through cart content. */}
						<animated.button
							type="button"
							tabIndex={-1}
							className="absolute inset-0 cursor-pointer bg-stone-900/40"
							onClick={closeCart}
							aria-label="Close cart"
							style={{ opacity: style.opacity }}
						/>
						<animated.aside
							role="dialog"
							aria-modal="true"
							aria-label="Shopping cart"
							className="absolute inset-y-0 right-0 flex w-full max-w-sm flex-col bg-white shadow-xl"
							style={{
								transform: style.x.to((value) => `translateX(${value}px)`),
								opacity: style.opacity,
							}}
						>
							<div className="flex items-center justify-between border-b border-stone-200 px-6 py-4">
								<h2 className="font-display text-2xl font-semibold tracking-tight text-stone-950">
									Your Cart
								</h2>
								<button
									type="button"
									onClick={closeCart}
									className="cursor-pointer text-stone-400 transition-colors hover:text-stone-700"
									aria-label="Close cart"
								>
									✕
								</button>
							</div>
							{items.length > 0 ? (
								<ul className="flex-1 divide-y divide-stone-100 overflow-y-auto px-6">
									{items.map((item) => (
										<CartLineItem
											key={item.id}
											item={item}
											limit={limits[item.id] ?? item.quantity}
											onDecrease={() => setQuantity(item.id, item.quantity - 1)}
											onIncrease={() => setQuantity(item.id, item.quantity + 1)}
											onRemove={() => remove(item.id)}
										/>
									))}
								</ul>
							) : (
								<div className="flex flex-1 items-center justify-center px-6">
									<p className="text-center text-stone-500">Your cart is empty.</p>
								</div>
							)}
							{items.length > 0 ? (
								<CartTotals
									subtotal={totals.subtotal}
									shippingLabel={totals.shippingLabel}
									total={totals.total}
									needsArrangement={totals.needsArrangement}
									checkoutState={checkoutState}
									onCheckout={handleCheckout}
								/>
							) : null}
						</animated.aside>
					</div>
				) : null,
			)}
		</>
	)
}
