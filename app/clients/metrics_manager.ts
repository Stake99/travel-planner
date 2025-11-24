import logger from '@adonisjs/core/services/logger'
import type { IMetrics } from './interfaces/metrics_interface.js'

/**
 * Simple in-memory metrics manager implementation.
 * Logs metrics to the application logger for observability.
 *
 * In production, this could be replaced with a more sophisticated
 * implementation that sends metrics to services like Prometheus,
 * DataDog, or CloudWatch.
 */
export default class MetricsManager implements IMetrics {
  /**
   * Increment a counter metric
   */
  incrementCounter(name: string, value: number = 1, tags?: Record<string, string>): void {
    logger.debug({ metric: 'counter', name, value, tags }, `Counter: ${name} += ${value}`)
  }

  /**
   * Record a timing metric in milliseconds
   */
  recordTiming(name: string, durationMs: number, tags?: Record<string, string>): void {
    logger.info({ metric: 'timing', name, durationMs, tags }, `Timing: ${name} = ${durationMs}ms`)
  }

  /**
   * Record a gauge metric
   */
  recordGauge(name: string, value: number, tags?: Record<string, string>): void {
    logger.debug({ metric: 'gauge', name, value, tags }, `Gauge: ${name} = ${value}`)
  }
}
