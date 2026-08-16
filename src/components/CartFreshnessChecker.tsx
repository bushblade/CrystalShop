import { useEffect } from 'react'
import { toast } from 'react-toastify'
import { checkCartFreshness } from '../lib/cartFreshness'

function describeRemovals(removedItems: string[]): string {
	if (removedItems.length === 1) {
		return `We're sorry — ${removedItems[0]} sold out while you were away, so we've removed it from your cart.`
	}
	return `We're sorry — ${removedItems.length} items sold out while you were away and were removed from your cart.`
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
