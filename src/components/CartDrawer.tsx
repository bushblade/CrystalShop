import { useEffect, useMemo, useState } from 'react'
import { useCartStore } from '../lib/cart'
import { formatPrice } from '../lib/format'
import { pickShippingRate, type ShippingRate, totalShippableWeight } from '../lib/shipping'
import CartLineItem from './CartLineItem'
import CartTotals, { type CheckoutState } from './CartTotals'
import CartTrigger from './CartTrigger'

interface CartDrawerProps {
	shippingRates: ShippingRate[]
}

export default function CartDrawer({ shippingRates }: CartDrawerProps) {
	const items = useCartStore((state) => state.items)
	const limits = useCartStore((state) => state.limits)
	const setQuantity = useCartStore((state) => state.setQuantity)
	const remove = useCartStore((state) => state.remove)
	const [open, setOpen] = useState(false)
	const [checkoutState, setCheckoutState] = useState<CheckoutState>('idle')

	const count = useMemo(() => items.reduce((sum, item) => sum + item.quantity, 0), [items])
	const subtotal = useMemo(
		() => items.reduce((sum, item) => sum + item.price * item.quantity, 0),
		[items],
	)
	const hasHeavyItem = items.some((item) => item.deliveryMethod === 'arrange')
	const hasShippableItems = items.some((item) => item.deliveryMethod === 'post')
	const shippingRate = pickShippingRate(totalShippableWeight(items), shippingRates)
	const shippingTotal = hasShippableItems && shippingRate ? shippingRate.price : 0
	const shippingLabel = hasShippableItems ? formatPrice(shippingTotal) : 'To be arranged'
	const total = subtotal + shippingTotal

	useEffect(() => {
		if (!open) return
		function onKeyDown(event: KeyboardEvent) {
			if (event.key === 'Escape') setOpen(false)
		}
		document.addEventListener('keydown', onKeyDown)
		document.body.style.overflow = 'hidden'
		return () => {
			document.removeEventListener('keydown', onKeyDown)
			document.body.style.overflow = ''
		}
	}, [open])

	function closeCart() {
		setOpen(false)
		setCheckoutState('idle')
	}

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
			<CartTrigger count={count} onOpen={() => setOpen(true)} />
			{open ? (
				<div className="fixed inset-0 z-50">
					<button
						type="button"
						className="absolute inset-0 cursor-pointer bg-stone-900/40"
						onClick={closeCart}
						aria-label="Close cart"
					/>
					<aside
						role="dialog"
						aria-modal="true"
						aria-label="Shopping cart"
						className="absolute inset-y-0 right-0 flex w-full max-w-sm flex-col bg-white shadow-xl"
					>
						<div className="flex items-center justify-between border-b border-stone-200 px-6 py-4">
							<h2 className="font-display text-xl font-semibold text-stone-900">Your Cart</h2>
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
								subtotal={subtotal}
								shippingLabel={shippingLabel}
								total={total}
								hasHeavyItem={hasHeavyItem}
								checkoutState={checkoutState}
								onCheckout={handleCheckout}
							/>
						) : null}
					</aside>
				</div>
			) : null}
		</>
	)
}
