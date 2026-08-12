function reveal(image: HTMLImageElement, fade: boolean) {
	if (!fade) {
		image.classList.remove('motion-safe:transition-opacity', 'motion-safe:duration-300')
	}
	image.classList.remove('opacity-0')
	image.classList.add('opacity-100')
}

export function transitionImage(image: HTMLImageElement) {
	if (image.complete) {
		reveal(image, false)
	} else {
		image.addEventListener('load', () => reveal(image, true), { once: true })
		image.addEventListener('error', () => reveal(image, false), { once: true })
	}
}
