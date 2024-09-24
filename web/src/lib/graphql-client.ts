import { GraphQLClient } from 'graphql-request'

const endpoint = 'http://localhost:8080/query'

export const graphqlClient = new GraphQLClient(endpoint)
