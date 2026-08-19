import type { SanityClient } from '@sanity/client'
import { vi } from 'vitest'
import type {
	CHECKOUT_ITEMS_QUERY_RESULT,
	SITE_SETTINGS_QUERY_RESULT,
	STOCK_LEVELS_QUERY_RESULT,
} from '../../sanity.types'

type FetchParams = { ids?: string[]; id?: string }

export type FakeSanityConfig = {
	products?: CHECKOUT_ITEMS_QUERY_RESULT
	stockLevels?: STOCK_LEVELS_QUERY_RESULT
	siteSettings?: SITE_SETTINGS_QUERY_RESULT
	fetchError?: Error
	existingOrder?: { _id: string } | null
	commitError?: Error
}

export type FakeSanity = {
	fetch: ReturnType<typeof vi.fn>
	transaction: ReturnType<typeof vi.fn>
	commit: ReturnType<typeof vi.fn>
	createdDoc: Record<string, unknown> | undefined
	patches: Record<string, Record<string, unknown>>
}

export function fakeSanity(config: FakeSanityConfig = {}): FakeSanity {
	const state: FakeSanity = {
		fetch: vi.fn(),
		transaction: vi.fn(),
		commit: vi.fn(),
		createdDoc: undefined,
		patches: {},
	}

	state.fetch.mockImplementation(async (_query: string, params?: FetchParams) => {
		if (config.fetchError) throw config.fetchError
		if (params?.ids) return config.products ?? config.stockLevels ?? []
		if (params?.id) return config.existingOrder ?? null
		return config.siteSettings ?? null
	})

	state.commit.mockImplementation(async () => {
		if (config.commitError) throw config.commitError
	})

	state.transaction.mockImplementation(() => {
		const tx = {
			create: (doc: Record<string, unknown>) => {
				state.createdDoc = doc
				return tx
			},
			patch: (
				id: string,
				apply: (patch: { set: (value: Record<string, unknown>) => unknown }) => unknown,
			) => {
				const patch = {
					set: (value: Record<string, unknown>) => {
						state.patches[id] = value
						return patch
					},
				}
				apply(patch)
				return tx
			},
			commit: state.commit,
		}
		return tx
	})

	return state
}

export function asSanityClient(fake: FakeSanity): SanityClient {
	return fake as unknown as SanityClient
}
