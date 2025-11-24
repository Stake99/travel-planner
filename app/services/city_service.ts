import { IWeatherClient } from '#clients/interfaces/weather_client_interface'
import { ICacheManager } from '#clients/interfaces/cache_manager_interface'
import { IMetrics } from '#clients/interfaces/metrics_interface'
import { City } from '#models/city'
import logger from '@adonisjs/core/services/logger'

/**
 * Service for city search operations.
 * Orchestrates city search with caching and result ordering.
 */
export class CityService {
  private readonly CACHE_TTL_SECONDS = 3600
  private readonly CACHE_KEY_PREFIX = 'city:search:'

  constructor(
    private readonly weatherClient: IWeatherClient,
    private readonly cacheManager: ICacheManager,
    private readonly metrics: IMetrics
  ) {}

  /**
   * Search for cities by name with caching and relevance ordering.
   *
   * @param query - The city name to search for (partial or complete)
   * @param limit - Maximum number of results to return (default: 10)
   * @returns Array of matching cities ordered by relevance
   */
  async searchCities(query: string, limit: number = 10): Promise<City[]> {
    const startTime = Date.now()

    logger.info({ query, limit }, 'City search requested')
    this.metrics.incrementCounter('city.search.requests')

    if (!query || query.trim().length === 0) {
      logger.debug('Empty query provided, returning empty results')
      this.metrics.incrementCounter('city.search.empty_query')
      return []
    }

    const sanitizedQuery = this.sanitizeQuery(query)

    if (sanitizedQuery.length === 0) {
      logger.debug({ originalQuery: query }, 'Query sanitization resulted in empty string')
      this.metrics.incrementCounter('city.search.invalid_query')
      return []
    }

    const cacheKey = this.generateCacheKey(sanitizedQuery)
    const cachedResults = await this.cacheManager.get<City[]>(cacheKey)
    if (cachedResults) {
      logger.info(
        { query: sanitizedQuery, resultCount: cachedResults.length },
        'City search cache hit'
      )
      this.metrics.incrementCounter('city.search.cache_hit')

      const duration = Date.now() - startTime
      this.metrics.recordTiming('city.search.duration', duration, { cache: 'hit' })

      return cachedResults.slice(0, limit)
    }

    logger.info({ query: sanitizedQuery }, 'City search cache miss, fetching from API')
    this.metrics.incrementCounter('city.search.cache_miss')

    const apiStartTime = Date.now()
    const cities = await this.weatherClient.searchCities(sanitizedQuery)
    const apiDuration = Date.now() - apiStartTime

    logger.info(
      { query: sanitizedQuery, resultCount: cities.length, apiDuration },
      'City search API call completed'
    )
    this.metrics.recordTiming('city.search.api_call', apiDuration)

    const orderedCities = this.orderByRelevance(cities, sanitizedQuery)
    await this.cacheManager.set(cacheKey, orderedCities, this.CACHE_TTL_SECONDS)

    const totalDuration = Date.now() - startTime
    this.metrics.recordTiming('city.search.duration', totalDuration, { cache: 'miss' })

    logger.info(
      { query: sanitizedQuery, resultCount: orderedCities.length, totalDuration },
      'City search completed'
    )

    return orderedCities.slice(0, limit)
  }

  /**
   * Sanitize search query to remove special characters and normalize input.
   *
   * @param query - Raw search query
   * @returns Sanitized query string
   */
  private sanitizeQuery(query: string): string {
    let sanitized = query.trim()
    sanitized = sanitized.replace(/[^a-zA-Z0-9\s\-']/g, '')
    sanitized = sanitized.replace(/\s+/g, ' ')
    sanitized = sanitized.trim()

    return sanitized
  }

  /**
   * Order cities by relevance to the search query.
   * Exact matches come first, then ordered by population.
   *
   * @param cities - Array of cities to order
   * @param query - The search query (sanitized)
   * @returns Ordered array of cities
   */
  private orderByRelevance(cities: City[], query: string): City[] {
    const queryLower = query.toLowerCase()

    return cities.sort((a, b) => {
      const aNameLower = a.name.toLowerCase()
      const bNameLower = b.name.toLowerCase()
      const aExactMatch = aNameLower === queryLower
      const bExactMatch = bNameLower === queryLower

      if (aExactMatch && !bExactMatch) return -1
      if (!aExactMatch && bExactMatch) return 1

      const aPopulation = a.population || 0
      const bPopulation = b.population || 0

      if (aPopulation !== bPopulation) {
        return bPopulation - aPopulation
      }

      return aNameLower.localeCompare(bNameLower)
    })
  }

  /**
   * Generate cache key for a sanitized query.
   *
   * @param sanitizedQuery - The sanitized search query
   * @returns Cache key string
   */
  private generateCacheKey(sanitizedQuery: string): string {
    return `${this.CACHE_KEY_PREFIX}${sanitizedQuery.toLowerCase()}`
  }
}
