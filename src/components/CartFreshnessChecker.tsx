import { useEffect } from 'react'
import { toast } from 'react-toastify'
import { checkCartFreshness } from '../lib/cartFreshness'

function describeRemovals(removedItems: string[]): string {
	if (removedItems.length === 1) {
		return `${removedItems[0]} sold out while you were away and was removed from your cart.`
	}
	return `${removedItems.length} items in your cart sold out while you were away and were removed.`
}

export default function CartFreshnessChecker() {
	useEffect(() => {
		let cancelled = false
		checkCartFreshness().then((removedItems) => {
			if (cancelled || removedItems.length === 0) return
			toast(describeRemovals(removedItems))
		})
		return () => {
			cancelled = true
		}
	}, [])

	return null
}
