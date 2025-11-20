import AppError from './app_error.js'

/**
 * Exception thrown when cache operations fail.
 * Used for cache connection errors, serialization issues,
 * or other cache-related problems.
 */
export default class CacheException extends AppError {
  /**
   * The cache operation that failed (get, set, delete, clear)
   */
  public readonly operation?: string

  /**
   * The cache key involved in the operation
   */
  public readonly cacheKey?: string

  /**
   * The original error that caused this exception
   */
  public readonly originalError?: Error

  constructor(message: string, operation?: string, cacheKey?: string, originalError?: Error) {
    const details: Record<string, any> = {}

    if (operation !== undefined) {
      details.operation = operation
    }

    if (cacheKey !== undefined) {
      details.cacheKey = cacheKey
    }

    if (originalError) {
      details.originalMessage = originalError.message
      details.originalName = originalError.name
    }

    super(
      message,
      500, // Internal Server Error - cache failures are internal issues
      'CACHE_ERROR',
      Object.keys(details).length > 0 ? details : undefined
    )

    this.operation = operation
    this.cacheKey = cacheKey
    this.originalError = originalError
  }

  /**
   * Create a CacheException for connection errors
   */
  static connectionError(originalError: Error): CacheException {
    return new CacheException(
      'Failed to connect to cache service',
      undefined,
      undefined,
      originalError
    )
  }

  /**
   * Create a CacheException for get operation failures
   */
  static getError(cacheKey: string, originalError: Error): CacheException {
    return new CacheException(
      `Failed to retrieve value from cache`,
      'get',
      cacheKey,
      originalError
    )
  }

  /**
   * Create a CacheException for set operation failures
   */
  static setError(cacheKey: string, originalError: Error): CacheException {
    return new CacheException(
      `Failed to store value in cache`,
      'set',
      cacheKey,
      originalError
    )
  }

  /**
   * Create a CacheException for delete operation failures
   */
  static deleteError(cacheKey: string, originalError: Error): CacheException {
    return new CacheException(
      `Failed to delete value from cache`,
      'delete',
      cacheKey,
      originalError
    )
  }

  /**
   * Create a CacheException for serialization errors
   */
  static serializationError(cacheKey: string, originalError: Error): CacheException {
    return new CacheException(
      `Failed to serialize value for cache storage`,
      'set',
      cacheKey,
      originalError
    )
  }

  /**
   * Create a CacheException for deserialization errors
   */
  static deserializationError(cacheKey: string, originalError: Error): CacheException {
    return new CacheException(
      `Failed to deserialize value from cache`,
      'get',
      cacheKey,
      originalError
    )
  }
}
