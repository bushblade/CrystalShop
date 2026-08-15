import { CogIcon } from '@sanity/icons/Cog'
import { defineArrayMember, defineField, defineType } from 'sanity'

type ShippingRateValue = {
	_key?: string
	name?: string
	maxWeightGrams?: number
	price?: number
}

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
		defineField({
			name: 'shippingRates',
			title: 'Shipping Rates',
			type: 'array',
			description:
				'Weight-band postage tiers, cheapest first. The final band with no max weight catches every heavier parcel. These prices are shown to buyers and charged at checkout.',
			of: [
				defineArrayMember({
					name: 'shippingRate',
					type: 'object',
					fields: [
						defineField({
							name: 'name',
							title: 'Band Name',
							type: 'string',
							description: 'e.g. "Standard"',
							validation: (rule) => rule.required(),
						}),
						defineField({
							name: 'maxWeightGrams',
							title: 'Max Weight (g)',
							type: 'number',
							description:
								'Upper weight for this band. Leave blank for the final catch-all band that covers every heavier parcel.',
							validation: (rule) => rule.integer().min(1),
						}),
						defineField({
							name: 'price',
							title: 'Price (£)',
							type: 'number',
							description: 'e.g. 4.50',
							validation: (rule) =>
								rule.required().positive().precision(2).error('Enter a price greater than 0'),
						}),
					],
				}),
			],
			validation: (rule) =>
				rule.custom((rates: ShippingRateValue[] | undefined) => {
					if (!rates?.length) return true
					const openTiers = rates.filter(
						(tier) => tier.maxWeightGrams === null || tier.maxWeightGrams === undefined,
					)
					if (openTiers.length > 1) return 'Only the final catch-all band may have no max weight'
					const lastTier = rates[rates.length - 1]
					if (openTiers.length === 1 && lastTier.maxWeightGrams !== undefined) {
						return 'The catch-all band must be the last band'
					}
					return true
				}),
		}),
	],
	preview: {
		prepare() {
			return { title: 'Site Settings' }
		},
	},
})
