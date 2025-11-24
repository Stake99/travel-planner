import { test } from '@japa/runner'
import * as fc from 'fast-check'
import CacheManager from '#clients/cache_manager'

test.group('CacheManager - Property-Based Tests', () => {
  /**
   * Feature: travel-planning-graphql-api, Property 10: Cache hit reduces API calls
   * Validates: Requirements 10.1, 10.2
   *
   * For any city search or weather request, if the same query is made within
   * the cache TTL window, the second request should return cached data without
   * calling the external API.
   *
   * This property verifies that:
   * 1. Setting a value and immediately getting it returns the same value
   * 2. Multiple gets of the same key return consistent results
   * 3. Cache hits work for any valid key-value pair
   */
  test('Property 10: Cache hit reduces API calls - getting a cached value returns the same value', async ({
    assert,
  }) => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1 }), // cache key
        fc.anything(), // cache value (any JSON-serializable value)
        fc.integer({ min: 1, max: 3600 }), // TTL in seconds
        async (key, value, ttl) => {
          const cache = new CacheManager()

          // Set the value in cache
          await cache.set(key, value, ttl)

          // First get - should return the cached value
          const firstGet = await cache.get(key)

          // Second get - should also return the cached value (cache hit)
          const secondGet = await cache.get(key)

          // Both gets should return the same value that was set
          assert.deepEqual(firstGet, value)
          assert.deepEqual(secondGet, value)
          assert.deepEqual(firstGet, secondGet)
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Feature: travel-planning-graphql-api, Property 11: Cache expiration
   * Validates: Requirements 10.3
   *
   * For any cached data, after the TTL expires, the next request should
   * fetch fresh data from the external API and update the cache.
   *
   * This property verifies that:
   * 1. Values are accessible before TTL expires
   * 2. Values are not accessible after TTL expires
   * 3. Expired entries return null (indicating cache miss)
   */
  test('Property 11: Cache expiration - expired entries return null', async ({ assert }) => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1 }), // cache key
        fc.anything(), // cache value
        async (key, value) => {
          const cache = new CacheManager()

          // Use a very short TTL (1 millisecond) to test expiration
          const ttl = 0.001 // 1 millisecond

          // Set the value in cache
          await cache.set(key, value, ttl)

          // Wait for the TTL to expire (10ms to be safe)
          await new Promise((resolve) => setTimeout(resolve, 10))

          // Get should return null after expiration
          const result = await cache.get(key)

          assert.isNull(result)
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Additional property: Cache isolation - different keys don't interfere
   *
   * This verifies that setting/getting one key doesn't affect other keys.
   */
  test('Property: Cache isolation - different keys are independent', async ({ assert }) => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1 }),
        fc.string({ minLength: 1 }),
        fc.anything(),
        fc.anything(),
        fc.integer({ min: 1, max: 3600 }),
        async (key1, key2, value1, value2, ttl) => {
          // Skip if keys are the same
          fc.pre(key1 !== key2)

          const cache = new CacheManager()

          // Set both values
          await cache.set(key1, value1, ttl)
          await cache.set(key2, value2, ttl)

          // Get both values
          const result1 = await cache.get(key1)
          const result2 = await cache.get(key2)

          // Each key should return its own value
          assert.deepEqual(result1, value1)
          assert.deepEqual(result2, value2)
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Additional property: Cache overwrite - setting the same key twice updates the value
   */
  test('Property: Cache overwrite - setting a key twice updates the value', async ({ assert }) => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1 }),
        fc.anything(),
        fc.anything(),
        fc.integer({ min: 1, max: 3600 }),
        async (key, value1, value2, ttl) => {
          const cache = new CacheManager()

          // Set first value
          await cache.set(key, value1, ttl)

          // Set second value (overwrite)
          await cache.set(key, value2, ttl)

          // Get should return the second value
          const result = await cache.get(key)

          assert.deepEqual(result, value2)
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Additional property: Delete removes entries
   */
  test('Property: Delete removes entries from cache', async ({ assert }) => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1 }),
        fc.anything(),
        fc.integer({ min: 1, max: 3600 }),
        async (key, value, ttl) => {
          const cache = new CacheManager()

          // Set value
          await cache.set(key, value, ttl)

          // Verify it's there
          const beforeDelete = await cache.get(key)
          assert.deepEqual(beforeDelete, value)

          // Delete it
          await cache.delete(key)

          // Should return null after deletion
          const afterDelete = await cache.get(key)
          assert.isNull(afterDelete)
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Additional property: Clear removes all entries
   */
  test('Property: Clear removes all entries from cache', async ({ assert }) => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(fc.string({ minLength: 1 }), { minLength: 1, maxLength: 10 }),
        fc.array(fc.anything(), { minLength: 1, maxLength: 10 }),
        fc.integer({ min: 1, max: 3600 }),
        async (keys, values, ttl) => {
          // Ensure we have the same number of keys and values
          const pairs = keys.slice(0, Math.min(keys.length, values.length)).map((key, i) => ({
            key,
            value: values[i],
          }))

          const cache = new CacheManager()

          // Set all values
          for (const { key, value } of pairs) {
            await cache.set(key, value, ttl)
          }

          // Clear the cache
          await cache.clear()

          // All keys should return null
          for (const { key } of pairs) {
            const result = await cache.get(key)
            assert.isNull(result)
          }
        }
      ),
      { numRuns: 100 }
    )
  })
})
