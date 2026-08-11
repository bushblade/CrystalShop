import { defineQuery } from 'groq'

export const PRODUCTS_QUERY = defineQuery(
	`*[_type == "product"]{_id, name, price} | order(name asc)`
)
