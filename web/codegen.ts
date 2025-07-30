import type { CodegenConfig } from '@graphql-codegen/cli'

const config: CodegenConfig = {
  // Point to your GraphQL schema
  schema: 'http://localhost:8080/query',

  // Patterns to find GraphQL documents (queries, mutations, subscriptions)
  documents: ['src/**/*.{ts,tsx}', '!src/generated/**'],

  // Output configuration
  generates: {
    // Generate TypeScript types and hooks
    './src/generated/': {
      preset: 'client',
      config: {
        useTypeImports: true,
        enumsAsTypes: true,
        scalars: {
          Upload: 'File',
          JSON: 'Record<string, any>',
        },
      },
      plugins: [],
    },

    // Generate schema introspection for development tools
    './src/generated/introspection.json': {
      plugins: ['introspection'],
      config: {
        minify: true,
      },
    },

    // Generate GraphQL Request SDK
    './src/generated/graphql-request.ts': {
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
  },

  // Hooks to run before/after generation
  hooks: {
    afterAllFileWrite: ['prettier --write'],
  },

  // Configuration
  config: {
    // Use TypeScript imports instead of require
    useTypeImports: true,

    // Generate enums as TypeScript types instead of enums
    enumsAsTypes: true,

    // Custom scalar mappings
    scalars: {
      Upload: 'File',
      JSON: 'Record<string, any>',
    },

    // Add __typename to all generated types
    addTypename: true,

    // Avoid optionals on required fields
    avoidOptionals: {
      field: true,
      inputValue: true,
      object: false,
    },

    // Make fragments more reusable
    dedupeFragments: true,
  },
}

export default config
