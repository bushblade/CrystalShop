import { describe, expect, it } from 'vitest'
import { formatPrice, formatWeight, formatWeightBand } from './format'

describe('formatPrice', () => {
	it('formats as GBP', () => {
		expect(formatPrice(4.5)).toBe('£4.50')
	})
})

describe('formatWeight', () => {
	it('renders grams below a kilogram', () => {
		expect(formatWeight(750)).toBe('750 g')
	})

	it('renders whole kilograms', () => {
		expect(formatWeight(2000)).toBe('2 kg')
	})

	it('renders mixed weights in kg', () => {
		expect(formatWeight(1500)).toBe('1.5 kg')
	})
})

describe('formatWeightBand', () => {
	it('renders the first band as up to the tier max', () => {
		expect(formatWeightBand(0, 1000)).toBe('Up to 1 kg')
	})

	it('renders bounded middle bands as a range', () => {
		expect(formatWeightBand(1000, 2000)).toBe('1 kg–2 kg')
	})

	it('renders the open-ended catch-all band as over the previous max', () => {
		expect(formatWeightBand(2000, null)).toBe('Over 2 kg')
	})
})
