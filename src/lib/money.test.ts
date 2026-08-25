import { describe, expect, it } from 'vitest'
import { toPence, toPounds } from './money'

describe('toPence', () => {
	it('rounds half-up float artifacts to the exact pence value', () => {
		expect(toPence(19.99)).toBe(1999)
		expect(toPence(4.35)).toBe(435)
	})

	it('converts sub-penny prices exactly', () => {
		expect(toPence(0.07)).toBe(7)
	})

	it('passes whole pounds through unchanged', () => {
		expect(toPence(30)).toBe(3000)
	})
})

describe('toPounds', () => {
	it('divides integer minor units into pounds', () => {
		expect(toPounds(3000)).toBe(30)
		expect(toPounds(1250)).toBe(12.5)
	})

	it('round-trips through toPence', () => {
		expect(toPounds(toPence(19.99))).toBe(19.99)
	})
})
