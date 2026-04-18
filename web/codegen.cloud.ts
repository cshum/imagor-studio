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
    './src/generated/cloud/graphql-request.ts': {
      plugins: ['typescript', 'typescript-operations', 'typescript-graphql-request'],
      config: {
        useTypeImports: true,
        enumsAsTypes: true,
        scalars: {
          Upload: 'File',
          JSON: 'Record<string, any>',
        },
        rawRequest: false,
        dedupeFragments: true,
      },
    },
    './src/generated/cloud/introspection.json': {
      plugins: ['introspection'],
      config: {
        minify: true,
      },
    },
  },
  hooks: {
    afterAllFileWrite: ['prettier --write'],
  },
}

export default config
