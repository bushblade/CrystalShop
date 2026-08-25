import { createClient } from '@sanity/client'
import { SANITY_API_VERSION } from '../../src/lib/apiVersions'
import { resolveSanityCredentials, serverTrustClientOptions } from '../../src/lib/sanityEnvironment'

// Shared functions-side Sanity client, distinct from Astro's `sanity:client`
// used in pages. Thin adapter: which project/dataset and the trust policy
// live in `src/lib/sanityEnvironment.ts`; all this adds is how a Netlify
// function reads env vars (via the Netlify runtime global, working under
// both `netlify dev` and deployed functions) plus optional write token.
export function createSanityClient(token?: string) {
	const { projectId, dataset } = resolveSanityCredentials((name) => Netlify.env.get(name))
	return createClient({
		projectId,
		dataset,
		apiVersion: SANITY_API_VERSION,
		...serverTrustClientOptions,
		token,
	})
}
