/**
 * Constructs image URL with auto format and resize parameters.
 * Appends `?auto=format&fit=max&w=${width}` to the given URL.
 * Returns `null` if `url` is falsy.
 *
 * @param url - Base image URL (may be `null` or `undefined`)
 * @param width - Target width in pixels
 * @returns Full image URL with resize parameters, or `null`
 */
export function imageUrl(url: string | null | undefined, width: number): string | null {
	if (!url) {
		return null
	}
	return `${url}?auto=format&fit=max&w=${width}`
}
