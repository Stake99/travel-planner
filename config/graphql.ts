import env from '#start/env'

export default {
  /**
   * Enable GraphQL Playground in development
   */
  playgroundEnabled: env.get('GRAPHQL_PLAYGROUND_ENABLED') ?? true,

  /**
   * Enable GraphQL introspection
   */
  introspectionEnabled: env.get('GRAPHQL_INTROSPECTION_ENABLED') ?? true,

  /**
   * GraphQL endpoint path
   */
  path: '/v1/api/graphql',
}
