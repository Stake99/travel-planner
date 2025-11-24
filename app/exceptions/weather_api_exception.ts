import AppError from './app_error.js'

/**
 * Exception thrown when communication with the OpenMeteo API fails.
 * Wraps the original error to preserve context while providing
 * a consistent error interface.
 */
export default class WeatherAPIException extends AppError {
  /**
   * The original error that caused this exception
   */
  public readonly originalError?: Error

  /**
   * The endpoint that was being called when the error occurred
   */
  public readonly endpoint?: string

  constructor(message: string, originalError?: Error, endpoint?: string) {
    const details: Record<string, any> = {}

    if (originalError) {
      details.originalMessage = originalError.message
      details.originalName = originalError.name
    }

    if (endpoint) {
      details.endpoint = endpoint
    }

    super(
      message,
      502, // Bad Gateway - indicates upstream service failure
      'WEATHER_API_ERROR',
      Object.keys(details).length > 0 ? details : undefined
    )

    this.originalError = originalError
    this.endpoint = endpoint
  }

  /**
   * Create a WeatherAPIException for timeout errors
   */
  static timeout(endpoint: string, timeoutMs: number): WeatherAPIException {
    return new WeatherAPIException(
      `OpenMeteo API request timed out after ${timeoutMs}ms`,
      undefined,
      endpoint
    )
  }

  /**
   * Create a WeatherAPIException for network errors
   */
  static networkError(originalError: Error, endpoint: string): WeatherAPIException {
    return new WeatherAPIException('Unable to connect to OpenMeteo API', originalError, endpoint)
  }

  /**
   * Create a WeatherAPIException for API errors (4xx, 5xx responses)
   */
  static apiError(statusCode: number, message: string, endpoint: string): WeatherAPIException {
    return new WeatherAPIException(
      `OpenMeteo API returned error ${statusCode}: ${message}`,
      undefined,
      endpoint
    )
  }

  /**
   * Create a WeatherAPIException for malformed response errors
   */
  static malformedResponse(endpoint: string, reason: string): WeatherAPIException {
    return new WeatherAPIException(
      `OpenMeteo API returned malformed response: ${reason}`,
      undefined,
      endpoint
    )
  }
}
