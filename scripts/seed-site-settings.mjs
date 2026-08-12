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
		'Shipping costs are calculated at checkout based on the weight of the items in your cart. Local pickup is available where a piece is marked as such.',
	),
	headingBlock('Natural variation'),
	paragraphBlock(
		'Crystals are natural products. Minor variations in colour, shape and size are expected and part of what makes each piece unique.',
	),
]

const contactEmail = 'hello@eclipsiacrystals.com'

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
	}

	await client.createOrReplace(document)
	console.log(`Upserted siteSettings in dataset "${dataset}"`)
	console.log(`  aboutBody: ${aboutBody.length} block(s)`)
	console.log(`  termsBody: ${termsBody.length} block(s)`)
	console.log(`  contactEmail: ${contactEmail}`)
}

run().catch((error) => {
	console.error(error)
	process.exitCode = 1
})
