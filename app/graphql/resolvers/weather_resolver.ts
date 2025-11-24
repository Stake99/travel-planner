import { GraphQLError } from 'graphql'
import { WeatherService } from '#services/weather_service'
import ValidationException from '#exceptions/validation_exception'
import WeatherAPIException from '#exceptions/weather_api_exception'
import AppError from '#exceptions/app_error'

/**
 * Input type for weather forecast query
 */
interface WeatherForecastInput {
  latitude: number
  longitude: number
  days?: number
}

/**
 * GraphQL resolver for weather-related queries.
 * Handles weather forecast operations and error translation.
 */
export class WeatherResolver {
  constructor(private readonly weatherService: WeatherService) {}

  /**
   * Resolve the getWeatherForecast query.
   * Retrieves weather forecast for specified coordinates.
   *
   * @param _parent - Parent resolver (unused)
   * @param args - Query arguments { input: WeatherForecastInput }
   * @returns Weather forecast with daily forecasts
   * @throws GraphQLError with appropriate error code and details
   */
  async getWeatherForecast(
    _parent: unknown,
    args: { input: WeatherForecastInput }
  ) {
    try {
      const { latitude, longitude, days = 7 } = args.input

      if (days < 1 || days > 16) {
        throw new ValidationException(
          'Days must be between 1 and 16',
          'days',
          days
        )
      }

      const forecast = await this.weatherService.getWeatherForecast(
        latitude,
        longitude,
        days
      )

      return forecast
    } catch (error) {
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
          'Unable to fetch weather forecast at this time. Please try again later.',
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
