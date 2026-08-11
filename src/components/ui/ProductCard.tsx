import { formatPrice } from '../../lib/format'
import { imageUrl } from '../../lib/images'
import type { ProductCardData } from '../../queries/sanity'

interface ProductCardProps {
	product: ProductCardData
}

export default function ProductCard({ product }: ProductCardProps) {
	const imageSrc = imageUrl(product.image?.url, 600)
	return (
		<a
			href={`/shop/product/${product.slug}`}
			className="group flex flex-col overflow-hidden rounded-md"
		>
			<div className="relative aspect-square overflow-hidden rounded-md bg-stone-100">
				{imageSrc ? (
					<img
						src={imageSrc}
						alt={product.image?.alt ?? product.name}
						width={product.image?.width ?? undefined}
						height={product.image?.height ?? undefined}
						loading="lazy"
						className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
					/>
				) : null}
				{product.isUniquePiece ? (
					<span className="absolute left-2 top-2 rounded-full bg-white/90 px-2 py-0.5 text-xs font-medium text-violet-700">
						1 of 1
					</span>
				) : null}
			</div>
			<div className="mt-3 flex flex-col gap-1">
				<p className="text-xs font-medium uppercase tracking-wide text-violet-700">
					{product.category.name}
				</p>
				<h3 className="font-display text-lg font-semibold text-stone-900 transition-colors group-hover:text-violet-800">
					{product.name}
				</h3>
				<p className="text-sm text-stone-600">{formatPrice(product.price)}</p>
			</div>
		</a>
	)
}
