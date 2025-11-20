import { test } from '@japa/runner'
import { ActivityRankingService } from '#services/activity_ranking_service'
import { WeatherService } from '#services/weather_service'
import { IWeatherClient } from '#clients/interfaces/weather_client_interface'
import { ICacheManager } from '#clients/interfaces/cache_manager_interface'
import { WeatherForecast, DailyForecast } from '#models/weather'
import { ActivityType } from '#types/enums'
import { createMockMetrics } from '../helpers/mock_metrics.js'

test.group('ActivityRankingService - Unit Tests', () => {
  /**
   * Helper function to create a mock WeatherService
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

    // Override getWeatherForecast to return our mock forecast
    const weatherService = new WeatherService(mockWeatherClient, mockCacheManager, createMockMetrics())
    weatherService.getWeatherForecast = async () => forecast

    return weatherService
  }

  /**
   * Test: Skiing ranks highest for snowy cold weather
   * Validates: Requirements 3.1
   */
  test('skiing ranks highest for snowy cold weather', async ({ assert }) => {
    // Create forecast with ideal skiing conditions
    const snowyForecast = new WeatherForecast({
      latitude: 51.5,
      longitude: -0.1,
      timezone: 'Europe/London',
      dailyForecasts: [
        new DailyForecast({
          date: new Date('2024-01-01'),
          temperatureMax: -5, // Cold
          temperatureMin: -10,
          precipitation: 10, // Snow
          windSpeed: 10,
          weatherCode: 75, // Snow
        }),
        new DailyForecast({
          date: new Date('2024-01-02'),
          temperatureMax: 0, // Cold
          temperatureMin: -5,
          precipitation: 8, // Snow
          windSpeed: 12,
          weatherCode: 73, // Snow
        }),
      ],
    })

    const weatherService = createMockWeatherService(snowyForecast)
    const activityService = new ActivityRankingService(weatherService, createMockMetrics())

    const result = await activityService.rankActivities(51.5, -0.1, 2)

    // Skiing should be ranked first
    assert.equal(result[0].type, ActivityType.SKIING)

    // Skiing should have a high score (>= 80)
    assert.isAtLeast(result[0].score, 80)
  })

  /**
   * Test: Indoor sightseeing ranks highest for rainy weather
   * Validates: Requirements 3.3
   */
  test('indoor sightseeing ranks highest for rainy weather', async ({ assert }) => {
    // Create forecast with rainy conditions
    const rainyForecast = new WeatherForecast({
      latitude: 51.5,
      longitude: -0.1,
      timezone: 'Europe/London',
      dailyForecasts: [
        new DailyForecast({
          date: new Date('2024-01-01'),
          temperatureMax: 15,
          temperatureMin: 10,
          precipitation: 15, // Heavy rain
          windSpeed: 20,
          weatherCode: 61, // Rain
        }),
        new DailyForecast({
          date: new Date('2024-01-02'),
          temperatureMax: 12,
          temperatureMin: 8,
          precipitation: 20, // Heavy rain
          windSpeed: 25,
          weatherCode: 63, // Rain
        }),
      ],
    })

    const weatherService = createMockWeatherService(rainyForecast)
    const activityService = new ActivityRankingService(weatherService, createMockMetrics())

    const result = await activityService.rankActivities(51.5, -0.1, 2)

    // Indoor sightseeing should be ranked first
    assert.equal(result[0].type, ActivityType.INDOOR_SIGHTSEEING)
  })

  /**
   * Test: Surfing ranks high for warm dry weather
   * Validates: Requirements 3.2
   */
  test('surfing ranks high for warm dry weather', async ({ assert }) => {
    // Create forecast with ideal surfing conditions
    const warmForecast = new WeatherForecast({
      latitude: 51.5,
      longitude: -0.1,
      timezone: 'Europe/London',
      dailyForecasts: [
        new DailyForecast({
          date: new Date('2024-01-01'),
          temperatureMax: 25, // Warm
          temperatureMin: 20,
          precipitation: 0, // Dry
          windSpeed: 15, // Good for waves
          weatherCode: 0, // Clear
        }),
        new DailyForecast({
          date: new Date('2024-01-02'),
          temperatureMax: 27, // Warm
          temperatureMin: 22,
          precipitation: 0, // Dry
          windSpeed: 12, // Good for waves
          weatherCode: 1, // Clear
        }),
      ],
    })

    const weatherService = createMockWeatherService(warmForecast)
    const activityService = new ActivityRankingService(weatherService, createMockMetrics())

    const result = await activityService.rankActivities(51.5, -0.1, 2)

    // Find surfing in results
    const surfing = result.find((a) => a.type === ActivityType.SURFING)
    assert.isDefined(surfing)

    // Surfing should have a high score
    assert.isAtLeast(surfing!.score, 70)
  })

  /**
   * Test: Consistent ordering for same input (determinism)
   * Validates: Requirements 3.5
   */
  test('consistent ordering for same input', async ({ assert }) => {
    const forecast = new WeatherForecast({
      latitude: 51.5,
      longitude: -0.1,
      timezone: 'Europe/London',
      dailyForecasts: [
        new DailyForecast({
          date: new Date('2024-01-01'),
          temperatureMax: 20,
          temperatureMin: 15,
          precipitation: 2,
          windSpeed: 10,
          weatherCode: 2, // Partly cloudy
        }),
      ],
    })

    const weatherService = createMockWeatherService(forecast)
    const activityService = new ActivityRankingService(weatherService, createMockMetrics())

    // Call multiple times with same input
    const result1 = await activityService.rankActivities(51.5, -0.1, 1)
    const result2 = await activityService.rankActivities(51.5, -0.1, 1)
    const result3 = await activityService.rankActivities(51.5, -0.1, 1)

    // Results should be identical
    assert.deepEqual(result1, result2)
    assert.deepEqual(result2, result3)

    // Verify ordering is consistent
    for (let i = 0; i < result1.length; i++) {
      assert.equal(result1[i].type, result2[i].type)
      assert.equal(result1[i].score, result2[i].score)
      assert.equal(result1[i].suitability, result2[i].suitability)
    }
  })

  /**
   * Test: All four activities are returned
   * Validates: Requirements 3.4
   */
  test('all four activities are returned', async ({ assert }) => {
    const forecast = new WeatherForecast({
      latitude: 51.5,
      longitude: -0.1,
      timezone: 'Europe/London',
      dailyForecasts: [
        new DailyForecast({
          date: new Date('2024-01-01'),
          temperatureMax: 20,
          temperatureMin: 15,
          precipitation: 0,
          windSpeed: 10,
          weatherCode: 0,
        }),
      ],
    })

    const weatherService = createMockWeatherService(forecast)
    const activityService = new ActivityRankingService(weatherService, createMockMetrics())

    const result = await activityService.rankActivities(51.5, -0.1, 1)

    // Should return exactly 4 activities
    assert.equal(result.length, 4)

    // Should contain all activity types
    const types = result.map((a) => a.type)
    assert.include(types, ActivityType.SKIING)
    assert.include(types, ActivityType.SURFING)
    assert.include(types, ActivityType.INDOOR_SIGHTSEEING)
    assert.include(types, ActivityType.OUTDOOR_SIGHTSEEING)
  })

  /**
   * Test: Activities are sorted by score descending
   * Validates: Requirements 3.4
   */
  test('activities are sorted by score descending', async ({ assert }) => {
    const forecast = new WeatherForecast({
      latitude: 51.5,
      longitude: -0.1,
      timezone: 'Europe/London',
      dailyForecasts: [
        new DailyForecast({
          date: new Date('2024-01-01'),
          temperatureMax: 20,
          temperatureMin: 15,
          precipitation: 0,
          windSpeed: 10,
          weatherCode: 0,
        }),
      ],
    })

    const weatherService = createMockWeatherService(forecast)
    const activityService = new ActivityRankingService(weatherService, createMockMetrics())

    const result = await activityService.rankActivities(51.5, -0.1, 1)

    // Verify descending order
    for (let i = 0; i < result.length - 1; i++) {
      assert.isAtLeast(result[i].score, result[i + 1].score)
    }
  })

  /**
   * Test: Outdoor sightseeing ranks high for ideal temperature
   * Validates: Requirements 3.2
   */
  test('outdoor sightseeing ranks high for ideal temperature', async ({ assert }) => {
    const idealForecast = new WeatherForecast({
      latitude: 51.5,
      longitude: -0.1,
      timezone: 'Europe/London',
      dailyForecasts: [
        new DailyForecast({
          date: new Date('2024-01-01'),
          temperatureMax: 22, // Ideal range (15-25)
          temperatureMin: 18,
          precipitation: 0, // No rain
          windSpeed: 8, // Calm
          weatherCode: 0, // Clear
        }),
        new DailyForecast({
          date: new Date('2024-01-02'),
          temperatureMax: 20, // Ideal range
          temperatureMin: 16,
          precipitation: 0,
          windSpeed: 10,
          weatherCode: 1, // Clear
        }),
      ],
    })

    const weatherService = createMockWeatherService(idealForecast)
    const activityService = new ActivityRankingService(weatherService, createMockMetrics())

    const result = await activityService.rankActivities(51.5, -0.1, 2)

    // Find outdoor sightseeing
    const outdoor = result.find((a) => a.type === ActivityType.OUTDOOR_SIGHTSEEING)
    assert.isDefined(outdoor)

    // Should have a high score
    assert.isAtLeast(outdoor!.score, 80)
  })

  /**
   * Test: Multi-day forecast aggregates scores correctly
   * Validates: Requirements 3.4
   */
  test('multi-day forecast aggregates scores correctly', async ({ assert }) => {
    // Create forecast with varying conditions
    const mixedForecast = new WeatherForecast({
      latitude: 51.5,
      longitude: -0.1,
      timezone: 'Europe/London',
      dailyForecasts: [
        // Day 1: Perfect skiing
        new DailyForecast({
          date: new Date('2024-01-01'),
          temperatureMax: -5,
          temperatureMin: -10,
          precipitation: 10,
          windSpeed: 10,
          weatherCode: 75, // Snow
        }),
        // Day 2: Warm and sunny
        new DailyForecast({
          date: new Date('2024-01-02'),
          temperatureMax: 25,
          temperatureMin: 20,
          precipitation: 0,
          windSpeed: 5,
          weatherCode: 0, // Clear
        }),
      ],
    })

    const weatherService = createMockWeatherService(mixedForecast)
    const activityService = new ActivityRankingService(weatherService, createMockMetrics())

    const result = await activityService.rankActivities(51.5, -0.1, 2)

    // All activities should have scores (aggregated from both days)
    result.forEach((activity) => {
      assert.isAtLeast(activity.score, 0)
      assert.isAtMost(activity.score, 100)
    })

    // Scores should be averaged, not summed
    // (No activity should have perfect 100 since conditions vary)
    const hasVariedScores = result.some((a) => a.score < 100)
    assert.isTrue(hasVariedScores)
  })

  /**
   * Test: Each activity has a reason
   * Validates: Requirements 3.4
   */
  test('each activity has a reason', async ({ assert }) => {
    const forecast = new WeatherForecast({
      latitude: 51.5,
      longitude: -0.1,
      timezone: 'Europe/London',
      dailyForecasts: [
        new DailyForecast({
          date: new Date('2024-01-01'),
          temperatureMax: 20,
          temperatureMin: 15,
          precipitation: 0,
          windSpeed: 10,
          weatherCode: 0,
        }),
      ],
    })

    const weatherService = createMockWeatherService(forecast)
    const activityService = new ActivityRankingService(weatherService, createMockMetrics())

    const result = await activityService.rankActivities(51.5, -0.1, 1)

    // Each activity should have a non-empty reason
    result.forEach((activity) => {
      assert.isString(activity.reason)
      assert.isAtLeast(activity.reason.length, 10)
    })
  })

  /**
   * Test: Tie-breaking is deterministic by enum order
   * Validates: Requirements 3.5
   */
  test('tie-breaking is deterministic by enum order', async ({ assert }) => {
    // Create conditions that might produce similar scores
    const neutralForecast = new WeatherForecast({
      latitude: 51.5,
      longitude: -0.1,
      timezone: 'Europe/London',
      dailyForecasts: [
        new DailyForecast({
          date: new Date('2024-01-01'),
          temperatureMax: 10, // Neutral temperature
          temperatureMin: 5,
          precipitation: 3, // Moderate precipitation
          windSpeed: 15,
          weatherCode: 3, // Cloudy
        }),
      ],
    })

    const weatherService = createMockWeatherService(neutralForecast)
    const activityService = new ActivityRankingService(weatherService, createMockMetrics())

    const result = await activityService.rankActivities(51.5, -0.1, 1)

    // If there are ties, they should be ordered by enum order
    // SKIING, SURFING, INDOOR_SIGHTSEEING, OUTDOOR_SIGHTSEEING
    for (let i = 0; i < result.length - 1; i++) {
      if (result[i].score === result[i + 1].score) {
        const currentIndex = Object.values(ActivityType).indexOf(result[i].type)
        const nextIndex = Object.values(ActivityType).indexOf(result[i + 1].type)
        assert.isBelow(currentIndex, nextIndex, 'Tied activities should be ordered by enum order')
      }
    }
  })
})
