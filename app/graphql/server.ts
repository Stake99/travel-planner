import { ApolloServer } from '@apollo/server'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createResolverMap } from './resolvers/index.js'
import { CityService } from '#services/city_service'
import { WeatherService } from '#services/weather_service'
import { ActivityRankingService } from '#services/activity_ranking_service'
import { OpenMeteoClient } from '#clients/open_meteo_client'
import CacheManager from '#clients/cache_manager'
import MetricsManager from '#clients/metrics_manager'
import { GraphQLFormattedError } from 'graphql'

// eslint-disable-next-line @typescript-eslint/naming-convention
const __dirname = fileURLToPath(new URL('.', import.meta.url))

/**
 * Create and configure Apollo Server instance.
 * Sets up GraphQL schema, resolvers, and error formatting.
 *
 * @param options - Configuration options
 * @param options.introspection - Enable GraphQL introspection (default: true in dev)
 * @param options.playground - Enable GraphQL Playground (default: true in dev)
 * @returns Configured Apollo Server instance
 */
export function createApolloServer(options?: { introspection?: boolean; playground?: boolean }) {
  const typeDefs = readFileSync(join(__dirname, 'schema.graphql'), 'utf-8')

  const cacheManager = new CacheManager()
  const metricsManager = new MetricsManager()
  const weatherClient = new OpenMeteoClient()
  const cityService = new CityService(weatherClient, cacheManager, metricsManager)
  const weatherService = new WeatherService(weatherClient, cacheManager, metricsManager)
  const activityRankingService = new ActivityRankingService(weatherService, metricsManager)

  const resolvers = createResolverMap(cityService, weatherService, activityRankingService)

  const server = new ApolloServer({
    typeDefs,
    resolvers,
    introspection: options?.introspection ?? true,
    formatError: (formattedError: GraphQLFormattedError) => {
      return {
        message: formattedError.message,
        extensions: {
          code: formattedError.extensions?.code || 'INTERNAL_SERVER_ERROR',
          statusCode: formattedError.extensions?.statusCode || 500,
          ...formattedError.extensions,
        },
        path: formattedError.path,
      }
    },
  })

  return server
}
