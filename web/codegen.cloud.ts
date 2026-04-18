import type { CodegenConfig } from '@graphql-codegen/cli'

const config: CodegenConfig = {
	schema: ['../graphql/shared/*.graphql', '../graphql/cloud/*.graphql'],
	documents: ['src/graphql/shared/**/*.gql.ts', 'src/graphql/cloud/**/*.gql.ts'],
	generates: {
		'./src/generated/cloud/': {
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