import type { Config } from '@netlify/functions'
import Stripe from 'stripe'
import type { CHECKOUT_ITEMS_QUERY_RESULT, SITE_SETTINGS_QUERY_RESULT } from '../../sanity.types'
import { STRIPE_API_VERSION } from '../../src/lib/apiVersions'
import { getCartShipping } from '../../src/lib/shipping'
import { extractShippingRates } from '../../src/lib/siteSettings'
import { CHECKOUT_ITEMS_QUERY, SITE_SETTINGS_QUERY } from '../../src/queries/sanity'
import { createCheckoutMetadata } from '../lib/checkout-metadata'
import { createSanityClient } from '../lib/shared-sanity-client'

const INTEGRATION_IDENTIFIER = 'crystalshop-web'
const LOCALHOST_ORIGIN = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/

type CheckoutRequestItem = {
	id: string
	quantity: number
}

type EnrichedItem = {
	id: string
	name: string
	price: number
	weightInGrams: number
	deliveryMethod: 'post' | 'arrange'
	quantity: number
}

/** Creates a JSON response with the endpoint's status code. */
function jsonResponse(status: number, body: unknown): Response {
	return Response.json(body, { status })
}

/** Validates the browser-supplied cart item shape before querying Sanity. */
function parseItems(raw: unknown): CheckoutRequestItem[] | null {
	if (!Array.isArray(raw) || raw.length === 0) return null
	const items: CheckoutRequestItem[] = []
	for (const entry of raw) {
		if (typeof entry !== 'object' || entry === null) return null
		const { id, quantity } = entry as { id?: unknown; quantity?: unknown }
		if (typeof id !== 'string' || id.length === 0) return null
		if (typeof quantity !== 'number' || !Number.isInteger(quantity) || quantity < 1) return null
		items.push({ id, quantity })
	}
	return items
}

/** Chooses the trusted site origin used for Stripe's success and cancel URLs. */
function resolveSiteOrigin(req: Request): string {
	const netlifyUrl = Netlify.env.get('URL')
	if (netlifyUrl) return netlifyUrl
	const origin = req.headers.get('origin')
	if (origin && LOCALHOST_ORIGIN.test(origin)) return origin
	return 'http://localhost:8888'
}

/**
 * Revalidates the cart against Sanity and creates a Stripe-hosted Checkout
 * Session using server-authoritative prices, stock, shipping, and metadata.
 */
export default async (req: Request): Promise<Response> => {
	const key = Netlify.env.get('STRIPE_RESTRICTED_KEY')
	if (!key) {
		console.error('Missing required environment variable: STRIPE_RESTRICTED_KEY')
		return jsonResponse(500, 'Server configuration error')
	}

	let body: { items?: unknown } | null
	try {
		body = (await req.json()) as { items?: unknown } | null
	} catch {
		return jsonResponse(400, 'Invalid request body — expected { items: [{ id, quantity }] }')
	}
	if (body === null || typeof body !== 'object') {
		return jsonResponse(400, 'Invalid request body — expected { items: [{ id, quantity }] }')
	}

	const requested = parseItems(body.items)
	if (!requested) {
		return jsonResponse(400, 'Invalid request body — expected { items: [{ id, quantity }] }')
	}

	const quantitiesById = new Map<string, number>()
	for (const item of requested) {
		quantitiesById.set(item.id, (quantitiesById.get(item.id) ?? 0) + item.quantity)
	}
	const ids = [...quantitiesById.keys()]

	const sanity = createSanityClient()
	let products: CHECKOUT_ITEMS_QUERY_RESULT
	let siteSettings: SITE_SETTINGS_QUERY_RESULT
	try {
		;[products, siteSettings] = await Promise.all([
			sanity.fetch(CHECKOUT_ITEMS_QUERY, { ids }),
			sanity.fetch(SITE_SETTINGS_QUERY),
		])
	} catch (error) {
		console.error('Failed to fetch products or site settings', error)
		return jsonResponse(500, 'Unable to start checkout — please try again')
	}

	const productsById = new Map(products.map((product) => [product._id, product]))

	const items: EnrichedItem[] = []
	for (const [id, requestedQuantity] of quantitiesById) {
		const product = productsById.get(id)
		if (!product) return jsonResponse(400, `Unknown product: ${id}`)
		const stockLevel = product.stockLevel ?? 0
		if (stockLevel <= 0) return jsonResponse(409, `Out of stock: ${product.name}`)
		items.push({
			id: product._id,
			name: product.name,
			price: product.price,
			weightInGrams: product.weightInGrams,
			deliveryMethod: product.deliveryMethod,
			quantity: Math.min(requestedQuantity, stockLevel),
		})
	}

	const rates = extractShippingRates(siteSettings)
	if (rates.length === 0 && items.some((item) => item.deliveryMethod === 'post')) {
		console.warn(
			'siteSettings.shippingRates is empty — order will be treated as arrange-everything',
		)
	}

	const shipping = getCartShipping(items, rates)
	const origin = resolveSiteOrigin(req)
	const metadata = createCheckoutMetadata(
		items.map((item) => ({
			id: item.id,
			name: item.name,
			unitPrice: item.price,
			quantity: item.quantity,
		})),
	)
	if (!metadata) return jsonResponse(400, 'Cart is too large for checkout')

	const sessionParams: Stripe.Checkout.SessionCreateParams = {
		mode: 'payment',
		currency: 'gbp',
		line_items: items.map((item) => ({
			quantity: item.quantity,
			price_data: {
				currency: 'gbp',
				unit_amount: Math.round(item.price * 100),
				product_data: { name: item.name },
			},
		})),
		metadata,
		success_url: `${origin}/shop/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
		cancel_url: `${origin}/shop/checkout/cancel`,
		integration_identifier: INTEGRATION_IDENTIFIER,
		...(shipping.applies && shipping.rate
			? {
					shipping_options: [
						{
							shipping_rate_data: {
								type: 'fixed_amount',
								fixed_amount: {
									amount: Math.round(shipping.rate.price * 100),
									currency: 'gbp',
								},
								display_name: shipping.rate.name,
							},
						},
					],
					shipping_address_collection: { allowed_countries: ['GB'] },
				}
			: {}),
	}

	const stripe = new Stripe(key, { apiVersion: STRIPE_API_VERSION })
	try {
		const session = await stripe.checkout.sessions.create(sessionParams)
		return jsonResponse(200, { url: session.url })
	} catch (error) {
		console.error('Failed to create checkout session', error)
		return jsonResponse(500, 'Unable to start checkout — please try again')
	}
}

export const config: Config = {
	path: '/api/checkout',
	method: ['POST'],
}
