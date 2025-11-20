import { WeatherService } from './weather_service.js'
import { RankedActivity } from '../models/activity.js'
import { ActivityType, WeatherCondition } from '../types/enums.js'
import { DailyForecast } from '../models/weather.js'
import { IMetrics } from '#clients/interfaces/metrics_interface'
import logger from '@adonisjs/core/services/logger'

/**
 * Service for ranking activities based on weather conditions.
 * Uses rule-based scoring to evaluate activity suitability.
 */
export class ActivityRankingService {
  constructor(
    private readonly weatherService: WeatherService,
    private readonly metrics: IMetrics
  ) {}

  /**
   * Rank activities based on weather forecast for given coordinates.
   *
   * @param latitude - Latitude coordinate
   * @param longitude - Longitude coordinate
   * @param days - Number of forecast days (default: 7)
   * @returns Array of ranked activities sorted by score (descending)
   */
  async rankActivities(
    latitude: number,
    longitude: number,
    days: number = 7
  ): Promise<RankedActivity[]> {
    const startTime = Date.now()

    logger.info({ latitude, longitude, days }, 'Activity ranking requested')
    this.metrics.incrementCounter('activity.ranking.requests')

    // Fetch weather forecast
    const forecast = await this.weatherService.getWeatherForecast(latitude, longitude, days)

    // Calculate scores for each activity across all days
    const dailyScores = new Map<ActivityType, number[]>()

    // Initialize score arrays for each activity
    for (const activityType of Object.values(ActivityType)) {
      dailyScores.set(activityType, [])
    }

    // Score each activity for each day
    for (const dailyForecast of forecast.dailyForecasts) {
      dailyScores.get(ActivityType.SKIING)!.push(this.scoreSkiing(dailyForecast))
      dailyScores.get(ActivityType.SURFING)!.push(this.scoreSurfing(dailyForecast))
      dailyScores
        .get(ActivityType.INDOOR_SIGHTSEEING)!
        .push(this.scoreIndoorSightseeing(dailyForecast))
      dailyScores
        .get(ActivityType.OUTDOOR_SIGHTSEEING)!
        .push(this.scoreOutdoorSightseeing(dailyForecast))
    }

    // Aggregate scores across all days
    const aggregatedScores = this.aggregateScores(dailyScores)

    // Create ranked activities with reasons
    const rankedActivities: RankedActivity[] = []

    for (const entry of Array.from(aggregatedScores.entries())) {
      const [activityType, score] = entry
      const reason = this.generateReason(activityType, score, forecast.dailyForecasts)
      rankedActivities.push(new RankedActivity(activityType, score, reason))
    }

    // Sort by score (descending), with deterministic tie-breaking by enum order
    rankedActivities.sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score
      }
      // Tie-breaking: use enum order (SKIING, SURFING, INDOOR_SIGHTSEEING, OUTDOOR_SIGHTSEEING)
      return (
        Object.values(ActivityType).indexOf(a.type) -
        Object.values(ActivityType).indexOf(b.type)
      )
    })

    const duration = Date.now() - startTime
    this.metrics.recordTiming('activity.ranking.duration', duration)

    logger.info(
      {
        latitude,
        longitude,
        days,
        duration,
        topActivity: rankedActivities[0]?.type,
        topScore: rankedActivities[0]?.score,
      },
      'Activity ranking completed'
    )

    return rankedActivities
  }

  /**
   * Score skiing activity based on weather conditions.
   * Favors cold temperatures, snow, and precipitation.
   *
   * @param forecast - Daily weather forecast
   * @returns Score from 0-100
   */
  private scoreSkiing(forecast: DailyForecast): number {
    let score = 50 // Base score

    // Temperature scoring
    if (forecast.temperatureMax < 0) {
      score += 30 // Ideal skiing temperature
    } else if (forecast.temperatureMax <= 5) {
      score += 20 // Good skiing temperature
    } else if (forecast.temperatureMax > 15) {
      score -= 20 // Too warm for skiing
    }

    // Weather condition scoring
    const condition = forecast.getWeatherCondition()
    if (condition === WeatherCondition.SNOWY) {
      score += 20 // Fresh snow is ideal
    }

    // Precipitation scoring (snow)
    if (forecast.precipitation > 5) {
      score += 10 // More snow is better
    }

    return Math.max(0, Math.min(100, score))
  }

  /**
   * Score surfing activity based on weather conditions.
   * Favors warm temperatures, low precipitation, and moderate wind.
   *
   * @param forecast - Daily weather forecast
   * @returns Score from 0-100
   */
  private scoreSurfing(forecast: DailyForecast): number {
    let score = 50 // Base score

    // Temperature scoring
    if (forecast.temperatureMax > 20) {
      score += 30 // Warm water/air temperature
    } else if (forecast.temperatureMax >= 15) {
      score += 20 // Acceptable temperature
    }

    // Precipitation scoring
    if (forecast.precipitation > 5) {
      score -= 30 // Heavy rain is unpleasant
    }

    // Wind scoring
    if (forecast.windSpeed > 30) {
      score -= 20 // Too windy, dangerous
    } else if (forecast.windSpeed >= 10 && forecast.windSpeed <= 20) {
      score += 10 // Good wind for waves
    }

    return Math.max(0, Math.min(100, score))
  }

  /**
   * Score indoor sightseeing activity based on weather conditions.
   * Favors poor outdoor conditions (rain, extreme temperatures).
   *
   * @param forecast - Daily weather forecast
   * @returns Score from 40-100 (always somewhat viable)
   */
  private scoreIndoorSightseeing(forecast: DailyForecast): number {
    let score = 60 // Higher base score (always viable)

    // Precipitation scoring
    if (forecast.precipitation > 5) {
      score += 30 // Rain makes indoor activities more appealing
    }

    // Temperature scoring
    if (forecast.temperatureMax < 5 || forecast.temperatureMax > 35) {
      score += 20 // Extreme temperatures favor indoor
    }

    // Weather condition scoring
    const condition = forecast.getWeatherCondition()
    if (condition === WeatherCondition.STORMY) {
      score += 10 // Storms make outdoor dangerous
    }

    return Math.max(40, Math.min(100, score)) // Minimum 40 (always somewhat viable)
  }

  /**
   * Score outdoor sightseeing activity based on weather conditions.
   * Favors mild temperatures, low precipitation, and calm weather.
   *
   * @param forecast - Daily weather forecast
   * @returns Score from 0-100
   */
  private scoreOutdoorSightseeing(forecast: DailyForecast): number {
    let score = 50 // Base score

    // Temperature scoring (ideal range)
    if (forecast.temperatureMax >= 15 && forecast.temperatureMax <= 25) {
      score += 30 // Perfect temperature
    } else if (
      (forecast.temperatureMax >= 10 && forecast.temperatureMax < 15) ||
      (forecast.temperatureMax > 25 && forecast.temperatureMax <= 30)
    ) {
      score += 20 // Acceptable temperature
    }

    // Precipitation scoring
    if (forecast.precipitation > 2) {
      score -= 30 // Rain ruins outdoor sightseeing
    }

    // Wind scoring
    if (forecast.windSpeed > 40) {
      score -= 20 // Too windy to enjoy
    }

    // Weather condition scoring
    const condition = forecast.getWeatherCondition()
    if (condition === WeatherCondition.CLEAR || condition === WeatherCondition.PARTLY_CLOUDY) {
      score += 10 // Nice weather bonus
    }

    return Math.max(0, Math.min(100, score))
  }

  /**
   * Aggregate daily scores into a single score per activity.
   * Uses simple averaging across all forecast days.
   *
   * @param dailyScores - Map of activity types to daily score arrays
   * @returns Map of activity types to aggregated scores
   */
  private aggregateScores(dailyScores: Map<ActivityType, number[]>): Map<ActivityType, number> {
    const aggregated = new Map<ActivityType, number>()

    for (const entry of Array.from(dailyScores.entries())) {
      const [activity, scores] = entry
      const average = scores.reduce((sum: number, score: number) => sum + score, 0) / scores.length
      aggregated.set(activity, Math.round(average))
    }

    return aggregated
  }

  /**
   * Generate a human-readable reason for the activity score.
   *
   * @param activityType - Type of activity
   * @param score - Aggregated score
   * @param forecasts - Daily forecasts used for scoring
   * @returns Reason string explaining the score
   */
  private generateReason(
    activityType: ActivityType,
    score: number,
    forecasts: DailyForecast[]
  ): string {
    // Calculate average conditions
    const avgTemp =
      forecasts.reduce((sum, f) => sum + f.temperatureMax, 0) / forecasts.length
    const avgPrecip =
      forecasts.reduce((sum, f) => sum + f.precipitation, 0) / forecasts.length
    const avgWind = forecasts.reduce((sum, f) => sum + f.windSpeed, 0) / forecasts.length

    // Count weather conditions
    const snowyDays = forecasts.filter(
      (f) => f.getWeatherCondition() === WeatherCondition.SNOWY
    ).length
    const rainyDays = forecasts.filter(
      (f) => f.getWeatherCondition() === WeatherCondition.RAINY
    ).length

    switch (activityType) {
      case ActivityType.SKIING:
        if (score >= 80) {
          return `Excellent skiing conditions with cold temperatures (${avgTemp.toFixed(1)}°C) and ${snowyDays > 0 ? 'snow' : 'good conditions'}`
        } else if (score >= 60) {
          return `Good skiing conditions with suitable temperatures (${avgTemp.toFixed(1)}°C)`
        } else if (score >= 40) {
          return `Fair skiing conditions, temperatures may be suboptimal (${avgTemp.toFixed(1)}°C)`
        } else {
          return `Poor skiing conditions, too warm (${avgTemp.toFixed(1)}°C) or unfavorable weather`
        }

      case ActivityType.SURFING:
        if (score >= 80) {
          return `Excellent surfing conditions with warm temperatures (${avgTemp.toFixed(1)}°C) and favorable winds`
        } else if (score >= 60) {
          return `Good surfing conditions with pleasant temperatures (${avgTemp.toFixed(1)}°C)`
        } else if (score >= 40) {
          return `Fair surfing conditions, some rain (${avgPrecip.toFixed(1)}mm) or wind (${avgWind.toFixed(1)} km/h)`
        } else {
          return `Poor surfing conditions due to heavy rain, strong winds, or cold temperatures`
        }

      case ActivityType.INDOOR_SIGHTSEEING:
        if (score >= 80) {
          return `Excellent time for indoor activities with ${rainyDays > 0 ? 'rainy weather' : 'unfavorable outdoor conditions'}`
        } else if (score >= 60) {
          return `Good option for indoor activities with moderate outdoor conditions`
        } else {
          return `Indoor activities available, though outdoor conditions are favorable`
        }

      case ActivityType.OUTDOOR_SIGHTSEEING:
        if (score >= 80) {
          return `Excellent outdoor sightseeing with ideal temperatures (${avgTemp.toFixed(1)}°C) and minimal rain`
        } else if (score >= 60) {
          return `Good outdoor sightseeing conditions with pleasant weather (${avgTemp.toFixed(1)}°C)`
        } else if (score >= 40) {
          return `Fair outdoor sightseeing, some rain (${avgPrecip.toFixed(1)}mm) expected`
        } else {
          return `Poor outdoor sightseeing conditions due to rain, wind, or extreme temperatures`
        }

      default:
        return 'Activity score calculated based on weather conditions'
    }
  }
}
