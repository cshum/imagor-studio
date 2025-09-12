import { gql } from '@/generated'

// Query to get imagor status
export const IMAGOR_STATUS_QUERY = gql(`
  query ImagorStatus {
    imagorStatus {
      configured
      mode
      restartRequired
      lastUpdated
      isOverriddenByConfig
      embeddedConfig {
        cachePath
      }
      externalConfig {
        baseUrl
        hasSecret
        unsafe
        signerType
        signerTruncate
      }
    }
  }
`)

// Mutation to configure embedded imagor
export const CONFIGURE_EMBEDDED_IMAGOR_MUTATION = gql(`
  mutation ConfigureEmbeddedImagor($input: EmbeddedImagorInput!) {
    configureEmbeddedImagor(input: $input) {
      success
      restartRequired
      timestamp
      message
    }
  }
`)

// Mutation to configure external imagor
export const CONFIGURE_EXTERNAL_IMAGOR_MUTATION = gql(`
  mutation ConfigureExternalImagor($input: ExternalImagorInput!) {
    configureExternalImagor(input: $input) {
      success
      restartRequired
      timestamp
      message
    }
  }
`)
