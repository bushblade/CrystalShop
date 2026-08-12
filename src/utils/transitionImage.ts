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

export function transitionImage(image: HTMLImageElement) {
	if (image.complete) {
		reveal(image, false)
	} else {
		image.addEventListener('load', () => reveal(image, true), { once: true })
		image.addEventListener('error', () => reveal(image, false), { once: true })
	}
}
