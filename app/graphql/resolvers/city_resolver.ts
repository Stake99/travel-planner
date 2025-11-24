import { GraphQLError } from 'graphql'
import { CityService } from '#services/city_service'
import ValidationException from '#exceptions/validation_exception'
import WeatherAPIException from '#exceptions/weather_api_exception'
import AppError from '#exceptions/app_error'

/**
 * GraphQL resolver for city-related queries.
 * Handles city search operations and error translation.
 */
export class CityResolver {
  constructor(private readonly cityService: CityService) {}

  /**
   * Resolve the searchCities query.
   * Searches for cities by name and returns matching results.
   *
   * @param _parent - Parent resolver (unused)
   * @param args - Query arguments { query: string, limit?: number }
   * @returns Array of matching cities
   * @throws GraphQLError with appropriate error code and details
   */
  async searchCities(_parent: unknown, args: { query: string; limit?: number }) {
    try {
      const { query, limit = 10 } = args

      if (limit < 1 || limit > 100) {
        throw new ValidationException('Limit must be between 1 and 100', 'limit', limit)
      }

      const cities = await this.cityService.searchCities(query, limit)

      return cities
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
        throw new GraphQLError('Unable to search cities at this time. Please try again later.', {
          extensions: {
            code: error.code,
            statusCode: error.statusCode,
            ...error.details,
          },
        })
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
