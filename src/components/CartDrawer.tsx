import { useCartDrawer } from '../hooks/useCartDrawer'
import type { ShippingRate } from '../lib/shipping'
import CartDrawerPanel from './CartDrawerPanel'
import CartTrigger from './CartTrigger'

interface CartDrawerProps {
	shippingRates: ShippingRate[]
}

// Orchestration only: pulls all drawer logic from `useCartDrawer` and wires it
// into the trigger and the presentational `CartDrawerPanel`. No state, no
// effects, no markup of its own.
export default function CartDrawer({ shippingRates }: CartDrawerProps) {
	const drawer = useCartDrawer(shippingRates)
	return (
		<>
			<CartTrigger ref={drawer.triggerRef} count={drawer.totals.count} onOpen={drawer.openCart} />
			<CartDrawerPanel
				transitions={drawer.transitions}
				drawerRef={drawer.drawerRef}
				items={drawer.items}
				limits={drawer.limits}
				setQuantity={drawer.setQuantity}
				remove={drawer.remove}
				totals={drawer.totals}
				checkoutState={drawer.checkoutState}
				onClose={drawer.closeCart}
				onCheckout={drawer.handleCheckout}
			/>
		</>
	)
}
