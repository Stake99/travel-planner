import { GraphQLError } from 'graphql'
import { ActivityRankingService } from '#services/activity_ranking_service'
import ValidationException from '#exceptions/validation_exception'
import WeatherAPIException from '#exceptions/weather_api_exception'
import NotFoundException from '#exceptions/not_found_exception'
import AppError from '#exceptions/app_error'
import { City } from '#models/city'

/**
 * GraphQL resolver for activity recommendation queries.
 * Handles activity ranking based on weather forecasts and error translation.
 */
export class ActivityResolver {
  constructor(
    private readonly activityRankingService: ActivityRankingService
  ) {}

  /**
   * Resolve the getActivityRecommendations query.
   * Retrieves activity recommendations for a city based on weather forecast.
   *
   * @param _parent - Parent resolver (unused)
   * @param args - Query arguments { cityId: number, days?: number }
   * @param context - GraphQL context (may contain city data)
   * @returns Activity recommendations with city, forecast, and ranked activities
   * @throws GraphQLError with appropriate error code and details
   */
  async getActivityRecommendations(
    _parent: unknown,
    args: { cityId: number; days?: number },
    context?: { city?: City }
  ) {
    try {
      const { cityId, days = 7 } = args

      if (days < 1 || days > 16) {
        throw new ValidationException('Days must be between 1 and 16', 'days', days)
      }

      let city: City | undefined = context?.city

      if (!city) {
        throw NotFoundException.city(cityId)
      }

      const activities = await this.activityRankingService.rankActivities(
        city.latitude,
        city.longitude,
        days
      )

      const forecast = await this.activityRankingService['weatherService'].getWeatherForecast(
        city.latitude,
        city.longitude,
        days
      )

      return {
        city,
        forecast,
        activities,
        generatedAt: new Date().toISOString(),
      }
    } catch (error) {
      // Translate application errors to GraphQL errors
      if (error instanceof ValidationException) {
        throw new GraphQLError(error.message, {
          extensions: {
            code: error.code,
            statusCode: error.statusCode,
            ...error.details,
          },
        })
      }

      if (error instanceof NotFoundException) {
        throw new GraphQLError(
          'City not found. Note: This API does not persist city data. ' +
            'Please use searchCities to find a city, then use its coordinates ' +
            'with getWeatherForecast and activity ranking.',
          {
            extensions: {
              code: error.code,
              statusCode: error.statusCode,
              ...error.details,
            },
          }
        )
      }

      if (error instanceof WeatherAPIException) {
        throw new GraphQLError(
          'Unable to fetch activity recommendations at this time. Please try again later.',
          {
            extensions: {
              code: error.code,
              statusCode: error.statusCode,
              ...error.details,
            },
          }
        )
      }

      if (error instanceof AppError) {
        throw new GraphQLError(error.message, {
          extensions: {
            code: error.code,
            statusCode: error.statusCode,
            ...error.details,
          },
        })
      }

      // Unexpected errors
      throw new GraphQLError('An unexpected error occurred', {
        extensions: {
          code: 'INTERNAL_SERVER_ERROR',
          statusCode: 500,
        },
      })
    }
  }

  /**
   * Resolve the getActivityRecommendationsByCoordinates query.
   * Retrieves activity recommendations using coordinates directly.
   *
   * @param _parent - Parent resolver (unused)
   * @param args - Query arguments { input: { latitude, longitude, cityName?, country? }, days?: number }
   * @returns Activity recommendations with city, forecast, and ranked activities
   * @throws GraphQLError with appropriate error code and details
   */
  async getActivityRecommendationsByCoordinates(
    _parent: unknown,
    args: {
      input: { latitude: number; longitude: number; cityName?: string; country?: string }
      days?: number
    }
  ) {
    try {
      const { input, days = 7 } = args
      const { latitude, longitude, cityName, country } = input

      if (days < 1 || days > 16) {
        throw new ValidationException('Days must be between 1 and 16', 'days', days)
      }

      // Validate coordinates
      if (latitude < -90 || latitude > 90) {
        throw new ValidationException('Latitude must be between -90 and 90', 'latitude', latitude)
      }
      if (longitude < -180 || longitude > 180) {
        throw new ValidationException('Longitude must be between -180 and 180', 'longitude', longitude)
      }

      const activities = await this.activityRankingService.rankActivities(latitude, longitude, days)
      const forecast = await this.activityRankingService['weatherService'].getWeatherForecast(
        latitude,
        longitude,
        days
      )

      const city = new City({
        id: Math.floor(Math.random() * 1000000) + 1000000,
        name: cityName || 'Unknown Location',
        country: country || 'Unknown',
        countryCode: 'XX',
        latitude,
        longitude,
        timezone: forecast.timezone,
        population: undefined,
      })

      return {
        city,
        forecast,
        activities,
        generatedAt: new Date().toISOString(),
      }
    } catch (error) {
      // Translate application errors to GraphQL errors
      if (error instanceof ValidationException) {
        throw new GraphQLError(error.message, {
          extensions: {
            code: error.code,
            statusCode: error.statusCode,
            ...error.details,
          },
        })
      }

      if (error instanceof WeatherAPIException) {
        throw new GraphQLError(
          'Unable to fetch activity recommendations at this time. Please try again later.',
          {
            extensions: {
              code: error.code,
              statusCode: error.statusCode,
              ...error.details,
            },
          }
        )
      }

      if (error instanceof AppError) {
        throw new GraphQLError(error.message, {
          extensions: {
            code: error.code,
            statusCode: error.statusCode,
            ...error.details,
          },
        })
      }

      throw new GraphQLError('An unexpected error occurred', {
        extensions: {
          code: 'INTERNAL_SERVER_ERROR',
          statusCode: 500,
        },
      })
    }
  }
}
