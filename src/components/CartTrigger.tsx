import { useEffect, useState } from 'react'

interface CartTriggerProps {
	count: number
	onOpen: () => void
}

export default function CartTrigger({ count, onOpen }: CartTriggerProps) {
	const [hydrated, setHydrated] = useState(false)

	useEffect(() => {
		setHydrated(true)
	}, [])

	return (
		<button
			type="button"
			onClick={onOpen}
			className="flex cursor-pointer items-center gap-2 rounded-full bg-violet-700 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-violet-800"
		>
			<span>Cart</span>
			<span
				aria-hidden={!hydrated}
				className={`rounded-full bg-white/20 px-1.5 py-0.5 text-xs tabular-nums transition-opacity duration-300 ${
					hydrated ? 'opacity-100' : 'opacity-0'
				}`}
			>
				{count}
			</span>
		</button>
	)
}
