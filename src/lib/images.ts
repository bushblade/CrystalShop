export function imageUrl(url: string | null | undefined, width: number): string | null {
	if (!url) {
		return null
	}
	return `${url}?auto=format&fit=max&w=${width}`
}
