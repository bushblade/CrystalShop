import { useEffect, useRef, useState } from 'react'
import { type CartItem, useCartStore } from '../lib/cart'

interface AddToCartButtonProps {
	item: Omit<CartItem, 'quantity'>
	maxQuantity: number
}

export default function AddToCartButton({ item, maxQuantity }: AddToCartButtonProps) {
	const add = useCartStore((state) => state.add)
	const [added, setAdded] = useState(false)
	const timeoutRef = useRef<number | undefined>(undefined)

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
		<button
			type="button"
			onClick={handleAdd}
			className="cursor-pointer rounded-full bg-violet-700 px-8 py-3 font-medium text-white transition-colors hover:bg-violet-800"
		>
			{added ? 'Added ✓' : 'Add to cart'}
		</button>
	)
}
