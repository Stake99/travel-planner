import { test } from '@japa/runner'
import { CityService } from '#services/city_service'
import { IWeatherClient } from '#clients/interfaces/weather_client_interface'
import { ICacheManager } from '#clients/interfaces/cache_manager_interface'
import { City } from '#models/city'
import { createMockMetrics } from '../helpers/mock_metrics.js'

test.group('CityService - Unit Tests', () => {
  /**
   * Test: Empty query returns empty array
   * Validates: Requirements 1.1, 1.3
   */
  test('empty query returns empty array', async ({ assert }) => {
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

    // Test empty string
    const result1 = await cityService.searchCities('')
    assert.deepEqual(result1, [])

    // Test whitespace only
    const result2 = await cityService.searchCities('   ')
    assert.deepEqual(result2, [])

    // Test null-like empty string
    const result3 = await cityService.searchCities('  \t  \n  ')
    assert.deepEqual(result3, [])
  })

  /**
   * Test: Special character sanitization
   * Validates: Requirements 1.5
   */
  test('special characters are sanitized', async ({ assert }) => {
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

    // Test query with special characters
    await cityService.searchCities('London@#$%^&*()')

    // Should sanitize to just "London"
    assert.equal(capturedQuery, 'London')

    // Test query with multiple special characters and spaces
    await cityService.searchCities('New   York!!!   City???')

    // Should sanitize to "New York City"
    assert.equal(capturedQuery, 'New York City')

    // Test query with valid apostrophe and hyphen
    await cityService.searchCities("Saint-Jean-d'Angély")

    // Should keep apostrophes and hyphens (note: accented characters are removed)
    assert.equal(capturedQuery, "Saint-Jean-d'Angly")
  })

  /**
   * Test: Cache hit behavior
   * Validates: Requirements 10.1
   */
  test('cache hit returns cached results without calling API', async ({ assert }) => {
    let apiCallCount = 0

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
      searchCities: async () => {
        apiCallCount++
        return mockCities
      },
      getWeatherForecast: async () => {
        throw new Error('Not implemented')
      },
    }

    const mockCacheManager: ICacheManager = {
      get: async <T>(key: string): Promise<T | null> => {
        // Return cached results for "london"
        if (key === 'city:search:london') {
          return mockCities as T
        }
        return null
      },
      set: async () => {},
      delete: async () => {},
      clear: async () => {},
    }

    const cityService = new CityService(mockWeatherClient, mockCacheManager, createMockMetrics())

    // First call - should hit cache
    const result = await cityService.searchCities('London')

    // Should return cached results
    assert.deepEqual(result, mockCities)

    // Should not call API
    assert.equal(apiCallCount, 0)
  })

  /**
   * Test: Result ordering by relevance
   * Validates: Requirements 1.1, 1.2
   */
  test('results are ordered by relevance - exact match first, then by population', async ({
    assert,
  }) => {
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
        name: 'London',
        country: 'Canada',
        countryCode: 'CA',
        latitude: 42.9849,
        longitude: -81.2453,
        timezone: 'America/Toronto',
        population: 400000,
      }),
      new City({
        id: 3,
        name: 'Londonderry',
        country: 'United Kingdom',
        countryCode: 'GB',
        latitude: 54.9966,
        longitude: -7.3086,
        timezone: 'Europe/London',
        population: 100000,
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

    // Search for "London"
    const result = await cityService.searchCities('London')

    // Exact matches should come first (both London cities)
    // Then ordered by population (UK London > Canada London)
    // Non-exact match (Londonderry) should come last
    assert.equal(result[0].name, 'London')
    assert.equal(result[0].country, 'United Kingdom')
    assert.equal(result[1].name, 'London')
    assert.equal(result[1].country, 'Canada')
    assert.equal(result[2].name, 'Londonderry')
  })

  /**
   * Test: Limit parameter restricts results
   * Validates: Requirements 1.1
   */
  test('limit parameter restricts number of results', async ({ assert }) => {
    const mockCities = Array.from(
      { length: 20 },
      (_, i) =>
        new City({
          id: i + 1, // IDs must be non-zero
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

    // Test with limit of 5
    const result = await cityService.searchCities('City', 5)

    assert.equal(result.length, 5)
  })

  /**
   * Test: Cache stores ordered results
   * Validates: Requirements 10.1
   */
  test('cache stores ordered results', async ({ assert }) => {
    let cachedValue: any = null

    const mockCities = [
      new City({
        id: 2,
        name: 'Paris',
        country: 'France',
        countryCode: 'FR',
        latitude: 48.8566,
        longitude: 2.3522,
        timezone: 'Europe/Paris',
        population: 2000000,
      }),
      new City({
        id: 1,
        name: 'Paris',
        country: 'USA',
        countryCode: 'US',
        latitude: 33.6609,
        longitude: -95.5555,
        timezone: 'America/Chicago',
        population: 25000,
      }),
    ]

    const mockWeatherClient: IWeatherClient = {
      searchCities: async () => mockCities,
      getWeatherForecast: async () => {
        throw new Error('Not implemented')
      },
    }

    const mockCacheManager: ICacheManager = {
      get: async <T>(): Promise<T | null> => null,
      set: async (_key: string, value: any) => {
        cachedValue = value
      },
      delete: async () => {},
      clear: async () => {},
    }

    const cityService = new CityService(mockWeatherClient, mockCacheManager, createMockMetrics())

    await cityService.searchCities('Paris')

    // Cache should store ordered results (France before USA due to population)
    assert.isNotNull(cachedValue)
    assert.equal((cachedValue as City[])[0].country, 'France')
    assert.equal((cachedValue as City[])[1].country, 'USA')
  })
})
