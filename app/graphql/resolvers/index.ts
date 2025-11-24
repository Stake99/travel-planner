import { CityResolver } from './city_resolver.js'
import { WeatherResolver } from './weather_resolver.js'
import { ActivityResolver } from './activity_resolver.js'
import { CityService } from '#services/city_service'
import { WeatherService } from '#services/weather_service'
import { ActivityRankingService } from '#services/activity_ranking_service'

/**
 * Create resolver instances with dependency injection.
 *
 * @param cityService - City service instance
 * @param weatherService - Weather service instance
 * @param activityRankingService - Activity ranking service instance
 * @returns Object containing all resolver instances
 */
export function createResolvers(
  cityService: CityService,
  weatherService: WeatherService,
  activityRankingService: ActivityRankingService
) {
  const cityResolver = new CityResolver(cityService)
  const weatherResolver = new WeatherResolver(weatherService)
  const activityResolver = new ActivityResolver(activityRankingService)

  return {
    cityResolver,
    weatherResolver,
    activityResolver,
  }
}

/**
 * Create GraphQL resolver map for Apollo Server.
 * Maps GraphQL schema queries to resolver methods.
 *
 * @param cityService - City service instance
 * @param weatherService - Weather service instance
 * @param activityRankingService - Activity ranking service instance
 * @returns GraphQL resolver map
 */
export function createResolverMap(
  cityService: CityService,
  weatherService: WeatherService,
  activityRankingService: ActivityRankingService
) {
  const resolvers = createResolvers(cityService, weatherService, activityRankingService)

  return {
    Query: {
      searchCities: (parent: unknown, args: any, context: any) =>
        resolvers.cityResolver.searchCities(parent, args),

      getWeatherForecast: (parent: unknown, args: any, context: any) =>
        resolvers.weatherResolver.getWeatherForecast(parent, args),

      getActivityRecommendations: (parent: unknown, args: any, context: any) =>
        resolvers.activityResolver.getActivityRecommendations(parent, args, context),

      getActivityRecommendationsByCoordinates: (parent: unknown, args: any, context: any) =>
        resolvers.activityResolver.getActivityRecommendationsByCoordinates(parent, args),
    },
    DailyForecast: {
      weatherCondition: (parent: any) => {
        return parent.getWeatherCondition()
      },
      date: (parent: any) => {
        if (parent.date instanceof Date) {
          return parent.date.toISOString().split('T')[0]
        }
        return parent.date
      },
    },
  }
}

export { CityResolver, WeatherResolver, ActivityResolver }
