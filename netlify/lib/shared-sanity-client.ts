import { createClient } from '@sanity/client'

// Shared functions-side Sanity client, distinct from Astro's `sanity:client`
// used in pages. Reads env via the Netlify runtime global so it works under
// both `netlify dev` and deployed functions. Always reads fresh, published
// content — never the CDN, never drafts — so checkout can't be priced or
// stocked from stale or unpublished data.
export function createSanityClient() {
	const projectId = Netlify.env.get('PUBLIC_SANITY_STUDIO_PROJECT_ID')
	const dataset = Netlify.env.get('PUBLIC_SANITY_STUDIO_DATASET')
	if (!projectId) {
		throw new Error('Missing required environment variable: PUBLIC_SANITY_STUDIO_PROJECT_ID')
	}
	if (!dataset) {
		throw new Error('Missing required environment variable: PUBLIC_SANITY_STUDIO_DATASET')
	}
	return createClient({
		projectId,
		dataset,
		apiVersion: '2026-08-10',
		useCdn: false,
		perspective: 'published',
	})
}
