import { useEffect, useRef, useState } from 'react'
import { checkCartFreshness } from '../lib/cartFreshness'

const TOAST_DURATION_MS = 6000

function describeRemovals(removedItems: string[]): string {
	if (removedItems.length === 1) {
		return `${removedItems[0]} sold out while you were away and was removed from your cart.`
	}
	return `${removedItems.length} items in your cart sold out while you were away and were removed.`
}

export default function CartFreshnessChecker() {
	const [message, setMessage] = useState<string | null>(null)
	const timeoutRef = useRef<number | undefined>(undefined)

	useEffect(() => {
		let cancelled = false
		checkCartFreshness().then((removedItems) => {
			if (cancelled || removedItems.length === 0) return
			setMessage(describeRemovals(removedItems))
			timeoutRef.current = window.setTimeout(() => setMessage(null), TOAST_DURATION_MS)
		})
		return () => {
			cancelled = true
			window.clearTimeout(timeoutRef.current)
		}
	}, [])

	if (!message) return null

	return (
		<div
			role="status"
			className="fixed left-1/2 top-4 z-60 w-max max-w-[90vw] -translate-x-1/2 rounded-lg bg-stone-900 px-4 py-3 text-sm text-white shadow-lg"
		>
			<div className="flex items-center gap-3">
				<p>{message}</p>
				<button
					type="button"
					onClick={() => setMessage(null)}
					aria-label="Dismiss notification"
					className="shrink-0 cursor-pointer text-stone-300 transition-colors hover:text-white"
				>
					✕
				</button>
			</div>
		</div>
	)
}
