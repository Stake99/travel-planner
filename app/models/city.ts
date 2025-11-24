/**
 * City domain model representing a geographic location
 */
export class City {
  public readonly id: number
  public readonly name: string
  public readonly country: string
  public readonly countryCode: string
  public readonly latitude: number
  public readonly longitude: number
  public readonly timezone: string
  public readonly population?: number

  constructor(data: {
    id: number
    name: string
    country: string
    countryCode: string
    latitude: number
    longitude: number
    timezone: string
    population?: number
  }) {
    if (!data.id) {
      throw new Error('City id is required')
    }
    if (!data.name || data.name.trim().length === 0) {
      throw new Error('City name is required')
    }
    if (!data.country || data.country.trim().length === 0) {
      throw new Error('City country is required')
    }
    if (!data.countryCode || data.countryCode.trim().length === 0) {
      throw new Error('City countryCode is required')
    }
    if (data.latitude === undefined || data.latitude === null) {
      throw new Error('City latitude is required')
    }
    if (data.longitude === undefined || data.longitude === null) {
      throw new Error('City longitude is required')
    }
    if (!data.timezone || data.timezone.trim().length === 0) {
      throw new Error('City timezone is required')
    }

    if (data.latitude < -90 || data.latitude > 90) {
      throw new Error('City latitude must be between -90 and 90')
    }
    if (data.longitude < -180 || data.longitude > 180) {
      throw new Error('City longitude must be between -180 and 180')
    }

    if (data.population !== undefined && data.population < 0) {
      throw new Error('City population must be non-negative')
    }

    this.id = data.id
    this.name = data.name.trim()
    this.country = data.country.trim()
    this.countryCode = data.countryCode.trim()
    this.latitude = data.latitude
    this.longitude = data.longitude
    this.timezone = data.timezone.trim()
    this.population = data.population
  }
}
