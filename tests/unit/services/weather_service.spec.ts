import { test } from '@japa/runner'
import { WeatherService } from '#services/weather_service'
import { IWeatherClient } from '#clients/interfaces/weather_client_interface'
import { ICacheManager } from '#clients/interfaces/cache_manager_interface'
import { WeatherForecast, DailyForecast } from '#models/weather'
import ValidationException from '#exceptions/validation_exception'
import WeatherAPIException from '#exceptions/weather_api_exception'
import { createMockMetrics } from '../helpers/mock_metrics.js'

test.group('WeatherService - Unit Tests', () => {
  /**
   * Test: Invalid latitude throws ValidationException
   * Validates: Requirements 2.1, 2.2
   */
  test('invalid latitude throws ValidationException', async ({ assert }) => {
    const mockWeatherClient: IWeatherClient = {
      searchCities: async () => [],
      getWeatherForecast: async () => {
        throw new Error('Should not be called')
      },
    }

    const mockCacheManager: ICacheManager = {
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

    // Test latitude > 90
    await assert.rejects(async () => {
      await weatherService.getWeatherForecast(91, 0, 7)
    }, ValidationException as any)

    // Test latitude < -90
    await assert.rejects(async () => {
      await weatherService.getWeatherForecast(-91, 0, 7)
    }, ValidationException as any)

    // Test NaN latitude
    await assert.rejects(async () => {
      await weatherService.getWeatherForecast(Number.NaN, 0, 7)
    }, ValidationException as any)
  })

  /**
   * Test: Invalid longitude throws ValidationException
   * Validates: Requirements 2.1, 2.2
   */
  test('invalid longitude throws ValidationException', async ({ assert }) => {
    const mockWeatherClient: IWeatherClient = {
      searchCities: async () => [],
      getWeatherForecast: async () => {
        throw new Error('Should not be called')
      },
    }

    const mockCacheManager: ICacheManager = {
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

    // Test longitude > 180
    await assert.rejects(async () => {
      await weatherService.getWeatherForecast(0, 181, 7)
    }, ValidationException as any)

    // Test longitude < -180
    await assert.rejects(async () => {
      await weatherService.getWeatherForecast(0, -181, 7)
    }, ValidationException as any)

    // Test NaN longitude
    await assert.rejects(async () => {
      await weatherService.getWeatherForecast(0, Number.NaN, 7)
    }, ValidationException as any)
  })

  /**
   * Test: Invalid days parameter throws ValidationException
   * Validates: Requirements 2.1
   */
  test('invalid days parameter throws ValidationException', async ({ assert }) => {
    const mockWeatherClient: IWeatherClient = {
      searchCities: async () => [],
      getWeatherForecast: async () => {
        throw new Error('Should not be called')
      },
    }

    const mockCacheManager: ICacheManager = {
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

    // Test days < 1
    await assert.rejects(async () => {
      await weatherService.getWeatherForecast(51.5, -0.1, 0)
    }, ValidationException as any)

    // Test days > 16
    await assert.rejects(async () => {
      await weatherService.getWeatherForecast(51.5, -0.1, 17)
    }, ValidationException as any)
  })

  /**
   * Test: Valid coordinates are accepted
   * Validates: Requirements 2.1
   */
  test('valid coordinates are accepted', async ({ assert }) => {
    const mockForecast = new WeatherForecast({
      latitude: 51.5,
      longitude: -0.1,
      timezone: 'Europe/London',
      dailyForecasts: [
        new DailyForecast({
          date: new Date('2024-01-01'),
          temperatureMax: 15,
          temperatureMin: 5,
          precipitation: 0,
          windSpeed: 10,
          weatherCode: 0,
        }),
      ],
    })

    const mockWeatherClient: IWeatherClient = {
      searchCities: async () => [],
      getWeatherForecast: async () => mockForecast,
    }

    const mockCacheManager: ICacheManager = {
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

    // Test boundary values
    await assert.doesNotReject(async () => await weatherService.getWeatherForecast(90, 180, 7))
    await assert.doesNotReject(async () => await weatherService.getWeatherForecast(-90, -180, 7))
    await assert.doesNotReject(async () => await weatherService.getWeatherForecast(0, 0, 1))
    await assert.doesNotReject(async () => await weatherService.getWeatherForecast(0, 0, 16))
  })

  /**
   * Test: Cache hit returns cached forecast without calling API
   * Validates: Requirements 10.2
   */
  test('cache hit returns cached forecast without calling API', async ({ assert }) => {
    let apiCallCount = 0

    const mockForecast = new WeatherForecast({
      latitude: 51.5,
      longitude: -0.1,
      timezone: 'Europe/London',
      dailyForecasts: [
        new DailyForecast({
          date: new Date('2024-01-01'),
          temperatureMax: 15,
          temperatureMin: 5,
          precipitation: 0,
          windSpeed: 10,
          weatherCode: 0,
        }),
      ],
    })

    const mockWeatherClient: IWeatherClient = {
      searchCities: async () => [],
      getWeatherForecast: async () => {
        apiCallCount++
        return mockForecast
      },
    }

    const mockCacheManager: ICacheManager = {
      get: async <T>(key: string): Promise<T | null> => {
        // Return cached forecast for specific coordinates
        if (key === 'weather:51.5000:-0.1000:7') {
          return mockForecast as T
        }
        return null
      },
      set: async () => {},
      delete: async () => {},
      clear: async () => {},
    }

    const weatherService = new WeatherService(
      mockWeatherClient,
      mockCacheManager,
      createMockMetrics()
    )

    // Call with coordinates that should hit cache
    const result = await weatherService.getWeatherForecast(51.5, -0.1, 7)

    // Should return cached forecast
    assert.deepEqual(result, mockForecast)

    // Should not call API
    assert.equal(apiCallCount, 0)
  })

  /**
   * Test: Cache miss calls API and caches result
   * Validates: Requirements 10.2
   */
  test('cache miss calls API and caches result', async ({ assert }) => {
    let cachedKey: string | null = null
    let cachedValue: any = null
    let cachedTTL: number | null = null

    const mockForecast = new WeatherForecast({
      latitude: 51.5,
      longitude: -0.1,
      timezone: 'Europe/London',
      dailyForecasts: [
        new DailyForecast({
          date: new Date('2024-01-01'),
          temperatureMax: 15,
          temperatureMin: 5,
          precipitation: 0,
          windSpeed: 10,
          weatherCode: 0,
        }),
      ],
    })

    const mockWeatherClient: IWeatherClient = {
      searchCities: async () => [],
      getWeatherForecast: async () => mockForecast,
    }

    const mockCacheManager: ICacheManager = {
      get: async () => null, // Cache miss
      set: async (key: string, value: any, ttl: number) => {
        cachedKey = key
        cachedValue = value
        cachedTTL = ttl
      },
      delete: async () => {},
      clear: async () => {},
    }

    const weatherService = new WeatherService(
      mockWeatherClient,
      mockCacheManager,
      createMockMetrics()
    )

    const result = await weatherService.getWeatherForecast(51.5, -0.1, 7)

    // Should return forecast from API
    assert.deepEqual(result, mockForecast)

    // Should cache the result
    assert.equal(cachedKey, 'weather:51.5000:-0.1000:7')
    assert.deepEqual(cachedValue, mockForecast)
    assert.equal(cachedTTL, 1800) // 30 minutes
  })

  /**
   * Test: API error is wrapped in WeatherAPIException
   * Validates: Requirements 2.3
   */
  test('API error is wrapped in WeatherAPIException', async ({ assert }) => {
    const mockWeatherClient: IWeatherClient = {
      searchCities: async () => [],
      getWeatherForecast: async () => {
        throw new Error('Network error')
      },
    }

    const mockCacheManager: ICacheManager = {
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

    await assert.rejects(async () => {
      await weatherService.getWeatherForecast(51.5, -0.1, 7)
    }, WeatherAPIException as any)
  })

  /**
   * Test: WeatherAPIException is re-thrown
   * Validates: Requirements 2.3
   */
  test('WeatherAPIException from client is re-thrown', async ({ assert }) => {
    const originalException = new WeatherAPIException('OpenMeteo API unavailable')

    const mockWeatherClient: IWeatherClient = {
      searchCities: async () => [],
      getWeatherForecast: async () => {
        throw originalException
      },
    }

    const mockCacheManager: ICacheManager = {
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

    try {
      await weatherService.getWeatherForecast(51.5, -0.1, 7)
      assert.fail('Should have thrown WeatherAPIException')
    } catch (error) {
      assert.instanceOf(error, WeatherAPIException as any)
      assert.equal(error, originalException)
    }
  })

  /**
   * Test: Cache key generation is consistent
   * Validates: Requirements 10.2
   */
  test('cache key generation is consistent for same coordinates', async ({ assert }) => {
    const capturedKeys: string[] = []

    const mockForecast = new WeatherForecast({
      latitude: 51.5074,
      longitude: -0.1278,
      timezone: 'Europe/London',
      dailyForecasts: [
        new DailyForecast({
          date: new Date('2024-01-01'),
          temperatureMax: 15,
          temperatureMin: 5,
          precipitation: 0,
          windSpeed: 10,
          weatherCode: 0,
        }),
      ],
    })

    const mockWeatherClient: IWeatherClient = {
      searchCities: async () => [],
      getWeatherForecast: async () => mockForecast,
    }

    const mockCacheManager: ICacheManager = {
      get: async (key: string) => {
        capturedKeys.push(key)
        return null
      },
      set: async () => {},
      delete: async () => {},
      clear: async () => {},
    }

    const weatherService = new WeatherService(
      mockWeatherClient,
      mockCacheManager,
      createMockMetrics()
    )

    // Call with slightly different precision (should round to same key)
    await weatherService.getWeatherForecast(51.50740001, -0.12780001, 7)
    await weatherService.getWeatherForecast(51.50739999, -0.12779999, 7)

    // Both should generate the same cache key
    assert.equal(capturedKeys[0], capturedKeys[1])
    assert.equal(capturedKeys[0], 'weather:51.5074:-0.1278:7')
  })

  /**
   * Test: Different days parameter generates different cache keys
   * Validates: Requirements 10.2
   */
  test('different days parameter generates different cache keys', async ({ assert }) => {
    const capturedKeys: string[] = []

    const mockForecast = new WeatherForecast({
      latitude: 51.5,
      longitude: -0.1,
      timezone: 'Europe/London',
      dailyForecasts: [
        new DailyForecast({
          date: new Date('2024-01-01'),
          temperatureMax: 15,
          temperatureMin: 5,
          precipitation: 0,
          windSpeed: 10,
          weatherCode: 0,
        }),
      ],
    })

    const mockWeatherClient: IWeatherClient = {
      searchCities: async () => [],
      getWeatherForecast: async () => mockForecast,
    }

    const mockCacheManager: ICacheManager = {
      get: async (key: string) => {
        capturedKeys.push(key)
        return null
      },
      set: async () => {},
      delete: async () => {},
      clear: async () => {},
    }

    const weatherService = new WeatherService(
      mockWeatherClient,
      mockCacheManager,
      createMockMetrics()
    )

    await weatherService.getWeatherForecast(51.5, -0.1, 7)
    await weatherService.getWeatherForecast(51.5, -0.1, 14)

    // Should generate different cache keys
    assert.notEqual(capturedKeys[0], capturedKeys[1])
    assert.equal(capturedKeys[0], 'weather:51.5000:-0.1000:7')
    assert.equal(capturedKeys[1], 'weather:51.5000:-0.1000:14')
  })
})
