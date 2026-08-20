/**
 * Locks page scroll by setting body overflow to hidden and saving scroll position.
 * Saves the current `window.scrollY` to `document.body.dataset.scrollY` and
 * applies `position: fixed` with negative top offset to keep the page
 * visually in place while preventing scroll.
 *
 * @returns void
 */
export function lockScroll() {
	const scrollY = window.scrollY
	document.body.dataset.scrollY = String(scrollY)
	document.documentElement.style.overflow = 'hidden'
	document.body.style.overflow = 'hidden'
	document.body.style.position = 'fixed'
	document.body.style.top = `-${scrollY}px`
	document.body.style.left = '0'
	document.body.style.right = '0'
	document.body.style.width = '100%'
	document.body.style.overscrollBehavior = 'none'
}

/**
 * Restores previous scroll position and enables scrolling.
 * Reads the saved scroll position from `document.body.dataset.scrollY`,
 * removes the `position: fixed` and `overflow: hidden` styles, and
 * restores the saved scroll offset.
 *
 * @returns void
 */
export function unlockScroll() {
	const scrollY = Number(document.body.dataset.scrollY ?? 0)
	delete document.body.dataset.scrollY
	document.documentElement.style.overflow = ''
	document.body.style.overflow = ''
	document.body.style.position = ''
	document.body.style.top = ''
	document.body.style.left = ''
	document.body.style.right = ''
	document.body.style.width = ''
	document.body.style.overscrollBehavior = ''
	window.scrollTo(0, scrollY)
}
