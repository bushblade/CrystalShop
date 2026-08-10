import { defineType, defineField, defineArrayMember } from 'sanity'
import { PackageIcon } from '@sanity/icons/Package'

const PACKAGING_GROUP = 'packaging'
const INVENTORY_GROUP = 'inventory'

export const product = defineType({
	name: 'product',
	title: 'Product',
	type: 'document',
	icon: PackageIcon,
	groups: [
		{ name: PACKAGING_GROUP, title: 'Pricing & Shipping' },
		{ name: INVENTORY_GROUP, title: 'Inventory & Display' },
	],
	fields: [
		defineField({
			name: 'name',
			title: 'Product Name',
			type: 'string',
			validation: (rule) => rule.required(),
		}),
		defineField({
			name: 'slug',
			title: 'Slug',
			type: 'slug',
			options: {
				source: 'name',
				maxLength: 96,
			},
			validation: (rule) =>
				rule.required().custom(async (slug, context) => {
					if (!slug?.current) return true
					const client = context.getClient({ apiVersion: '2026-08-10' })
					const id = context.document?._id?.replace(/^drafts\./, '')
					const existing = await client.fetch(
						`count(*[_type == "product" && slug.current == $slug && _id != $id])`,
						{ slug: slug.current, id },
					)
					return existing === 0 || 'Slug is already used by another product'
				}),
		}),
		defineField({
			name: 'description',
			title: 'Description',
			type: 'text',
			rows: 8,
		}),
		defineField({
			name: 'images',
			title: 'Images',
			type: 'array',
			of: [
				defineArrayMember({
					type: 'image',
					options: {
						hotspot: true,
					},
					fields: [
						defineField({
							name: 'alt',
							title: 'Alt Text',
							type: 'string',
							description: 'Describes the image for accessibility and SEO',
						}),
					],
				}),
			],
			validation: (rule) => rule.min(1).error('Add at least one image'),
		}),
		defineField({
			name: 'price',
			title: 'Price (£)',
			type: 'number',
			validation: (rule) =>
				rule
					.required()
					.positive()
					.precision(2)
					.error('Enter a price greater than 0'),
		}),
		defineField({
			name: 'categories',
			title: 'Categories',
			type: 'array',
			of: [defineArrayMember({ type: 'reference', to: [{ type: 'category' }] })],
		}),
		defineField({
			name: 'weightInGrams',
			title: 'Weight (g)',
			type: 'number',
			group: PACKAGING_GROUP,
			description: 'Used by Snipcart to calculate shipping costs',
			validation: (rule) =>
				rule.required().positive().error('Enter the product weight in grams'),
		}),
		defineField({
			name: 'localPickupAvailable',
			title: 'Local Pickup Available',
			type: 'boolean',
			group: PACKAGING_GROUP,
			description: 'Tick if the buyer can collect in person instead of shipping',
		}),
		defineField({
			name: 'countryOfOrigin',
			title: 'Country of Origin',
			type: 'string',
			group: PACKAGING_GROUP,
		}),
		defineField({
			name: 'isUniquePiece',
			title: 'Unique 1-of-1 Piece',
			type: 'boolean',
			group: INVENTORY_GROUP,
			description: 'Tick if this is a one-off physical item that cannot be restocked',
			initialValue: true,
		}),
		defineField({
			name: 'stockLevel',
			title: 'Stock Level',
			type: 'number',
			group: INVENTORY_GROUP,
			initialValue: 1,
			validation: (rule) =>
				rule
					.integer()
					.min(0)
					.custom((stockLevel, context) => {
						const isUniquePiece = context.document?.isUniquePiece
						if (isUniquePiece && stockLevel && stockLevel > 1) {
							return 'Unique pieces should have a stock level of at most 1'
						}
						return true
					}),
		}),
		defineField({
			name: 'isFeatured',
			title: 'Featured on Homepage',
			type: 'boolean',
			group: INVENTORY_GROUP,
		}),
	],
	preview: {
		select: {
			title: 'name',
			subtitle: 'price',
			media: 'images.0',
		},
		prepare({ title, subtitle, media }) {
			return {
				title,
				subtitle: subtitle !== undefined ? `£${subtitle}` : undefined,
				media,
			}
		},
	},
})
