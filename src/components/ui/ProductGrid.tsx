import type { ProductCardData } from '../../queries/sanity'
import ProductCard from './ProductCard'

interface ProductGridProps {
	products: ProductCardData[]
	wide?: boolean
}

function ProductGrid({ products, wide = false }: ProductGridProps) {
	const gridClasses = wide
		? 'mt-8 grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4'
		: 'mt-8 grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3'
	return (
		<ul className={gridClasses}>
			{products.map((product) => (
				<li key={product._id}>
					<ProductCard product={product} />
				</li>
			))}
		</ul>
	)
}

export default ProductGrid
