import type { ICacheManager } from './interfaces/cache_manager_interface.js'

/**
 * Internal cache entry structure with expiration tracking
 */
interface CacheEntry<T> {
  value: T
  expiresAt: number
}

/**
 * In-memory cache manager implementation.
 * Provides TTL-based caching with automatic cleanup of expired entries.
 *
 * This implementation uses a Map for storage and is suitable for
 * single-instance deployments. For distributed systems, consider
 * implementing a Redis-based cache manager with the same interface.
 */
export default class CacheManager implements ICacheManager {
  private cache: Map<string, CacheEntry<any>>
  private readonly maxSize: number

  /**
   * Create a new CacheManager instance
   *
   * @param maxSize - Maximum number of entries before triggering cleanup (default: 1000)
   */
  constructor(maxSize: number = 1000) {
    this.cache = new Map()
    this.maxSize = maxSize
  }

  /**
   * Retrieve a value from the cache by key.
   * Automatically removes expired entries when encountered.
   *
   * @param key - The cache key
   * @returns The cached value or null if not found/expired
   */
  async get<T>(key: string): Promise<T | null> {
    const entry = this.cache.get(key)

    if (!entry) {
      return null
    }

    if (this.isExpired(entry)) {
      this.cache.delete(key)
      return null
    }

    return entry.value as T
  }

  /**
   * Store a value in the cache with a TTL.
   * Triggers cleanup if cache size exceeds maxSize.
   *
   * @param key - The cache key
   * @param value - The value to cache
   * @param ttlSeconds - Time-to-live in seconds
   */
  async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    const expiresAt = Date.now() + ttlSeconds * 1000

    this.cache.set(key, {
      value,
      expiresAt,
    })

    // Trigger cleanup if cache is getting too large
    if (this.cache.size > this.maxSize) {
      this.cleanup()
    }
  }

  /**
   * Delete a specific key from the cache.
   *
   * @param key - The cache key to delete
   */
  async delete(key: string): Promise<void> {
    this.cache.delete(key)
  }

  /**
   * Clear all entries from the cache.
   */
  async clear(): Promise<void> {
    this.cache.clear()
  }

  /**
   * Check if a cache entry has expired
   *
   * @param entry - The cache entry to check
   * @returns true if expired, false otherwise
   */
  private isExpired<T>(entry: CacheEntry<T>): boolean {
    return Date.now() > entry.expiresAt
  }

  /**
   * Remove all expired entries from the cache.
   * This method is called automatically when cache size exceeds maxSize.
   */
  private cleanup(): void {
    const now = Date.now()

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key)
      }
    }
  }

  /**
   * Get the current number of entries in the cache (including expired ones)
   * Useful for testing and monitoring
   */
  size(): number {
    return this.cache.size
  }
}
