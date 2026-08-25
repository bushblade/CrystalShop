import { describe, expect, it } from 'vitest'
import {
	resolveSanityCredentials,
	SANITY_DATASET_ENV_VAR,
	SANITY_PROJECT_ID_ENV_VAR,
	serverTrustClientOptions,
} from './sanityEnvironment'

function makeReader(values: Record<string, string>) {
	return (name: string) => values[name]
}

describe('resolveSanityCredentials', () => {
	it('returns the project/dataset pair when both variables are set', () => {
		expect(
			resolveSanityCredentials(
				makeReader({
					[SANITY_PROJECT_ID_ENV_VAR]: '8jzdagyy',
					[SANITY_DATASET_ENV_VAR]: 'development',
				}),
			),
		).toEqual({ projectId: '8jzdagyy', dataset: 'development' })
	})

	it('throws naming the project variable when it is missing', () => {
		expect(() =>
			resolveSanityCredentials(makeReader({ [SANITY_DATASET_ENV_VAR]: 'development' })),
		).toThrow(`Missing required environment variable: ${SANITY_PROJECT_ID_ENV_VAR}`)
	})

	it('throws naming the dataset variable when it is missing', () => {
		expect(() =>
			resolveSanityCredentials(makeReader({ [SANITY_PROJECT_ID_ENV_VAR]: '8jzdagyy' })),
		).toThrow(`Missing required environment variable: ${SANITY_DATASET_ENV_VAR}`)
	})

	it('treats empty strings as missing', () => {
		expect(() =>
			resolveSanityCredentials(
				makeReader({ [SANITY_PROJECT_ID_ENV_VAR]: '', [SANITY_DATASET_ENV_VAR]: 'production' }),
			),
		).toThrow(`Missing required environment variable: ${SANITY_PROJECT_ID_ENV_VAR}`)
	})
})

describe('serverTrustClientOptions', () => {
	it('pins fresh published content', () => {
		expect(serverTrustClientOptions).toEqual({ useCdn: false, perspective: 'published' })
	})
})
