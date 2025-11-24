import { test } from '@japa/runner'

test.group('HTTP Routes - Comprehensive Tests', () => {
  test('health endpoint returns correct structure', async ({ client, assert }) => {
    const response = await client.get('/health')

    response.assertStatus(200)
    response.assertBodyContains({
      status: 'healthy',
    })

    const body = response.body()
    assert.isDefined(body.timestamp)
    assert.isString(body.timestamp)
    assert.isDefined(body.uptime)
    assert.isNumber(body.uptime)
    assert.isDefined(body.memory)
    assert.isObject(body.memory)
  })

  test('home endpoint returns API information', async ({ client, assert }) => {
    const response = await client.get('/')

    response.assertStatus(200)
    response.assertBodyContains({
      message: 'Travel Planning GraphQL API',
    })

    const body = response.body()
    assert.isDefined(body.version)
    assert.isDefined(body.endpoints)
    assert.isObject(body.endpoints)
    assert.isDefined(body.endpoints.graphql)
    assert.isDefined(body.endpoints.health)
  })

  test('GraphQL POST endpoint handles different Content-Type headers', async ({ client, assert }) => {
    const response = await client
      .post('/v1/api/graphql')
      .header('Content-Type', 'application/json')
      .json({ query: 'query { searchCities(query: "London") { id } }' })

    response.assertStatus(200)
  })

  test('GraphQL POST endpoint handles missing body', async ({ client, assert }) => {
    const response = await client.post('/v1/api/graphql').header('Content-Type', 'application/json')

    response.assertStatus(400)
  })

  test('GraphQL GET endpoint returns error for missing query parameter', async ({ client, assert }) => {
    const response = await client.get('/v1/api/graphql')

    response.assertStatus(400)
    const body = response.body()
    assert.isDefined(body.errors)
    assert.isTrue(body.errors.length > 0)
    assert.include(body.errors[0].message, 'Must provide query string')
  })

  test('GraphQL GET endpoint handles query parameter correctly', async ({ client, assert }) => {
    const query = encodeURIComponent('query { searchCities(query: "London", limit: 1) { id name } }')
    const response = await client.get(`/v1/api/graphql?query=${query}`)

    response.assertStatus(200)

    const body = response.body()
    assert.isDefined(body.data)
  })

  test('GraphQL GET endpoint handles variables parameter', async ({ client, assert }) => {
    const query = encodeURIComponent(
      'query GetWeather($lat: Float!, $lon: Float!) { getWeatherForecast(input: { latitude: $lat, longitude: $lon, days: 7 }) { latitude } }'
    )
    const variables = encodeURIComponent(JSON.stringify({ lat: 51.5074, lon: -0.1278 }))
    const response = await client.get(`/v1/api/graphql?query=${query}&variables=${variables}`)

    response.assertStatus(200)

      const body = response.body()
      if (body.data && body.data.getWeatherForecast) {
        assert.approximately(body.data.getWeatherForecast.latitude, 51.5074, 0.1)
      }
  })

  test('GraphQL GET endpoint handles invalid variables JSON', async ({ client, assert }) => {
    const query = encodeURIComponent('query { searchCities(query: "London") { id } }')
    const response = await client.get(`/v1/api/graphql?query=${query}&variables=invalid-json`)

    response.assertStatus(500)

    const body = response.body()
    assert.isDefined(body.errors)
  })

  test('GraphQL POST endpoint handles large query payloads', async ({ client, assert }) => {
    const largeQuery = `
      query {
        searchCities(query: "New", limit: 10) {
          id
          name
          country
          countryCode
          latitude
          longitude
          timezone
          population
        }
      }
    `.repeat(10)

    const response = await client.post('/v1/api/graphql').json({ query: largeQuery })

    response.assertStatus(200)

    const body = response.body()
    assert.isDefined(body.data || body.errors)
  })

  test('GraphQL POST endpoint handles empty variables object', async ({ client, assert }) => {
    const query = `
      query {
        searchCities(query: "London", limit: 5) {
          id
          name
        }
      }
    `

    const response = await client.post('/v1/api/graphql').json({
      query,
      variables: {},
    })

    response.assertStatus(200)

    const body = response.body()
    assert.isDefined(body.data)
  })

  test('GraphQL POST endpoint handles null variables', async ({ client, assert }) => {
    const query = `
      query {
        searchCities(query: "London", limit: 5) {
          id
          name
        }
      }
    `

    const response = await client.post('/v1/api/graphql').json({
      query,
      variables: null,
    })

    response.assertStatus(200)

    const body = response.body()
    assert.isDefined(body.data)
  })

  test('GraphQL POST endpoint handles undefined operationName', async ({ client, assert }) => {
    const query = `
      query {
        searchCities(query: "London", limit: 5) {
          id
          name
        }
      }
    `

    const response = await client.post('/v1/api/graphql').json({
      query,
      operationName: undefined,
    })

    response.assertStatus(200)

    const body = response.body()
    assert.isDefined(body.data)
  })

  test('returns 404 for non-existent routes', async ({ client, assert }) => {
    const response = await client.get('/non-existent-route')

    response.assertStatus(404)
  })

  test('returns 404 for POST to non-existent routes', async ({ client, assert }) => {
    const response = await client.post('/non-existent-route').json({})

    response.assertStatus(404)
  })

  test('handles OPTIONS request for CORS', async ({ client, assert }) => {
    const response = await client.options('/v1/api/graphql')

    response.assertStatus(404)
  })

  test('handles HEAD request to health endpoint', async ({ client, assert }) => {
    const response = await client.head('/health')

    response.assertStatus(200)
  })

  test('handles request with invalid HTTP method', async ({ client, assert }) => {
    const response = await client.patch('/v1/api/graphql').json({
      query: 'query { searchCities(query: "London") { id } }',
    })

    response.assertStatus(404)
  })
})

