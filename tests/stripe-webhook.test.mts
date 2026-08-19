import Stripe from 'stripe'
import { describe, expect, it } from 'vitest'
import { stubNetlifyEnv } from './helpers/netlify-env'

const WH_SECRET = 'whsec_test_webhook_signing_secret_for_local_verification'

function buildEvent(payload: Record<string, unknown>): { body: string; signature: string } {
	const body = JSON.stringify(payload)
	const signature = Stripe.webhooks.generateTestHeaderString({
		payload: body,
		secret: WH_SECRET,
	})
	return { body, signature }
}

async function invoke(body: string, signature: string): Promise<{ status: number; body: unknown }> {
	const mod = await import('../netlify/functions/stripe-webhook.mts')
	const res = await mod.default(
		new Request('http://localhost/api/webhooks/stripe', {
			method: 'POST',
			headers: { 'content-type': 'application/json', 'stripe-signature': signature },
			body,
		}),
	)
	return { status: res.status, body: await res.json() }
}

describe('stripe-webhook guard paths', () => {
	it('rejects a request with no signature', async () => {
		stubNetlifyEnv()
		const mod = await import('../netlify/functions/stripe-webhook.mts')
		const res = await mod.default(
			new Request('http://localhost/api/webhooks/stripe', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: '{}',
			}),
		)
		expect(res.status).toBe(400)
	})

	it('rejects a bad signature', async () => {
		stubNetlifyEnv()
		const { body } = buildEvent({ id: 'evt_1' })
		const { status } = await invoke(body, 't=1,v1=not_a_valid_signature')
		expect(status).toBe(400)
	})

	it('ignores a livemode mismatch', async () => {
		stubNetlifyEnv({ STRIPE_EXPECTED_MODE: 'test' })
		const { body, signature } = buildEvent({
			id: 'evt_live',
			livemode: true,
			type: 'checkout.session.completed',
			data: { object: { id: 'cs_test_123' } },
		})
		const { status } = await invoke(body, signature)
		expect(status).toBe(200)
	})

	it('ignores async_payment_failed without touching stock', async () => {
		stubNetlifyEnv()
		const { body, signature } = buildEvent({
			id: 'evt_async_failed',
			livemode: false,
			type: 'checkout.session.async_payment_failed',
			data: { object: { id: 'cs_test_123' } },
		})
		const { status } = await invoke(body, signature)
		expect(status).toBe(200)
	})

	it('skips an unpaid completed event', async () => {
		stubNetlifyEnv()
		const { body, signature } = buildEvent({
			id: 'evt_unpaid',
			livemode: false,
			type: 'checkout.session.completed',
			data: {
				object: {
					id: 'cs_test_unpaid',
					payment_status: 'unpaid',
					metadata: {},
				},
			},
		})
		const { status } = await invoke(body, signature)
		expect(status).toBe(200)
	})

	it('returns 500 config error when webhook secret missing', async () => {
		stubNetlifyEnv({ STRIPE_WEBHOOK_SECRET: undefined })
		const mod = await import('../netlify/functions/stripe-webhook.mts')
		const res = await mod.default(
			new Request('http://localhost/api/webhooks/stripe', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: '{}',
			}),
		)
		expect(res.status).toBe(500)
	})

	it('returns 500 for a paid event with malformed metadata (never drop a paid order)', async () => {
		stubNetlifyEnv()
		const { body, signature } = buildEvent({
			id: 'evt_badmeta',
			livemode: false,
			type: 'checkout.session.completed',
			data: {
				object: {
					id: 'cs_test_badmeta',
					payment_status: 'paid',
					metadata: { items: 'not-json' },
				},
			},
		})
		const { status } = await invoke(body, signature)
		expect(status).toBe(500)
	})
})
