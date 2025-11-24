/**
 * Interface for cache management operations.
 * Provides a consistent abstraction for caching that can be implemented
 * with in-memory storage, Redis, or other caching backends.
 */
// eslint-disable-next-line @typescript-eslint/naming-convention
export interface ICacheManager {
  /**
   * Retrieve a value from the cache by key.
   * Returns null if the key doesn't exist or has expired.
   *
   * @param key - The cache key
   * @returns The cached value or null if not found/expired
   */
  get<T>(key: string): Promise<T | null>

  /**
   * Store a value in the cache with a TTL (time-to-live).
   *
   * @param key - The cache key
   * @param value - The value to cache
   * @param ttlSeconds - Time-to-live in seconds
   */
  set<T>(key: string, value: T, ttlSeconds: number): Promise<void>

  /**
   * Delete a specific key from the cache.
   *
   * @param key - The cache key to delete
   */
  delete(key: string): Promise<void>

  /**
   * Clear all entries from the cache.
   */
  clear(): Promise<void>
}
