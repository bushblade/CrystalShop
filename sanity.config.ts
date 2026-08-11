import { defineConfig } from 'sanity'
import { structureTool } from 'sanity/structure'
import { visionTool } from '@sanity/vision'

import { schemaTypes } from './src/schemaTypes'

function getRequiredEnvVar(name: string): string {
	const value = process.env[name]
	if (!value) {
		throw new Error(`Missing required environment variable: ${name}`)
	}
	return value
}

const projectId = getRequiredEnvVar('PUBLIC_SANITY_STUDIO_PROJECT_ID')
const dataset = getRequiredEnvVar('PUBLIC_SANITY_STUDIO_DATASET')

export default defineConfig({
	name: 'crystal-shop',
	title: 'Crystal Shop',
	projectId,
	dataset,
	plugins: [structureTool(), visionTool()],
	schema: {
		types: schemaTypes,
	},
})
