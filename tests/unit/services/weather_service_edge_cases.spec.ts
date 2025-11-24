import { test } from '@japa/runner'
import { WeatherService } from '#services/weather_service'
import { IWeatherClient } from '#clients/interfaces/weather_client_interface'
import { ICacheManager } from '#clients/interfaces/cache_manager_interface'
import { WeatherForecast, DailyForecast } from '#models/weather'
import ValidationException from '#exceptions/validation_exception'
import WeatherAPIException from '#exceptions/weather_api_exception'
import { createMockMetrics } from '../helpers/mock_metrics.js'

test.group('WeatherService - Edge Cases', () => {
  test('handles boundary coordinate values correctly', async ({ assert }) => {
    const mockForecast = new WeatherForecast({
      latitude: 90,
      longitude: 180,
      timezone: 'UTC',
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

    await assert.doesNotReject(async () => await weatherService.getWeatherForecast(90, 180, 7))
    await assert.doesNotReject(async () => await weatherService.getWeatherForecast(-90, -180, 7))
    await assert.doesNotReject(async () => await weatherService.getWeatherForecast(0, 0, 7))
  })

  test('rejects coordinates just outside boundaries', async ({ assert }) => {
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

    await assert.rejects(async () => {
      await weatherService.getWeatherForecast(90.0001, 0, 7)
    }, ValidationException as any)
    await assert.rejects(async () => {
      await weatherService.getWeatherForecast(-90.0001, 0, 7)
    }, ValidationException as any)
    await assert.rejects(async () => {
      await weatherService.getWeatherForecast(0, 180.0001, 7)
    }, ValidationException as any)
    await assert.rejects(async () => {
      await weatherService.getWeatherForecast(0, -180.0001, 7)
    }, ValidationException as any)
  })

  test('handles days boundary values correctly', async ({ assert }) => {
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

    await assert.doesNotReject(async () => await weatherService.getWeatherForecast(51.5, -0.1, 1))
    await assert.doesNotReject(async () => await weatherService.getWeatherForecast(51.5, -0.1, 16))
  })

  test('rejects days just outside boundaries', async ({ assert }) => {
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

    await assert.rejects(async () => {
      await weatherService.getWeatherForecast(51.5, -0.1, 0)
    }, ValidationException as any)
    await assert.rejects(async () => {
      await weatherService.getWeatherForecast(51.5, -0.1, 17)
    }, ValidationException as any)
  })

  test('handles Infinity and -Infinity coordinates', async ({ assert }) => {
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

    await assert.rejects(async () => {
      await weatherService.getWeatherForecast(Infinity, 0, 7)
    }, ValidationException as any)
    await assert.rejects(async () => {
      await weatherService.getWeatherForecast(-Infinity, 0, 7)
    }, ValidationException as any)
    await assert.rejects(async () => {
      await weatherService.getWeatherForecast(0, Infinity, 7)
    }, ValidationException as any)
    await assert.rejects(async () => {
      await weatherService.getWeatherForecast(0, -Infinity, 7)
    }, ValidationException as any)
  })

  test('handles very high precision coordinates', async ({ assert }) => {
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

    const result = await weatherService.getWeatherForecast(
      51.507400000000001,
      -0.12780000000000001,
      7
    )

    assert.equal(result.latitude, 51.5074)
    assert.equal(result.longitude, -0.1278)
  })

  test('handles API timeout gracefully', async ({ assert }) => {
    const mockWeatherClient: IWeatherClient = {
      searchCities: async () => [],
      getWeatherForecast: async () => {
        throw WeatherAPIException.timeout('/forecast', 5000)
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

  test('handles network errors gracefully', async ({ assert }) => {
    const mockWeatherClient: IWeatherClient = {
      searchCities: async () => [],
      getWeatherForecast: async () => {
        throw WeatherAPIException.networkError(new Error('Network error'), '/forecast')
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

  test('handles malformed API response gracefully', async ({ assert }) => {
    const mockWeatherClient: IWeatherClient = {
      searchCities: async () => [],
      getWeatherForecast: async () => {
        throw WeatherAPIException.malformedResponse('/forecast', 'Missing daily data')
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

  test('handles cache errors gracefully', async ({ assert }) => {
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
      get: async () => {
        throw new Error('Cache error')
      },
      set: async () => {
        throw new Error('Cache error')
      },
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
    }, Error)
  })

  test('handles string coordinates as invalid', async ({ assert }) => {
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

    await assert.rejects(async () => {
      await weatherService.getWeatherForecast('51.5' as any, -0.1, 7)
    }, ValidationException as any)
    await assert.rejects(async () => {
      await weatherService.getWeatherForecast(51.5, '-0.1' as any, 7)
    }, ValidationException as any)
  })

  test('handles null and undefined coordinates', async ({ assert }) => {
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

    await assert.rejects(async () => {
      await weatherService.getWeatherForecast(null as any, -0.1, 7)
    }, ValidationException as any)
    await assert.rejects(async () => {
      await weatherService.getWeatherForecast(51.5, undefined as any, 7)
    }, ValidationException as any)
  })

  test('handles very large forecast arrays', async ({ assert }) => {
    const dailyForecasts = Array.from(
      { length: 16 },
      (_, i) =>
        new DailyForecast({
          date: new Date(`2024-01-${i + 1}`),
          temperatureMax: 15 + i,
          temperatureMin: 5 + i,
          precipitation: i,
          windSpeed: 10 + i,
          weatherCode: i % 10,
        })
    )

    const mockForecast = new WeatherForecast({
      latitude: 51.5,
      longitude: -0.1,
      timezone: 'Europe/London',
      dailyForecasts,
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

    const result = await weatherService.getWeatherForecast(51.5, -0.1, 16)

    assert.equal(result.dailyForecasts.length, 16)
  })
})
