import { test } from '@japa/runner'
import { CityService } from '#services/city_service'
import { IWeatherClient } from '#clients/interfaces/weather_client_interface'
import { ICacheManager } from '#clients/interfaces/cache_manager_interface'
import { City } from '#models/city'
import WeatherAPIException from '#exceptions/weather_api_exception'
import { createMockMetrics } from '../helpers/mock_metrics.js'

test.group('CityService - Edge Cases', () => {
  test('handles very long city names', async ({ assert }) => {
    const longName = 'A'.repeat(1000)
    const mockCities = [
      new City({
        id: 1,
        name: longName,
        country: 'Country',
        countryCode: 'CC',
        latitude: 0,
        longitude: 0,
        timezone: 'UTC',
        population: 1000,
      }),
    ]

    const mockWeatherClient: IWeatherClient = {
      searchCities: async () => mockCities,
      getWeatherForecast: async () => {
        throw new Error('Not implemented')
      },
    }

    const mockCacheManager: ICacheManager = {
      get: async () => null,
      set: async () => {},
      delete: async () => {},
      clear: async () => {},
    }

    const cityService = new CityService(mockWeatherClient, mockCacheManager, createMockMetrics())
    const result = await cityService.searchCities(longName)

    assert.equal(result.length, 1)
    assert.equal(result[0].name, longName)
  })

  test('handles unicode and special characters in city names', async ({ assert }) => {
    const unicodeQueries = [
      'São Paulo',
      '北京',
      'Москва',
      'München',
      "O'Reilly",
      'Saint-Jean',
    ]

    const mockWeatherClient: IWeatherClient = {
      searchCities: async (query: string) => {
        return [
          new City({
            id: 1,
            name: query,
            country: 'Country',
            countryCode: 'CC',
            latitude: 0,
            longitude: 0,
            timezone: 'UTC',
            population: 1000,
          }),
        ]
      },
      getWeatherForecast: async () => {
        throw new Error('Not implemented')
      },
    }

    const mockCacheManager: ICacheManager = {
      get: async () => null,
      set: async () => {},
      delete: async () => {},
      clear: async () => {},
    }

    const cityService = new CityService(mockWeatherClient, mockCacheManager, createMockMetrics())

    for (const query of unicodeQueries) {
      const result = await cityService.searchCities(query)
      assert.isArray(result)
    }
  })

  test('handles query with only special characters', async ({ assert }) => {
    const mockWeatherClient: IWeatherClient = {
      searchCities: async () => [],
      getWeatherForecast: async () => {
        throw new Error('Not implemented')
      },
    }

    const mockCacheManager: ICacheManager = {
      get: async () => null,
      set: async () => {},
      delete: async () => {},
      clear: async () => {},
    }

    const cityService = new CityService(mockWeatherClient, mockCacheManager, createMockMetrics())

    const result = await cityService.searchCities('@#$%^&*()')
    assert.deepEqual(result, [])
  })

  test('handles limit of 1 correctly', async ({ assert }) => {
    const mockCities = Array.from({ length: 10 }, (_, i) =>
      new City({
        id: i + 1,
        name: `City${i}`,
        country: 'Country',
        countryCode: 'CC',
        latitude: 0,
        longitude: 0,
        timezone: 'UTC',
        population: 1000,
      })
    )

    const mockWeatherClient: IWeatherClient = {
      searchCities: async () => mockCities,
      getWeatherForecast: async () => {
        throw new Error('Not implemented')
      },
    }

    const mockCacheManager: ICacheManager = {
      get: async () => null,
      set: async () => {},
      delete: async () => {},
      clear: async () => {},
    }

    const cityService = new CityService(mockWeatherClient, mockCacheManager, createMockMetrics())
    const result = await cityService.searchCities('City', 1)

    assert.equal(result.length, 1)
  })

  test('handles very large limit values', async ({ assert }) => {
    const mockCities = Array.from({ length: 50 }, (_, i) =>
      new City({
        id: i + 1,
        name: `City${i}`,
        country: 'Country',
        countryCode: 'CC',
        latitude: 0,
        longitude: 0,
        timezone: 'UTC',
        population: 1000,
      })
    )

    const mockWeatherClient: IWeatherClient = {
      searchCities: async () => mockCities,
      getWeatherForecast: async () => {
        throw new Error('Not implemented')
      },
    }

    const mockCacheManager: ICacheManager = {
      get: async () => null,
      set: async () => {},
      delete: async () => {},
      clear: async () => {},
    }

    const cityService = new CityService(mockWeatherClient, mockCacheManager, createMockMetrics())
    const result = await cityService.searchCities('City', 1000)

    assert.isAtMost(result.length, 50)
  })

  test('handles cities with zero population', async ({ assert }) => {
    const mockCities = [
      new City({
        id: 1,
        name: 'City1',
        country: 'Country',
        countryCode: 'CC',
        latitude: 0,
        longitude: 0,
        timezone: 'UTC',
        population: 0,
      }),
      new City({
        id: 2,
        name: 'City2',
        country: 'Country',
        countryCode: 'CC',
        latitude: 0,
        longitude: 0,
        timezone: 'UTC',
        population: undefined,
      }),
    ]

    const mockWeatherClient: IWeatherClient = {
      searchCities: async () => mockCities,
      getWeatherForecast: async () => {
        throw new Error('Not implemented')
      },
    }

    const mockCacheManager: ICacheManager = {
      get: async () => null,
      set: async () => {},
      delete: async () => {},
      clear: async () => {},
    }

    const cityService = new CityService(mockWeatherClient, mockCacheManager, createMockMetrics())
    const result = await cityService.searchCities('City')

    assert.equal(result.length, 2)
  })

  test('handles API timeout gracefully', async ({ assert }) => {
    const mockWeatherClient: IWeatherClient = {
      searchCities: async () => {
        throw WeatherAPIException.timeout('/search', 5000)
      },
      getWeatherForecast: async () => {
        throw new Error('Not implemented')
      },
    }

    const mockCacheManager: ICacheManager = {
      get: async () => null,
      set: async () => {},
      delete: async () => {},
      clear: async () => {},
    }

    const cityService = new CityService(mockWeatherClient, mockCacheManager, createMockMetrics())

    await assert.rejects(
      async () => await cityService.searchCities('London'),
      WeatherAPIException
    )
  })

  test('handles network errors gracefully', async ({ assert }) => {
    const mockWeatherClient: IWeatherClient = {
      searchCities: async () => {
        throw WeatherAPIException.networkError(new Error('Network error'), '/search')
      },
      getWeatherForecast: async () => {
        throw new Error('Not implemented')
      },
    }

    const mockCacheManager: ICacheManager = {
      get: async () => null,
      set: async () => {},
      delete: async () => {},
      clear: async () => {},
    }

    const cityService = new CityService(mockWeatherClient, mockCacheManager, createMockMetrics())

    await assert.rejects(
      async () => await cityService.searchCities('London'),
      WeatherAPIException
    )
  })

  test('handles empty results from API', async ({ assert }) => {
    const mockWeatherClient: IWeatherClient = {
      searchCities: async () => [],
      getWeatherForecast: async () => {
        throw new Error('Not implemented')
      },
    }

    const mockCacheManager: ICacheManager = {
      get: async () => null,
      set: async () => {},
      delete: async () => {},
      clear: async () => {},
    }

    const cityService = new CityService(mockWeatherClient, mockCacheManager, createMockMetrics())
    const result = await cityService.searchCities('NonExistentCity12345')

    assert.deepEqual(result, [])
  })

  test('handles cache errors gracefully', async ({ assert }) => {
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

    const mockWeatherClient: IWeatherClient = {
      searchCities: async () => mockCities,
      getWeatherForecast: async () => {
        throw new Error('Not implemented')
      },
    }

    const mockCacheManager: ICacheManager = {
      get: async () => {
        throw new Error('Cache error')
      },
      set: async () => {
        throw new Error('Cache error')
      },
      delete: async () => {},
      clear: async () => {},
    }

    const cityService = new CityService(mockWeatherClient, mockCacheManager, createMockMetrics())

    await assert.rejects(async () => await cityService.searchCities('London'), Error)
  })

  test('handles case-insensitive query matching', async ({ assert }) => {
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
      new City({
        id: 2,
        name: 'LONDON',
        country: 'Canada',
        countryCode: 'CA',
        latitude: 42.9849,
        longitude: -81.2453,
        timezone: 'America/Toronto',
        population: 400000,
      }),
    ]

    const mockWeatherClient: IWeatherClient = {
      searchCities: async () => mockCities,
      getWeatherForecast: async () => {
        throw new Error('Not implemented')
      },
    }

    const mockCacheManager: ICacheManager = {
      get: async () => null,
      set: async () => {},
      delete: async () => {},
      clear: async () => {},
    }

    const cityService = new CityService(mockWeatherClient, mockCacheManager, createMockMetrics())

    const result1 = await cityService.searchCities('london')
    const result2 = await cityService.searchCities('LONDON')
    const result3 = await cityService.searchCities('London')

    assert.equal(result1.length, 2)
    assert.equal(result2.length, 2)
    assert.equal(result3.length, 2)
  })

  test('handles query with multiple spaces correctly', async ({ assert }) => {
    let capturedQuery = ''

    const mockWeatherClient: IWeatherClient = {
      searchCities: async (query: string) => {
        capturedQuery = query
        return []
      },
      getWeatherForecast: async () => {
        throw new Error('Not implemented')
      },
    }

    const mockCacheManager: ICacheManager = {
      get: async () => null,
      set: async () => {},
      delete: async () => {},
      clear: async () => {},
    }

    const cityService = new CityService(mockWeatherClient, mockCacheManager, createMockMetrics())

    await cityService.searchCities('New    York     City')

    assert.equal(capturedQuery, 'New York City')
  })

  test('handles query with leading and trailing spaces', async ({ assert }) => {
    let capturedQuery = ''

    const mockWeatherClient: IWeatherClient = {
      searchCities: async (query: string) => {
        capturedQuery = query
        return []
      },
      getWeatherForecast: async () => {
        throw new Error('Not implemented')
      },
    }

    const mockCacheManager: ICacheManager = {
      get: async () => null,
      set: async () => {},
      delete: async () => {},
      clear: async () => {},
    }

    const cityService = new CityService(mockWeatherClient, mockCacheManager, createMockMetrics())

    await cityService.searchCities('   London   ')

    assert.equal(capturedQuery, 'London')
  })
})

