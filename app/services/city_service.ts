import { IWeatherClient } from '#clients/interfaces/weather_client_interface'
import { ICacheManager } from '#clients/interfaces/cache_manager_interface'
import { City } from '#models/city'

/**
 * Service for city search operations.
 * Orchestrates city search with caching and result ordering.
 */
export class CityService {
  private readonly CACHE_TTL_SECONDS = 3600 // 1 hour
  private readonly CACHE_KEY_PREFIX = 'city:search:'

  constructor(
    private readonly weatherClient: IWeatherClient,
    private readonly cacheManager: ICacheManager
  ) {}

  /**
   * Search for cities by name with caching and relevance ordering.
   *
   * @param query - The city name to search for (partial or complete)
   * @param limit - Maximum number of results to return (default: 10)
   * @returns Array of matching cities ordered by relevance
   */
  async searchCities(query: string, limit: number = 10): Promise<City[]> {
    // Handle empty query - return empty array per requirements 1.3
    if (!query || query.trim().length === 0) {
      return []
    }

    // Sanitize the query for consistent caching and safe API calls
    const sanitizedQuery = this.sanitizeQuery(query)

    // Return empty array if sanitization results in empty string
    if (sanitizedQuery.length === 0) {
      return []
    }

    // Generate cache key
    const cacheKey = this.generateCacheKey(sanitizedQuery)

    // Check cache first
    const cachedResults = await this.cacheManager.get<City[]>(cacheKey)
    if (cachedResults) {
      // Return limited results from cache
      return cachedResults.slice(0, limit)
    }

    // Cache miss - fetch from API
    const cities = await this.weatherClient.searchCities(sanitizedQuery)

    // Order results by relevance
    const orderedCities = this.orderByRelevance(cities, sanitizedQuery)

    // Cache the ordered results
    await this.cacheManager.set(cacheKey, orderedCities, this.CACHE_TTL_SECONDS)

    // Return limited results
    return orderedCities.slice(0, limit)
  }

  /**
   * Sanitize search query to remove special characters and normalize input.
   * Handles special characters gracefully per requirements 1.5.
   *
   * @param query - Raw search query
   * @returns Sanitized query string
   */
  private sanitizeQuery(query: string): string {
    // Trim whitespace
    let sanitized = query.trim()

    // Remove special characters that could cause API issues
    // Keep letters, numbers, spaces, hyphens, and apostrophes (common in city names)
    sanitized = sanitized.replace(/[^a-zA-Z0-9\s\-']/g, '')

    // Collapse multiple spaces into single space
    sanitized = sanitized.replace(/\s+/g, ' ')

    // Trim again after replacements
    sanitized = sanitized.trim()

    return sanitized
  }

  /**
   * Order cities by relevance to the search query.
   * Exact matches come first, then ordered by population.
   * Per requirements 1.1, 1.2.
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

      // Exact match comes first
      const aExactMatch = aNameLower === queryLower
      const bExactMatch = bNameLower === queryLower

      if (aExactMatch && !bExactMatch) return -1
      if (!aExactMatch && bExactMatch) return 1

      // Then by population (descending) - cities with higher population are more relevant
      const aPopulation = a.population || 0
      const bPopulation = b.population || 0

      if (aPopulation !== bPopulation) {
        return bPopulation - aPopulation
      }

      // If population is the same, maintain stable sort by name
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
