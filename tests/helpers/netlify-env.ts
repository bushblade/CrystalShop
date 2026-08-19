import { afterEach, vi } from 'vitest'

type EnvOverrides = Record<string, string | undefined>

const BASE_ENV: EnvOverrides = {
	STRIPE_RESTRICTED_KEY: 'rk_test_dummy',
	STRIPE_WEBHOOK_SECRET: 'whsec_test_webhook_signing_secret_for_local_verification',
	STRIPE_EXPECTED_MODE: 'test',
	PUBLIC_SANITY_STUDIO_PROJECT_ID: '8jzdagyy',
	PUBLIC_SANITY_STUDIO_DATASET: 'development',
	SANITY_WRITE_TOKEN: 'sk_dummy',
}

export function stubNetlifyEnv(overrides: EnvOverrides = {}) {
	vi.stubGlobal('Netlify', {
		env: {
			get: (key: string) => ({ ...BASE_ENV, ...overrides })[key],
		},
	})
}

afterEach(() => {
	vi.unstubAllGlobals()
})
