import { test } from '@japa/runner'
import { CityResolver } from '#graphql/resolvers/city_resolver'
import { WeatherResolver } from '#graphql/resolvers/weather_resolver'
import { ActivityResolver } from '#graphql/resolvers/activity_resolver'
import { CityService } from '#services/city_service'
import { WeatherService } from '#services/weather_service'
import { ActivityRankingService } from '#services/activity_ranking_service'
import { IWeatherClient } from '#clients/interfaces/weather_client_interface'
import { ICacheManager } from '#clients/interfaces/cache_manager_interface'
import { City } from '#models/city'
import { WeatherForecast, DailyForecast } from '#models/weather'
import ValidationException from '#exceptions/validation_exception'
import WeatherAPIException from '#exceptions/weather_api_exception'
import { createMockMetrics } from '../helpers/mock_metrics.js'
import { GraphQLError } from 'graphql'

test.group('CityResolver', (group) => {
  let cityResolver: CityResolver
  let mockWeatherClient: IWeatherClient
  let mockCacheManager: ICacheManager

  group.each.setup(() => {
    // Create mock weather client
    mockWeatherClient = {
      searchCities: async () => [],
      getWeatherForecast: async () => {
        throw new Error('Not implemented')
      },
    }

    // Create mock cache manager
    mockCacheManager = {
      get: async () => null,
      set: async () => {},
      delete: async () => {},
      clear: async () => {},
    }

    const cityService = new CityService(mockWeatherClient, mockCacheManager, createMockMetrics())
    cityResolver = new CityResolver(cityService)
  })

  test('searchCities returns cities for valid query', async ({ assert }) => {
    const mockCities = [
      new City({
        id: 1,
        name: 'London',
        country: 'United Kingdom',
        countryCode: 'GB',
        latitude: 51.5074,
        longitude: -0.1278,
        timezone: 'Europe/London',
        population: 9000000,
      }),
    ]

    mockWeatherClient.searchCities = async () => mockCities

    const result = await cityResolver.searchCities(null, { query: 'London', limit: 10 })

    assert.equal(result.length, 1)
    assert.equal(result[0].name, 'London')
  })

  test('searchCities throws GraphQLError for invalid limit', async ({ assert }) => {
    try {
      await cityResolver.searchCities(null, { query: 'London', limit: 0 })
      assert.fail('Should have thrown GraphQLError')
    } catch (error) {
      assert.instanceOf(error, GraphQLError)
      assert.equal((error as GraphQLError).extensions.code, 'VALIDATION_ERROR')
    }
  })

  test('searchCities translates WeatherAPIException to GraphQLError', async ({ assert }) => {
    mockWeatherClient.searchCities = async () => {
      throw new WeatherAPIException('API error', undefined, '/search')
    }

    try {
      await cityResolver.searchCities(null, { query: 'London', limit: 10 })
      assert.fail('Should have thrown GraphQLError')
    } catch (error) {
      assert.instanceOf(error, GraphQLError)
      assert.equal((error as GraphQLError).extensions.code, 'WEATHER_API_ERROR')
    }
  })
})

test.group('WeatherResolver', (group) => {
  let weatherResolver: WeatherResolver
  let mockWeatherClient: IWeatherClient
  let mockCacheManager: ICacheManager

  group.each.setup(() => {
    // Create mock weather client
    mockWeatherClient = {
      searchCities: async () => [],
      getWeatherForecast: async () => {
        throw new Error('Not implemented')
      },
    }

    // Create mock cache manager
    mockCacheManager = {
      get: async () => null,
      set: async () => {},
      delete: async () => {},
      clear: async () => {},
    }

    const weatherService = new WeatherService(
      mockWeatherClient,
      mockCacheManager,
      createMockMetrics()
    )
    weatherResolver = new WeatherResolver(weatherService)
  })

  test('getWeatherForecast returns forecast for valid coordinates', async ({ assert }) => {
    const mockForecast = new WeatherForecast({
      latitude: 51.5074,
      longitude: -0.1278,
      timezone: 'Europe/London',
      dailyForecasts: [
        new DailyForecast({
          date: '2024-01-01',
          temperatureMax: 15,
          temperatureMin: 5,
          precipitation: 0,
          windSpeed: 10,
          weatherCode: 0,
        }),
      ],
    })

    mockWeatherClient.getWeatherForecast = async () => mockForecast

    const result = await weatherResolver.getWeatherForecast(null, {
      input: { latitude: 51.5074, longitude: -0.1278, days: 1 },
    })

    assert.equal(result.latitude, 51.5074)
    assert.equal(result.longitude, -0.1278)
    assert.equal(result.dailyForecasts.length, 1)
  })

  test('getWeatherForecast throws GraphQLError for invalid days', async ({ assert }) => {
    try {
      await weatherResolver.getWeatherForecast(null, {
        input: { latitude: 51.5074, longitude: -0.1278, days: 20 },
      })
      assert.fail('Should have thrown GraphQLError')
    } catch (error) {
      assert.instanceOf(error, GraphQLError)
      assert.equal((error as GraphQLError).extensions.code, 'VALIDATION_ERROR')
    }
  })

  test('getWeatherForecast translates ValidationException to GraphQLError', async ({ assert }) => {
    mockWeatherClient.getWeatherForecast = async () => {
      throw new ValidationException('Invalid coordinates', 'latitude', 200)
    }

    try {
      await weatherResolver.getWeatherForecast(null, {
        input: { latitude: 200, longitude: 50, days: 7 },
      })
      assert.fail('Should have thrown GraphQLError')
    } catch (error) {
      assert.instanceOf(error, GraphQLError)
      assert.equal((error as GraphQLError).extensions.code, 'VALIDATION_ERROR')
    }
  })
})

test.group('ActivityResolver', (group) => {
  let activityResolver: ActivityResolver
  let mockWeatherClient: IWeatherClient
  let mockCacheManager: ICacheManager

  group.each.setup(() => {
    // Create mock weather client
    mockWeatherClient = {
      searchCities: async () => [],
      getWeatherForecast: async () => {
        const mockForecast = new WeatherForecast({
          latitude: 51.5074,
          longitude: -0.1278,
          timezone: 'Europe/London',
          dailyForecasts: [
            new DailyForecast({
              date: '2024-01-01',
              temperatureMax: 15,
              temperatureMin: 5,
              precipitation: 0,
              windSpeed: 10,
              weatherCode: 0,
            }),
          ],
        })
        return mockForecast
      },
    }

    // Create mock cache manager
    mockCacheManager = {
      get: async () => null,
      set: async () => {},
      delete: async () => {},
      clear: async () => {},
    }

    const weatherService = new WeatherService(
      mockWeatherClient,
      mockCacheManager,
      createMockMetrics()
    )
    const activityRankingService = new ActivityRankingService(weatherService, createMockMetrics())
    activityResolver = new ActivityResolver(activityRankingService)
  })

  test('getActivityRecommendations throws NotFoundException when city not in context', async ({
    assert,
  }) => {
    try {
      await activityResolver.getActivityRecommendations(null, { cityId: 123, days: 7 })
      assert.fail('Should have thrown GraphQLError')
    } catch (error) {
      assert.instanceOf(error, GraphQLError)
      assert.equal((error as GraphQLError).extensions.code, 'NOT_FOUND')
      assert.include((error as GraphQLError).message, 'City not found')
    }
  })

  test('getActivityRecommendations returns recommendations when city in context', async ({
    assert,
  }) => {
    const mockCity = new City({
      id: 123,
      name: 'London',
      country: 'United Kingdom',
      countryCode: 'GB',
      latitude: 51.5074,
      longitude: -0.1278,
      timezone: 'Europe/London',
      population: 9000000,
    })

    const result = await activityResolver.getActivityRecommendations(
      null,
      { cityId: 123, days: 7 },
      { city: mockCity }
    )

    assert.equal(result.city.name, 'London')
    assert.isDefined(result.forecast)
    assert.isDefined(result.activities)
    assert.equal(result.activities.length, 4)
    assert.isDefined(result.generatedAt)
  })

  test('getActivityRecommendations throws GraphQLError for invalid days', async ({ assert }) => {
    const mockCity = new City({
      id: 123,
      name: 'London',
      country: 'United Kingdom',
      countryCode: 'GB',
      latitude: 51.5074,
      longitude: -0.1278,
      timezone: 'Europe/London',
      population: 9000000,
    })

    try {
      await activityResolver.getActivityRecommendations(
        null,
        { cityId: 123, days: 20 },
        { city: mockCity }
      )
      assert.fail('Should have thrown GraphQLError')
    } catch (error) {
      assert.instanceOf(error, GraphQLError)
      assert.equal((error as GraphQLError).extensions.code, 'VALIDATION_ERROR')
    }
  })
})
