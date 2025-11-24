import { test } from '@japa/runner'
import * as fc from 'fast-check'
import { CityService } from '#services/city_service'
import { IWeatherClient } from '#clients/interfaces/weather_client_interface'
import { ICacheManager } from '#clients/interfaces/cache_manager_interface'
import { City } from '#models/city'
import { createMockMetrics } from '../helpers/mock_metrics.js'

test.group('CityService - Property-Based Tests', () => {
  /**
   * Feature: travel-planning-graphql-api, Property 1: City search returns relevant matches
   * Validates: Requirements 1.1, 1.2
   *
   * For any city name query (partial or complete), all returned cities should contain
   * the search string in their name, and results should be ordered by relevance
   * (exact matches first, then by population).
   *
   * This property verifies that:
   * 1. All returned cities contain the search query in their name (case-insensitive)
   * 2. Exact matches appear before partial matches
   * 3. Cities with higher population appear before cities with lower population (when match type is the same)
   * 4. The ordering is deterministic and stable
   */
  test('Property 1: City search returns relevant matches', async ({ assert }) => {
    await fc.assert(
      fc.asyncProperty(
        // Generate a search query (1-20 characters, letters only)
        fc.string({
          minLength: 1,
          maxLength: 20,
          unit: fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz'.split('')),
        }),
        // Generate a list of cities (0-20 cities)
        fc.array(
          fc.record({
            id: fc.integer({ min: 1, max: 1000000 }),
            name: fc
              .string({
                minLength: 1,
                maxLength: 50,
                unit: fc.constantFrom(
                  ...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ '.split('')
                ),
              })
              .filter((s) => s.trim().length > 0),
            country: fc
              .string({
                minLength: 1,
                maxLength: 50,
                unit: fc.constantFrom(
                  ...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ '.split('')
                ),
              })
              .filter((s) => s.trim().length > 0),
            countryCode: fc.string({
              minLength: 2,
              maxLength: 2,
              unit: fc.constantFrom(...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')),
            }),
            latitude: fc.double({ min: -90, max: 90 }),
            longitude: fc.double({ min: -180, max: 180 }),
            timezone: fc.constantFrom('UTC', 'America/New_York', 'Europe/London', 'Asia/Tokyo'),
            population: fc.option(fc.integer({ min: 0, max: 50000000 }), { nil: undefined }),
          }),
          { minLength: 0, maxLength: 20 }
        ),
        async (query, cityData) => {
          // Create City objects from the generated data
          const cities = cityData.map((data) => new City(data))

          // Filter cities to only include those that match the query
          // (simulating what the API would return)
          const matchingCities = cities.filter((city) =>
            city.name.toLowerCase().includes(query.toLowerCase())
          )

          // Create mock weather client that returns the matching cities
          const mockWeatherClient: IWeatherClient = {
            searchCities: async () => matchingCities,
            getWeatherForecast: async () => {
              throw new Error('Not implemented')
            },
          }

          // Create mock cache manager (always miss)
          const mockCacheManager: ICacheManager = {
            get: async () => null,
            set: async () => {},
            delete: async () => {},
            clear: async () => {},
          }

          const cityService = new CityService(
            mockWeatherClient,
            mockCacheManager,
            createMockMetrics()
          )

          // Execute the search
          const results = await cityService.searchCities(query)

          // Property 1: All results should contain the query in their name (case-insensitive)
          for (const city of results) {
            assert.isTrue(
              city.name.toLowerCase().includes(query.toLowerCase()),
              `City "${city.name}" should contain query "${query}"`
            )
          }

          // Property 2: Exact matches should come before partial matches
          const queryLower = query.toLowerCase()
          let foundPartialMatch = false

          for (const city of results) {
            const cityNameLower = city.name.toLowerCase()
            const isExactMatch = cityNameLower === queryLower

            if (foundPartialMatch && isExactMatch) {
              assert.fail(
                `Exact match "${city.name}" should appear before partial matches in results`
              )
            }

            if (!isExactMatch) {
              foundPartialMatch = true
            }
          }

          // Property 3: Within same match type, cities should be ordered by population (descending)
          // Group results by match type
          const exactMatches = results.filter((city) => city.name.toLowerCase() === queryLower)
          const partialMatches = results.filter((city) => city.name.toLowerCase() !== queryLower)

          // Check exact matches are ordered by population
          for (let i = 0; i < exactMatches.length - 1; i++) {
            const currentPop = exactMatches[i].population || 0
            const nextPop = exactMatches[i + 1].population || 0

            assert.isTrue(
              currentPop >= nextPop,
              `Exact matches should be ordered by population: ${exactMatches[i].name} (${currentPop}) should come before ${exactMatches[i + 1].name} (${nextPop})`
            )
          }

          // Check partial matches are ordered by population
          for (let i = 0; i < partialMatches.length - 1; i++) {
            const currentPop = partialMatches[i].population || 0
            const nextPop = partialMatches[i + 1].population || 0

            assert.isTrue(
              currentPop >= nextPop,
              `Partial matches should be ordered by population: ${partialMatches[i].name} (${currentPop}) should come before ${partialMatches[i + 1].name} (${nextPop})`
            )
          }

          // Property 4: Results should be deterministic (running twice gives same order)
          const results2 = await cityService.searchCities(query)
          assert.deepEqual(
            results.map((c) => c.id),
            results2.map((c) => c.id),
            'Results should be deterministic'
          )
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Feature: travel-planning-graphql-api, Property 2: City data transformation completeness
   * Validates: Requirements 1.4
   *
   * For any OpenMeteo geolocation API response, the transformed City object should
   * contain all required fields: name, country, countryCode, latitude, longitude, and timezone.
   *
   * This property verifies that:
   * 1. All required fields are present in the transformed City object
   * 2. Field values are correctly mapped from the API response
   * 3. Optional fields (like population) are handled correctly
   * 4. The transformation preserves data integrity
   */
  test('Property 2: City data transformation completeness', async ({ assert }) => {
    await fc.assert(
      fc.asyncProperty(
        // Generate a search query
        fc.string({
          minLength: 1,
          maxLength: 20,
          unit: fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz'.split('')),
        }),
        // Generate OpenMeteo-like city data with unique IDs
        fc.uniqueArray(
          fc.record({
            id: fc.integer({ min: 1, max: 1000000 }),
            name: fc
              .string({
                minLength: 1,
                maxLength: 50,
                unit: fc.constantFrom(
                  ...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ '.split('')
                ),
              })
              .filter((s) => s.trim().length > 0),
            country: fc
              .string({
                minLength: 1,
                maxLength: 50,
                unit: fc.constantFrom(
                  ...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ '.split('')
                ),
              })
              .filter((s) => s.trim().length > 0),
            countryCode: fc.string({
              minLength: 2,
              maxLength: 2,
              unit: fc.constantFrom(...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')),
            }),
            latitude: fc.double({ min: -90, max: 90, noNaN: true }),
            longitude: fc.double({ min: -180, max: 180, noNaN: true }),
            timezone: fc.constantFrom(
              'UTC',
              'America/New_York',
              'Europe/London',
              'Asia/Tokyo',
              'Australia/Sydney'
            ),
            population: fc.option(fc.integer({ min: 0, max: 50000000 }), { nil: undefined }),
          }),
          { minLength: 1, maxLength: 10, selector: (city) => city.id }
        ),
        async (query, apiCityData) => {
          // Transform the API data to City objects (simulating what OpenMeteoClient does)
          const cities = apiCityData.map(
            (data) =>
              new City({
                id: data.id,
                name: data.name,
                country: data.country,
                countryCode: data.countryCode,
                latitude: data.latitude,
                longitude: data.longitude,
                timezone: data.timezone,
                population: data.population,
              })
          )

          // Create mock weather client that returns the transformed cities
          const mockWeatherClient: IWeatherClient = {
            searchCities: async () => cities,
            getWeatherForecast: async () => {
              throw new Error('Not implemented')
            },
          }

          // Create mock cache manager (always miss)
          const mockCacheManager: ICacheManager = {
            get: async () => null,
            set: async () => {},
            delete: async () => {},
            clear: async () => {},
          }

          const cityService = new CityService(
            mockWeatherClient,
            mockCacheManager,
            createMockMetrics()
          )

          // Execute the search
          const results = await cityService.searchCities(query)

          // Property: All returned cities must have all required fields
          for (const city of results) {
            // Find the original data for this city by ID
            const originalData = apiCityData.find((d) => d.id === city.id)

            // This should always be found since we're returning the same cities
            assert.isDefined(originalData, `Should find original data for city ID ${city.id}`)
            if (!originalData) {
              continue
            }

            // Verify all required fields are present and non-empty
            assert.isDefined(city.id, 'City id should be defined')
            assert.isNumber(city.id, 'City id should be a number')
            assert.isTrue(city.id > 0, 'City id should be positive')

            assert.isDefined(city.name, 'City name should be defined')
            assert.isString(city.name, 'City name should be a string')
            assert.isTrue(city.name.trim().length > 0, 'City name should not be empty')

            assert.isDefined(city.country, 'City country should be defined')
            assert.isString(city.country, 'City country should be a string')
            assert.isTrue(city.country.trim().length > 0, 'City country should not be empty')

            assert.isDefined(city.countryCode, 'City countryCode should be defined')
            assert.isString(city.countryCode, 'City countryCode should be a string')
            assert.isTrue(
              city.countryCode.trim().length > 0,
              'City countryCode should not be empty'
            )

            assert.isDefined(city.latitude, 'City latitude should be defined')
            assert.isNumber(city.latitude, 'City latitude should be a number')
            assert.isTrue(
              city.latitude >= -90 && city.latitude <= 90,
              'City latitude should be in valid range'
            )

            assert.isDefined(city.longitude, 'City longitude should be defined')
            assert.isNumber(city.longitude, 'City longitude should be a number')
            assert.isTrue(
              city.longitude >= -180 && city.longitude <= 180,
              'City longitude should be in valid range'
            )

            assert.isDefined(city.timezone, 'City timezone should be defined')
            assert.isString(city.timezone, 'City timezone should be a string')
            assert.isTrue(city.timezone.trim().length > 0, 'City timezone should not be empty')

            // Verify optional fields are handled correctly
            if (originalData.population !== undefined) {
              assert.isDefined(city.population, 'City population should be defined when provided')
              if (city.population !== undefined) {
                assert.isNumber(city.population, 'City population should be a number')
                assert.isTrue(city.population >= 0, 'City population should be non-negative')
              }
            }

            // Verify data integrity - values should match original data (after trimming)
            assert.equal(city.id, originalData.id, 'City id should match original')
            assert.equal(
              city.name,
              originalData.name.trim(),
              'City name should match original (trimmed)'
            )
            assert.equal(
              city.country,
              originalData.country.trim(),
              'City country should match original (trimmed)'
            )
            assert.equal(
              city.countryCode,
              originalData.countryCode.trim(),
              'City countryCode should match original (trimmed)'
            )
            assert.equal(
              city.latitude,
              originalData.latitude,
              'City latitude should match original'
            )
            assert.equal(
              city.longitude,
              originalData.longitude,
              'City longitude should match original'
            )
            assert.equal(
              city.timezone,
              originalData.timezone.trim(),
              'City timezone should match original (trimmed)'
            )
            if (originalData.population !== undefined && city.population !== undefined) {
              assert.equal(
                city.population,
                originalData.population,
                'City population should match original'
              )
            }
          }
        }
      ),
      { numRuns: 100 }
    )
  })
})
