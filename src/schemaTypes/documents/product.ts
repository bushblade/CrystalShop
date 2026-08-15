import { PackageIcon } from '@sanity/icons/Package'
import { defineArrayMember, defineField, defineType } from 'sanity'

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
					const client = context
						.getClient({ apiVersion: '2026-08-10' })
						.withConfig({ perspective: 'raw' })
					const published = context.document?._id?.replace(/^drafts\./, '')
					const existing = await client.fetch(
						`count(*[_type == "product" && slug.current == $slug && !sanity::versionOf($published)])`,
						{ slug: slug.current, published },
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
				rule.required().positive().precision(2).error('Enter a price greater than 0'),
		}),
		defineField({
			name: 'category',
			title: 'Category',
			type: 'reference',
			to: [{ type: 'category' }],
			description: 'The type of gemstone this piece is made from',
			validation: (rule) => rule.required(),
		}),
		defineField({
			name: 'weightInGrams',
			title: 'Weight (g)',
			type: 'number',
			group: PACKAGING_GROUP,
			description: 'Used to calculate shipping costs',
			validation: (rule) => rule.required().positive().error('Enter the product weight in grams'),
		}),
		defineField({
			name: 'deliveryMethod',
			title: 'Delivery Method',
			type: 'string',
			group: PACKAGING_GROUP,
			description:
				'How this piece reaches the buyer. Pick "Arrange" for pieces too heavy for standard postage.',
			initialValue: 'post',
			options: {
				list: [
					{ title: 'Standard postage', value: 'post' },
					{ title: 'Arrange collection or delivery', value: 'arrange' },
				],
				layout: 'radio',
			},
			validation: (rule) => rule.required(),
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
			validation: (rule) =>
				rule
					.custom(async (isFeatured, context) => {
						if (!isFeatured) return true
						const client = context
							.getClient({ apiVersion: '2026-08-10' })
							.withConfig({ perspective: 'drafts' })
						const id = context.document?._id?.replace(/^drafts\./, '')
						const featuredCount = await client.fetch(
							`count(*[_type == "product" && isFeatured == true && defined(slug.current) && coalesce(stockLevel, 0) > 0 && (_id != $id || !defined($id))])`,
							{ id },
						)
						return featuredCount < 6
							? true
							: `Only 6 products are shown on the homepage — ${featuredCount + 1} would be featured. Unfeature one so they all display.`
					})
					.warning(),
		}),
	],
	orderings: [
		{
			title: 'Stock: low to high',
			name: 'stockLevelAsc',
			by: [{ field: 'stockLevel', direction: 'asc' }],
		},
		{
			title: 'Stock: high to low',
			name: 'stockLevelDesc',
			by: [{ field: 'stockLevel', direction: 'desc' }],
		},
	],
	preview: {
		select: {
			title: 'name',
			subtitle: 'price',
			stockLevel: 'stockLevel',
			media: 'images.0',
		},
		prepare({ title, subtitle, stockLevel, media }) {
			const price = subtitle !== undefined ? `£${subtitle}` : null
			const stock = (stockLevel ?? 0) > 0 ? `In stock: ${stockLevel}` : 'Out of stock'
			return {
				title,
				subtitle: [price, stock].filter(Boolean).join(' · '),
				media,
			}
		},
	},
})
