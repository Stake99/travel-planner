import AppError from './app_error.js'

/**
 * Exception thrown when a requested resource cannot be found.
 * Used for missing cities, invalid IDs, or other resource lookups.
 */
export default class NotFoundException extends AppError {
  /**
   * The type of resource that was not found
   */
  public readonly resourceType?: string

  /**
   * The identifier used to search for the resource
   */
  public readonly resourceId?: string | number

  constructor(message: string, resourceType?: string, resourceId?: string | number) {
    const details: Record<string, any> = {}

    if (resourceType !== undefined) {
      details.resourceType = resourceType
    }

    if (resourceId !== undefined) {
      details.resourceId = resourceId
    }

    super(
      message,
      404, // Not Found
      'NOT_FOUND',
      Object.keys(details).length > 0 ? details : undefined
    )

    this.resourceType = resourceType
    this.resourceId = resourceId
  }

  /**
   * Create a NotFoundException for a city that was not found
   */
  static city(cityId: number): NotFoundException {
    return new NotFoundException(`City not found: ${cityId}`, 'city', cityId)
  }

  /**
   * Create a NotFoundException for a generic resource
   */
  static resource(resourceType: string, resourceId: string | number): NotFoundException {
    return new NotFoundException(
      `${resourceType} not found: ${resourceId}`,
      resourceType,
      resourceId
    )
  }
}
