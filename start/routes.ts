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

const versionPrefix = '/v1/api'
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

router.get('/health', async () => {
  return {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
  }
})

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

router.post(`${versionPrefix}/graphql`, async ({ request, response }: HttpContext) => {
  try {
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

router.get(`${versionPrefix}/graphql`, async ({ request, response }: HttpContext) => {
  try {
    const query = request.qs().query as string
    const variables = request.qs().variables
      ? JSON.parse(request.qs().variables as string)
      : undefined
    const operationName = request.qs().operationName as string | undefined

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
