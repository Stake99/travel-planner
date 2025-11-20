import { test } from '@japa/runner'
import fc from 'fast-check'
import { ActivityRankingService } from '#services/activity_ranking_service'
import { WeatherService } from '#services/weather_service'
import { IWeatherClient } from '#clients/interfaces/weather_client_interface'
import { ICacheManager } from '#clients/interfaces/cache_manager_interface'
import { WeatherForecast, DailyForecast } from '#models/weather'
import { ActivityType, WeatherCondition } from '#types/enums'
import { createMockMetrics } from '../helpers/mock_metrics.js'

test.group('ActivityRankingService - Property Tests', () => {
  /**
   * Helper function to create a mock WeatherService with a given forecast
   */
  function createMockWeatherService(forecast: WeatherForecast): WeatherService {
    const mockWeatherClient: IWeatherClient = {
      searchCities: async () => [],
      getWeatherForecast: async () => forecast,
    }

    const mockCacheManager: ICacheManager = {
      get: async () => null,
      set: async () => {},
      delete: async () => {},
      clear: async () => {},
    }

    const weatherService = new WeatherService(mockWeatherClient, mockCacheManager, createMockMetrics())
    weatherService.getWeatherForecast = async () => forecast

    return weatherService
  }

  /**
   * Property 4: Skiing ranks highest in snowy conditions
   * Validates: Requirements 3.1
   *
   * This property test verifies that for any weather forecast with snow
   * (weather code indicating snow) and cold temperatures (below 5°C),
   * skiing should be ranked as the highest scored activity.
   */
  test('skiing ranks highest in snowy cold conditions', async ({ assert }) => {
    await fc.assert(
      fc.asyncProperty(
        fc.float({ min: -20, max: 5, noNaN: true }), // Cold temperature
        fc.float({ min: 5, max: 50, noNaN: true }), // Significant precipitation
        fc.integer({ min: 1, max: 7 }), // Number of days
        async (temperature, precipitation, numDays) => {
          // Create forecast with snowy cold conditions
          const dailyForecasts = Array.from({ length: numDays }, (_, i) =>
            new DailyForecast({
              date: new Date(Date.now() + i * 24 * 60 * 60 * 1000),
              temperatureMax: temperature,
              temperatureMin: temperature - 5,
              precipitation,
              windSpeed: fc.sample(fc.float({ min: 0, max: 30 }), 1)[0],
              weatherCode: fc.sample(fc.integer({ min: 71, max: 77 }), 1)[0], // Snow codes
            })
          )

          const forecast = new WeatherForecast({
            latitude: 51.5,
            longitude: -0.1,
            timezone: 'UTC',
            dailyForecasts,
          })

          const weatherService = createMockWeatherService(forecast)
          const activityService = new ActivityRankingService(weatherService, createMockMetrics())

          // Act
          const result = await activityService.rankActivities(51.5, -0.1, numDays)

          // Assert: Skiing should be ranked first
          assert.equal(
            result[0].type,
            ActivityType.SKIING,
            `Expected SKIING to rank first in snowy cold conditions (temp: ${temperature}°C, precip: ${precipitation}mm), but got ${result[0].type}`
          )

          // Assert: Skiing should have a high score
          assert.isAtLeast(
            result[0].score,
            70,
            `Expected skiing score >= 70 in snowy cold conditions, got ${result[0].score}`
          )
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property 5: Warm weather favors outdoor activities
   * Validates: Requirements 3.2
   *
   * This property test verifies that for any weather forecast with warm temperatures
   * (above 20°C) and low precipitation (below 2mm), both surfing and outdoor sightseeing
   * should score higher than indoor sightseeing.
   */
  test('warm weather favors outdoor activities', async ({ assert }) => {
    await fc.assert(
      fc.asyncProperty(
        fc.float({ min: 20, max: 35, noNaN: true }), // Warm temperature
        fc.float({ min: 0, max: 2, noNaN: true }), // Low precipitation
        fc.integer({ min: 1, max: 7 }), // Number of days
        async (temperature, precipitation, numDays) => {
          // Create forecast with warm dry conditions
          const dailyForecasts = Array.from({ length: numDays }, (_, i) =>
            new DailyForecast({
              date: new Date(Date.now() + i * 24 * 60 * 60 * 1000),
              temperatureMax: temperature,
              temperatureMin: temperature - 5,
              precipitation,
              windSpeed: fc.sample(fc.float({ min: 0, max: 25 }), 1)[0],
              weatherCode: fc.sample(fc.integer({ min: 0, max: 3 }), 1)[0], // Clear/partly cloudy
            })
          )

          const forecast = new WeatherForecast({
            latitude: 51.5,
            longitude: -0.1,
            timezone: 'UTC',
            dailyForecasts,
          })

          const weatherService = createMockWeatherService(forecast)
          const activityService = new ActivityRankingService(weatherService, createMockMetrics())

          // Act
          const result = await activityService.rankActivities(51.5, -0.1, numDays)

          // Find activities
          const surfing = result.find((a) => a.type === ActivityType.SURFING)
          const outdoorSightseeing = result.find(
            (a) => a.type === ActivityType.OUTDOOR_SIGHTSEEING
          )
          const indoorSightseeing = result.find(
            (a) => a.type === ActivityType.INDOOR_SIGHTSEEING
          )

          assert.isDefined(surfing, 'Surfing activity not found')
          assert.isDefined(outdoorSightseeing, 'Outdoor sightseeing activity not found')
          assert.isDefined(indoorSightseeing, 'Indoor sightseeing activity not found')

          // Assert: Surfing should score higher than or equal to indoor sightseeing
          assert.isAtLeast(
            surfing!.score,
            indoorSightseeing!.score,
            `Expected surfing (${surfing!.score}) >= indoor (${indoorSightseeing!.score}) in warm dry weather (temp: ${temperature}°C, precip: ${precipitation}mm)`
          )

          // Assert: Outdoor sightseeing should score higher than or equal to indoor sightseeing
          assert.isAtLeast(
            outdoorSightseeing!.score,
            indoorSightseeing!.score,
            `Expected outdoor (${outdoorSightseeing!.score}) >= indoor (${indoorSightseeing!.score}) in warm dry weather (temp: ${temperature}°C, precip: ${precipitation}mm)`
          )
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property 6: Rain favors indoor activities
   * Validates: Requirements 3.3
   *
   * This property test verifies that for any weather forecast with significant
   * precipitation (above 5mm) or rainy weather codes, indoor sightseeing should
   * score higher than all outdoor activities.
   */
  test('rain favors indoor activities', async ({ assert }) => {
    await fc.assert(
      fc.asyncProperty(
        fc.float({ min: 6, max: 50, noNaN: true }), // Significant precipitation (> 5mm)
        fc.float({ min: 6, max: 30, noNaN: true }), // Temperature range (avoid skiing bonus)
        fc.integer({ min: 1, max: 7 }), // Number of days
        async (precipitation, temperature, numDays) => {
          // Create forecast with rainy conditions
          const dailyForecasts = Array.from({ length: numDays }, (_, i) =>
            new DailyForecast({
              date: new Date(Date.now() + i * 24 * 60 * 60 * 1000),
              temperatureMax: temperature,
              temperatureMin: temperature - 5,
              precipitation,
              windSpeed: fc.sample(fc.float({ min: 10, max: 40 }), 1)[0],
              weatherCode: fc.sample(fc.integer({ min: 51, max: 67 }), 1)[0], // Rain codes
            })
          )

          const forecast = new WeatherForecast({
            latitude: 51.5,
            longitude: -0.1,
            timezone: 'UTC',
            dailyForecasts,
          })

          const weatherService = createMockWeatherService(forecast)
          const activityService = new ActivityRankingService(weatherService, createMockMetrics())

          // Act
          const result = await activityService.rankActivities(51.5, -0.1, numDays)

          // Find activities
          const indoorSightseeing = result.find(
            (a) => a.type === ActivityType.INDOOR_SIGHTSEEING
          )
          const skiing = result.find((a) => a.type === ActivityType.SKIING)
          const surfing = result.find((a) => a.type === ActivityType.SURFING)
          const outdoorSightseeing = result.find(
            (a) => a.type === ActivityType.OUTDOOR_SIGHTSEEING
          )

          assert.isDefined(indoorSightseeing, 'Indoor sightseeing activity not found')
          assert.isDefined(skiing, 'Skiing activity not found')
          assert.isDefined(surfing, 'Surfing activity not found')
          assert.isDefined(outdoorSightseeing, 'Outdoor sightseeing activity not found')

          // Assert: Indoor sightseeing should score higher than all outdoor activities
          assert.isAbove(
            indoorSightseeing!.score,
            skiing!.score,
            `Expected indoor (${indoorSightseeing!.score}) > skiing (${skiing!.score}) in rainy weather (precip: ${precipitation}mm)`
          )

          assert.isAbove(
            indoorSightseeing!.score,
            surfing!.score,
            `Expected indoor (${indoorSightseeing!.score}) > surfing (${surfing!.score}) in rainy weather (precip: ${precipitation}mm)`
          )

          assert.isAbove(
            indoorSightseeing!.score,
            outdoorSightseeing!.score,
            `Expected indoor (${indoorSightseeing!.score}) > outdoor (${outdoorSightseeing!.score}) in rainy weather (precip: ${precipitation}mm)`
          )
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property 7: Activity ranking determinism
   * Validates: Requirements 3.5
   *
   * This property test verifies that for any weather forecast data,
   * running the activity ranking algorithm multiple times produces
   * identical scores and ordering.
   */
  test('activity ranking is deterministic', async ({ assert }) => {
    await fc.assert(
      fc.asyncProperty(
        fc.float({ min: -90, max: 90, noNaN: true }), // Latitude
        fc.float({ min: -180, max: 180, noNaN: true }), // Longitude
        fc.integer({ min: 1, max: 7 }), // Number of days
        async (latitude, longitude, numDays) => {
          // Create forecast with random conditions
          const dailyForecasts = Array.from({ length: numDays }, (_, i) =>
            new DailyForecast({
              date: new Date(Date.now() + i * 24 * 60 * 60 * 1000),
              temperatureMax: fc.sample(fc.float({ min: -20, max: 40 }), 1)[0],
              temperatureMin: fc.sample(fc.float({ min: -30, max: 30 }), 1)[0],
              precipitation: fc.sample(fc.float({ min: 0, max: 50 }), 1)[0],
              windSpeed: fc.sample(fc.float({ min: 0, max: 100 }), 1)[0],
              weatherCode: fc.sample(fc.integer({ min: 0, max: 99 }), 1)[0],
            })
          )

          const forecast = new WeatherForecast({
            latitude,
            longitude,
            timezone: 'UTC',
            dailyForecasts,
          })

          const weatherService = createMockWeatherService(forecast)
          const activityService = new ActivityRankingService(weatherService, createMockMetrics())

          // Act: Run ranking multiple times
          const result1 = await activityService.rankActivities(latitude, longitude, numDays)
          const result2 = await activityService.rankActivities(latitude, longitude, numDays)
          const result3 = await activityService.rankActivities(latitude, longitude, numDays)

          // Assert: All results should be identical
          assert.equal(result1.length, result2.length, 'Result lengths should match')
          assert.equal(result2.length, result3.length, 'Result lengths should match')

          for (let i = 0; i < result1.length; i++) {
            // Check activity type
            assert.equal(
              result1[i].type,
              result2[i].type,
              `Activity type at position ${i} should match between runs 1 and 2`
            )
            assert.equal(
              result2[i].type,
              result3[i].type,
              `Activity type at position ${i} should match between runs 2 and 3`
            )

            // Check score
            assert.equal(
              result1[i].score,
              result2[i].score,
              `Score for ${result1[i].type} should match between runs 1 and 2`
            )
            assert.equal(
              result2[i].score,
              result3[i].score,
              `Score for ${result2[i].type} should match between runs 2 and 3`
            )

            // Check suitability
            assert.equal(
              result1[i].suitability,
              result2[i].suitability,
              `Suitability for ${result1[i].type} should match between runs 1 and 2`
            )
            assert.equal(
              result2[i].suitability,
              result3[i].suitability,
              `Suitability for ${result2[i].type} should match between runs 2 and 3`
            )

            // Check reason
            assert.equal(
              result1[i].reason,
              result2[i].reason,
              `Reason for ${result1[i].type} should match between runs 1 and 2`
            )
            assert.equal(
              result2[i].reason,
              result3[i].reason,
              `Reason for ${result2[i].type} should match between runs 2 and 3`
            )
          }
        }
      ),
      { numRuns: 100 }
    )
  })
})
