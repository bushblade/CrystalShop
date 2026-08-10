import type { SchemaTypeDefinition } from 'sanity'

import { product } from './documents/product'
import { category } from './documents/category'

export const schemaTypes: SchemaTypeDefinition[] = [product, category]
