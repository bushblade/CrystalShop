import { useState } from 'react'
import { imageUrl } from '../lib/images'

interface ProductGalleryImage {
	url?: string | null
	alt?: string | null
	width?: number | null
	height?: number | null
}

interface ProductGalleryProps {
	images: ProductGalleryImage[]
	name: string
}

export default function ProductGallery({ images, name }: ProductGalleryProps) {
	const [selectedIndex, setSelectedIndex] = useState(0)

	if (images.length === 0) {
		return null
	}

	const selected = images[selectedIndex] ?? images[0]

	return (
		<div className="space-y-4">
			{selected?.url ? (
				<img
					src={imageUrl(selected.url, 1000) ?? undefined}
					alt={selected.alt ?? name}
					width={selected.width ?? undefined}
					height={selected.height ?? undefined}
					className="aspect-square w-full rounded-lg bg-stone-100 object-cover"
				/>
			) : null}
			{images.length > 1 ? (
				<div className="grid grid-cols-4 gap-4">
					{images.map((image, index) =>
						image.url ? (
							<button
								key={image.url}
								type="button"
								onClick={() => setSelectedIndex(index)}
								aria-label={`Show image of ${name}`}
								aria-current={index === selectedIndex ? 'true' : undefined}
								className="cursor-pointer rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-700"
							>
								<img
									src={imageUrl(image.url, 300) ?? undefined}
									alt={image.alt ?? name}
									width={image.width ?? undefined}
									height={image.height ?? undefined}
									loading="lazy"
									className={`aspect-square w-full rounded-md bg-stone-100 object-cover transition-opacity ${
										index === selectedIndex
											? 'ring-2 ring-violet-700'
											: 'opacity-70 hover:opacity-100'
									}`}
								/>
							</button>
						) : null,
					)}
				</div>
			) : null}
		</div>
	)
}
