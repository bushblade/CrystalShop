import Stripe from 'stripe'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createCheckoutMetadata } from '../netlify/lib/checkout-metadata'
import { createSanityClient } from '../netlify/lib/shared-sanity-client'
import {
	asSanityClient,
	type FakeSanity,
	type FakeSanityConfig,
	fakeSanity,
} from './helpers/fake-sanity'
import { stubNetlifyEnv } from './helpers/netlify-env'

const createSanityClientMock = vi.mocked(createSanityClient)

vi.mock('../netlify/lib/shared-sanity-client', () => ({
	createSanityClient: vi.fn(),
}))

const WH_SECRET = 'whsec_test_webhook_signing_secret_for_local_verification'

let sanity: FakeSanity

function mockSanity(config: FakeSanityConfig = {}) {
	sanity = fakeSanity(config)
	createSanityClientMock.mockImplementation(() => asSanityClient(sanity))
}

beforeEach(() => {
	createSanityClientMock.mockReset()
})

function buildEvent(payload: Record<string, unknown>): { body: string; signature: string } {
	const body = JSON.stringify(payload)
	const signature = Stripe.webhooks.generateTestHeaderString({
		payload: body,
		secret: WH_SECRET,
	})
	return { body, signature }
}

function paidSessionEvent(
	type: 'checkout.session.completed' | 'checkout.session.async_payment_succeeded',
	session: Record<string, unknown>,
): { body: string; signature: string } {
	return buildEvent({
		id: `evt_${session.id as string}`,
		livemode: false,
		type,
		created: 1_700_000_000,
		data: {
			object: {
				payment_status: 'paid',
				metadata: {},
				amount_total: 3000,
				currency: 'gbp',
				payment_intent: 'pi_test_1',
				...session,
			},
		},
	})
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

	it('returns 500 for a paid event with an incomplete metadata chunk sequence', async () => {
		stubNetlifyEnv()
		mockSanity()
		const metadata = createCheckoutMetadata([
			{
				id: 'product-post',
				name: 'x'.repeat(800),
				unitPrice: 20,
				quantity: 1,
			},
		])
		if (!metadata?.items1) throw new Error('expected metadata to use multiple chunks')
		metadata.items2 = metadata.items1
		delete metadata.items1
		const { body, signature } = paidSessionEvent('checkout.session.completed', {
			id: 'cs_test_badchunks',
			metadata,
		})

		const { status } = await invoke(body, signature)
		expect(status).toBe(500)
		expect(sanity.transaction).not.toHaveBeenCalled()
	})
})

// Fulfillment-path tests. These are unit-level and concurrency-*adjacent*: the
// concurrent-race test simulates the losing delivery sequentially (fast-path
// miss -> transaction conflict -> order found on re-check). They do NOT
// eliminate the pre-payment checkout race, where two shoppers can both reach
// Stripe Checkout for the last unit of a unique piece. That race is an accepted
// risk (declined inventory reservations — Stage 14 of
// docs/plan-code-quality-audit.md); the manual resolution is to contact one
// buyer, explain, and refund. A failed finalization returns 500 so Stripe
// retries and the paid order is never silently dropped.
describe('webhook fulfillment', () => {
	it('returns duplicate for an already-recorded order without touching stock', async () => {
		stubNetlifyEnv()
		mockSanity({ existingOrder: { _id: 'order-cs_test_dup' } })
		const { body, signature } = paidSessionEvent('checkout.session.completed', {
			id: 'cs_test_dup',
			metadata: {
				items: JSON.stringify([
					{ id: 'product-post', name: 'Clear Quartz', unitPrice: 20, quantity: 1 },
				]),
			},
		})
		const { status, body: responseBody } = await invoke(body, signature)
		expect(status).toBe(200)
		expect(responseBody).toEqual({ received: true, duplicate: true })
		expect(sanity.transaction).not.toHaveBeenCalled()
	})

	it('treats a lost concurrent create race on the order id as idempotent success', async () => {
		stubNetlifyEnv()
		mockSanity()
		sanity.fetch
			.mockImplementationOnce(async () => null)
			.mockImplementationOnce(async () => [{ _id: 'product-post', stockLevel: 5 }])
			.mockImplementationOnce(async () => ({ _id: 'order-cs_test_race' }))
		sanity.commit.mockRejectedValueOnce(new Error('duplicate _id conflict'))
		const { body, signature } = paidSessionEvent('checkout.session.completed', {
			id: 'cs_test_race',
			metadata: {
				items: JSON.stringify([
					{ id: 'product-post', name: 'Clear Quartz', unitPrice: 20, quantity: 1 },
				]),
			},
		})
		const { status, body: responseBody } = await invoke(body, signature)
		expect(status).toBe(200)
		expect(responseBody).toEqual({ received: true, duplicate: true })
	})

	it('records the order but skips stock for products deleted since checkout', async () => {
		stubNetlifyEnv()
		mockSanity({ stockLevels: [{ _id: 'product-known', stockLevel: 3 }] })
		const { body, signature } = paidSessionEvent('checkout.session.completed', {
			id: 'cs_test_missing',
			metadata: {
				items: JSON.stringify([
					{ id: 'product-known', name: 'Known Quartz', unitPrice: 10, quantity: 2 },
					{ id: 'product-deleted', name: 'Gone Stone', unitPrice: 5, quantity: 1 },
				]),
			},
		})
		const { status, body: responseBody } = await invoke(body, signature)
		expect(status).toBe(200)
		expect(responseBody).toEqual({ received: true })
		expect(sanity.createdDoc?.items).toHaveLength(2)
		expect(sanity.patches).toEqual({ 'product-known': { stockLevel: 1 } })
	})

	it('clamps stock to zero when the paid quantity exceeds remaining stock', async () => {
		stubNetlifyEnv()
		mockSanity({ stockLevels: [{ _id: 'product-post', stockLevel: 2 }] })
		const { body, signature } = paidSessionEvent('checkout.session.completed', {
			id: 'cs_test_partial',
			metadata: {
				items: JSON.stringify([
					{ id: 'product-post', name: 'Clear Quartz', unitPrice: 20, quantity: 5 },
				]),
			},
		})
		const { status } = await invoke(body, signature)
		expect(status).toBe(200)
		expect(sanity.patches).toEqual({ 'product-post': { stockLevel: 0 } })
	})

	it('returns 500 when recording the order fails and no order exists', async () => {
		stubNetlifyEnv()
		mockSanity({ stockLevels: [{ _id: 'product-post', stockLevel: 5 }] })
		sanity.commit.mockRejectedValueOnce(new Error('sanity down'))
		const { body, signature } = paidSessionEvent('checkout.session.completed', {
			id: 'cs_test_fail',
			metadata: {
				items: JSON.stringify([
					{ id: 'product-post', name: 'Clear Quartz', unitPrice: 20, quantity: 1 },
				]),
			},
		})
		const { status, body: responseBody } = await invoke(body, signature)
		expect(status).toBe(500)
		expect(responseBody).toBe('Failed to record order')
	})

	it('records the order and decrements stock for a paid session', async () => {
		stubNetlifyEnv()
		mockSanity({ stockLevels: [{ _id: 'product-post', stockLevel: 5 }] })
		const { body, signature } = paidSessionEvent('checkout.session.completed', {
			id: 'cs_test_ok',
			metadata: {
				items: JSON.stringify([
					{ id: 'product-post', name: 'Clear Quartz', unitPrice: 20, quantity: 2 },
				]),
			},
		})
		const { status, body: responseBody } = await invoke(body, signature)
		expect(status).toBe(200)
		expect(responseBody).toEqual({ received: true })
		expect(sanity.createdDoc).toMatchObject({
			_id: 'order-cs_test_ok',
			sessionId: 'cs_test_ok',
			paymentIntentId: 'pi_test_1',
			livemode: false,
			total: 30,
			currency: 'gbp',
			items: [
				{
					_key: 'product-post',
					productId: 'product-post',
					productName: 'Clear Quartz',
					quantity: 2,
					unitPrice: 20,
				},
			],
		})
		expect(sanity.patches).toEqual({ 'product-post': { stockLevel: 3 } })
		expect(sanity.commit).toHaveBeenCalledTimes(1)
	})

	it('reassembles chunked metadata and records the order', async () => {
		stubNetlifyEnv()
		mockSanity({ stockLevels: [{ _id: 'product-post', stockLevel: 5 }] })
		const metadata = createCheckoutMetadata([
			{
				id: 'product-post',
				name: 'Clear Quartz with a long checkout snapshot name '.repeat(20),
				unitPrice: 20,
				quantity: 2,
			},
		])
		if (!metadata) throw new Error('expected checkout metadata')
		const { body, signature } = paidSessionEvent('checkout.session.completed', {
			id: 'cs_test_chunked',
			metadata,
		})

		const { status, body: responseBody } = await invoke(body, signature)
		expect(status).toBe(200)
		expect(responseBody).toEqual({ received: true })
		expect(sanity.createdDoc?.items).toEqual([
			{
				_key: 'product-post',
				productId: 'product-post',
				productName: 'Clear Quartz with a long checkout snapshot name '.repeat(20),
				quantity: 2,
				unitPrice: 20,
			},
		])
		expect(sanity.patches).toEqual({ 'product-post': { stockLevel: 3 } })
	})

	it('fulfills an async_payment_succeeded event', async () => {
		stubNetlifyEnv()
		mockSanity({ stockLevels: [{ _id: 'product-post', stockLevel: 4 }] })
		const { body, signature } = paidSessionEvent('checkout.session.async_payment_succeeded', {
			id: 'cs_test_async',
			metadata: {
				items: JSON.stringify([
					{ id: 'product-post', name: 'Clear Quartz', unitPrice: 20, quantity: 1 },
				]),
			},
		})
		const { status, body: responseBody } = await invoke(body, signature)
		expect(status).toBe(200)
		expect(responseBody).toEqual({ received: true })
		expect(sanity.patches).toEqual({ 'product-post': { stockLevel: 3 } })
	})
})
