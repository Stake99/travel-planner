import { test } from '@japa/runner'
import { ActivityRankingService } from '#services/activity_ranking_service'
import { WeatherService } from '#services/weather_service'
import { IWeatherClient } from '#clients/interfaces/weather_client_interface'
import { ICacheManager } from '#clients/interfaces/cache_manager_interface'
import { WeatherForecast, DailyForecast } from '#models/weather'
import { ActivityType } from '#types/enums'
import { createMockMetrics } from '../helpers/mock_metrics.js'

test.group('ActivityRankingService - Edge Cases', () => {
  test('handles extreme cold weather conditions', async ({ assert }) => {
    const extremeColdForecast = new WeatherForecast({
      latitude: 70,
      longitude: 0,
      timezone: 'UTC',
      dailyForecasts: Array.from(
        { length: 7 },
        () =>
          new DailyForecast({
            date: new Date('2024-01-01'),
            temperatureMax: -20,
            temperatureMin: -30,
            precipitation: 10,
            windSpeed: 5,
            weatherCode: 71,
          })
      ),
    })

    const mockWeatherClient: IWeatherClient = {
      searchCities: async () => [],
      getWeatherForecast: async () => extremeColdForecast,
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
    const activityRankingService = new ActivityRankingService(weatherService, createMockMetrics())

    const activities = await activityRankingService.rankActivities(70, 0, 7)

    const skiingActivity = activities.find((a) => a.type === ActivityType.SKIING)
    assert.isDefined(skiingActivity)
    assert.isTrue(skiingActivity!.score >= 70)
  })

  test('handles extreme hot weather conditions', async ({ assert }) => {
    const extremeHotForecast = new WeatherForecast({
      latitude: 25,
      longitude: 0,
      timezone: 'UTC',
      dailyForecasts: Array.from(
        { length: 7 },
        () =>
          new DailyForecast({
            date: new Date('2024-07-01'),
            temperatureMax: 45,
            temperatureMin: 35,
            precipitation: 0,
            windSpeed: 5,
            weatherCode: 0,
          })
      ),
    })

    const mockWeatherClient: IWeatherClient = {
      searchCities: async () => [],
      getWeatherForecast: async () => extremeHotForecast,
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
    const activityRankingService = new ActivityRankingService(weatherService, createMockMetrics())

    const activities = await activityRankingService.rankActivities(25, 0, 7)

    const indoorActivity = activities.find((a) => a.type === ActivityType.INDOOR_SIGHTSEEING)
    assert.isDefined(indoorActivity)
    assert.isTrue(indoorActivity!.score >= 70)
  })

  test('handles stormy weather conditions', async ({ assert }) => {
    const stormyForecast = new WeatherForecast({
      latitude: 40,
      longitude: 0,
      timezone: 'UTC',
      dailyForecasts: Array.from(
        { length: 7 },
        () =>
          new DailyForecast({
            date: new Date('2024-01-01'),
            temperatureMax: 15,
            temperatureMin: 10,
            precipitation: 20,
            windSpeed: 50,
            weatherCode: 95,
          })
      ),
    })

    const mockWeatherClient: IWeatherClient = {
      searchCities: async () => [],
      getWeatherForecast: async () => stormyForecast,
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
    const activityRankingService = new ActivityRankingService(weatherService, createMockMetrics())

    const activities = await activityRankingService.rankActivities(40, 0, 7)

    const indoorActivity = activities.find((a) => a.type === ActivityType.INDOOR_SIGHTSEEING)
    const outdoorActivity = activities.find((a) => a.type === ActivityType.OUTDOOR_SIGHTSEEING)

    assert.isDefined(indoorActivity)
    assert.isDefined(outdoorActivity)
    assert.isTrue(indoorActivity!.score > outdoorActivity!.score)
  })

  test('handles perfect weather conditions', async ({ assert }) => {
    const perfectForecast = new WeatherForecast({
      latitude: 40,
      longitude: 0,
      timezone: 'UTC',
      dailyForecasts: Array.from(
        { length: 7 },
        () =>
          new DailyForecast({
            date: new Date('2024-05-15'),
            temperatureMax: 22,
            temperatureMin: 15,
            precipitation: 0,
            windSpeed: 10,
            weatherCode: 0,
          })
      ),
    })

    const mockWeatherClient: IWeatherClient = {
      searchCities: async () => [],
      getWeatherForecast: async () => perfectForecast,
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
    const activityRankingService = new ActivityRankingService(weatherService, createMockMetrics())

    const activities = await activityRankingService.rankActivities(40, 0, 7)

    const outdoorActivity = activities.find((a) => a.type === ActivityType.OUTDOOR_SIGHTSEEING)
    assert.isDefined(outdoorActivity)
    assert.isTrue(outdoorActivity!.score >= 70)
  })

  test('handles single day forecast', async ({ assert }) => {
    const singleDayForecast = new WeatherForecast({
      latitude: 40,
      longitude: 0,
      timezone: 'UTC',
      dailyForecasts: [
        new DailyForecast({
          date: new Date('2024-01-01'),
          temperatureMax: 20,
          temperatureMin: 10,
          precipitation: 0,
          windSpeed: 10,
          weatherCode: 0,
        }),
      ],
    })

    const mockWeatherClient: IWeatherClient = {
      searchCities: async () => [],
      getWeatherForecast: async () => singleDayForecast,
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
    const activityRankingService = new ActivityRankingService(weatherService, createMockMetrics())

    const activities = await activityRankingService.rankActivities(40, 0, 1)

    assert.equal(activities.length, 4)
    for (const activity of activities) {
      assert.isDefined(activity.type)
      assert.isDefined(activity.score)
      assert.isDefined(activity.suitability)
      assert.isDefined(activity.reason)
      assert.isTrue(activity.score >= 0 && activity.score <= 100)
    }
  })

  test('handles maximum days forecast', async ({ assert }) => {
    const maxDaysForecast = new WeatherForecast({
      latitude: 40,
      longitude: 0,
      timezone: 'UTC',
      dailyForecasts: Array.from(
        { length: 16 },
        (_, i) =>
          new DailyForecast({
            date: new Date(`2024-01-${i + 1}`),
            temperatureMax: 15 + i,
            temperatureMin: 5 + i,
            precipitation: i % 3,
            windSpeed: 10 + i,
            weatherCode: i % 10,
          })
      ),
    })

    const mockWeatherClient: IWeatherClient = {
      searchCities: async () => [],
      getWeatherForecast: async () => maxDaysForecast,
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
    const activityRankingService = new ActivityRankingService(weatherService, createMockMetrics())

    const activities = await activityRankingService.rankActivities(40, 0, 16)

    assert.equal(activities.length, 4)
    assert.isTrue(activities[0].score >= activities[1].score)
    assert.isTrue(activities[1].score >= activities[2].score)
    assert.isTrue(activities[2].score >= activities[3].score)
  })

  test('handles activities with identical scores (tie-breaking)', async ({ assert }) => {
    const neutralForecast = new WeatherForecast({
      latitude: 40,
      longitude: 0,
      timezone: 'UTC',
      dailyForecasts: Array.from(
        { length: 7 },
        () =>
          new DailyForecast({
            date: new Date('2024-01-01'),
            temperatureMax: 15,
            temperatureMin: 10,
            precipitation: 0,
            windSpeed: 10,
            weatherCode: 2,
          })
      ),
    })

    const mockWeatherClient: IWeatherClient = {
      searchCities: async () => [],
      getWeatherForecast: async () => neutralForecast,
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
    const activityRankingService = new ActivityRankingService(weatherService, createMockMetrics())

    const activities = await activityRankingService.rankActivities(40, 0, 7)

    assert.equal(activities.length, 4)

    const activityTypes = activities.map((a) => a.type)
    const expectedOrder = [
      ActivityType.SKIING,
      ActivityType.SURFING,
      ActivityType.INDOOR_SIGHTSEEING,
      ActivityType.OUTDOOR_SIGHTSEEING,
    ]

    for (let i = 0; i < activities.length; i++) {
      if (activities[i].score === activities[i + 1]?.score) {
        const currentIndex = expectedOrder.indexOf(activityTypes[i])
        const nextIndex = expectedOrder.indexOf(activityTypes[i + 1])
        assert.isTrue(currentIndex < nextIndex, 'Tie-breaking should maintain enum order')
      }
    }
  })

  test('handles zero precipitation correctly', async ({ assert }) => {
    const noPrecipForecast = new WeatherForecast({
      latitude: 40,
      longitude: 0,
      timezone: 'UTC',
      dailyForecasts: Array.from(
        { length: 7 },
        () =>
          new DailyForecast({
            date: new Date('2024-01-01'),
            temperatureMax: 20,
            temperatureMin: 10,
            precipitation: 0,
            windSpeed: 10,
            weatherCode: 0,
          })
      ),
    })

    const mockWeatherClient: IWeatherClient = {
      searchCities: async () => [],
      getWeatherForecast: async () => noPrecipForecast,
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
    const activityRankingService = new ActivityRankingService(weatherService, createMockMetrics())

    const activities = await activityRankingService.rankActivities(40, 0, 7)

    const outdoorActivity = activities.find((a) => a.type === ActivityType.OUTDOOR_SIGHTSEEING)
    assert.isDefined(outdoorActivity)
    assert.isTrue(outdoorActivity!.score >= 50)
  })

  test('handles very high wind speeds', async ({ assert }) => {
    const highWindForecast = new WeatherForecast({
      latitude: 40,
      longitude: 0,
      timezone: 'UTC',
      dailyForecasts: Array.from(
        { length: 7 },
        () =>
          new DailyForecast({
            date: new Date('2024-01-01'),
            temperatureMax: 8,
            temperatureMin: 2,
            precipitation: 0,
            windSpeed: 60,
            weatherCode: 3,
          })
      ),
    })

    const mockWeatherClient: IWeatherClient = {
      searchCities: async () => [],
      getWeatherForecast: async () => highWindForecast,
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
    const activityRankingService = new ActivityRankingService(weatherService, createMockMetrics())

    const activities = await activityRankingService.rankActivities(40, 0, 7)

    const surfingActivity = activities.find((a) => a.type === ActivityType.SURFING)
    const outdoorActivity = activities.find((a) => a.type === ActivityType.OUTDOOR_SIGHTSEEING)

    assert.isDefined(surfingActivity)
    assert.isDefined(outdoorActivity)
    assert.isTrue(surfingActivity!.score <= 50)
    assert.isTrue(outdoorActivity!.score <= 50)
  })
})
