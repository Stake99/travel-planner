import { ICacheManager } from './interfaces/cache_manager_interface.js'
import mysql from 'mysql2/promise'
import logger from '@adonisjs/core/services/logger'

/**
 * MySQL-based cache manager for persistent caching across server restarts
 * and multiple application instances.
 *
 * This implementation stores cache entries in a MySQL database table,
 * providing durability and shared caching for clustered deployments.
 */
export class MySQLCacheManager implements ICacheManager {
  private pool: mysql.Pool

  constructor(config: {
    host: string
    port: number
    user: string
    password: string
    database: string
  }) {
    this.pool = mysql.createPool({
      host: config.host,
      port: config.port,
      user: config.user,
      password: config.password,
      database: config.database,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      enableKeepAlive: true,
      keepAliveInitialDelay: 0,
    })

    // Start cleanup interval
    this.startCleanupInterval()
  }

  /**
   * Retrieves a cached value by key
   *
   * @param key - The cache key
   * @returns The cached value or null if not found or expired
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const [rows] = await this.pool.execute<mysql.RowDataPacket[]>(
        'SELECT cache_value, expires_at FROM cache_entries WHERE cache_key = ? AND expires_at > NOW()',
        [key]
      )

      if (rows.length === 0) {
        logger.debug('Cache miss', { key })
        return null
      }

      const value = JSON.parse(rows[0].cache_value)
      logger.debug('Cache hit', { key })
      return value as T
    } catch (error) {
      logger.error('Error retrieving from cache', { key, error })
      return null
    }
  }

  /**
   * Stores a value in the cache with a TTL
   *
   * @param key - The cache key
   * @param value - The value to cache
   * @param ttlSeconds - Time to live in seconds
   */
  async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    try {
      const expiresAt = new Date(Date.now() + ttlSeconds * 1000)
      const cacheValue = JSON.stringify(value)

      await this.pool.execute(
        `INSERT INTO cache_entries (cache_key, cache_value, expires_at)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE
         cache_value = VALUES(cache_value),
         expires_at = VALUES(expires_at),
         updated_at = CURRENT_TIMESTAMP`,
        [key, cacheValue, expiresAt]
      )

      logger.debug('Cache set', { key, ttlSeconds })
    } catch (error) {
      logger.error('Error setting cache', { key, error })
      throw error
    }
  }

  /**
   * Deletes a specific cache entry
   *
   * @param key - The cache key to delete
   */
  async delete(key: string): Promise<void> {
    try {
      await this.pool.execute('DELETE FROM cache_entries WHERE cache_key = ?', [key])
      logger.debug('Cache deleted', { key })
    } catch (error) {
      logger.error('Error deleting from cache', { key, error })
      throw error
    }
  }

  /**
   * Clears all cache entries
   */
  async clear(): Promise<void> {
    try {
      await this.pool.execute('DELETE FROM cache_entries')
      logger.info('Cache cleared')
    } catch (error) {
      logger.error('Error clearing cache', { error })
      throw error
    }
  }

  /**
   * Removes expired cache entries
   * Called periodically to prevent database bloat
   */
  private async cleanup(): Promise<void> {
    try {
      const [result] = await this.pool.execute<mysql.ResultSetHeader>(
        'DELETE FROM cache_entries WHERE expires_at <= NOW()'
      )

      if (result.affectedRows > 0) {
        logger.info('Cache cleanup completed', { entriesRemoved: result.affectedRows })
      }
    } catch (error) {
      logger.error('Error during cache cleanup', { error })
    }
  }

  /**
   * Starts periodic cleanup of expired entries
   * Runs every 5 minutes
   */
  private startCleanupInterval(): void {
    setInterval(
      () => {
        this.cleanup()
      },
      5 * 60 * 1000
    ) // 5 minutes
  }

  /**
   * Closes the database connection pool
   * Should be called when shutting down the application
   */
  async close(): Promise<void> {
    try {
      await this.pool.end()
      logger.info('MySQL cache manager connection pool closed')
    } catch (error) {
      logger.error('Error closing MySQL cache manager', { error })
    }
  }

  /**
   * Gets cache statistics
   *
   * @returns Object containing cache statistics
   */
  async getStats(): Promise<{
    totalEntries: number
    expiredEntries: number
    activeEntries: number
  }> {
    try {
      const [totalRows] = await this.pool.execute<mysql.RowDataPacket[]>(
        'SELECT COUNT(*) as count FROM cache_entries'
      )

      const [expiredRows] = await this.pool.execute<mysql.RowDataPacket[]>(
        'SELECT COUNT(*) as count FROM cache_entries WHERE expires_at <= NOW()'
      )

      const [activeRows] = await this.pool.execute<mysql.RowDataPacket[]>(
        'SELECT COUNT(*) as count FROM cache_entries WHERE expires_at > NOW()'
      )

      return {
        totalEntries: totalRows[0].count,
        expiredEntries: expiredRows[0].count,
        activeEntries: activeRows[0].count,
      }
    } catch (error) {
      logger.error('Error getting cache stats', { error })
      return {
        totalEntries: 0,
        expiredEntries: 0,
        activeEntries: 0,
      }
    }
  }
}
