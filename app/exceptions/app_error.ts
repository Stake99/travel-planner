/**
 * Base error class for all application-specific errors.
 * Extends the native Error class to provide consistent error handling
 * across the application.
 */
export default class AppError extends Error {
  /**
   * HTTP status code associated with this error
   */
  public readonly statusCode: number

  /**
   * Error code for client identification
   */
  public readonly code: string

  /**
   * Additional error details
   */
  public readonly details?: Record<string, any>

  constructor(message: string, statusCode: number = 500, code: string = 'INTERNAL_SERVER_ERROR', details?: Record<string, any>) {
    super(message)
    this.name = this.constructor.name
    this.statusCode = statusCode
    this.code = code
    this.details = details

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor)
    }
  }

  /**
   * Convert error to JSON representation for API responses
   */
  toJSON() {
    return {
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      ...(this.details && { details: this.details }),
    }
  }
}
