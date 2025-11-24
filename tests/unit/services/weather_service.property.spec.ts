import { test } from '@japa/runner'
import fc from 'fast-check'
import { WeatherService } from '#services/weather_service'
import { IWeatherClient } from '#clients/interfaces/weather_client_interface'
import { ICacheManager } from '#clients/interfaces/cache_manager_interface'
import { WeatherForecast, DailyForecast } from '#models/weather'
import { createMockMetrics } from '../helpers/mock_metrics.js'

test.group('WeatherService - Property Tests', () => {
  /**
   * Property 3: Weather forecast completeness
   * Validates: Requirements 2.1, 2.4
   *
   * This property test verifies that for any valid coordinates and days parameter,
   * the weather service returns a forecast with the requested number of days,
   * and each daily forecast contains all required fields.
   */
  test('weather forecast completeness - all fields present for requested days', async ({
    assert,
  }) => {
    await fc.assert(
      fc.asyncProperty(
        fc.float({ min: -90, max: 90, noNaN: true }), // Valid latitude
        fc.float({ min: -180, max: 180, noNaN: true }), // Valid longitude
        fc.integer({ min: 1, max: 16 }), // Valid days range
        async (latitude, longitude, days) => {
          // Create mock forecast with the requested number of days
          const dailyForecasts = Array.from(
            { length: days },
            (_, i) =>
              new DailyForecast({
                date: new Date(Date.now() + i * 24 * 60 * 60 * 1000),
                temperatureMax: fc.sample(fc.float({ min: -50, max: 50 }), 1)[0],
                temperatureMin: fc.sample(fc.float({ min: -50, max: 50 }), 1)[0],
                precipitation: fc.sample(fc.float({ min: 0, max: 100 }), 1)[0],
                windSpeed: fc.sample(fc.float({ min: 0, max: 200 }), 1)[0],
                weatherCode: fc.sample(fc.integer({ min: 0, max: 99 }), 1)[0],
              })
          )

          const mockForecast = new WeatherForecast({
            latitude,
            longitude,
            timezone: 'UTC',
            dailyForecasts,
          })

          const mockWeatherClient: IWeatherClient = {
            searchCities: async () => [],
            getWeatherForecast: async () => mockForecast,
          }

          const mockCacheManager: ICacheManager = {
            get: async () => null, // Always miss cache for property testing
            set: async () => {},
            delete: async () => {},
            clear: async () => {},
          }

          const weatherService = new WeatherService(
            mockWeatherClient,
            mockCacheManager,
            createMockMetrics()
          )

          // Act
          const result = await weatherService.getWeatherForecast(latitude, longitude, days)

          // Assert: Forecast has correct number of days
          assert.equal(
            result.dailyForecasts.length,
            days,
            `Expected ${days} daily forecasts, got ${result.dailyForecasts.length}`
          )

          // Assert: Each daily forecast has all required fields
          result.dailyForecasts.forEach((forecast, index) => {
            assert.isDefined(forecast.date, `Daily forecast ${index} missing date`)
            assert.isDefined(
              forecast.temperatureMax,
              `Daily forecast ${index} missing temperatureMax`
            )
            assert.isDefined(
              forecast.temperatureMin,
              `Daily forecast ${index} missing temperatureMin`
            )
            assert.isDefined(
              forecast.precipitation,
              `Daily forecast ${index} missing precipitation`
            )
            assert.isDefined(forecast.windSpeed, `Daily forecast ${index} missing windSpeed`)
            assert.isDefined(forecast.weatherCode, `Daily forecast ${index} missing weatherCode`)

            // Assert: Values are of correct type
            assert.instanceOf(forecast.date, Date)
            assert.isNumber(forecast.temperatureMax)
            assert.isNumber(forecast.temperatureMin)
            assert.isNumber(forecast.precipitation)
            assert.isNumber(forecast.windSpeed)
            assert.isNumber(forecast.weatherCode)

            // Assert: Weather condition can be derived
            const condition = forecast.getWeatherCondition()
            assert.isDefined(condition, `Daily forecast ${index} cannot derive weather condition`)
          })

          // Assert: Forecast metadata is correct
          assert.equal(result.latitude, latitude)
          assert.equal(result.longitude, longitude)
          assert.isDefined(result.timezone)
        }
      ),
      { numRuns: 100 }
    )
  })
})
