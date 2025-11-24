/**
 * Interface for metrics tracking and observability.
 * Provides methods for recording counters, timings, and other metrics.
 */
// eslint-disable-next-line @typescript-eslint/naming-convention
export interface IMetrics {
  /**
   * Increment a counter metric
   *
   * @param name - The metric name
   * @param value - The value to increment by (default: 1)
   * @param tags - Optional tags for the metric
   */
  incrementCounter(name: string, value?: number, tags?: Record<string, string>): void

  /**
   * Record a timing metric in milliseconds
   *
   * @param name - The metric name
   * @param durationMs - The duration in milliseconds
   * @param tags - Optional tags for the metric
   */
  recordTiming(name: string, durationMs: number, tags?: Record<string, string>): void

  /**
   * Record a gauge metric (a value that can go up or down)
   *
   * @param name - The metric name
   * @param value - The current value
   * @param tags - Optional tags for the metric
   */
  recordGauge(name: string, value: number, tags?: Record<string, string>): void
}
