function reveal(image: HTMLImageElement, fade: boolean) {
	if (!fade) {
		image.style.transition = 'none'
	}
	image.classList.remove('opacity-0')
	image.classList.add('opacity-100')
	if (!fade) {
		void image.offsetWidth
		image.style.transition = ''
	}
}

/**
 * Reveals image with fade/scale transition, handles load/error events.
 * If the image is already complete, reveals instantly without transition.
 * Otherwise, adds one-time `load` and `error` event listeners that reveal
 * the image (with fade on load, without fade on error) using a single-use
 * listener (`{ once: true }`).
 *
 * @param image - Image element to reveal/transition
 * @returns void
 */
export function transitionImage(image: HTMLImageElement) {
	if (image.complete) {
		reveal(image, false)
	} else {
		image.addEventListener('load', () => reveal(image, true), { once: true })
		image.addEventListener('error', () => reveal(image, false), { once: true })
	}
}
