import netlify from '@astrojs/netlify'
import react from '@astrojs/react'

import sanity from '@sanity/astro'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'astro/config'
import { loadEnv } from 'vite'

import { SANITY_API_VERSION } from './src/lib/apiVersions'

const { PUBLIC_SANITY_STUDIO_PROJECT_ID, PUBLIC_SANITY_STUDIO_DATASET } = loadEnv(
	process.env.NODE_ENV ?? 'development',
	process.cwd(),
	'',
)

// https://astro.build/config
export default defineConfig({
	output: 'server',
	adapter: netlify(),
	integrations: [
		sanity({
			projectId: PUBLIC_SANITY_STUDIO_PROJECT_ID,
			dataset: PUBLIC_SANITY_STUDIO_DATASET,
			apiVersion: SANITY_API_VERSION,
			useCdn: true,
			studioBasePath: '/admin',
		}),
		react(),
	],
	vite: {
		plugins: [tailwindcss()],
	},
})
