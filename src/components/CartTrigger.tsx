import { useEffect, useState } from 'react'
import { primaryButtonClasses } from './ui/buttonClasses'

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
			className={`${primaryButtonClasses} flex items-center gap-2 px-4 py-2 text-xs`}
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
