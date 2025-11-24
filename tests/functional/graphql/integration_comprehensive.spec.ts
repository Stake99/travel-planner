import { test } from '@japa/runner'

test.group('GraphQL - Comprehensive Integration Tests', () => {
  test('handles multiple queries in sequence', async ({ client, assert }) => {
    const query1 = `
      query {
        searchCities(query: "London", limit: 5) {
          id
          name
          country
        }
      }
    `

    const query2 = `
      query {
        getWeatherForecast(input: { latitude: 51.5074, longitude: -0.1278, days: 7 }) {
          latitude
          longitude
          dailyForecasts {
            date
            temperatureMax
          }
        }
      }
    `

    const response1 = await client.post('/v1/api/graphql').json({ query: query1 })
    response1.assertStatus(200)

    const response2 = await client.post('/v1/api/graphql').json({ query: query2 })
    response2.assertStatus(200)

    const body1 = response1.body()
    const body2 = response2.body()

    assert.isDefined(body1.data)
    assert.isDefined(body2.data)
  })

  test('handles query with all fields requested', async ({ client, assert }) => {
    const query = `
      query {
        searchCities(query: "Paris", limit: 3) {
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
    `

    const response = await client.post('/v1/api/graphql').json({ query })

    response.assertStatus(200)

    const body = response.body()
    if (body.data && body.data.searchCities && body.data.searchCities.length > 0) {
      const city = body.data.searchCities[0]
      assert.isDefined(city.id)
      assert.isDefined(city.name)
      assert.isDefined(city.country)
      assert.isDefined(city.countryCode)
      assert.isDefined(city.latitude)
      assert.isDefined(city.longitude)
      assert.isDefined(city.timezone)
    }
  })

  test('handles query with minimal fields requested', async ({ client, assert }) => {
    const query = `
      query {
        searchCities(query: "Tokyo", limit: 1) {
          id
          name
        }
      }
    `

    const response = await client.post('/v1/api/graphql').json({ query })

    response.assertStatus(200)

    const body = response.body()
    assert.isDefined(body.data)
    assert.isArray(body.data.searchCities)
  })

  test('handles query with variables correctly', async ({ client, assert }) => {
    const query = `
      query GetWeather($lat: Float!, $lon: Float!, $days: Int) {
        getWeatherForecast(input: { latitude: $lat, longitude: $lon, days: $days }) {
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

    const response = await client.post('/v1/api/graphql').json({
      query,
      variables: {
        lat: 51.5074,
        lon: -0.1278,
        days: 7,
      },
    })

    response.assertStatus(200)

      const body = response.body()
      if (body.data && body.data.getWeatherForecast) {
        const forecast = body.data.getWeatherForecast
        assert.approximately(forecast.latitude, 51.5074, 0.1)
        assert.approximately(forecast.longitude, -0.1278, 0.1)
        assert.isArray(forecast.dailyForecasts)
        assert.equal(forecast.dailyForecasts.length, 7)
      }
  })

  test('handles query with default variable values', async ({ client, assert }) => {
    const query = `
      query GetWeather($lat: Float!, $lon: Float!, $days: Int = 7) {
        getWeatherForecast(input: { latitude: $lat, longitude: $lon, days: $days }) {
          latitude
          dailyForecasts {
            date
          }
        }
      }
    `

    const response = await client.post('/v1/api/graphql').json({
      query,
      variables: {
        lat: 51.5074,
        lon: -0.1278,
      },
    })

    response.assertStatus(200)

    const body = response.body()
    if (body.data && body.data.getWeatherForecast) {
      const forecast = body.data.getWeatherForecast
      assert.isArray(forecast.dailyForecasts)
      assert.equal(forecast.dailyForecasts.length, 7)
    }
  })

  test('handles query with operation name', async ({ client, assert }) => {
    const query = `
      query SearchCities {
        searchCities(query: "Berlin", limit: 5) {
          id
          name
        }
      }
      
      query GetWeather {
        getWeatherForecast(input: { latitude: 52.52, longitude: 13.405, days: 3 }) {
          latitude
        }
      }
    `

    const response = await client.post('/v1/api/graphql').json({
      query,
      operationName: 'SearchCities',
    })

    response.assertStatus(200)

    const body = response.body()
    assert.isDefined(body.data)
    assert.isDefined(body.data.searchCities)
  })

  test('handles concurrent requests', async ({ client, assert }) => {
    const query = `
      query {
        searchCities(query: "New", limit: 5) {
          id
          name
        }
      }
    `

    const promises = Array.from({ length: 5 }, () =>
      client.post('/v1/api/graphql').json({ query })
    )

    const responses = await Promise.all(promises)

    for (const response of responses) {
      response.assertStatus(200)
      const body = response.body()
      assert.isDefined(body.data)
    }
  })

  test('handles query with aliases', async ({ client, assert }) => {
    const query = `
      query {
        londonCities: searchCities(query: "London", limit: 3) {
          id
          name
        }
        parisCities: searchCities(query: "Paris", limit: 3) {
          id
          name
        }
      }
    `

    const response = await client.post('/v1/api/graphql').json({ query })

    response.assertStatus(200)

    const body = response.body()
    assert.isDefined(body.data.londonCities)
    assert.isDefined(body.data.parisCities)
    assert.isArray(body.data.londonCities)
    assert.isArray(body.data.parisCities)
  })

  test('handles query with fragments', async ({ client, assert }) => {
    const query = `
      fragment CityFields on City {
        id
        name
        country
        latitude
        longitude
      }
      
      query {
        searchCities(query: "Madrid", limit: 3) {
          ...CityFields
        }
      }
    `

    const response = await client.post('/v1/api/graphql').json({ query })

    response.assertStatus(200)

    const body = response.body()
    if (body.data && body.data.searchCities && body.data.searchCities.length > 0) {
      const city = body.data.searchCities[0]
      assert.isDefined(city.id)
      assert.isDefined(city.name)
      assert.isDefined(city.country)
      assert.isDefined(city.latitude)
      assert.isDefined(city.longitude)
    }
  })

  test('handles query with inline fragments', async ({ client, assert }) => {
    const query = `
      query {
        searchCities(query: "Rome", limit: 2) {
          id
          name
          ... on City {
            country
            countryCode
          }
        }
      }
    `

    const response = await client.post('/v1/api/graphql').json({ query })

    response.assertStatus(200)

    const body = response.body()
    if (body.data && body.data.searchCities && body.data.searchCities.length > 0) {
      const city = body.data.searchCities[0]
      assert.isDefined(city.id)
      assert.isDefined(city.name)
      assert.isDefined(city.country)
      assert.isDefined(city.countryCode)
    }
  })

  test('handles query with directives', async ({ client, assert }) => {
    const query = `
      query {
        searchCities(query: "Vienna", limit: 5) {
          id
          name
          country @include(if: true)
          latitude @skip(if: false)
        }
      }
    `

    const response = await client.post('/v1/api/graphql').json({ query })

    response.assertStatus(200)

    const body = response.body()
    if (body.data && body.data.searchCities && body.data.searchCities.length > 0) {
      const city = body.data.searchCities[0]
      assert.isDefined(city.id)
      assert.isDefined(city.name)
      assert.isDefined(city.country)
      assert.isDefined(city.latitude)
    }
  })

  test('handles getActivityRecommendationsByCoordinates query', async ({ client, assert }) => {
    const query = `
      query {
        getActivityRecommendationsByCoordinates(
          input: {
            latitude: 51.5074
            longitude: -0.1278
            cityName: "London"
            country: "United Kingdom"
          }
          days: 7
        ) {
          city {
            name
            country
            latitude
            longitude
          }
          forecast {
            latitude
            longitude
            dailyForecasts {
              date
              temperatureMax
              weatherCondition
            }
          }
          activities {
            type
            score
            suitability
            reason
          }
          generatedAt
        }
      }
    `

    const response = await client.post('/v1/api/graphql').json({ query })

    response.assertStatus(200)

    const body = response.body()
    if (body.data && body.data.getActivityRecommendationsByCoordinates) {
      const result = body.data.getActivityRecommendationsByCoordinates
      assert.isDefined(result.city)
      assert.isDefined(result.forecast)
      assert.isDefined(result.activities)
      assert.isArray(result.activities)
      assert.equal(result.activities.length, 4)
      assert.isDefined(result.generatedAt)

      for (const activity of result.activities) {
        assert.isDefined(activity.type)
        assert.isDefined(activity.score)
        assert.isDefined(activity.suitability)
        assert.isDefined(activity.reason)
        assert.isNumber(activity.score)
        assert.isTrue(activity.score >= 0 && activity.score <= 100)
      }
    }
  })
})

