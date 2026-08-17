import type { Config } from '@netlify/functions'
import Stripe from 'stripe'
import { STOCK_LEVELS_QUERY } from '../../src/queries/sanity'
import { createSanityClient } from '../lib/shared-sanity-client'

const STRIPE_API_VERSION = '2026-07-29.dahlia'

type MetadataItem = {
	id: string
	name: string
	unitPrice: number
	quantity: number
}

function jsonResponse(status: number, body: unknown): Response {
	return Response.json(body, { status })
}

function parseMetadataItems(raw: string | undefined | null): MetadataItem[] | null {
	if (!raw) return null
	try {
		const parsed = JSON.parse(raw) as unknown
		if (!Array.isArray(parsed) || parsed.length === 0) return null
		const items: MetadataItem[] = []
		for (const entry of parsed) {
			if (typeof entry !== 'object' || entry === null) return null
			const { id, name, unitPrice, quantity } = entry as {
				id?: unknown
				name?: unknown
				unitPrice?: unknown
				quantity?: unknown
			}
			if (typeof id !== 'string' || id.length === 0) return null
			if (typeof name !== 'string' || name.length === 0) return null
			if (typeof unitPrice !== 'number' || !Number.isFinite(unitPrice) || unitPrice <= 0)
				return null
			if (typeof quantity !== 'number' || !Number.isInteger(quantity) || quantity < 1) return null
			items.push({ id, name, unitPrice, quantity })
		}
		return items
	} catch {
		return null
	}
}

export default async (req: Request): Promise<Response> => {
	const restrictedKey = Netlify.env.get('STRIPE_RESTRICTED_KEY')
	const webhookSecret = Netlify.env.get('STRIPE_WEBHOOK_SECRET')
	const expectedMode = Netlify.env.get('STRIPE_EXPECTED_MODE')
	const writeToken = Netlify.env.get('SANITY_WRITE_TOKEN')
	if (!restrictedKey) {
		console.error('Missing required environment variable: STRIPE_RESTRICTED_KEY')
		return jsonResponse(500, 'Server configuration error')
	}
	if (!webhookSecret) {
		console.error('Missing required environment variable: STRIPE_WEBHOOK_SECRET')
		return jsonResponse(500, 'Server configuration error')
	}
	if (!expectedMode || !['test', 'live'].includes(expectedMode)) {
		console.error(
			'Missing or invalid required environment variable: STRIPE_EXPECTED_MODE (test|live)',
		)
		return jsonResponse(500, 'Server configuration error')
	}
	if (!writeToken) {
		console.error('Missing required environment variable: SANITY_WRITE_TOKEN')
		return jsonResponse(500, 'Server configuration error')
	}

	const signature = req.headers.get('stripe-signature')
	if (!signature) {
		return jsonResponse(400, 'Missing stripe-signature header')
	}

	const rawBody = await req.text()

	const stripe = new Stripe(restrictedKey, { apiVersion: STRIPE_API_VERSION })
	let event: Stripe.Event
	try {
		event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret)
	} catch (error) {
		console.error('Webhook signature verification failed', error)
		return jsonResponse(400, 'Invalid signature')
	}

	// Livemode gate: only process events whose livemode matches the dataset the
	// function writes to (test events -> development dataset, live -> production).
	const expectedLivemode = expectedMode === 'live'
	if (event.livemode !== expectedLivemode) {
		console.log(
			`Ignoring ${event.type} event ${event.id}: livemode ${event.livemode} does not match STRIPE_EXPECTED_MODE=${expectedMode}`,
		)
		return jsonResponse(200, { received: true, ignored: 'livemode mismatch' })
	}

	if (event.type === 'checkout.session.async_payment_failed') {
		console.log(`Async payment failed for session, nothing to release: ${event.id}`)
		return jsonResponse(200, { received: true })
	}

	if (event.type === 'checkout.session.completed') {
		const session = event.data.object as Stripe.Checkout.Session
		// Delayed-notification methods fire `completed` while payment_status is
		// still `unpaid`; the later async_payment_succeeded event fulfills then.
		if (session.payment_status !== 'paid') {
			console.log(
				`Session ${session.id} completed but unpaid (payment_status=${session.payment_status}) — skipping`,
			)
			return jsonResponse(200, { received: true, ignored: 'unpaid' })
		}
	}

	if (
		event.type !== 'checkout.session.completed' &&
		event.type !== 'checkout.session.async_payment_succeeded'
	) {
		console.log(`Ignoring unhandled event type: ${event.type}`)
		return jsonResponse(200, { received: true, ignored: 'unhandled event type' })
	}

	const session = event.data.object as Stripe.Checkout.Session

	const metadataItems = parseMetadataItems(session.metadata?.items)
	if (!metadataItems) {
		// Never silently drop a paid order — surface it so Stripe retries and it
		// shows up in the logs.
		console.error(`Session ${session.id} has missing or malformed metadata.items`)
		return jsonResponse(500, 'Order metadata missing or malformed')
	}

	const orderId = `order-${session.id}`
	const sanity = createSanityClient(writeToken)

	// Idempotency fast-path: a duplicate delivery (Stripe retries are
	// at-least-once) sees the order already written and stops here.
	const existing = await sanity.fetch(`*[_id == $id][0]{ _id }`, { id: orderId })
	if (existing) {
		console.log(`Session ${session.id} already processed (order ${orderId}) — ignoring retry`)
		return jsonResponse(200, { received: true, duplicate: true })
	}

	// Merge quantities by product id (defensive — the checkout function already
	// dedupes, but the webhook must not trust that).
	const quantitiesById = new Map<string, number>()
	const itemsById = new Map<string, MetadataItem>()
	for (const item of metadataItems) {
		quantitiesById.set(item.id, (quantitiesById.get(item.id) ?? 0) + item.quantity)
		itemsById.set(item.id, item)
	}
	const ids = [...quantitiesById.keys()]

	const stockLevels = await sanity.fetch(STOCK_LEVELS_QUERY, { ids })
	const stockById = new Map(stockLevels.map((product) => [product._id, product.stockLevel ?? 0]))

	// Compute clamped new stock for every surviving product. Products deleted
	// since checkout are skipped (their patch target no longer exists); the sale
	// is still recorded.
	const stockPatches = new Map<string, number>()
	for (const [id, requestedQuantity] of quantitiesById) {
		const current = stockById.get(id)
		if (current === undefined) {
			console.warn(`Product ${id} not found in Sanity — skipping stock decrement for it`)
			continue
		}
		stockPatches.set(id, Math.max(0, current - requestedQuantity))
	}

	const orderDoc = {
		_id: orderId,
		_type: 'order',
		sessionId: session.id,
		paymentIntentId: typeof session.payment_intent === 'string' ? session.payment_intent : null,
		livemode: event.livemode,
		total: (session.amount_total ?? 0) / 100,
		currency: session.currency,
		items: [...quantitiesById.keys()].map((id) => {
			const item = itemsById.get(id)
			if (!item) throw new Error(`Missing metadata for product ${id}`)
			return {
				_key: id, // unique within the items array (map keys are unique); required for Studio
				productId: id,
				productName: item.name,
				quantity: quantitiesById.get(id),
				unitPrice: item.unitPrice,
			}
		}),
		completedAt: new Date(event.created * 1000).toISOString(),
	}

	try {
		const transaction = sanity.transaction().create(orderDoc)
		for (const [id, newStock] of stockPatches) {
			transaction.patch(id, (patch) => patch.set({ stockLevel: newStock }))
		}
		await transaction.commit()
	} catch (error) {
		// A concurrent duplicate delivery races to the same deterministic _id;
		// the loser's create aborts the whole transaction (stock not touched).
		// Treat that as idempotent success.
		const after = await sanity.fetch(`*[_id == $id][0]{ _id }`, { id: orderId })
		if (after) {
			console.log(
				`Session ${session.id} processed concurrently (order ${orderId}) — ignoring retry`,
			)
			return jsonResponse(200, { received: true, duplicate: true })
		}
		console.error(`Failed to record order ${orderId} for session ${session.id}`, error)
		return jsonResponse(500, 'Failed to record order')
	}

	// TODO(owner dispatch): notify the owner of this sale — provider TBD
	// (Resend free tier / Postmark). Log for now.
	console.log(`Recorded order ${orderId} for session ${session.id}`, {
		total: orderDoc.total,
		currency: orderDoc.currency,
		itemCount: orderDoc.items.length,
	})

	return jsonResponse(200, { received: true })
}

export const config: Config = {
	path: '/api/webhooks/stripe',
	method: ['POST'],
}
