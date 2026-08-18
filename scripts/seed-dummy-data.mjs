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
	// Canonical value: src/lib/apiVersions.ts (SANITY_API_VERSION). Kept inline
	// because these scripts run as plain Node ESM — importing a .ts module needs
	// Node >=22.18 (type stripping) while engines.node is >=22.12.
	apiVersion: '2026-08-10',
	useCdn: false,
	token,
})

const ORIGINS = [
	'Brazil',
	'Madagascar',
	'Uruguay',
	'India',
	'China',
	'Namibia',
	'Mexico',
	'Morocco',
]

const GEMS = {
	amethyst: {
		label: 'Amethyst',
		items: [
			{
				key: 'druzy-mini-geode-small',
				label: 'Druzy Mini Geode',
				size: 'Small',
				price: 31.88,
				weight: 500,
				featured: true,
			},
			{
				key: 'geode-cluster-medium',
				label: 'Geode Cluster',
				size: 'Medium',
				price: 58,
				weight: 2200,
				featured: true,
			},
			{
				key: 'cathedral-point-large',
				label: 'Cathedral Point',
				size: 'Large',
				price: 145,
				weight: 6400,
				pickup: true,
			},
			{
				key: 'polished-sphere-medium',
				label: 'Polished Sphere',
				size: 'Medium',
				price: 96,
				weight: 1800,
			},
			{ key: 'tower-xl', label: 'Tower', size: 'XL', price: 240, weight: 12000, pickup: true },
			{
				key: 'raw-cluster-large',
				label: 'Raw Cluster',
				size: 'Large',
				price: 118,
				weight: 7500,
				pickup: true,
			},
			{ key: 'point-small', label: 'Point', size: 'Small', price: 14, weight: 320 },
			{
				key: 'tumbled-stones-set',
				label: 'Tumbled Stones (Set of 5)',
				size: 'Small',
				price: 22,
				weight: 480,
				unique: false,
				stock: 6,
			},
			{ key: 'palm-stone-small', label: 'Palm Stone', size: 'Small', price: 12, weight: 190 },
			{ key: 'heart-small', label: 'Heart', size: 'Small', price: 16, weight: 260 },
			{ key: 'wand-medium', label: 'Wand', size: 'Medium', price: 34, weight: 950 },
			{ key: 'obelisk-medium', label: 'Obelisk', size: 'Medium', price: 62, weight: 2100 },
			{ key: 'pyramid-small', label: 'Pyramid', size: 'Small', price: 26, weight: 420 },
			{
				key: 'sliced-geode-bookends',
				label: 'Sliced Geode Bookends',
				size: 'Medium',
				price: 78,
				weight: 3600,
				unique: false,
				stock: 3,
			},
			{
				key: 'crystal-ball-large',
				label: 'Crystal Ball',
				size: 'Large',
				price: 190,
				weight: 7200,
				pickup: true,
			},
			{
				key: 'elestial-point-medium',
				label: 'Elestial Point',
				size: 'Medium',
				price: 84,
				weight: 1300,
				featured: true,
			},
			{
				key: 'chevron-slice-medium',
				label: 'Chevron Slice',
				size: 'Medium',
				price: 48,
				weight: 1600,
			},
			{
				key: 'rough-specimen-large',
				label: 'Rough Specimen',
				size: 'Large',
				price: 66,
				weight: 5200,
			},
			{
				key: 'keychain-tumbled',
				label: 'Keychain Tumbled Stone',
				size: 'Mini',
				price: 8,
				weight: 60,
				unique: false,
				stock: 8,
			},
			{
				key: 'sculpted-freeform-large',
				label: 'Sculpted Freeform',
				size: 'Large',
				price: 132,
				weight: 4800,
				soldOut: true,
			},
		],
	},
	citrine: {
		label: 'Citrine',
		items: [
			{
				key: 'geode-cluster-medium',
				label: 'Geode Cluster',
				size: 'Medium',
				price: 72,
				weight: 2600,
				featured: true,
			},
			{
				key: 'portal-large',
				label: 'Portal',
				size: 'Large',
				price: 104.68,
				weight: 2720,
				pickup: true,
			},
			{
				key: 'polished-point-small',
				label: 'Polished Point',
				size: 'Small',
				price: 18,
				weight: 340,
			},
			{ key: 'tower-xl', label: 'Tower', size: 'XL', price: 310, weight: 15000, pickup: true },
			{ key: 'sphere-medium', label: 'Sphere', size: 'Medium', price: 88, weight: 1700 },
			{
				key: 'raw-cluster-large',
				label: 'Raw Cluster',
				size: 'Large',
				price: 96,
				weight: 6800,
				pickup: true,
			},
			{
				key: 'phantom-point-medium',
				label: 'Phantom Point',
				size: 'Medium',
				price: 74,
				weight: 900,
			},
			{
				key: 'lemurian-point-medium',
				label: 'Lemurian Point',
				size: 'Medium',
				price: 58,
				weight: 820,
				soldOut: true,
			},
			{
				key: 'tumbled-stones-set',
				label: 'Tumbled Stones (Set of 6)',
				size: 'Small',
				price: 24,
				weight: 520,
				unique: false,
				stock: 5,
			},
			{ key: 'palm-stone-small', label: 'Palm Stone', size: 'Small', price: 13, weight: 200 },
			{ key: 'heart-small', label: 'Heart', size: 'Small', price: 17, weight: 280 },
			{ key: 'wand-medium', label: 'Wand', size: 'Medium', price: 38, weight: 1000 },
			{
				key: 'obelisk-large',
				label: 'Obelisk',
				size: 'Large',
				price: 128,
				weight: 5200,
				pickup: true,
			},
			{ key: 'pyramid-small', label: 'Pyramid', size: 'Small', price: 28, weight: 440 },
			{
				key: 'slice-medium',
				label: 'Polished Slice',
				size: 'Medium',
				price: 42,
				weight: 1400,
				unique: false,
				stock: 4,
			},
			{
				key: 'elestial-cluster-large',
				label: 'Elestial Cluster',
				size: 'Large',
				price: 150,
				weight: 5900,
				pickup: true,
				featured: true,
			},
			{
				key: 'candle-holder-small',
				label: 'Geode Candle Holder',
				size: 'Small',
				price: 35,
				weight: 750,
				unique: false,
				stock: 6,
			},
			{
				key: 'rough-specimen-large',
				label: 'Rough Specimen',
				size: 'Large',
				price: 88,
				weight: 7000,
				pickup: true,
			},
			{
				key: 'keychain-tumbled',
				label: 'Keychain Tumbled Stone',
				size: 'Mini',
				price: 9,
				weight: 65,
				unique: false,
				stock: 8,
			},
			{
				key: 'freeform-sculpture-large',
				label: 'Freeform Sculpture',
				size: 'Large',
				price: 260,
				weight: 11000,
				pickup: true,
				soldOut: true,
			},
		],
	},
	agate: {
		label: 'Agate',
		items: [
			{
				key: 'single-geode-medium',
				label: 'Single Geode',
				size: 'Medium',
				price: 46,
				weight: 2100,
			},
			{
				key: 'geode-pair-medium',
				label: 'Geode Pair',
				size: 'Medium',
				price: 24.08,
				weight: 600,
				featured: true,
			},
			{
				key: 'polished-slice-large',
				label: 'Polished Slice',
				size: 'Large',
				price: 88,
				weight: 3800,
			},
			{
				key: 'bookends-medium',
				label: 'Bookends',
				size: 'Medium',
				price: 64,
				weight: 3000,
				unique: false,
				stock: 3,
			},
			{ key: 'sphere-medium', label: 'Sphere', size: 'Medium', price: 58, weight: 1500 },
			{ key: 'tower-small', label: 'Tower', size: 'Small', price: 30, weight: 700 },
			{ key: 'palm-stone-small', label: 'Palm Stone', size: 'Small', price: 11, weight: 180 },
			{ key: 'heart-small', label: 'Heart', size: 'Small', price: 15, weight: 240 },
			{
				key: 'tumbled-stones-set',
				label: 'Tumbled Stones (Set of 5)',
				size: 'Small',
				price: 20,
				weight: 450,
				unique: false,
				stock: 6,
			},
			{ key: 'egg-medium', label: 'Egg', size: 'Medium', price: 38, weight: 1300 },
			{ key: 'pyramid-small', label: 'Pyramid', size: 'Small', price: 24, weight: 400 },
			{
				key: 'crystal-ball-large',
				label: 'Crystal Ball',
				size: 'Large',
				price: 140,
				weight: 5600,
				pickup: true,
			},
			{
				key: 'bowl-large',
				label: 'Geode Bowl',
				size: 'Large',
				price: 120,
				weight: 4800,
				pickup: true,
			},
			{ key: 'slab-xl', label: 'Large Slab', size: 'XL', price: 230, weight: 14000, pickup: true },
			{
				key: 'keychain-tumbled',
				label: 'Keychain Tumbled Stone',
				size: 'Mini',
				price: 8,
				weight: 60,
				unique: false,
				stock: 8,
			},
			{ key: 'wand-medium', label: 'Wand', size: 'Medium', price: 32, weight: 880 },
			{ key: 'thunder-egg-large', label: 'Thunder Egg', size: 'Large', price: 76, weight: 4100 },
			{
				key: 'banded-slice-medium',
				label: 'Banded Slice',
				size: 'Medium',
				price: 44,
				weight: 1200,
				soldOut: true,
			},
			{
				key: 'geode-bookend-pair-small',
				label: 'Geode Bookend Pair',
				size: 'Small',
				price: 36,
				weight: 1400,
			},
			{
				key: 'freeform-medium',
				label: 'Freeform',
				size: 'Medium',
				price: 66,
				weight: 2400,
				featured: true,
			},
		],
	},
}

// Reuse the existing image assets, pooled per gem so placeholders stay meaningful.
const IMAGE_POOL = {
	amethyst: [
		'image-39eb378b386cb75567012864340a5d2bf47bebe0-1600x1200-jpg',
		'image-4a737a10dd9fc1c5f94b95e2422b382f11da932c-1200x1600-jpg',
		'image-714b9ef2a757bd9e670b7fa723a9665ddbde8f9e-1200x1600-jpg',
		'image-16bfbcb2d274685675bbdcae4e45671d2824cb32-1600x1200-jpg',
		'image-28bfb52ee59248ec81ad94d8220ce2db31733463-1600x1200-jpg',
		'image-d104b654df51edb02e784bfdb60ba2bb05ea212d-1200x1600-jpg',
		'image-5c9bdd3bf04f9b43f2b8a89dd8471981125dc1d3-1200x1600-jpg',
		'image-1ac9e7fdf839136e33325c99fa8ce9901fd40521-1200x1600-jpg',
		'image-f1a8126dae11a37f87b4dbe0e499045f7739fbfd-1200x1600-jpg',
		'image-5c28418fbeb4a87b7f471455f46a54b992509c53-1200x1600-jpg',
		'image-e62d66758fb35f887827e50e26707d74ff57b1e7-1200x1600-jpg',
		'image-74ab60aa2aeff25cfff3d18c0e8f119dc974f3d0-1600x1200-jpg',
		'image-7b85cdf1754a0c0a6f125602e769a09df3602d9e-1200x1600-jpg',
	],
	citrine: [
		'image-e974d84e75655a0376a560d1eafa8ced0da8d1b4-1201x1600-jpg',
		'image-a71fd9f9b0d22d319cabf31a1750b8ce2a2ca1f1-1201x1600-jpg',
		'image-c00c227e0e87deb24fe7852e1a1af690ba78ff36-1201x1600-jpg',
		'image-e61409ab29af7c93da4c3f1291e7a3921d405acf-1201x1600-jpg',
		'image-91edbd9d855c3f59485d09ba5d78e59f76a3a12b-1201x1600-jpg',
		'image-cff7c84cf779357fbf97ece835a3c74a7500fb45-1201x1600-jpg',
		'image-bb2d133d1988efbe2872a37dbfd583437bef4889-1201x1600-jpg',
		'image-a5625fcd77f5e3eb05baaca03c6893db5c110267-1201x1600-jpg',
		'image-bec67d6c61fab13b52ae2212d08878d0f32fc31a-1201x1600-jpg',
		'image-484b3dd2dd11f47260e84681ad130a8eb8e6b3df-1201x1600-jpg',
		'image-e3735680cd4e51c508e36eccac5c22829a458b1f-1201x1600-jpg',
	],
	agate: [
		'image-5fef409a549ef6cbeb3a66b883fe29d1d13abf26-1200x1600-jpg',
		'image-fad80fc05e4cb486ec70faac2b65d7b11aa9d361-1600x1200-jpg',
		'image-fd72b600d4b1a5d58672ef9bad842cad11fc51b1-1200x1600-jpg',
	],
}

function slugify(value) {
	return value
		.toLowerCase()
		.replace(/\([^)]*\)/g, '')
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
}

function describeProduct(gem, item, origin) {
	const weight = item.weight >= 1000 ? `${(item.weight / 1000).toFixed(2)} kg` : `${item.weight} g`
	const provenance = origin ? `Sourced from ${origin}.` : 'Sourced from a trusted supplier.'
	const scarcity =
		item.unique !== false
			? 'A unique 1-of-1 piece — once sold, it cannot be restocked.'
			: 'Part of a small, ethically sourced batch.'
	return `A ${item.size.toLowerCase()} ${gem.toLowerCase()} ${item.label} weighing approximately ${weight}. ${provenance} ${scarcity}`
}

async function run() {
	if (isDeleteMode) {
		const result = await client.delete({ query: '*[_id match "seed-*"]' })
		console.log(`Deleted ${result.results.length} seed product(s)`)
		return
	}

	const [categories, existingSlugs] = await Promise.all([
		client.fetch(`*[_type == "category"]{ _id, "slug": slug.current }`),
		client.fetch(`*[_type == "product" && !(_id match "seed-*")]{ "slug": slug.current }`),
	])

	const categoryBySlug = new Map(categories.map((category) => [category.slug, category._id]))
	const usedSlugs = new Set(existingSlugs.map((product) => product.slug))

	const documents = []
	for (const [gemKey, gem] of Object.entries(GEMS)) {
		const categoryId = categoryBySlug.get(gemKey)
		if (!categoryId) {
			throw new Error(`No category found for slug "${gemKey}"`)
		}
		const pool = IMAGE_POOL[gemKey]
		gem.items.forEach((item, index) => {
			const name = `${gem.label} ${item.label}`
			let slug = slugify(name)
			if (usedSlugs.has(slug)) {
				let suffix = 2
				while (usedSlugs.has(`${slug}-${suffix}`)) {
					suffix += 1
				}
				slug = `${slug}-${suffix}`
			}
			usedSlugs.add(slug)

			const id = `seed-${gemKey}-${item.key}`
			const origin = ORIGINS[(index + Object.keys(GEMS).indexOf(gemKey)) % ORIGINS.length]
			const alt = `${name} — ${item.size.toLowerCase()} ${gem.label.toLowerCase()}`
			const stockLevel = item.soldOut ? 0 : (item.stock ?? 1)

			documents.push({
				_id: id,
				_type: 'product',
				name,
				slug: { _type: 'slug', current: slug },
				description: describeProduct(gem.label, item, origin),
				images: pool
					.slice(0, Math.min(2 + (index % 3), pool.length))
					.map((assetId, imageIndex) => ({
						_type: 'image',
						_key: `seed-img-${imageIndex}`,
						asset: { _type: 'reference', _ref: assetId },
						alt,
					})),
				price: item.price,
				category: { _type: 'reference', _ref: categoryId },
				weightInGrams: item.weight,
				deliveryMethod: item.pickup ? 'arrange' : 'post',
				countryOfOrigin: origin,
				isUniquePiece: item.unique !== false,
				stockLevel,
				isFeatured: item.featured ?? false,
			})
		})
	}

	const transaction = client.transaction()
	for (const document of documents) {
		transaction.createOrReplace(document)
	}
	const results = await transaction.commit()

	const inStock = documents.filter((document) => document.stockLevel > 0).length
	const soldOut = documents.length - inStock
	const featured = documents.filter((document) => document.isFeatured).length
	console.log(`Created ${results.results.length} seed product(s)`)
	console.log(`  in stock: ${inStock} (across 3 categories -> shop paginates)`)
	console.log(`  sold out: ${soldOut} (PDP "Sold out" badge)`)
	console.log(`  featured: ${featured} (home page, max 6 shown)`)
}

run().catch((error) => {
	console.error(error)
	process.exitCode = 1
})
