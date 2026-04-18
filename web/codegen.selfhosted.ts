import type { CodegenConfig } from '@graphql-codegen/cli'

const config: CodegenConfig = {
	schema: ['../graphql/shared/*.graphql'],
	documents: ['src/graphql/shared/**/*.gql.ts'],
	generates: {
		'./src/generated/selfhosted/': {
			preset: 'client',
			config: {
				useTypeImports: true,
				enumsAsTypes: true,
				scalars: {
					Upload: 'File',
					JSON: 'Record<string, any>',
				},
			},
			presetConfig: {
				gqlTagName: 'gql',
				fragmentMasking: false,
			},
			plugins: [],
		},
	},
}

export default config