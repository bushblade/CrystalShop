import { DocumentTextIcon } from '@sanity/icons/DocumentText'
import { defineArrayMember, defineField, defineType } from 'sanity'

export const order = defineType({
	name: 'order',
	title: 'Order',
	type: 'document',
	icon: DocumentTextIcon,
	description:
		'Written by the Stripe webhook as an idempotency guard and sales log. No customer data is stored here — the buyer only ever exists in Stripe.',
	fields: [
		defineField({
			name: 'sessionId',
			title: 'Stripe Session ID',
			type: 'string',
			readOnly: true,
			description: 'The Stripe Checkout Session id (cs_...). Used to dedupe webhook retries.',
			validation: (rule) =>
				rule.required().custom(async (sessionId, context) => {
					if (!sessionId) return true
					const client = context
						.getClient({ apiVersion: '2026-08-10' })
						.withConfig({ perspective: 'raw' })
					const published = context.document?._id?.replace(/^drafts\./, '')
					const existing = await client.fetch(
						`count(*[_type == "order" && sessionId == $sessionId && !sanity::versionOf($published)])`,
						{ sessionId, published },
					)
					return existing === 0 || 'An order with this Stripe session already exists'
				}),
		}),
		defineField({
			name: 'paymentIntentId',
			title: 'Stripe Payment Intent ID',
			type: 'string',
			readOnly: true,
			description:
				'The Stripe Payment Intent id (pi_...). Lets refunds (charge.refunded events) be matched back to this order.',
		}),
		defineField({
			name: 'livemode',
			title: 'Live Mode',
			type: 'boolean',
			readOnly: true,
			description: 'Whether this order was placed against live or test Stripe keys.',
		}),
		defineField({
			name: 'total',
			title: 'Total (£)',
			type: 'number',
			readOnly: true,
			validation: (rule) => rule.positive().precision(2),
		}),
		defineField({
			name: 'currency',
			title: 'Currency',
			type: 'string',
			readOnly: true,
		}),
		defineField({
			name: 'items',
			title: 'Items',
			type: 'array',
			readOnly: true,
			of: [
				defineArrayMember({
					name: 'orderItem',
					type: 'object',
					fields: [
						defineField({
							name: 'productId',
							title: 'Product ID',
							type: 'string',
						}),
						defineField({
							name: 'productName',
							title: 'Product Name',
							type: 'string',
						}),
						defineField({
							name: 'quantity',
							title: 'Quantity',
							type: 'number',
							validation: (rule) => rule.integer().min(1),
						}),
						defineField({
							name: 'unitPrice',
							title: 'Unit Price (£)',
							type: 'number',
							validation: (rule) => rule.positive().precision(2),
						}),
					],
				}),
			],
		}),
		defineField({
			name: 'completedAt',
			title: 'Completed At',
			type: 'datetime',
			readOnly: true,
		}),
	],
	orderings: [
		{
			title: 'Completed: newest first',
			name: 'completedAtDesc',
			by: [{ field: 'completedAt', direction: 'desc' }],
		},
	],
	preview: {
		select: {
			sessionId: 'sessionId',
			total: 'total',
			currency: 'currency',
			completedAt: 'completedAt',
		},
		prepare({ sessionId, total, currency, completedAt }) {
			const amount = total !== undefined && currency ? `${currency.toUpperCase()} ${total}` : null
			return {
				title: sessionId ?? 'Order',
				subtitle: [amount, completedAt].filter(Boolean).join(' · '),
			}
		},
	},
})
