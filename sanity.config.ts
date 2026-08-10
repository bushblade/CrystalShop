import { defineConfig } from 'sanity'
import { structureTool } from 'sanity/structure'
import { visionTool } from '@sanity/vision'

import { schemaTypes } from './src/schemaTypes'

export default defineConfig({
	name: 'crystal-shop',
	title: 'Crystal Shop',
	projectId: import.meta.env.PUBLIC_SANITY_STUDIO_PROJECT_ID,
	dataset: import.meta.env.PUBLIC_SANITY_STUDIO_DATASET,
	plugins: [structureTool(), visionTool()],
	schema: {
		types: schemaTypes,
	},
})
