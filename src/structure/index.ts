import { StarIcon } from '@sanity/icons/Star'
import type { StructureResolver } from 'sanity/structure'

export const structure: StructureResolver = (S) =>
	S.list()
		.title('Content')
		.items([
			S.listItem()
				.title('Featured Products')
				.icon(StarIcon)
				.child(
					S.documentList()
						.title('Featured Products')
						.schemaType('product')
						.apiVersion('2026-08-10')
						.filter('_type == "product" && isFeatured == true && coalesce(stockLevel, 0) > 0'),
				),
			S.divider(),
			...S.documentTypeListItems(),
		])
