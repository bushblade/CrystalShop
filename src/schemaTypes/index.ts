import type { SchemaTypeDefinition } from 'sanity'
import { category } from './documents/category'
import { product } from './documents/product'

export const schemaTypes: SchemaTypeDefinition[] = [product, category]
