import { defineQuery } from 'groq'
import type { IN_STOCK_PRODUCTS_QUERY_RESULT } from '../../sanity.types'

export type ProductCardData = IN_STOCK_PRODUCTS_QUERY_RESULT[number]

const PRODUCT_CARD_FRAGMENT = /* groq */ `
	_id,
	name,
	"slug": slug.current,
	price,
	weightInGrams,
	isUniquePiece,
	stockLevel,
	isFeatured,
	_createdAt,
	"category": category->{ name, "slug": slug.current },
	"image": images[0]{
		"url": asset->url,
		"alt": alt,
		"width": asset->metadata.dimensions.width,
		"height": asset->metadata.dimensions.height,
		"dominantColor": asset->metadata.palette.dominant.background
	}
`

export const IN_STOCK_PRODUCTS_QUERY = defineQuery(/* groq */ `
	*[_type == "product" && defined(slug.current) && coalesce(stockLevel, 0) > 0]{
		${PRODUCT_CARD_FRAGMENT}
	}
`)

export const FEATURED_PRODUCTS_QUERY = defineQuery(/* groq */ `
	*[_type == "product" && isFeatured == true && defined(slug.current) && coalesce(stockLevel, 0) > 0]
		| order(_createdAt desc)[0...6]{
		${PRODUCT_CARD_FRAGMENT}
	}
`)

export const CATEGORIES_QUERY = defineQuery(/* groq */ `
	*[_type == "category" &&
		count(*[_type == "product" && category._ref == ^._id && coalesce(stockLevel, 0) > 0]) > 0]{
		_id,
		name,
		"slug": slug.current
	} | order(name asc)
`)

export const CATEGORY_BY_SLUG_QUERY = defineQuery(/* groq */ `
	*[_type == "category" && slug.current == $slug][0]{ _id, name, "slug": slug.current }
`)

export const PRODUCTS_BY_CATEGORY_QUERY = defineQuery(/* groq */ `
	*[_type == "product" &&
		category._ref in *[_type == "category" && slug.current == $slug]._id &&
		defined(slug.current) && coalesce(stockLevel, 0) > 0]{
		${PRODUCT_CARD_FRAGMENT}
	}
`)

export const PRODUCT_BY_SLUG_QUERY = defineQuery(/* groq */ `
	*[_type == "product" && slug.current == $slug][0]{
		_id,
		name,
		"slug": slug.current,
		description,
		price,
		weightInGrams,
		deliveryMethod,
		countryOfOrigin,
		isUniquePiece,
		stockLevel,
		"category": category->{ name, "slug": slug.current },
		"images": images[]{
			"url": asset->url,
			"alt": alt,
			"width": asset->metadata.dimensions.width,
			"height": asset->metadata.dimensions.height,
			"dominantColor": asset->metadata.palette.dominant.background
		}
	}
`)

export const SITE_SETTINGS_QUERY = defineQuery(/* groq */ `
	*[_type == "siteSettings"][0]{
		aboutBody,
		termsBody,
		contactEmail
	}
`)
