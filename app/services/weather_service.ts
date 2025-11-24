import { IWeatherClient } from '#clients/interfaces/weather_client_interface'
import { ICacheManager } from '#clients/interfaces/cache_manager_interface'
import { IMetrics } from '#clients/interfaces/metrics_interface'
import { WeatherForecast } from '#models/weather'
import ValidationException from '#exceptions/validation_exception'
import WeatherAPIException from '#exceptions/weather_api_exception'
import logger from '@adonisjs/core/services/logger'

/**
 * Service for retrieving and processing weather forecast data.
 * Handles coordinate validation, caching, and weather code mapping.
 */
export class WeatherService {
  private readonly CACHE_TTL_SECONDS = 1800

  constructor(
    private readonly weatherClient: IWeatherClient,
    private readonly cacheManager: ICacheManager,
    private readonly metrics: IMetrics
  ) {}

  /**
   * Get weather forecast for specific coordinates with caching.
   *
   * @param latitude - Latitude coordinate (-90 to 90)
   * @param longitude - Longitude coordinate (-180 to 180)
   * @param days - Number of forecast days (1-16)
   * @returns Weather forecast with daily data
   * @throws {ValidationException} If coordinates are invalid
   * @throws {WeatherAPIException} If the API request fails
   */
  async getWeatherForecast(
    latitude: number,
    longitude: number,
    days: number = 7
  ): Promise<WeatherForecast> {
    const startTime = Date.now()

    logger.info({ latitude, longitude, days }, 'Weather forecast requested')
    this.metrics.incrementCounter('weather.forecast.requests')

    try {
      this.validateCoordinates(latitude, longitude)
    } catch (error) {
      logger.warn({ latitude, longitude, error }, 'Invalid coordinates provided')
      this.metrics.incrementCounter('weather.forecast.validation_error')
      throw error
    }

    if (days < 1 || days > 16) {
      logger.warn({ days }, 'Invalid days parameter provided')
      this.metrics.incrementCounter('weather.forecast.validation_error')
      throw ValidationException.invalidInput('days', days, 'must be between 1 and 16')
    }

    const cacheKey = this.generateCacheKey(latitude, longitude, days)
    const cached = await this.cacheManager.get<WeatherForecast>(cacheKey)
    if (cached) {
      logger.info({ latitude, longitude, days }, 'Weather forecast cache hit')
      this.metrics.incrementCounter('weather.forecast.cache_hit')

      const duration = Date.now() - startTime
      this.metrics.recordTiming('weather.forecast.duration', duration, { cache: 'hit' })

      return cached
    }

    logger.info({ latitude, longitude, days }, 'Weather forecast cache miss, fetching from API')
    this.metrics.incrementCounter('weather.forecast.cache_miss')

    try {
      const apiStartTime = Date.now()
      const forecast = await this.weatherClient.getWeatherForecast(latitude, longitude, days)
      const apiDuration = Date.now() - apiStartTime

      logger.info(
        { latitude, longitude, days, apiDuration },
        'Weather forecast API call completed'
      )
      this.metrics.recordTiming('weather.forecast.api_call', apiDuration)
      await this.cacheManager.set(cacheKey, forecast, this.CACHE_TTL_SECONDS)

      const totalDuration = Date.now() - startTime
      this.metrics.recordTiming('weather.forecast.duration', totalDuration, { cache: 'miss' })

      logger.info({ latitude, longitude, days, totalDuration }, 'Weather forecast completed')

      return forecast
    } catch (error) {
      logger.error({ latitude, longitude, days, error }, 'Weather forecast API call failed')
      this.metrics.incrementCounter('weather.forecast.api_error')

      if (error instanceof WeatherAPIException || error instanceof ValidationException) {
        throw error
      }

      throw new WeatherAPIException(
        'Failed to fetch weather forecast',
        error instanceof Error ? error : undefined
      )
    }
  }

  /**
   * Validate latitude and longitude coordinates.
   *
   * @param latitude - Latitude coordinate
   * @param longitude - Longitude coordinate
   * @throws {ValidationException} If coordinates are out of valid range
   */
  private validateCoordinates(latitude: number, longitude: number): void {
    if (typeof latitude !== 'number' || isNaN(latitude)) {
      throw ValidationException.invalidInput('latitude', latitude, 'must be a valid number')
    }

    if (typeof longitude !== 'number' || isNaN(longitude)) {
      throw ValidationException.invalidInput('longitude', longitude, 'must be a valid number')
    }

    if (latitude < -90 || latitude > 90) {
      throw ValidationException.invalidInput(
        'latitude',
        latitude,
        'must be between -90 and 90'
      )
    }

    if (longitude < -180 || longitude > 180) {
      throw ValidationException.invalidInput(
        'longitude',
        longitude,
        'must be between -180 and 180'
      )
    }
  }

  /**
   * Generate a cache key for weather forecast data.
   *
   * @param latitude - Latitude coordinate
   * @param longitude - Longitude coordinate
   * @param days - Number of forecast days
   * @returns Cache key string
   */
  private generateCacheKey(latitude: number, longitude: number, days: number): string {
    const lat = latitude.toFixed(4)
    const lon = longitude.toFixed(4)
    return `weather:${lat}:${lon}:${days}`
  }
}
