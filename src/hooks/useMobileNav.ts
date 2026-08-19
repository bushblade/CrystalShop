import {
	type PickAnimated,
	type TransitionFn,
	useReducedMotion,
	useTransition,
} from '@react-spring/web'
import { type RefObject, useEffect, useRef, useState } from 'react'

// The exact spring shape the mobile nav panel animates (fade + slide down).
// Naming the concrete transition type keeps the animated `style` values fully
// typed in `MobileNav`, mirroring the drawer's `DrawerTransitions`.
export type MobileNavSpringState = { opacity: number; y: number }
export type MobileNavTransitions = TransitionFn<boolean, PickAnimated<MobileNavSpringState>>

export interface UseMobileNavReturn {
	open: boolean
	transitions: MobileNavTransitions
	triggerRef: RefObject<HTMLButtonElement | null>
	panelRef: RefObject<HTMLElement | null>
	toggleMenu: () => void
	closeMenu: () => void
}

/**
 * Owns the mobile nav menu lifecycle — open/close, Escape and outside-click
 * dismissal, focus management, and the spring animation.
 *
 * The component layer stays presentational: `MobileNav` wires this hook's
 * output into the hamburger trigger and the animated panel, holding no state,
 * no effects, and no store access of its own. This mirrors the cart drawer's
 * `useCartDrawer` / `CartDrawer` split.
 *
 * @returns Everything the trigger and panel need: open state, the spring
 *   transition object, DOM refs, and open/close controls. See
 *   {@link UseMobileNavReturn}.
 */
export function useMobileNav(): UseMobileNavReturn {
	const [open, setOpen] = useState(false)

	const triggerRef = useRef<HTMLButtonElement>(null)
	const panelRef = useRef<HTMLElement>(null)
	// Keeps the latest `open` value readable inside the spring's onRest callback,
	// which is a closure that would otherwise capture a stale value.
	const openRef = useRef(open)
	openRef.current = open

	const reduceMotion = useReducedMotion()
	const transitions: MobileNavTransitions = useTransition(open, {
		// The menu drops down from the trigger (y: -8px) and fades in.
		from: { opacity: 0, y: -8 },
		enter: { opacity: 1, y: 0 },
		leave: { opacity: 0, y: -8 },
		config: reduceMotion ? { duration: 0 } : { tension: 210, friction: 26 },
		// onRest fires every time an animation settles. When the leave animation
		// finishes (open is now false), the panel is about to unmount — this is the
		// right moment to hand focus back to the hamburger button so it isn't lost
		// when the panel tears down. The guard skips the enter animation.
		onRest: () => {
			if (openRef.current) return
			triggerRef.current?.focus()
		},
	})

	// On open: move focus into the panel — the first link — so keyboard users
	// land on the menu rather than being left on the trigger.
	useEffect(() => {
		if (!open) return
		const panel = panelRef.current
		if (!panel) return
		const firstLink = panel.querySelector<HTMLAnchorElement>('a[href]')
		firstLink?.focus()
	}, [open])

	// While open: close on Escape, and close when a pointer press lands anywhere
	// outside the trigger and panel (outside-click dismissal).
	useEffect(() => {
		if (!open) return
		function onKeyDown(event: KeyboardEvent) {
			if (event.key === 'Escape') setOpen(false)
		}
		function onPointerDown(event: PointerEvent) {
			const target = event.target
			if (target instanceof Node && triggerRef.current?.contains(target)) return
			if (target instanceof Node && panelRef.current?.contains(target)) return
			setOpen(false)
		}
		document.addEventListener('keydown', onKeyDown)
		document.addEventListener('pointerdown', onPointerDown)
		return () => {
			document.removeEventListener('keydown', onKeyDown)
			document.removeEventListener('pointerdown', onPointerDown)
		}
	}, [open])

	function toggleMenu() {
		setOpen((current) => !current)
	}

	function closeMenu() {
		setOpen(false)
	}

	return {
		open,
		transitions,
		triggerRef,
		panelRef,
		toggleMenu,
		closeMenu,
	}
}
