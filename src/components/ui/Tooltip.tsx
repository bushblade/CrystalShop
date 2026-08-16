import type { ReactNode } from 'react'

interface TooltipProps {
	label: string
	visible?: boolean
	id?: string
	children: ReactNode
}

export default function Tooltip({ label, visible = true, id, children }: TooltipProps) {
	return (
		<span className="group relative inline-block">
			{children}
			{visible ? (
				<span
					id={id}
					role="tooltip"
					className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 -translate-x-1/2 whitespace-nowrap rounded-md bg-stone-900 px-2 py-1 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100"
				>
					{label}
				</span>
			) : null}
		</span>
	)
}
