import type Stripe from 'stripe'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createSanityClient } from '../netlify/lib/shared-sanity-client'
import type { CHECKOUT_ITEMS_QUERY_RESULT, SITE_SETTINGS_QUERY_RESULT } from '../sanity.types'
import {
	asSanityClient,
	type FakeSanity,
	type FakeSanityConfig,
	fakeSanity,
} from './helpers/fake-sanity'
import { stubNetlifyEnv } from './helpers/netlify-env'

const { StripeMock, stripeSessionCreateMock } = vi.hoisted(() => {
	const stripeSessionCreateMock = vi.fn()
	return {
		StripeMock: class {
			checkout = { sessions: { create: stripeSessionCreateMock } }
		},
		stripeSessionCreateMock,
	}
})

vi.mock('stripe', () => ({ default: StripeMock }))

const createSanityClientMock = vi.mocked(createSanityClient)

vi.mock('../netlify/lib/shared-sanity-client', () => ({
	createSanityClient: vi.fn(),
}))

type ShippingRateEntry = NonNullable<
	NonNullable<SITE_SETTINGS_QUERY_RESULT>['shippingRates']
>[number]

let sanity: FakeSanity

function mockSanity(config: FakeSanityConfig = {}) {
	sanity = fakeSanity(config)
	createSanityClientMock.mockImplementation(() => asSanityClient(sanity))
}

function postProduct(
	overrides: Partial<CHECKOUT_ITEMS_QUERY_RESULT[number]> = {},
): CHECKOUT_ITEMS_QUERY_RESULT[number] {
	return {
		_id: 'product-post',
		name: 'Clear Quartz',
		price: 20,
		stockLevel: 5,
		weightInGrams: 200,
		deliveryMethod: 'post',
		...overrides,
	}
}

function arrangeProduct(
	overrides: Partial<CHECKOUT_ITEMS_QUERY_RESULT[number]> = {},
): CHECKOUT_ITEMS_QUERY_RESULT[number] {
	return postProduct({
		_id: 'product-arrange',
		name: 'Amethyst Geode',
		price: 150,
		stockLevel: 1,
		weightInGrams: 15000,
		deliveryMethod: 'arrange',
		...overrides,
	})
}

function settings(shippingRates: ShippingRateEntry[] | null = null): SITE_SETTINGS_QUERY_RESULT {
	return {
		aboutBody: null,
		termsBody: null,
		contactEmail: 'shop@example.com',
		shippingRates,
	}
}

const RATES: ShippingRateEntry[] = [
	{ name: 'Standard', maxWeightGrams: 1000, price: 4.5 },
	{ name: 'Large', maxWeightGrams: null, price: 9.5 },
]

async function invoke(
	body: string,
	origin = 'http://localhost:5173',
): Promise<{ status: number; body: unknown }> {
	const mod = await import('../netlify/functions/create-checkout-session.mts')
	const res = await mod.default(
		new Request(`${origin}/api/checkout`, {
			method: 'POST',
			headers: { 'content-type': 'application/json', origin },
			body,
		}),
	)
	return { status: res.status, body: await res.json() }
}

function checkoutBody(items: unknown): string {
	return JSON.stringify({ items })
}

function sessionParams(): Stripe.Checkout.SessionCreateParams {
	return stripeSessionCreateMock.mock.calls[0][0]
}

function metadataChunks(params: Stripe.Checkout.SessionCreateParams): [string, string][] {
	return Object.entries(params.metadata ?? {})
		.filter(
			(entry): entry is [string, string] =>
				/^items\d+$/.test(entry[0]) && typeof entry[1] === 'string',
		)
		.sort((a, b) => Number(a[0].slice('items'.length)) - Number(b[0].slice('items'.length)))
}

function metadataItems(params: Stripe.Checkout.SessionCreateParams): unknown {
	const legacy = params.metadata?.items
	if (typeof legacy === 'string') return JSON.parse(legacy)
	const chunks = metadataChunks(params)
	if (chunks.length === 0) throw new Error('expected checkout item metadata')
	return JSON.parse(chunks.map(([, value]) => value).join(''))
}

beforeEach(() => {
	stripeSessionCreateMock.mockReset()
	stripeSessionCreateMock.mockResolvedValue({
		url: 'https://checkout.stripe.com/pay/cs_test_default',
	})
	createSanityClientMock.mockReset()
	mockSanity()
})

describe('request body guard paths', () => {
	it('returns 500 when the restricted key is missing', async () => {
		stubNetlifyEnv({ STRIPE_RESTRICTED_KEY: undefined })
		const { status, body } = await invoke(checkoutBody([{ id: 'product-post', quantity: 1 }]))
		expect(status).toBe(500)
		expect(body).toBe('Server configuration error')
	})

	it('rejects invalid JSON', async () => {
		stubNetlifyEnv()
		const { status, body } = await invoke('{ not json')
		expect(status).toBe(400)
		expect(body).toContain('Invalid request body')
	})

	it('rejects null JSON', async () => {
		stubNetlifyEnv()
		const { status, body } = await invoke('null')
		expect(status).toBe(400)
		expect(body).toContain('Invalid request body')
	})

	it('rejects primitive JSON', async () => {
		stubNetlifyEnv()
		for (const primitive of ['42', '"hello"']) {
			const { status, body } = await invoke(primitive)
			expect(status).toBe(400)
			expect(body).toContain('Invalid request body')
		}
	})
})

describe('items validation', () => {
	it.each([
		['missing items', '{}'],
		['non-array items', checkoutBody('nope')],
		['empty items array', checkoutBody([])],
		['non-object entry', checkoutBody([42])],
		['null entry', checkoutBody([null])],
		['missing id', checkoutBody([{ quantity: 1 }])],
		['empty id', checkoutBody([{ id: '', quantity: 1 }])],
		['missing quantity', checkoutBody([{ id: 'product-post' }])],
		['non-integer quantity', checkoutBody([{ id: 'product-post', quantity: 1.5 }])],
		['zero quantity', checkoutBody([{ id: 'product-post', quantity: 0 }])],
		['negative quantity', checkoutBody([{ id: 'product-post', quantity: -1 }])],
		['quantity above the maximum', checkoutBody([{ id: 'product-post', quantity: 1000 }])],
	])('rejects %s with 400', async (_label, body) => {
		stubNetlifyEnv()
		const { status, body: responseBody } = await invoke(body)
		expect(status).toBe(400)
		expect(responseBody).toContain('Invalid request body')
	})

	it('rejects a cart with too many distinct products with 400', async () => {
		stubNetlifyEnv()
		const items = Array.from({ length: 51 }, (_, index) => ({
			id: `product-${index}`,
			quantity: 1,
		}))
		const { status, body } = await invoke(checkoutBody(items))
		expect(status).toBe(400)
		expect(body).toBe('Cart contains too many items')
		expect(stripeSessionCreateMock).not.toHaveBeenCalled()
	})
})

describe('product resolution and stock', () => {
	it('dedupes duplicate product ids and sums their quantities', async () => {
		stubNetlifyEnv()
		mockSanity({ products: [postProduct()] })
		const { status } = await invoke(
			checkoutBody([
				{ id: 'product-post', quantity: 2 },
				{ id: 'product-post', quantity: 3 },
			]),
		)
		expect(status).toBe(200)
		const params = sessionParams()
		expect(params.line_items).toHaveLength(1)
		expect(params.line_items?.[0].quantity).toBe(5)
		expect(metadataItems(params)).toEqual([
			{ id: 'product-post', name: 'Clear Quartz', unitPrice: 20, quantity: 5 },
		])
	})

	it('returns 400 for an unknown product', async () => {
		stubNetlifyEnv()
		mockSanity({ products: [] })
		const { status, body } = await invoke(checkoutBody([{ id: 'product-missing', quantity: 1 }]))
		expect(status).toBe(400)
		expect(body).toContain('Unknown product: product-missing')
	})

	it('returns 409 for an out-of-stock product', async () => {
		stubNetlifyEnv()
		mockSanity({ products: [postProduct({ stockLevel: 0 })] })
		const { status, body } = await invoke(checkoutBody([{ id: 'product-post', quantity: 1 }]))
		expect(status).toBe(409)
		expect(body).toContain('Out of stock: Clear Quartz')
	})

	it('returns 409 when stock level is missing', async () => {
		stubNetlifyEnv()
		mockSanity({ products: [postProduct({ stockLevel: null })] })
		const { status } = await invoke(checkoutBody([{ id: 'product-post', quantity: 1 }]))
		expect(status).toBe(409)
	})

	it('clamps the requested quantity to current stock', async () => {
		stubNetlifyEnv()
		mockSanity({ products: [postProduct({ stockLevel: 2 })] })
		const { status } = await invoke(checkoutBody([{ id: 'product-post', quantity: 5 }]))
		expect(status).toBe(200)
		const params = sessionParams()
		expect(params.line_items?.[0].quantity).toBe(2)
		expect(params.line_items?.[0].price_data?.unit_amount).toBe(2000)
		expect(metadataItems(params)).toEqual([
			{ id: 'product-post', name: 'Clear Quartz', unitPrice: 20, quantity: 2 },
		])
	})

	it('chunks a large item snapshot below Stripe metadata value limits', async () => {
		stubNetlifyEnv()
		const products = Array.from({ length: 8 }, (_, index) =>
			postProduct({
				_id: `product-${index}`,
				name: `Natural crystal specimen with a deliberately descriptive name ${index}`,
				price: 10 + index,
			}),
		)
		mockSanity({ products })

		const { status } = await invoke(
			checkoutBody(products.map((product) => ({ id: product._id, quantity: 1 }))),
		)
		expect(status).toBe(200)

		const params = sessionParams()
		const chunks = metadataChunks(params)
		expect(params.metadata?.items).toBeUndefined()
		expect(chunks.length).toBeGreaterThan(1)
		expect(chunks.every(([, value]) => value.length < 500)).toBe(true)
		expect(metadataItems(params)).toEqual(
			products.map((product) => ({
				id: product._id,
				name: product.name,
				unitPrice: product.price,
				quantity: 1,
			})),
		)
	})
})

describe('shipping behavior', () => {
	it('applies a bounded shipping tier for an all-post cart', async () => {
		stubNetlifyEnv()
		mockSanity({ products: [postProduct()], siteSettings: settings(RATES) })
		const { status } = await invoke(checkoutBody([{ id: 'product-post', quantity: 1 }]))
		expect(status).toBe(200)
		const params = sessionParams()
		expect(params.shipping_address_collection).toEqual({ allowed_countries: ['GB'] })
		expect(params.shipping_options).toEqual([
			{
				shipping_rate_data: {
					type: 'fixed_amount',
					fixed_amount: { amount: 450, currency: 'gbp' },
					display_name: 'Standard',
				},
			},
		])
	})

	it('applies the catch-all tier when no bounded tier fits', async () => {
		stubNetlifyEnv()
		mockSanity({
			products: [postProduct({ weightInGrams: 5000 })],
			siteSettings: settings(RATES),
		})
		const { status } = await invoke(checkoutBody([{ id: 'product-post', quantity: 1 }]))
		expect(status).toBe(200)
		const params = sessionParams()
		expect(params.shipping_options?.[0].shipping_rate_data?.display_name).toBe('Large')
	})

	it('omits shipping for a post cart when no rates are configured', async () => {
		stubNetlifyEnv()
		mockSanity({ products: [postProduct()], siteSettings: settings(null) })
		const { status } = await invoke(checkoutBody([{ id: 'product-post', quantity: 1 }]))
		expect(status).toBe(200)
		expect(sessionParams().shipping_options).toBeUndefined()
	})

	it('omits shipping for an arrange-only cart', async () => {
		stubNetlifyEnv()
		mockSanity({ products: [arrangeProduct()], siteSettings: settings(RATES) })
		const { status } = await invoke(checkoutBody([{ id: 'product-arrange', quantity: 1 }]))
		expect(status).toBe(200)
		expect(sessionParams().shipping_options).toBeUndefined()
	})

	it('omits shipping for a mixed post and arrange cart', async () => {
		stubNetlifyEnv()
		mockSanity({
			products: [postProduct(), arrangeProduct()],
			siteSettings: settings(RATES),
		})
		const { status } = await invoke(
			checkoutBody([
				{ id: 'product-post', quantity: 1 },
				{ id: 'product-arrange', quantity: 1 },
			]),
		)
		expect(status).toBe(200)
		expect(sessionParams().shipping_options).toBeUndefined()
	})

	it('omits shipping when the total weight exceeds every bounded tier', async () => {
		stubNetlifyEnv()
		mockSanity({
			products: [postProduct({ weightInGrams: 5000 })],
			siteSettings: settings([{ name: 'Standard', maxWeightGrams: 1000, price: 4.5 }]),
		})
		const { status } = await invoke(checkoutBody([{ id: 'product-post', quantity: 1 }]))
		expect(status).toBe(200)
		expect(sessionParams().shipping_options).toBeUndefined()
	})
})

describe('failure handling', () => {
	it('returns 500 when the Sanity fetch fails', async () => {
		stubNetlifyEnv()
		mockSanity({ fetchError: new Error('sanity down') })
		const { status, body } = await invoke(checkoutBody([{ id: 'product-post', quantity: 1 }]))
		expect(status).toBe(500)
		expect(body).toBe('Unable to start checkout — please try again')
	})

	it('returns 500 when Stripe session creation fails', async () => {
		stubNetlifyEnv()
		mockSanity({ products: [postProduct()] })
		stripeSessionCreateMock.mockRejectedValue(new Error('stripe down'))
		const { status, body } = await invoke(checkoutBody([{ id: 'product-post', quantity: 1 }]))
		expect(status).toBe(500)
		expect(body).toBe('Unable to start checkout — please try again')
	})

	it('returns 500 when Stripe creates a session without a URL', async () => {
		stubNetlifyEnv()
		mockSanity({ products: [postProduct()] })
		stripeSessionCreateMock.mockResolvedValue({ url: null })
		const { status, body } = await invoke(checkoutBody([{ id: 'product-post', quantity: 1 }]))
		expect(status).toBe(500)
		expect(body).toBe('Unable to start checkout — please try again')
	})

	it('returns 400 when the checkout snapshot cannot fit in Stripe metadata', async () => {
		stubNetlifyEnv()
		mockSanity({
			products: [postProduct({ name: 'x'.repeat(23_000) })],
		})
		const { status, body } = await invoke(checkoutBody([{ id: 'product-post', quantity: 1 }]))
		expect(status).toBe(400)
		expect(body).toBe('Cart is too large for checkout')
		expect(stripeSessionCreateMock).not.toHaveBeenCalled()
	})
})

describe('successful session creation', () => {
	it('expires the Checkout Session after 30 minutes', async () => {
		const createdAt = new Date('2026-08-20T12:00:00.000Z')
		vi.useFakeTimers()
		vi.setSystemTime(createdAt)
		try {
			stubNetlifyEnv()
			mockSanity({ products: [postProduct()] })

			const { status } = await invoke(checkoutBody([{ id: 'product-post', quantity: 1 }]))
			expect(status).toBe(200)
			expect(sessionParams().expires_at).toBe(Math.floor(createdAt.getTime() / 1000) + 30 * 60)
		} finally {
			vi.useRealTimers()
		}
	})

	it('returns the checkout URL and builds session params from the cart', async () => {
		stubNetlifyEnv()
		mockSanity({
			products: [
				postProduct(),
				postProduct({ _id: 'product-second', name: 'Smoky Quartz', price: 12.5, stockLevel: 3 }),
			],
			siteSettings: settings(RATES),
		})
		stripeSessionCreateMock.mockResolvedValue({
			url: 'https://checkout.stripe.com/pay/cs_test_123',
		})

		const { status, body } = await invoke(
			checkoutBody([
				{ id: 'product-post', quantity: 1 },
				{ id: 'product-second', quantity: 1 },
			]),
		)
		expect(status).toBe(200)
		expect(body).toEqual({ url: 'https://checkout.stripe.com/pay/cs_test_123' })

		const params = sessionParams()
		expect(params.mode).toBe('payment')
		expect(params.currency).toBe('gbp')
		expect(params.integration_identifier).toBe('crystalshop-web')
		expect(params.success_url).toBe(
			'http://localhost:5173/shop/checkout/success?session_id={CHECKOUT_SESSION_ID}',
		)
		expect(params.cancel_url).toBe('http://localhost:5173/shop/checkout/cancel')
		expect(params.line_items).toHaveLength(2)
		expect(params.line_items?.[0]).toMatchObject({
			quantity: 1,
			price_data: { currency: 'gbp', unit_amount: 2000, product_data: { name: 'Clear Quartz' } },
		})
		expect(params.line_items?.[1]).toMatchObject({
			quantity: 1,
			price_data: { currency: 'gbp', unit_amount: 1250, product_data: { name: 'Smoky Quartz' } },
		})
		expect(metadataItems(params)).toEqual([
			{ id: 'product-post', name: 'Clear Quartz', unitPrice: 20, quantity: 1 },
			{ id: 'product-second', name: 'Smoky Quartz', unitPrice: 12.5, quantity: 1 },
		])
	})

	it('uses the Netlify URL when configured', async () => {
		stubNetlifyEnv({ URL: 'https://crystalshop.example.com' })
		mockSanity({ products: [postProduct()] })
		stripeSessionCreateMock.mockResolvedValue({
			url: 'https://checkout.stripe.com/pay/cs_test_123',
		})

		const { status } = await invoke(checkoutBody([{ id: 'product-post', quantity: 1 }]))
		expect(status).toBe(200)
		expect(sessionParams().success_url).toBe(
			'https://crystalshop.example.com/shop/checkout/success?session_id={CHECKOUT_SESSION_ID}',
		)
	})
})
