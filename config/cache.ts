import env from '#start/env'

export default {
  /**
   * TTL for city search cache in seconds (default: 1 hour)
   */
  citySearchTTL: env.get('CACHE_TTL_CITY_SEARCH') ?? 3600,

  /**
   * TTL for weather forecast cache in seconds (default: 30 minutes)
   */
  weatherForecastTTL: env.get('CACHE_TTL_WEATHER_FORECAST') ?? 1800,
}
