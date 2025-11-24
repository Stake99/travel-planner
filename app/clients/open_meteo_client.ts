import axios, { AxiosInstance, AxiosError } from 'axios'
import { IWeatherClient } from './interfaces/weather_client_interface.js'
import { City } from '#models/city'
import { WeatherForecast, DailyForecast } from '#models/weather'
import WeatherAPIException from '#exceptions/weather_api_exception'
import {
  OpenMeteoGeocodingResponse,
  OpenMeteoWeatherResponse,
  OpenMeteoCityResult,
} from '#types/open_meteo_types'
import openmeteoConfig from '#config/openmeteo'
import logger from '@adonisjs/core/services/logger'

/**
 * Client for communicating with the OpenMeteo API.
 * Handles both geocoding (city search) and weather forecast requests.
 */
export class OpenMeteoClient implements IWeatherClient {
  private readonly httpClient: AxiosInstance
  private readonly baseUrl: string
  private readonly geocodingUrl: string
  private readonly timeout: number

  constructor() {
    this.baseUrl = openmeteoConfig.baseUrl
    this.geocodingUrl = openmeteoConfig.geocodingUrl
    this.timeout = openmeteoConfig.timeout

    this.httpClient = axios.create({
      timeout: this.timeout,
      headers: {
        'Content-Type': 'application/json',
      },
    })
  }

  /**
   * Search for cities by name using the OpenMeteo Geocoding API.
   *
   * @param query - The city name to search for
   * @returns Array of matching cities (up to 10 results)
   * @throws {WeatherAPIException} If the API request fails
   */
  async searchCities(query: string): Promise<City[]> {
    const endpoint = `${this.geocodingUrl}/search`
    const startTime = Date.now()

    logger.debug({ query, endpoint }, 'OpenMeteo geocoding API call starting')

    try {
      const response = await this.httpClient.get<OpenMeteoGeocodingResponse>(endpoint, {
        params: {
          name: query,
          count: 10,
          language: 'en',
          format: 'json',
        },
      })

      const duration = Date.now() - startTime
      const resultCount = response.data.results?.length || 0

      logger.info(
        { query, endpoint, duration, resultCount, status: response.status },
        'OpenMeteo geocoding API call successful'
      )

      if (!response.data.results || response.data.results.length === 0) {
        return []
      }

      return response.data.results.map((result) => this.transformCityResult(result))
    } catch (error) {
      const duration = Date.now() - startTime
      logger.error({ query, endpoint, duration, error }, 'OpenMeteo geocoding API call failed')
      throw this.handleApiError(error, endpoint)
    }
  }

  /**
   * Get weather forecast for specific coordinates using the OpenMeteo Weather API.
   *
   * @param latitude - Latitude coordinate (-90 to 90)
   * @param longitude - Longitude coordinate (-180 to 180)
   * @param days - Number of forecast days (1-16)
   * @returns Weather forecast with daily data
   * @throws {WeatherAPIException} If the API request fails
   */
  async getWeatherForecast(
    latitude: number,
    longitude: number,
    days: number
  ): Promise<WeatherForecast> {
    const endpoint = `${this.baseUrl}/forecast`
    const startTime = Date.now()

    logger.debug({ latitude, longitude, days, endpoint }, 'OpenMeteo weather API call starting')

    try {
      const response = await this.httpClient.get<OpenMeteoWeatherResponse>(endpoint, {
        params: {
          latitude,
          longitude,
          daily:
            'temperature_2m_max,temperature_2m_min,precipitation_sum,windspeed_10m_max,weathercode',
          forecast_days: days,
          timezone: 'auto',
        },
      })

      const duration = Date.now() - startTime

      logger.info(
        { latitude, longitude, days, endpoint, duration, status: response.status },
        'OpenMeteo weather API call successful'
      )

      if (!response.data || !response.data.daily) {
        throw WeatherAPIException.malformedResponse(
          endpoint,
          'Missing daily forecast data in response'
        )
      }

      const { daily } = response.data

      if (
        !daily.time ||
        !daily.temperature_2m_max ||
        !daily.temperature_2m_min ||
        !daily.precipitation_sum ||
        !daily.windspeed_10m_max ||
        !daily.weathercode
      ) {
        throw WeatherAPIException.malformedResponse(
          endpoint,
          'Missing required fields in daily forecast data'
        )
      }

      const forecastLength = daily.time.length
      if (
        daily.temperature_2m_max.length !== forecastLength ||
        daily.temperature_2m_min.length !== forecastLength ||
        daily.precipitation_sum.length !== forecastLength ||
        daily.windspeed_10m_max.length !== forecastLength ||
        daily.weathercode.length !== forecastLength
      ) {
        throw WeatherAPIException.malformedResponse(
          endpoint,
          'Inconsistent array lengths in daily forecast data'
        )
      }

      return this.transformWeatherResponse(response.data)
    } catch (error) {
      const duration = Date.now() - startTime
      logger.error(
        { latitude, longitude, days, endpoint, duration, error },
        'OpenMeteo weather API call failed'
      )

      if (error instanceof WeatherAPIException) {
        throw error
      }
      throw this.handleApiError(error, endpoint)
    }
  }

  /**
   * Transform OpenMeteo city result to City domain model.
   *
   * @param result - Raw API result
   * @returns City domain model
   */
  private transformCityResult(result: OpenMeteoCityResult): City {
    return new City({
      id: result.id,
      name: result.name,
      country: result.country,
      countryCode: result.country_code,
      latitude: result.latitude,
      longitude: result.longitude,
      timezone: result.timezone,
      population: result.population,
    })
  }

  /**
   * Transform OpenMeteo weather response to WeatherForecast domain model.
   *
   * @param response - Raw API response
   * @returns WeatherForecast domain model
   */
  private transformWeatherResponse(response: OpenMeteoWeatherResponse): WeatherForecast {
    const dailyForecasts: DailyForecast[] = []

    for (let i = 0; i < response.daily.time.length; i++) {
      dailyForecasts.push(
        new DailyForecast({
          date: response.daily.time[i],
          temperatureMax: response.daily.temperature_2m_max[i],
          temperatureMin: response.daily.temperature_2m_min[i],
          precipitation: response.daily.precipitation_sum[i],
          windSpeed: response.daily.windspeed_10m_max[i],
          weatherCode: response.daily.weathercode[i],
        })
      )
    }

    return new WeatherForecast({
      latitude: response.latitude,
      longitude: response.longitude,
      timezone: response.timezone,
      dailyForecasts,
    })
  }

  /**
   * Handle API errors and translate them to domain exceptions.
   *
   * @param error - The error that occurred
   * @param endpoint - The endpoint that was being called
   * @returns WeatherAPIException with appropriate context
   */
  private handleApiError(error: unknown, endpoint: string): WeatherAPIException {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError

      if (axiosError.code === 'ECONNABORTED') {
        return WeatherAPIException.timeout(endpoint, this.timeout)
      }

      if (!axiosError.response) {
        return WeatherAPIException.networkError(axiosError, endpoint)
      }

      const status = axiosError.response.status
      const responseData = axiosError.response.data as any

      if (status >= 400 && status < 500) {
        const message = responseData?.reason || responseData?.message || 'Invalid request'
        return WeatherAPIException.apiError(status, message, endpoint)
      }

      if (status >= 500) {
        return WeatherAPIException.apiError(
          status,
          'OpenMeteo API is currently unavailable',
          endpoint
        )
      }

      return WeatherAPIException.apiError(status, 'Unexpected API error', endpoint)
    }

    if (error instanceof Error) {
      return new WeatherAPIException(
        `Unexpected error communicating with OpenMeteo API: ${error.message}`,
        error,
        endpoint
      )
    }

    return new WeatherAPIException(
      'Unknown error occurred while communicating with OpenMeteo API',
      undefined,
      endpoint
    )
  }
}
