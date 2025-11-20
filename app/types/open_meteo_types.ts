/**
 * OpenMeteo API response types
 * These types represent the structure of responses from the OpenMeteo API
 */

/**
 * Response from OpenMeteo Geocoding API for city search
 */
export interface OpenMeteoGeocodingResponse {
  results?: OpenMeteoCityResult[]
  generationtime_ms?: number
}

/**
 * Individual city result from geocoding API
 */
export interface OpenMeteoCityResult {
  id: number
  name: string
  latitude: number
  longitude: number
  elevation?: number
  feature_code?: string
  country_code: string
  country: string
  country_id?: number
  timezone: string
  population?: number
  postcodes?: string[]
  admin1?: string
  admin2?: string
  admin3?: string
  admin4?: string
  admin1_id?: number
  admin2_id?: number
  admin3_id?: number
  admin4_id?: number
}

/**
 * Response from OpenMeteo Weather Forecast API
 */
export interface OpenMeteoWeatherResponse {
  latitude: number
  longitude: number
  generationtime_ms: number
  utc_offset_seconds: number
  timezone: string
  timezone_abbreviation: string
  elevation: number
  daily_units?: {
    time: string
    temperature_2m_max: string
    temperature_2m_min: string
    precipitation_sum: string
    windspeed_10m_max: string
    weathercode: string
  }
  daily: {
    time: string[]
    temperature_2m_max: number[]
    temperature_2m_min: number[]
    precipitation_sum: number[]
    windspeed_10m_max: number[]
    weathercode: number[]
  }
}
