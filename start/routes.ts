/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
|
| The routes file is used for defining the HTTP routes.
|
*/

import router from '@adonisjs/core/services/router'
import { createApolloServer } from '#graphql/server'
import graphqlConfig from '#config/graphql'
import type { ApolloServer } from '@apollo/server'

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
      graphql: graphqlConfig.path,
      health: '/health',
    },
  }
})

// GraphQL endpoint
router.post(graphqlConfig.path, async ({ request, response }) => {
  try {
    const { query, variables, operationName } = request.body()
    const server = await getApolloServer()

    const result = await server.executeOperation(
      {
        query,
        variables,
        operationName,
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

// GraphQL GET endpoint for introspection queries and simple queries
router.get(graphqlConfig.path, async ({ request, response }) => {
  try {
    const query = request.qs().query as string
    const variables = request.qs().variables
      ? JSON.parse(request.qs().variables as string)
      : undefined
    const operationName = request.qs().operationName as string | undefined

    if (!query) {
      // Return GraphQL Playground HTML if enabled
      if (graphqlConfig.playgroundEnabled) {
        return response.header('Content-Type', 'text/html').send(`
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>GraphQL Playground</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    body {
      margin: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
    }
    #root {
      height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background: #1a1a1a;
      color: #fff;
    }
    h1 {
      margin-bottom: 1rem;
    }
    .info {
      max-width: 600px;
      padding: 2rem;
      background: #2a2a2a;
      border-radius: 8px;
    }
    code {
      background: #3a3a3a;
      padding: 0.2rem 0.4rem;
      border-radius: 4px;
      font-family: 'Courier New', monospace;
    }
    pre {
      background: #3a3a3a;
      padding: 1rem;
      border-radius: 4px;
      overflow-x: auto;
    }
    a {
      color: #61dafb;
      text-decoration: none;
    }
    a:hover {
      text-decoration: underline;
    }
  </style>
</head>
<body>
  <div id="root">
    <div class="info">
      <h1>🚀 GraphQL API Ready</h1>
      <p>Welcome to the Travel Planning GraphQL API!</p>
      <p>To interact with the API, you can:</p>
      <ul>
        <li>Use a GraphQL client like <a href="https://www.apollographql.com/docs/graphos/explorer/" target="_blank">Apollo Studio</a></li>
        <li>Use <a href="https://insomnia.rest/" target="_blank">Insomnia</a> or <a href="https://www.postman.com/" target="_blank">Postman</a></li>
        <li>Send POST requests to <code>${graphqlConfig.path}</code></li>
      </ul>
      <h3>Example Query:</h3>
      <pre>query {
  searchCities(query: "London", limit: 5) {
    id
    name
    country
    latitude
    longitude
  }
}</pre>
      <p>Send this query as a POST request with JSON body:</p>
      <pre>{ "query": "query { ... }" }</pre>
    </div>
  </div>
</body>
</html>
        `)
      }

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
        variables,
        operationName,
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
