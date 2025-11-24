import AppError from './app_error.js'

/**
 * Exception thrown when input validation fails.
 * Tracks the specific field and value that caused the validation error.
 */
export default class ValidationException extends AppError {
  /**
   * The field that failed validation
   */
  public readonly field?: string

  /**
   * The value that failed validation
   */
  public readonly value?: any

  constructor(message: string, field?: string, value?: any) {
    const details: Record<string, any> = {}

    if (field !== undefined) {
      details.field = field
    }

    if (value !== undefined) {
      details.value = value
    }

    super(
      message,
      400, // Bad Request
      'VALIDATION_ERROR',
      Object.keys(details).length > 0 ? details : undefined
    )

    this.field = field
    this.value = value
  }

  /**
   * Create a ValidationException for invalid coordinates
   */
  static invalidCoordinates(latitude: number, longitude: number): ValidationException {
    return new ValidationException(
      `Invalid coordinates: latitude must be between -90 and 90, longitude must be between -180 and 180`,
      'coordinates',
      { latitude, longitude }
    )
  }

  /**
   * Create a ValidationException for invalid input
   */
  static invalidInput(field: string, value: any, reason: string): ValidationException {
    return new ValidationException(`Invalid ${field}: ${reason}`, field, value)
  }
}
