import { visionTool } from '@sanity/vision'
import { defineConfig } from 'sanity'
import { structureTool } from 'sanity/structure'
import { resolveSanityCredentials } from './src/lib/sanityEnvironment'
import { schemaTypes } from './src/schemaTypes'
import { structure } from './src/structure'

// The Studio bundle runs this config in the browser (no `process`) while
// `pnpm typegen` runs it in Node (no `import.meta.env`), so the env reader
// itself has to work in both — see AGENTS.md.
const credentials = resolveSanityCredentials((name) =>
	typeof process !== 'undefined' ? process.env[name] : import.meta.env[name],
)

export default defineConfig({
	name: 'crystal-shop',
	title: 'Crystal Shop',
	projectId: credentials.projectId,
	dataset: credentials.dataset,
	plugins: [structureTool({ structure }), visionTool()],
	schema: {
		types: schemaTypes,
	},
})
