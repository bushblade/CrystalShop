import { CogIcon } from '@sanity/icons/Cog'
import { defineField, defineType } from 'sanity'

export const siteSettings = defineType({
	name: 'siteSettings',
	title: 'Site Settings',
	type: 'document',
	icon: CogIcon,
	fields: [
		defineField({
			name: 'aboutBody',
			title: 'About Page Content',
			type: 'blockContent',
			description: 'The body of the /about page. Headings render as h2/h3.',
		}),
		defineField({
			name: 'termsBody',
			title: 'Terms & Conditions Content',
			type: 'blockContent',
			description: 'The body of the /terms page. Headings render as h2/h3.',
		}),
		defineField({
			name: 'contactEmail',
			title: 'Contact Email',
			type: 'string',
			description: 'Shown on the contact page and in the footer',
			validation: (rule) =>
				rule
					.required()
					.regex(/^\S+@\S+\.\S+$/, {
						name: 'email',
						invert: false,
					})
					.warning('Enter a valid email address so customers can reach you'),
		}),
	],
	preview: {
		prepare() {
			return { title: 'Site Settings' }
		},
	},
})
