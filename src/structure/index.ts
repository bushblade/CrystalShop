import { CogIcon } from '@sanity/icons/Cog'
import { DocumentTextIcon } from '@sanity/icons/DocumentText'
import { PackageIcon } from '@sanity/icons/Package'
import { StackIcon } from '@sanity/icons/Stack'
import { StackCompactIcon } from '@sanity/icons/StackCompact'
import { StarIcon } from '@sanity/icons/Star'
import type { StructureBuilder, StructureResolver } from 'sanity/structure'

const listMenuGroups = [
	{ id: 'sorting', title: 'Sort' },
	{ id: 'layout', title: 'Layout' },
	{ id: 'actions', title: 'Actions' },
]

const layoutMenuItems = (S: StructureBuilder) => [
	S.menuItem()
		.group('layout')
		.title('Compact view')
		.icon(StackCompactIcon)
		.action('setLayout')
		.params({ layout: 'default' }),
	S.menuItem()
		.group('layout')
		.title('Detailed view')
		.icon(StackIcon)
		.action('setLayout')
		.params({ layout: 'detail' }),
]

const productMenuItems = (S: StructureBuilder) => [
	S.orderingMenuItem({
		title: 'Name: A–Z',
		name: 'nameAsc',
		by: [{ field: 'name', direction: 'asc' }],
	}),
	S.orderingMenuItem({
		title: 'Name: Z–A',
		name: 'nameDesc',
		by: [{ field: 'name', direction: 'desc' }],
	}),
	...S.orderingMenuItemsForType('product'),
	...layoutMenuItems(S),
]

const orderMenuItems = (S: StructureBuilder) => [
	...S.orderingMenuItemsForType('order'),
	...layoutMenuItems(S),
]

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
				.menuItemGroups(listMenuGroups)
				.menuItems(productMenuItems(S))
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
										.menuItemGroups(listMenuGroups)
										.menuItems(productMenuItems(S))
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
										.menuItemGroups(listMenuGroups)
										.menuItems(productMenuItems(S))
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
						.menuItemGroups(listMenuGroups)
						.menuItems(orderMenuItems(S))
						.canHandleIntent(
							(intentName, params) => intentName === 'edit' && params?.type === 'order',
						),
				),
		])
