import { type TransitionFn, useReducedMotion, useTransition } from '@react-spring/web'
import { type RefObject, useEffect, useRef, useState } from 'react'
import { lockScroll as lockPageScroll, unlockScroll as unlockPageScroll } from '../utils/scrollLock'

// Selector for every element inside an overlay that keyboard users can Tab to.
// Disabled controls are skipped, and [tabindex="-1"] elements (e.g. the drawer's
// invisible backdrop) are deliberately excluded so Tab never lands on them.
const FOCUSABLE_SELECTOR =
	'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

/**
 * Returns every focusable element inside an overlay panel in DOM order, used
 * by both the initial-focus and focus-trap effects.
 *
 * @param container - The overlay panel element
 * @returns Focusable elements in DOM order
 */
function getFocusableElements(container: HTMLElement): HTMLElement[] {
	return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
}

/** The spring motion an overlay animates with, in its open and closed poses. */
export interface OverlayMotion<S> {
	from: S
	enter: S
	leave: S
}

/** Optional overlay behaviours; everything left off defaults to plain open/close. */
export interface OverlayOptions {
	/** While open, cycle keyboard Tab between the panel's first and last focusable elements. */
	trapFocus?: boolean
	/** While open, lock page scroll behind the overlay. */
	lockScroll?: boolean
	/** Close when a pointer press lands outside both the trigger and the panel. */
	dismissOnOutsideClick?: boolean
}

// The complete contract between `useOverlay` and the UI layer. Wrappers
// (useCartDrawer, useMobileNav) rename or extend these values for their own
// components but never re-implement them. `transitions` stays wide here
// because react-spring cannot resolve its animated-value types through a
// generic shape; each wrapper narrows it to its own concrete alias.
export interface OverlayReturn<E extends HTMLElement> {
	open: boolean
	openOverlay: () => void
	closeOverlay: () => void
	toggleOverlay: () => void
	// react-spring's TransitionFn is contravariant in its animated-values
	// parameter, so no concrete shape accepts what useTransition infers for an
	// abstract spring type. The handle stays wide here; each wrapper narrows it
	// to its own concrete alias when returning it to components.
	// biome-ignore lint/suspicious/noExplicitAny: see comment above
	transitions: TransitionFn<boolean, any>
	triggerRef: RefObject<HTMLButtonElement | null>
	panelRef: RefObject<E | null>
}

/**
 * Owns the shared overlay lifecycle — open/close state, the spring animation
 * (including reduced-motion fallback), moving focus into the panel on open,
 * restoring focus to the trigger once the leave animation settles, Escape to
 * close, plus the optional trap-focus / scroll-lock / outside-click-dismiss
 * behaviours.
 *
 * Every floating panel uses this hook so accessibility fixes land once and
 * apply everywhere (see CONTEXT.md, "Overlay"). Panel-specific extras belong
 * to the caller's wrapper hook, not here.
 *
 * @typeParam S - Spring value shape the panel animates (e.g. `{ x, opacity }`)
 * @typeParam E - Panel element type (`HTMLDivElement` for the drawer)
 * @param motion - The spring's from/enter/leave values
 * @param options - Which optional behaviours to enable while open
 * @returns Open state, open/close/toggle controls, the spring transition
 *   object, and the trigger/panel refs. See {@link OverlayReturn}.
 */
export function useOverlay<S extends object, E extends HTMLElement = HTMLElement>(
	motion: OverlayMotion<S>,
	options: OverlayOptions = {},
): OverlayReturn<E> {
	const { trapFocus = false, lockScroll = false, dismissOnOutsideClick = false } = options

	const [open, setOpen] = useState(false)
	const triggerRef = useRef<HTMLButtonElement>(null)
	const panelRef = useRef<E>(null)
	// Keeps the latest `open` value readable inside the spring's onRest callback,
	// which is a closure that would otherwise capture a stale value.
	const openRef = useRef(open)
	openRef.current = open

	const reduceMotion = useReducedMotion()
	const transitions = useTransition(open, {
		from: motion.from,
		enter: motion.enter,
		leave: motion.leave,
		config: reduceMotion ? { duration: 0 } : { tension: 210, friction: 26 },
		// onRest fires every time an animation settles. When the leave animation
		// finishes (open is now false), the panel is about to unmount — this is
		// the right moment to hand focus back to the trigger so it isn't lost
		// when the panel tears down. The guard skips the enter animation.
		onRest: () => {
			if (openRef.current) return
			triggerRef.current?.focus()
		},
	})

	// On open: move focus into the panel — its first focusable element, or the
	// panel itself when it has none.
	useEffect(() => {
		if (!open) return
		const container = panelRef.current
		if (!container) return
		const focusables = getFocusableElements(container)
		;(focusables[0] ?? container).focus()
	}, [open])

	// While open: close on Escape, optionally trap keyboard focus inside the
	// panel (Tab wraps between first and last, and focus that escapes is pulled
	// back in), optionally lock page scroll, and optionally dismiss on outside
	// pointer presses.
	useEffect(() => {
		if (!open) return
		function onKeyDown(event: KeyboardEvent) {
			if (event.key === 'Escape') {
				setOpen(false)
				return
			}
			if (event.key !== 'Tab' || !trapFocus) return
			const container = panelRef.current
			if (!container) return
			const focusables = getFocusableElements(container)
			if (focusables.length === 0) return
			const first = focusables[0]
			const last = focusables[focusables.length - 1]
			const current = document.activeElement
			if (event.shiftKey) {
				// Shift+Tab from the first element (or when focus escaped) → last.
				if (current === first || !container.contains(current)) {
					event.preventDefault()
					last.focus()
				}
			} else if (current === last || !container.contains(current)) {
				// Tab from the last element (or when focus escaped) → first.
				event.preventDefault()
				first.focus()
			}
		}
		function onPointerDown(event: PointerEvent) {
			if (!dismissOnOutsideClick) return
			const target = event.target
			if (target instanceof Node && triggerRef.current?.contains(target)) return
			if (target instanceof Node && panelRef.current?.contains(target)) return
			setOpen(false)
		}
		document.addEventListener('keydown', onKeyDown)
		document.addEventListener('pointerdown', onPointerDown)
		if (lockScroll) lockPageScroll()
		return () => {
			document.removeEventListener('keydown', onKeyDown)
			document.removeEventListener('pointerdown', onPointerDown)
			if (lockScroll) unlockPageScroll()
		}
	}, [open, trapFocus, lockScroll, dismissOnOutsideClick])

	function openOverlay() {
		setOpen(true)
	}

	function closeOverlay() {
		setOpen(false)
	}

	function toggleOverlay() {
		setOpen((current) => !current)
	}

	return { open, openOverlay, closeOverlay, toggleOverlay, transitions, triggerRef, panelRef }
}
