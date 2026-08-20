export type CheckoutMetadataItem = {
	id: string
	name: string
	unitPrice: number
	quantity: number
}

const LEGACY_METADATA_KEY = 'items'
const METADATA_CHUNK_PREFIX = 'items'
const MAX_METADATA_VALUE_LENGTH = 500
const SAFE_METADATA_CHUNK_LENGTH = 450
const MAX_METADATA_KEYS = 50

/**
 * Splits serialized checkout data into Stripe-safe metadata values.
 *
 * The chunk size stays below Stripe's 500-character value limit while avoiding
 * splitting a UTF-16 surrogate pair between adjacent values.
 */
function splitMetadataValue(value: string): string[] {
	const chunks: string[] = []
	let start = 0

	while (start < value.length) {
		let end = Math.min(start + SAFE_METADATA_CHUNK_LENGTH, value.length)
		if (end < value.length && isHighSurrogate(value.charCodeAt(end - 1))) end -= 1
		chunks.push(value.slice(start, end))
		start = end
	}

	return chunks
}

/** Returns whether a UTF-16 code unit starts a surrogate pair. */
function isHighSurrogate(code: number): boolean {
	return code >= 0xd800 && code <= 0xdbff
}

/** Parses and validates the item snapshot stored in checkout metadata. */
function parseItemsJson(raw: string): CheckoutMetadataItem[] | null {
	try {
		const parsed = JSON.parse(raw) as unknown
		if (!Array.isArray(parsed) || parsed.length === 0) return null

		const items: CheckoutMetadataItem[] = []
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

/**
 * Serializes the server-authoritative item snapshot into sequential Stripe
 * metadata values, or returns null when Stripe's metadata key capacity is exceeded.
 */
export function createCheckoutMetadata(
	items: CheckoutMetadataItem[],
): Record<string, string> | null {
	const serialized = JSON.stringify(items)
	const chunks = splitMetadataValue(serialized)
	if (chunks.length > MAX_METADATA_KEYS) return null

	return Object.fromEntries(
		chunks.map((chunk, index) => [`${METADATA_CHUNK_PREFIX}${index}`, chunk]),
	)
}

/**
 * Reassembles and validates chunked checkout metadata, while retaining support
 * for the legacy single `items` value used by older Checkout Sessions.
 */
export function parseCheckoutMetadata(
	metadata: Record<string, string> | null | undefined,
): CheckoutMetadataItem[] | null {
	if (!metadata) return null

	const legacy = metadata[LEGACY_METADATA_KEY]
	if (legacy !== undefined) return typeof legacy === 'string' ? parseItemsJson(legacy) : null

	const chunks = Object.entries(metadata)
		.filter(([key]) => /^items(?:0|[1-9]\d*)$/.test(key))
		.map(([key, value]) => ({ index: Number(key.slice(METADATA_CHUNK_PREFIX.length)), value }))
	if (chunks.length === 0 || chunks.length > MAX_METADATA_KEYS) return null
	if (
		chunks.some(
			({ value }) => typeof value !== 'string' || value.length > MAX_METADATA_VALUE_LENGTH,
		)
	)
		return null

	chunks.sort((a, b) => a.index - b.index)
	if (chunks.some(({ index }, position) => index !== position)) return null

	return parseItemsJson(chunks.map(({ value }) => value).join(''))
}
