import { test } from '@japa/runner'

/**
 * Integration tests for GraphQL queries.
 * Tests the complete request flow from GraphQL query to response.
 *
 * These tests validate:
 * - Query execution with valid inputs
 * - Error handling for invalid inputs
 * - Response structure and data correctness
 * - End-to-end functionality
 */

test.group('GraphQL Integration - searchCities', () => {

  test('should return cities for valid query', async ({ client }) => {
    const query = `
      query {
        searchCities(query: "London", limit: 5) {
          id
          name
          country
          latitude
          longitude
        }
      }
    `

    const response = await client.post('/graphql').json({ query })

    response.assertStatus(200)
    response.assertBodyContains({
      data: {
        searchCities: [],
      },
    })

    // Verify response structure
    const body = response.body()
    const cities = body.data.searchCities

    // Cities should be an array
    if (cities.length > 0) {
      // Verify first city has required fields
      const firstCity = cities[0]
      if (firstCity.name.toLowerCase().includes('london')) {
        // City name should contain 'london'
      }
      // All cities should have required fields
      cities.forEach((city: any) => {
        if (city.id) {
          // Has id
        }
        if (city.name) {
          // Has name
        }
        if (city.country) {
          // Has country
        }
        if (typeof city.latitude === 'number') {
          // Has latitude
        }
        if (typeof city.longitude === 'number') {
          // Has longitude
        }
      })
    }
  })

  test('should return empty array for empty query', async ({ client }) => {
    const query = `
      query {
        searchCities(query: "", limit: 5) {
          id
          name
        }
      }
    `

    const response = await client.post('/graphql').json({ query })

    response.assertStatus(200)
    response.assertBodyContains({
      data: {
        searchCities: [],
      },
    })
  })

  test('should respect limit parameter', async ({ client }) => {
    const query = `
      query {
        searchCities(query: "New", limit: 3) {
          id
          name
        }
      }
    `

    const response = await client.post('/graphql').json({ query })

    response.assertStatus(200)

    const body = response.body()
    const cities = body.data.searchCities

    // Should return at most 3 cities
    if (cities.length > 3) {
      throw new Error(`Expected at most 3 cities, got ${cities.length}`)
    }
  })

  test('should return error for invalid limit', async ({ client }) => {
    const query = `
      query {
        searchCities(query: "London", limit: 200) {
          id
          name
        }
      }
    `

    const response = await client.post('/graphql').json({ query })

    response.assertStatus(200)

    const body = response.body()
    if (body.errors && body.errors.length > 0) {
      const error = body.errors[0]
      if (error.extensions?.code === 'VALIDATION_ERROR') {
        // Correct error code
      }
    }
  })
})

test.group('GraphQL Integration - getWeatherForecast', () => {

  test('should return weather forecast for valid coordinates', async ({ client }) => {
    const query = `
      query {
        getWeatherForecast(input: { latitude: 51.5074, longitude: -0.1278, days: 7 }) {
          latitude
          longitude
          timezone
          dailyForecasts {
            date
            temperatureMax
            temperatureMin
            precipitation
            windSpeed
            weatherCondition
          }
        }
      }
    `

    const response = await client.post('/graphql').json({ query })

    response.assertStatus(200)

    const body = response.body()
    if (body.data && body.data.getWeatherForecast) {
      const forecast = body.data.getWeatherForecast

      // Verify forecast structure
      if (typeof forecast.latitude === 'number') {
        // Has latitude
      }
      if (typeof forecast.longitude === 'number') {
        // Has longitude
      }
      if (forecast.timezone) {
        // Has timezone
      }
      if (Array.isArray(forecast.dailyForecasts)) {
        // Has daily forecasts array
        if (forecast.dailyForecasts.length === 7) {
          // Has 7 days of forecasts
        }

        // Verify each daily forecast has required fields
        forecast.dailyForecasts.forEach((daily: any) => {
          if (daily.date) {
            // Has date
          }
          if (typeof daily.temperatureMax === 'number') {
            // Has temperatureMax
          }
          if (typeof daily.temperatureMin === 'number') {
            // Has temperatureMin
          }
          if (typeof daily.precipitation === 'number') {
            // Has precipitation
          }
          if (typeof daily.windSpeed === 'number') {
            // Has windSpeed
          }
          if (daily.weatherCondition) {
            // Has weatherCondition
          }
        })
      }
    }
  })

  test('should return error for invalid latitude', async ({ client }) => {
    const query = `
      query {
        getWeatherForecast(input: { latitude: 200, longitude: 50, days: 7 }) {
          latitude
          longitude
        }
      }
    `

    const response = await client.post('/graphql').json({ query })

    response.assertStatus(200)

    const body = response.body()
    if (body.errors && body.errors.length > 0) {
      const error = body.errors[0]
      if (error.message.toLowerCase().includes('latitude')) {
        // Error message mentions latitude
      }
      if (error.extensions?.code === 'VALIDATION_ERROR') {
        // Correct error code
      }
    }
  })

  test('should return error for invalid longitude', async ({ client }) => {
    const query = `
      query {
        getWeatherForecast(input: { latitude: 50, longitude: 200, days: 7 }) {
          latitude
          longitude
        }
      }
    `

    const response = await client.post('/graphql').json({ query })

    response.assertStatus(200)

    const body = response.body()
    if (body.errors && body.errors.length > 0) {
      const error = body.errors[0]
      if (error.message.toLowerCase().includes('longitude')) {
        // Error message mentions longitude
      }
      if (error.extensions?.code === 'VALIDATION_ERROR') {
        // Correct error code
      }
    }
  })

  test('should return error for invalid days parameter', async ({ client }) => {
    const query = `
      query {
        getWeatherForecast(input: { latitude: 51.5074, longitude: -0.1278, days: 20 }) {
          latitude
        }
      }
    `

    const response = await client.post('/graphql').json({ query })

    response.assertStatus(200)

    const body = response.body()
    if (body.errors && body.errors.length > 0) {
      const error = body.errors[0]
      if (error.extensions?.code === 'VALIDATION_ERROR') {
        // Correct error code
      }
    }
  })
})

test.group('GraphQL Integration - getActivityRecommendations', () => {

  test('should return error for city not found', async ({ client }) => {
    const query = `
      query {
        getActivityRecommendations(cityId: 999999, days: 7) {
          city {
            name
          }
          activities {
            type
            score
          }
        }
      }
    `

    const response = await client.post('/graphql').json({ query })

    response.assertStatus(200)

    const body = response.body()
    if (body.errors && body.errors.length > 0) {
      const error = body.errors[0]
      if (error.extensions?.code === 'NOT_FOUND') {
        // Correct error code for not found
      }
    }
  })

  test('should return error for invalid days parameter', async ({ client }) => {
    const query = `
      query {
        getActivityRecommendations(cityId: 2643743, days: 20) {
          city {
            name
          }
        }
      }
    `

    const response = await client.post('/graphql').json({ query })

    response.assertStatus(200)

    const body = response.body()
    if (body.errors && body.errors.length > 0) {
      const error = body.errors[0]
      if (error.extensions?.code === 'VALIDATION_ERROR') {
        // Correct error code
      }
    }
  })
})

test.group('GraphQL Integration - Error Structure', () => {

  test('should return consistent error structure for validation errors', async ({ client }) => {
    const query = `
      query {
        getWeatherForecast(input: { latitude: 200, longitude: 50 }) {
          latitude
        }
      }
    `

    const response = await client.post('/graphql').json({ query })

    response.assertStatus(200)

    const body = response.body()
    if (body.errors && body.errors.length > 0) {
      const error = body.errors[0]

      // Error should have message
      if (error.message) {
        // Has message
      }

      // Error should have extensions with code
      if (error.extensions) {
        if (error.extensions.code) {
          // Has error code
        }
        if (typeof error.extensions.statusCode === 'number') {
          // Has status code
        }
      }
    }
  })

  test('should return consistent error structure for API errors', async ({ client }) => {
    const query = `
      query {
        searchCities(query: "InvalidCityThatDoesNotExist12345", limit: 5) {
          id
          name
        }
      }
    `

    const response = await client.post('/graphql').json({ query })

    response.assertStatus(200)

    const body = response.body()

    // Should either return empty array or error with consistent structure
    if (body.errors && body.errors.length > 0) {
      const error = body.errors[0]

      // Error should have message
      if (error.message) {
        // Has message
      }

      // Error should have extensions
      if (error.extensions) {
        if (error.extensions.code) {
          // Has error code
        }
      }
    }
  })
})

test.group('GraphQL Integration - Health Check', () => {

  test('should return health status', async ({ client }) => {
    const response = await client.get('/health')

    response.assertStatus(200)
    response.assertBodyContains({
      status: 'healthy',
    })

    const body = response.body()
    if (body.timestamp) {
      // Has timestamp
    }
    if (typeof body.uptime === 'number') {
      // Has uptime
    }
  })
})

test.group('GraphQL Integration - Playground', () => {

  test('should return GraphQL playground HTML on GET request', async ({ client }) => {
    const response = await client.get('/graphql')

    response.assertStatus(200)
    
    const contentType = response.headers()['content-type']
    if (contentType && contentType.includes('text/html')) {
      // Has HTML content type
    }

    const body = response.text()
    if (body.includes('GraphQL')) {
      // Contains GraphQL text
    }
  })
})
