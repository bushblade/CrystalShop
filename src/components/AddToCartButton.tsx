import { useEffect, useRef, useState } from 'react'
import { type CartItem, useCartStore } from '../lib/cart'
import Tooltip from './ui/Tooltip'

interface AddToCartButtonProps {
	item: Omit<CartItem, 'quantity'>
	maxQuantity: number
}

export default function AddToCartButton({ item, maxQuantity }: AddToCartButtonProps) {
	const add = useCartStore((state) => state.add)
	const quantity = useCartStore(
		(state) => state.items.find((line) => line.id === item.id)?.quantity ?? 0,
	)
	const [added, setAdded] = useState(false)
	const timeoutRef = useRef<number | undefined>(undefined)
	const atMax = quantity >= maxQuantity

	useEffect(() => {
		return () => window.clearTimeout(timeoutRef.current)
	}, [])

	function handleAdd() {
		add(item, maxQuantity)
		setAdded(true)
		window.clearTimeout(timeoutRef.current)
		timeoutRef.current = window.setTimeout(() => setAdded(false), 1500)
	}

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
