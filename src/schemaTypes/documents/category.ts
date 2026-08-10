import { defineType, defineField } from 'sanity'
import { TagIcon } from '@sanity/icons/Tag'

export const category = defineType({
	name: 'category',
	title: 'Category',
	type: 'document',
	icon: TagIcon,
	fields: [
		defineField({
			name: 'name',
			title: 'Name',
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
						`count(*[_type == "category" && slug.current == $slug && _id != $id])`,
						{ slug: slug.current, id },
					)
					return existing === 0 || 'Slug is already used by another category'
				}),
		}),
	],
	preview: {
		select: {
			title: 'name',
			subtitle: 'slug',
		},
		prepare({ title, subtitle }) {
			return {
				title,
				subtitle: subtitle?.current,
			}
		},
	},
})
