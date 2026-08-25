export const SANITY_PROJECT_ID_ENV_VAR = 'PUBLIC_SANITY_STUDIO_PROJECT_ID'
export const SANITY_DATASET_ENV_VAR = 'PUBLIC_SANITY_STUDIO_DATASET'

/**
 * Reads a named environment variable in whatever way the current runtime
 * provides (`process.env`, `import.meta.env`, Netlify's global, …).
 *
 * @param name - Canonical environment variable name
 * @returns The variable's value, or `undefined` when unset
 */
export type GetEnvVar = (name: string) => string | undefined

export type SanityCredentials = {
	projectId: string
	dataset: string
}

/**
 * Resolves and validates the Sanity project/dataset pair from any runtime.
 * Callers supply how to read env vars for their environment (browser bundle,
 * Node build step, Netlify function); this module owns which variable names
 * are canonical and what happens when one is missing — so the knowledge lives
 * here once instead of being re-encoded per dialect.
 *
 * @param getEnv - Runtime-specific env reader
 * @returns Validated credentials for every Sanity client in the app
 * @throws When either variable is missing or empty
 */
export function resolveSanityCredentials(getEnv: GetEnvVar): SanityCredentials {
	const projectId = getEnv(SANITY_PROJECT_ID_ENV_VAR)
	if (!projectId) {
		throw new Error(`Missing required environment variable: ${SANITY_PROJECT_ID_ENV_VAR}`)
	}
	const dataset = getEnv(SANITY_DATASET_ENV_VAR)
	if (!dataset) {
		throw new Error(`Missing required environment variable: ${SANITY_DATASET_ENV_VAR}`)
	}
	return { projectId, dataset }
}

/**
 * Client options for code paths where money or stock must come from fresh,
 * published content only — never the CDN, never drafts. Used by checkout,
 * the webhook's Sanity reads, and the cart freshness cycle.
 */
export const serverTrustClientOptions = {
	useCdn: false,
	perspective: 'published',
} as const
