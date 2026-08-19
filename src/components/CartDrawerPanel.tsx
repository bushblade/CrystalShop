import { animated } from '@react-spring/web'
import type { RefObject } from 'react'
import type { DrawerTransitions } from '../hooks/useCartDrawer'
import type { CartItem } from '../lib/cart'
import type { CartTotals as CartTotalsSummary } from '../lib/cartTotals'
import CartLineItem from './CartLineItem'
import CartTotals, { type CheckoutState } from './CartTotals'

// Every value rendered here arrives via props — no store, no state, no effects —
// so all drawer behavior stays owned by `useCartDrawer`.
interface CartDrawerPanelProps {
	transitions: DrawerTransitions
	drawerRef: RefObject<HTMLDivElement | null>
	items: CartItem[]
	limits: Record<string, number>
	setQuantity: (id: string, quantity: number) => void
	remove: (id: string) => void
	totals: CartTotalsSummary
	checkoutState: CheckoutState
	onClose: () => void
	onCheckout: () => void
}

// Pure presentational half of the cart drawer. Every value it renders comes in
// via props from `useCartDrawer` (via `CartDrawer`); this component owns no
// state, no store access, and no effects — just the drawer markup.
export default function CartDrawerPanel({
	transitions,
	drawerRef,
	items,
	limits,
	setQuantity,
	remove,
	totals,
	checkoutState,
	onClose,
	onCheckout,
}: CartDrawerPanelProps) {
	return (
		<>
			{/* useTransition keeps the drawer mounted during the leave animation, then
			    unmounts it — the hook's onRest restores focus exactly at that point. */}
			{transitions((style, item) =>
				item ? (
					<div ref={drawerRef} className="fixed inset-0 z-50">
						{/* Click-away backdrop. tabIndex={-1} keeps it out of the Tab
						    order so the focus trap only cycles through cart content. */}
						<animated.button
							type="button"
							tabIndex={-1}
							className="absolute inset-0 cursor-pointer bg-stone-900/40"
							onClick={onClose}
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
									onClick={onClose}
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
									onCheckout={onCheckout}
								/>
							) : null}
						</animated.aside>
					</div>
				) : null,
			)}
		</>
	)
}
