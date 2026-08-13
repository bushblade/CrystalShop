import { CogIcon } from '@sanity/icons/Cog'
import { StarIcon } from '@sanity/icons/Star'
import type { StructureResolver } from 'sanity/structure'

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
			S.listItem()
				.title('Featured Products')
				.icon(StarIcon)
				.child(
					S.documentList()
						.title('Featured Products: Max of 6 products')
						.schemaType('product')
						.apiVersion('2026-08-10')
						.filter('_type == "product" && isFeatured == true && coalesce(stockLevel, 0) > 0')
						.canHandleIntent(
							(intentName, params) => intentName === 'edit' && params?.type === 'product',
						),
				),
			S.divider(),
			...S.documentTypeListItems().filter((listItem) => listItem.getId() !== 'siteSettings'),
		])
