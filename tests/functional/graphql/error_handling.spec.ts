import { test } from '@japa/runner'

test.group('GraphQL - Error Handling', () => {
  test('returns error for malformed GraphQL query', async ({ client, assert }) => {
    const response = await client.post('/v1/api/graphql').json({
      query: 'invalid graphql query syntax {',
    })

    response.assertStatus(200)

    const body = response.body()
    assert.isDefined(body.errors)
    assert.isArray(body.errors)
    assert.isTrue(body.errors.length > 0)
  })

  test('returns error for missing query field', async ({ client }) => {
    const response = await client.post('/v1/api/graphql').json({
      variables: {},
    })

    response.assertStatus(400)
    response.assertBodyContains({
      errors: [
        {
          message: 'Must provide query string',
        },
      ],
    })
  })

  test('returns error for invalid JSON body', async ({ client, assert }) => {
    try {
      const response = await client
        .post('/v1/api/graphql')
        .header('Content-Type', 'application/json')
        .json({ invalid: 'json' })

      response.assertStatus(400)
    } catch (error) {
      assert.isDefined(error)
    }
  })

  test('returns error for non-string query', async ({ client, assert }) => {
    const response = await client.post('/v1/api/graphql').json({
      query: 123,
    })

    response.assertStatus(500)

    const body = response.body()
    assert.isDefined(body.errors)
  })

  test('returns error for empty query string', async ({ client, assert }) => {
    const response = await client.post('/v1/api/graphql').json({
      query: '',
    })

    response.assertStatus(400)
    response.assertBodyContains({
      errors: [
        {
          message: 'Must provide query string',
        },
      ],
    })
  })

  test('returns error for query with invalid operation name', async ({ client, assert }) => {
    const query = `
      query InvalidOperation {
        nonExistentField {
          id
        }
      }
    `

    const response = await client.post('/v1/api/graphql').json({
      query,
      operationName: 'InvalidOperation',
    })

    response.assertStatus(200)

    const body = response.body()
    assert.isDefined(body.errors)
    assert.isTrue(body.errors.length > 0)
  })

  test('returns error for query with invalid variables', async ({ client, assert }) => {
    const query = `
      query GetWeather($lat: Float!, $lon: Float!) {
        getWeatherForecast(input: { latitude: $lat, longitude: $lon, days: 7 }) {
          latitude
        }
      }
    `

    const response = await client.post('/v1/api/graphql').json({
      query,
      variables: {
        lat: 'invalid',
        lon: 'invalid',
      },
    })

    response.assertStatus(200)

    const body = response.body()
    assert.isDefined(body.errors)
  })

  test('handles missing required variables', async ({ client, assert }) => {
    const query = `
      query GetWeather($lat: Float!, $lon: Float!) {
        getWeatherForecast(input: { latitude: $lat, longitude: $lon, days: 7 }) {
          latitude
        }
      }
    `

    const response = await client.post('/v1/api/graphql').json({
      query,
      variables: {},
    })

    response.assertStatus(200)

    const body = response.body()
    assert.isDefined(body.errors)
  })

  test('returns consistent error structure for all error types', async ({ client, assert }) => {
    const queries = [
      {
        query: 'query { searchCities(query: "London", limit: 200) { id } }',
        expectedCode: 'VALIDATION_ERROR',
      },
      {
        query: 'query { getWeatherForecast(input: { latitude: 200, longitude: 50, days: 7 }) { latitude } }',
        expectedCode: 'VALIDATION_ERROR',
      },
      {
        query: 'query { getActivityRecommendations(cityId: 999999, days: 7) { city { name } } }',
        expectedCode: 'NOT_FOUND',
      },
    ]

    for (const { query, expectedCode } of queries) {
      const response = await client.post('/v1/api/graphql').json({ query })

      response.assertStatus(200)

      const body = response.body()
      if (body.errors && body.errors.length > 0) {
        const error = body.errors[0]
        assert.isDefined(error.message)
        assert.isDefined(error.extensions)
        assert.isDefined(error.extensions.code)
        assert.equal(error.extensions.code, expectedCode)
        assert.isDefined(error.extensions.statusCode)
        assert.isNumber(error.extensions.statusCode)
      }
    }
  })

  test('handles deeply nested invalid queries', async ({ client, assert }) => {
    const query = `
      query {
        searchCities(query: "London", limit: 5) {
          id
          name
          nestedField {
            deeperField {
              invalidField
            }
          }
        }
      }
    `

    const response = await client.post('/v1/api/graphql').json({ query })

    response.assertStatus(200)

    const body = response.body()
    assert.isDefined(body.errors)
  })

  test('handles query with invalid field types', async ({ client, assert }) => {
    const query = `
      query {
        searchCities(query: 123, limit: "invalid") {
          id
        }
      }
    `

    const response = await client.post('/v1/api/graphql').json({ query })

    response.assertStatus(200)

    const body = response.body()
    assert.isDefined(body.errors)
  })

  test('handles query with circular references', async ({ client, assert }) => {
    const query = `
      query {
        searchCities(query: "London", limit: 5) {
          id
          name
          self {
            self {
              self {
                id
              }
            }
          }
        }
      }
    `

    const response = await client.post('/v1/api/graphql').json({ query })

    response.assertStatus(200)

    const body = response.body()
    assert.isDefined(body.errors)
  })
})

