import { formatPrice } from '../../lib/format'
import { imageUrl } from '../../lib/images'
import type { ProductCardData } from '../../queries/sanity'
import FadeInImage from './FadeInImage'

interface ProductCardProps {
	product: ProductCardData
}

export default function ProductCard({ product }: ProductCardProps) {
	const imageSrc = imageUrl(product.image?.url, 600)
	return (
		<a href={`/shop/product/${product.slug}`} className="group flex flex-col">
			<div className="relative aspect-square overflow-hidden rounded-sm border border-stone-200/80 bg-stone-100 transition-all duration-300 group-hover:border-violet-700/40 group-hover:shadow-sm">
				{imageSrc ? (
					<FadeInImage
						src={imageSrc}
						alt={product.image?.alt ?? product.name}
						width={product.image?.width ?? undefined}
						height={product.image?.height ?? undefined}
						placeholderColor={product.image?.dominantColor}
						placeholderLqip={product.image?.lqip}
						className="aspect-square w-full rounded-sm"
						imgClassName="group-hover:scale-105"
						loading="lazy"
					/>
				) : null}
				{product.isUniquePiece ? (
					<span className="absolute left-2 top-2 rounded-full border border-stone-200/70 bg-white/95 px-2.5 py-1 text-[0.625rem] font-semibold uppercase tracking-[0.14em] text-violet-800">
						1 of 1
					</span>
				) : null}
			</div>
			<div className="mt-4 flex flex-col gap-1.5">
				<p className="text-[0.6875rem] font-semibold uppercase tracking-[0.18em] text-violet-700">
					{product.category.name}
				</p>
				<h3 className="text-lg font-medium text-stone-950">
					<span className="relative inline-block">
						{product.name}
						<span
							aria-hidden
							className="absolute inset-x-0 -bottom-0.5 h-px origin-left scale-x-0 bg-violet-700 transition-transform duration-300 group-hover:scale-x-100"
						/>
					</span>
				</h3>
				<p className="text-sm font-medium text-stone-600">{formatPrice(product.price)}</p>
			</div>
		</a>
	)
}
