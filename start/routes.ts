/*
||--------------------------------------------------------------------------
|| Routes file
||--------------------------------------------------------------------------
||
|| The routes file is used for defining the HTTP routes.
||
*/

import router from '@adonisjs/core/services/router'
import type { HttpContext } from '@adonisjs/core/http'
import { createApolloServer } from '#graphql/server'
import graphqlConfig from '#config/graphql'
import type { ApolloServer } from '@apollo/server'

// Version prefix for API routes
const versionPrefix = '/v1/api'

// Lazy-load Apollo Server instance
let apolloServer: ApolloServer | null = null

async function getApolloServer() {
  if (!apolloServer) {
    apolloServer = createApolloServer({
      introspection: graphqlConfig.introspectionEnabled,
      playground: graphqlConfig.playgroundEnabled,
    })
    await apolloServer.start()
  }
  return apolloServer
}

// ============================================================================
// Public Routes (No Authentication Required)
// ============================================================================

// Health check endpoint
router.get('/health', async () => {
  return {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
  }
})

// Home endpoint
router.get('/', async () => {
  return {
    message: 'Travel Planning GraphQL API',
    version: '1.0.0',
    endpoints: {
      graphql: `${versionPrefix}/graphql`,
      apolloStudio: 'https://studio.apollographql.com/sandbox/explorer',
      health: '/health',
      api: versionPrefix,
    },
  }
})

// ============================================================================
// GraphQL Routes (Versioned)
// ============================================================================

// GraphQL POST endpoint - Accepts JSON requests from Postman/curl
router.post(`${versionPrefix}/graphql`, async ({ request, response }: HttpContext) => {
  try {
    // Parse JSON body (bodyparser middleware handles this)
    const body = request.body()
    const { query, variables, operationName } = body

    if (!query) {
      return response.status(400).json({
        errors: [
          {
            message: 'Must provide query string',
            extensions: {
              code: 'BAD_REQUEST',
            },
          },
        ],
      })
    }

    const server = await getApolloServer()

    const result = await server.executeOperation(
      {
        query,
        variables: variables || {},
        operationName: operationName || undefined,
      },
      {
        contextValue: {},
      }
    )

    if (result.body.kind === 'single') {
      return response.status(200).json(result.body.singleResult)
    }

    // Handle incremental results (not expected in this API)
    return response.status(200).json({ errors: [{ message: 'Incremental results not supported' }] })
  } catch (error) {
    return response.status(500).json({
      errors: [
        {
          message: 'Internal server error',
          extensions: {
            code: 'INTERNAL_SERVER_ERROR',
          },
        },
      ],
    })
  }
})

// GraphQL GET endpoint for introspection (used by Apollo Studio)
router.get(`${versionPrefix}/graphql`, async ({ request, response }: HttpContext) => {
  try {
    const query = request.qs().query as string
    const variables = request.qs().variables
      ? JSON.parse(request.qs().variables as string)
      : undefined
    const operationName = request.qs().operationName as string | undefined

    // If no query, return helpful message (Apollo Studio will handle introspection)
    if (!query) {
      return response.status(400).json({
        errors: [
          {
            message:
              'Must provide query string. Use Apollo Studio at https://studio.apollographql.com/sandbox/explorer',
            extensions: {
              code: 'BAD_REQUEST',
            },
          },
        ],
      })
    }

    // Execute GraphQL query from query string
    const server = await getApolloServer()
    const result = await server.executeOperation(
      {
        query,
        variables: variables || {},
        operationName: operationName || undefined,
      },
      {
        contextValue: {},
      }
    )

    if (result.body.kind === 'single') {
      return response.status(200).json(result.body.singleResult)
    }

    return response.status(200).json({ errors: [{ message: 'Incremental results not supported' }] })
  } catch (error) {
    return response.status(500).json({
      errors: [
        {
          message: 'Internal server error',
          extensions: {
            code: 'INTERNAL_SERVER_ERROR',
          },
        },
      ],
    })
  }
})

// ============================================================================
// API Routes (Versioned with /v1/api prefix)
// ============================================================================

// Example: City routes (can be expanded with controllers)
// router.get(`${versionPrefix}/cities`, async ({ request, response }: HttpContext) => {
//   // This is a placeholder - you can create a CitiesController later
//   return response.json({
//     message: 'Cities endpoint - implement with CitiesController',
//     query: request.qs(),
//   })
// })

// Example: Weather routes (can be expanded with controllers)
// router.get(`${versionPrefix}/weather`, async ({ request, response }: HttpContext) => {
//   // This is a placeholder - you can create a WeatherController later
//   return response.json({
//     message: 'Weather endpoint - implement with WeatherController',
//     query: request.qs(),
//   })
// })

// Example route structure with middleware (as requested)
// router.post(`${versionPrefix}/schedules`, async (context: HttpContext) => {
//   return new SchedulesController().store(context)
// }).use(middleware.auth()).use(middleware.role(['admin', 'Ops']))
