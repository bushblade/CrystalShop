import type { PickAnimated, TransitionFn } from '@react-spring/web'
import type { RefObject } from 'react'
import { useOverlay } from './useOverlay'

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
 * Adapts the shared overlay lifecycle to the mobile nav menu's vocabulary.
 *
 * Everything generic to floating panels (animation, focus management, Escape,
 * outside-click dismissal) lives in {@link useOverlay}; this hook only renames
 * its output for the menu. The component layer stays presentational:
 * `MobileNav` wires this hook's output into the hamburger trigger and the
 * animated panel, holding no state, no effects, and no store access of its own.
 *
 * @returns Everything the trigger and panel need: open state, the spring
 *   transition object, DOM refs, and open/close controls. See
 *   {@link UseMobileNavReturn}.
 */
export function useMobileNav(): UseMobileNavReturn {
	// The menu drops down from the trigger (y: -8px) and fades; it dismisses on
	// outside clicks — a menu-specific behaviour.
	const { open, transitions, triggerRef, panelRef, toggleOverlay, closeOverlay } = useOverlay<
		MobileNavSpringState,
		HTMLElement
	>(
		{ from: { opacity: 0, y: -8 }, enter: { opacity: 1, y: 0 }, leave: { opacity: 0, y: -8 } },
		{ dismissOnOutsideClick: true },
	)

	return {
		open,
		transitions: transitions as MobileNavTransitions,
		triggerRef,
		panelRef,
		toggleMenu: toggleOverlay,
		closeMenu: closeOverlay,
	}
}
