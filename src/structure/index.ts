import { CogIcon } from '@sanity/icons/Cog'
import { DocumentTextIcon } from '@sanity/icons/DocumentText'
import { PackageIcon } from '@sanity/icons/Package'
import { StarIcon } from '@sanity/icons/Star'
import type { StructureBuilder, StructureResolver } from 'sanity/structure'

const productList = (S: StructureBuilder, title: string, filter: string) =>
	S.listItem()
		.title(title)
		.icon(PackageIcon)
		.child(
			S.documentList()
				.title(title)
				.schemaType('product')
				.apiVersion('2026-08-10')
				.filter(filter)
				.canHandleIntent(
					(intentName, params) => intentName === 'edit' && params?.type === 'product',
				),
		)

export const structure: StructureResolver = (S) =>
	S.list()
		.title('Content')
		.items([
			S.listItem()
				.title('Site Settings')
				.icon(CogIcon)
				.child(
					S.document().schemaType('siteSettings').documentId('siteSettings').title('Site Settings'),
				),
			S.divider(),
			S.listItem()
				.title('Products')
				.icon(PackageIcon)
				.child(
					S.list()
						.title('Products')
						.items([
							S.listItem()
								.title('All Products')
								.icon(PackageIcon)
								.child(
									S.documentList()
										.title('All Products')
										.schemaType('product')
										.apiVersion('2026-08-10')
										.filter('_type == "product"')
										.defaultOrdering([{ field: 'stockLevel', direction: 'asc' }])
										.canHandleIntent(
											(intentName, params) => intentName === 'edit' && params?.type === 'product',
										),
								),
							S.listItem()
								.title('Featured Products')
								.icon(StarIcon)
								.child(
									S.documentList()
										.title('Featured Products: Max of 6 products')
										.schemaType('product')
										.apiVersion('2026-08-10')
										.filter(
											'_type == "product" && isFeatured == true && coalesce(stockLevel, 0) > 0',
										)
										.canHandleIntent(
											(intentName, params) => intentName === 'edit' && params?.type === 'product',
										),
								),
							productList(S, 'In Stock', '_type == "product" && coalesce(stockLevel, 0) > 0'),
							productList(S, 'Out of Stock', '_type == "product" && coalesce(stockLevel, 0) == 0'),
						]),
				),
			...S.documentTypeListItems().filter(
				(listItem) => !['siteSettings', 'product', 'order'].includes(listItem.getId() ?? ''),
			),
			S.divider(),
			S.listItem()
				.title('Orders (read only)')
				.icon(DocumentTextIcon)
				.child(
					S.documentList()
						.title('Orders — sales history, read only')
						.schemaType('order')
						.apiVersion('2026-08-10')
						.filter('_type == "order"')
						.initialValueTemplates([])
						.defaultOrdering([{ field: 'completedAt', direction: 'desc' }])
						.canHandleIntent(
							(intentName, params) => intentName === 'edit' && params?.type === 'order',
						),
				),
		])
