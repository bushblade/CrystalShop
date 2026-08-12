import type { SchemaTypeDefinition } from 'sanity'
import { category } from './documents/category'
import { product } from './documents/product'
import { siteSettings } from './documents/siteSettings'
import { blockContent } from './objects/blockContent'

export const schemaTypes: SchemaTypeDefinition[] = [product, category, siteSettings, blockContent]
