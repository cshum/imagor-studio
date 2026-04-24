import { gql } from '@/generated'

// Query to get imagor status
export const IMAGOR_STATUS_QUERY = gql(`
  query ImagorStatus {
    imagorStatus {
      configured
      lastUpdated
      isOverriddenByConfig
      config {
        hasSecret
        signerType
        signerTruncate
      }
    }
  }
`)

// Mutation to configure imagor
export const CONFIGURE_IMAGOR_MUTATION = gql(`
  mutation ConfigureImagor($input: ImagorInput!) {
    configureImagor(input: $input) {
      success
      timestamp
      message
    }
  }
`)

// Mutation to generate imagor URL for image transformations
export const GENERATE_IMAGOR_URL_MUTATION = gql(`
  mutation GenerateImagorUrl(
    $imagePath: String!
    $spaceID: String
    $params: ImagorParamsInput!
  ) {
    generateImagorUrl(
      imagePath: $imagePath
      spaceID: $spaceID
      params: $params
    )
  }
`)

// Mutation to generate imagor URL from template JSON (backend conversion)
export const GENERATE_IMAGOR_URL_FROM_TEMPLATE_MUTATION = gql(`
  mutation GenerateImagorUrlFromTemplate(
    $templateJson: String!
    $spaceID: String
    $contextPath: [String!]
    $forPreview: Boolean
    $previewMaxDimensions: DimensionsInput
    $skipLayerId: String
    $appendFilters: [ImagorFilterInput!]
  ) {
    generateImagorUrlFromTemplate(
      templateJson: $templateJson
      spaceID: $spaceID
      contextPath: $contextPath
      forPreview: $forPreview
      previewMaxDimensions: $previewMaxDimensions
      skipLayerId: $skipLayerId
      appendFilters: $appendFilters
    )
  }
`)
