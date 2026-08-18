import { useEffect, useRef, useState } from 'react'
import { type CartItem, useCartStore } from '../lib/cart'
import QuantityStepper from './ui/QuantityStepper'
import Tooltip from './ui/Tooltip'

interface AddToCartButtonProps {
	item: Omit<CartItem, 'quantity'>
	maxQuantity: number
	stockLevel: number
	isUniquePiece: boolean
}

const LOW_STOCK_THRESHOLD = 3

export default function AddToCartButton({
	item,
	maxQuantity,
	stockLevel,
	isUniquePiece,
}: AddToCartButtonProps) {
	const addMany = useCartStore((state) => state.addMany)
	const inCart = useCartStore(
		(state) => state.items.find((line) => line.id === item.id)?.quantity ?? 0,
	)
	const [selected, setSelected] = useState(1)
	const [added, setAdded] = useState(false)
	const timeoutRef = useRef<number | undefined>(undefined)

	const available = Math.max(0, maxQuantity - inCart)
	const atMax = inCart >= maxQuantity
	const clampedSelected = Math.min(selected, Math.max(1, available))

	useEffect(() => {
		return () => window.clearTimeout(timeoutRef.current)
	}, [])

	function handleAdd() {
		addMany(item, clampedSelected, maxQuantity)
		setAdded(true)
		setSelected(1)
		window.clearTimeout(timeoutRef.current)
		timeoutRef.current = window.setTimeout(() => setAdded(false), 1500)
	}

	if (isUniquePiece) {
		return (
			<Tooltip label="This item has already been added to your cart" visible={atMax}>
				<button
					type="button"
					onClick={handleAdd}
					disabled={atMax}
					className="cursor-pointer rounded-full bg-violet-700 px-8 py-3 font-medium text-white transition-colors hover:bg-violet-800 disabled:cursor-not-allowed disabled:bg-stone-200 disabled:text-stone-600 disabled:hover:bg-stone-200"
				>
					{added ? 'Added ✓' : atMax ? 'In cart' : 'Add to cart'}
				</button>
			</Tooltip>
		)
	}

	return (
		<div className="space-y-3">
			<div className="text-sm">
				{atMax ? (
					<p className="font-medium text-stone-500">
						All {stockLevel} {stockLevel === 1 ? 'item' : 'items'} in your cart
					</p>
				) : available <= LOW_STOCK_THRESHOLD ? (
					<p className="font-medium text-violet-700">Only {available} left</p>
				) : (
					<p className="text-stone-600">{available} in stock</p>
				)}
				{inCart > 0 ? <p className="mt-0.5 text-xs text-stone-500">In cart: {inCart}</p> : null}
			</div>
			<div className="flex items-center gap-4">
				<QuantityStepper
					value={clampedSelected}
					max={available}
					label={item.name}
					disabled={atMax}
					onDecrease={() => setSelected((value) => Math.max(1, value - 1))}
					onIncrease={() => setSelected((value) => Math.min(available, value + 1))}
				/>
				<Tooltip label="This item has already been added to your cart" visible={atMax}>
					<button
						type="button"
						onClick={handleAdd}
						disabled={atMax}
						className="cursor-pointer rounded-full bg-violet-700 px-8 py-3 font-medium text-white transition-colors hover:bg-violet-800 disabled:cursor-not-allowed disabled:bg-stone-200 disabled:text-stone-600 disabled:hover:bg-stone-200"
					>
						{added
							? 'Added ✓'
							: atMax
								? 'In cart'
								: clampedSelected > 1
									? `Add ${clampedSelected} to cart`
									: 'Add to cart'}
					</button>
				</Tooltip>
			</div>
		</div>
	)
}
