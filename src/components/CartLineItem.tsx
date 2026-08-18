import type { CartItem } from '../lib/cart'
import { formatPrice } from '../lib/format'
import { imageUrl } from '../lib/images'
import QuantityStepper from './ui/QuantityStepper'

interface CartLineItemProps {
	item: CartItem
	limit: number
	onDecrease: () => void
	onIncrease: () => void
	onRemove: () => void
}

export default function CartLineItem({
	item,
	limit,
	onDecrease,
	onIncrease,
	onRemove,
}: CartLineItemProps) {
	const productUrl = `/shop/product/${item.slug}`

	return (
		<li className="flex gap-4 py-4">
			<a href={productUrl} className="shrink-0" aria-label={`View ${item.name}`}>
				<img
					src={imageUrl(item.image.url, 128) ?? ''}
					alt={item.image.alt}
					loading="lazy"
					className="h-16 w-16 rounded-sm border border-stone-200 object-cover transition-opacity hover:opacity-80"
				/>
			</a>
			<div className="flex flex-1 flex-col">
				<a
					href={productUrl}
					className="text-sm font-medium text-stone-900 transition-colors hover:text-violet-700"
				>
					{item.name}
				</a>
				<span className="text-xs text-stone-500">{formatPrice(item.price)} each</span>
				<div className="mt-auto flex items-center gap-2">
					<QuantityStepper
						value={item.quantity}
						max={limit}
						label={item.name}
						onDecrease={onDecrease}
						onIncrease={onIncrease}
					/>
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
