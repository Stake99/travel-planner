import { IMetrics } from '#clients/interfaces/metrics_interface'

/**
 * Create a mock metrics manager for testing.
 * All methods are no-ops to avoid cluttering test output.
 */
export function createMockMetrics(): IMetrics {
  return {
    incrementCounter: () => {},
    recordTiming: () => {},
    recordGauge: () => {},
  }
}
