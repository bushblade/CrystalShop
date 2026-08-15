import { useEffect, useRef } from 'react'
import { transitionImage } from '../../utils/transitionImage'

interface FadeInImageProps {
	src: string
	alt: string
	width?: number
	height?: number
	placeholderColor?: string | null
	placeholderLqip?: string | null
	className?: string
	imgClassName?: string
	loading?: 'eager' | 'lazy'
}

function FadeInImage({
	src,
	alt,
	width,
	height,
	placeholderColor,
	placeholderLqip,
	className,
	imgClassName,
	loading,
}: FadeInImageProps) {
	const imageRef = useRef<HTMLImageElement>(null)

	useEffect(() => {
		if (imageRef.current) {
			transitionImage(imageRef.current)
		}
	}, [])

	return (
		<div
			className={`relative overflow-hidden bg-stone-100 ${className ?? ''}`}
			style={placeholderColor ? { backgroundColor: placeholderColor } : undefined}
		>
			{placeholderLqip ? (
				<img
					src={placeholderLqip}
					alt=""
					aria-hidden
					className="absolute inset-0 h-full w-full scale-110 object-cover blur-xl"
				/>
			) : null}
			<img
				ref={imageRef}
				suppressHydrationWarning
				data-fade-in
				src={src}
				alt={alt}
				width={width}
				height={height}
				loading={loading}
				className={`absolute inset-0 h-full w-full object-cover opacity-0 motion-safe:transition-[opacity,transform,scale] motion-safe:duration-300 ${imgClassName ?? ''}`}
			/>
		</div>
	)
}

export default FadeInImage
