import netlify from '@astrojs/netlify'
import react from '@astrojs/react'

import sanity from '@sanity/astro'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'astro/config'
import { loadEnv } from 'vite'

import { SANITY_API_VERSION } from './src/lib/apiVersions'
import { resolveSanityCredentials } from './src/lib/sanityEnvironment'

const env = loadEnv(process.env.NODE_ENV ?? 'development', process.cwd(), '')
const credentials = resolveSanityCredentials((name) => env[name])

// https://astro.build/config
export default defineConfig({
	output: 'server',
	adapter: netlify(),
	integrations: [
		sanity({
			projectId: credentials.projectId,
			dataset: credentials.dataset,
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
