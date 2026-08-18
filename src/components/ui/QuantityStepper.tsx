interface QuantityStepperProps {
	value: number
	max: number
	label: string
	disabled?: boolean
	onDecrease: () => void
	onIncrease: () => void
}

const stepperClasses =
	'cursor-pointer rounded-md border border-stone-300 px-2 text-sm leading-6 text-stone-700 transition-colors hover:border-violet-700 hover:text-violet-700 disabled:cursor-not-allowed disabled:opacity-40'

export default function QuantityStepper({
	value,
	max,
	label,
	disabled = false,
	onDecrease,
	onIncrease,
}: QuantityStepperProps) {
	return (
		<div className="flex items-center gap-2">
			<button
				type="button"
				onClick={onDecrease}
				disabled={disabled || value <= 1}
				className={stepperClasses}
				aria-label={`Decrease quantity of ${label}`}
			>
				−
			</button>
			<span className="w-6 text-center text-sm tabular-nums text-stone-800">{value}</span>
			<button
				type="button"
				onClick={onIncrease}
				disabled={disabled || value >= max}
				className={stepperClasses}
				aria-label={`Increase quantity of ${label}`}
			>
				+
			</button>
		</div>
	)
}
