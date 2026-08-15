import type { CartItem } from '../lib/cart'
import { formatPrice } from '../lib/format'

interface CartLineItemProps {
	item: CartItem
	limit: number
	onDecrease: () => void
	onIncrease: () => void
	onRemove: () => void
}

const stepperClasses =
	'cursor-pointer rounded-md border border-stone-300 px-2 text-sm leading-6 text-stone-700 transition-colors hover:border-violet-700 hover:text-violet-700 disabled:cursor-not-allowed disabled:opacity-40'

export default function CartLineItem({
	item,
	limit,
	onDecrease,
	onIncrease,
	onRemove,
}: CartLineItemProps) {
	return (
		<li className="flex gap-4 py-4">
			<img
				src={item.image.url}
				alt={item.image.alt}
				loading="lazy"
				className="h-16 w-16 shrink-0 rounded-md object-cover"
			/>
			<div className="flex flex-1 flex-col">
				<span className="text-sm font-medium text-stone-900">{item.name}</span>
				<span className="text-xs text-stone-500">{formatPrice(item.price)} each</span>
				<div className="mt-auto flex items-center gap-2">
					<button
						type="button"
						onClick={onDecrease}
						className={stepperClasses}
						aria-label={`Decrease quantity of ${item.name}`}
					>
						−
					</button>
					<span className="w-6 text-center text-sm tabular-nums text-stone-800">
						{item.quantity}
					</span>
					<button
						type="button"
						onClick={onIncrease}
						disabled={item.quantity >= limit}
						className={stepperClasses}
						aria-label={`Increase quantity of ${item.name}`}
					>
						+
					</button>
					<button
						type="button"
						onClick={onRemove}
						className="ml-auto cursor-pointer text-xs text-stone-400 transition-colors hover:text-violet-700"
					>
						Remove
					</button>
				</div>
			</div>
			<span className="text-sm font-medium text-stone-900">
				{formatPrice(item.price * item.quantity)}
			</span>
		</li>
	)
}
