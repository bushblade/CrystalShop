import { animated } from '@react-spring/web'
import { useMobileNav } from '../hooks/useMobileNav'

const NAV_LINKS = [
	{ href: '/shop', label: 'Shop' },
	{ href: '/about', label: 'About' },
	{ href: '/contact', label: 'Contact' },
]

const PANEL_ID = 'mobile-nav-menu'

function hamburgerBarClasses(position: 'top' | 'middle' | 'bottom', open: boolean): string {
	const base = 'block h-0.5 rounded-full bg-current transition-all duration-200'
	switch (position) {
		case 'top':
			return `${base} ${open ? 'translate-y-[6px] rotate-45' : ''}`
		case 'middle':
			return `${base} ${open ? 'opacity-0' : ''}`
		case 'bottom':
			return `${base} ${open ? '-translate-y-[6px] -rotate-45' : ''}`
	}
}

// Orchestration only: pulls all menu logic from `useMobileNav` and wires it into
// the hamburger trigger and the presentational animated panel. No state, no
// effects, no store access of its own — mirrors `CartDrawer`.
export default function MobileNav() {
	const { open, transitions, triggerRef, panelRef, toggleMenu, closeMenu } = useMobileNav()

	return (
		<div className="md:hidden">
			<button
				type="button"
				ref={triggerRef}
				onClick={toggleMenu}
				aria-expanded={open}
				aria-controls={PANEL_ID}
				aria-label={open ? 'Close menu' : 'Open menu'}
				className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-stone-600 transition-colors hover:text-violet-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-700"
			>
				<span aria-hidden="true" className="flex h-3.5 w-5 flex-col justify-between">
					<span className={hamburgerBarClasses('top', open)} />
					<span className={hamburgerBarClasses('middle', open)} />
					<span className={hamburgerBarClasses('bottom', open)} />
				</span>
			</button>
			{transitions((style, item) =>
				item ? (
					<animated.nav
						id={PANEL_ID}
						ref={panelRef}
						aria-label="Mobile navigation"
						className="absolute right-0 top-full mt-2 flex w-44 flex-col rounded-xl border border-stone-200 bg-white p-2 shadow-lg"
						style={{
							opacity: style.opacity,
							transform: style.y.to((value) => `translateY(${value}px)`),
						}}
					>
						{NAV_LINKS.map((link) => (
							<a
								key={link.href}
								href={link.href}
								onClick={closeMenu}
								className="rounded-lg px-3 py-2 text-xs font-medium uppercase tracking-[0.14em] text-stone-600 transition-colors hover:text-violet-800"
							>
								{link.label}
							</a>
						))}
					</animated.nav>
				) : null,
			)}
		</div>
	)
}
