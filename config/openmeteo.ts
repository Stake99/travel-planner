import env from '#start/env'

export default {
  /**
   * OpenMeteo API base URL
   */
  baseUrl: env.get('OPENMETEO_BASE_URL') ?? 'https://api.open-meteo.com/v1',

  /**
   * OpenMeteo Geocoding API URL
   */
  geocodingUrl: env.get('OPENMETEO_GEOCODING_URL') ?? 'https://geocoding-api.open-meteo.com/v1',

  /**
   * Request timeout in milliseconds
   */
  timeout: env.get('OPENMETEO_TIMEOUT') ?? 5000,
}
