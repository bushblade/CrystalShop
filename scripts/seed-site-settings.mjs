import { createClient } from '@sanity/client'

const isDeleteMode = process.argv.includes('--delete')

const projectId = process.env.PUBLIC_SANITY_STUDIO_PROJECT_ID
const dataset = process.env.PUBLIC_SANITY_STUDIO_DATASET ?? 'development'
const token = process.env.SANITY_WRITE_TOKEN

if (!projectId) {
	throw new Error('Missing required environment variable: PUBLIC_SANITY_STUDIO_PROJECT_ID')
}
if (!token) {
	throw new Error('Missing required environment variable: SANITY_WRITE_TOKEN')
}

const client = createClient({
	projectId,
	dataset,
	apiVersion: '2026-08-10',
	useCdn: false,
	token,
})

function paragraphBlock(text) {
	return {
		_type: 'block',
		_key: `block-${Math.random().toString(36).slice(2, 10)}`,
		style: 'normal',
		children: [{ _type: 'span', text }],
		markDefs: [],
	}
}

function headingBlock(text) {
	return {
		_type: 'block',
		_key: `block-${Math.random().toString(36).slice(2, 10)}`,
		style: 'h2',
		children: [{ _type: 'span', text }],
		markDefs: [],
	}
}

const aboutBody = [
	paragraphBlock(
		'Eclipsia Crystals is a small independent shop for natural crystal pieces. Every stone is handpicked — many of them one-of-a-kind finds that will never be restocked once they\u2019re gone.',
	),
	paragraphBlock(
		'Because each piece is unique, you\u2019ll find a full description and its exact weight with every listing, so what you see is exactly what you\u2019ll receive.',
	),
]

const termsBody = [
	headingBlock('Unique pieces'),
	paragraphBlock(
		'Many of our pieces are one-of-a-kind and cannot be restocked. Once a unique piece is sold, it will not be available again.',
	),
	headingBlock('Shipping'),
	paragraphBlock(
		'We ship within the UK. Postage is calculated at checkout from the total weight of the items in your order. Pieces too heavy for standard postage are arranged individually — you pay online and we contact you to arrange collection or courier.',
	),
	headingBlock('Natural variation'),
	paragraphBlock(
		'Crystals are natural products. Minor variations in colour, shape and size are expected and part of what makes each piece unique.',
	),
]

const contactEmail = 'hello@eclipsiacrystals.com'

// Placeholder postage tiers — the owner must confirm real UK rates before go-live.
// The final band (null maxWeightGrams) is the catch-all for heavier parcels.
const shippingRates = [
	{ _key: 'rate-standard', name: 'Standard', maxWeightGrams: 1000, price: 4.5 },
	{ _key: 'rate-medium', name: 'Medium', maxWeightGrams: 2000, price: 6.5 },
	{ _key: 'rate-large', name: 'Large', maxWeightGrams: null, price: 9.5 },
]

async function run() {
	if (isDeleteMode) {
		await client.delete({ query: '_id == "siteSettings"' })
		console.log(`Deleted siteSettings from dataset "${dataset}"`)
		return
	}

	const document = {
		_id: 'siteSettings',
		_type: 'siteSettings',
		aboutBody,
		termsBody,
		contactEmail,
		shippingRates,
	}

	await client.createOrReplace(document)
	console.log(`Upserted siteSettings in dataset "${dataset}"`)
	console.log(`  aboutBody: ${aboutBody.length} block(s)`)
	console.log(`  termsBody: ${termsBody.length} block(s)`)
	console.log(`  contactEmail: ${contactEmail}`)
	console.log(`  shippingRates: ${shippingRates.length} tier(s) (placeholders)`)
}

run().catch((error) => {
	console.error(error)
	process.exitCode = 1
})
