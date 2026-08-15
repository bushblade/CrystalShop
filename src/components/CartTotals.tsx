import { formatPrice } from '../lib/format'

export type CheckoutState = 'idle' | 'loading' | 'error'

interface CartTotalsProps {
	subtotal: number
	shippingLabel: string
	total: number
	hasHeavyItem: boolean
	checkoutState: CheckoutState
	onCheckout: () => void
}

export default function CartTotals({
	subtotal,
	shippingLabel,
	total,
	hasHeavyItem,
	checkoutState,
	onCheckout,
}: CartTotalsProps) {
	return (
		<div className="border-t border-stone-200 px-6 py-4">
			{hasHeavyItem ? (
				<p className="mb-4 rounded-md bg-stone-100 px-3 py-2 text-xs text-stone-600">
					Contains a piece too heavy for standard postage — we'll contact you to arrange collection
					or courier.
				</p>
			) : null}
			<div className="space-y-1 text-sm">
				<div className="flex justify-between text-stone-600">
					<span>Subtotal</span>
					<span>{formatPrice(subtotal)}</span>
				</div>
				<div className="flex justify-between text-stone-600">
					<span>Shipping</span>
					<span>{shippingLabel}</span>
				</div>
				<div className="flex justify-between border-t border-stone-100 pt-2 font-medium text-stone-900">
					<span>Total</span>
					<span>{formatPrice(total)}</span>
				</div>
			</div>
			<button
				type="button"
				onClick={onCheckout}
				disabled={checkoutState === 'loading'}
				className="mt-4 w-full cursor-pointer rounded-full bg-violet-700 px-8 py-3 font-medium text-white transition-colors hover:bg-violet-800 disabled:cursor-not-allowed disabled:opacity-50"
			>
				{checkoutState === 'loading' ? 'Taking you to checkout…' : 'Checkout'}
			</button>
			{checkoutState === 'error' ? (
				<p className="mt-2 text-center text-xs text-red-600">
					Something went wrong starting checkout. Please try again.
				</p>
			) : null}
		</div>
	)
}
