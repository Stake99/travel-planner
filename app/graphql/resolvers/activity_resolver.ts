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
   * Note: Since OpenMeteo API doesn't provide a direct "get city by ID" endpoint,
   * this implementation uses a workaround where the cityId is expected to be
   * passed along with city data from the client, or we search for the city
   * and use the first result's coordinates.
   *
   * For a production system, you would typically:
   * 1. Store cities in a database with their IDs
   * 2. Look up the city from the database by ID
   * 3. Use the stored coordinates for weather/activity queries
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

      // Validate days parameter
      if (days < 1 || days > 16) {
        throw new ValidationException('Days must be between 1 and 16', 'days', days)
      }

      // For this implementation, we need city coordinates to fetch weather and activities
      // In a real system, you would look up the city from a database by ID
      // For now, we'll throw a helpful error explaining the limitation
      
      // Check if city data is provided in context (from a previous query or cache)
      let city: City | undefined = context?.city

      if (!city) {
        // Since we don't have a database, we cannot look up cities by ID directly
        // This is a known limitation documented in the design trade-offs
        throw NotFoundException.city(cityId)
      }

      // Get activity rankings using the city's coordinates
      const activities = await this.activityRankingService.rankActivities(
        city.latitude,
        city.longitude,
        days
      )

      // Get weather forecast for the response
      const forecast = await this.activityRankingService['weatherService'].getWeatherForecast(
        city.latitude,
        city.longitude,
        days
      )

      // Return the complete activity recommendations
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
}
