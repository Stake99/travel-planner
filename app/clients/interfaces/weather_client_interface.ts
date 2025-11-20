import { City } from '#models/city'
import { WeatherForecast } from '#models/weather'

/**
 * Interface for weather and geocoding client operations.
 * Abstracts external API communication to enable testing and potential provider switching.
 */
export interface IWeatherClient {
  /**
   * Search for cities by name (partial or complete match).
   *
   * @param query - The city name to search for
   * @returns Array of matching cities
   * @throws {WeatherAPIException} If the API request fails
   */
  searchCities(query: string): Promise<City[]>

  /**
   * Get weather forecast for specific coordinates.
   *
   * @param latitude - Latitude coordinate (-90 to 90)
   * @param longitude - Longitude coordinate (-180 to 180)
   * @param days - Number of forecast days (1-16)
   * @returns Weather forecast with daily data
   * @throws {WeatherAPIException} If the API request fails
   */
  getWeatherForecast(latitude: number, longitude: number, days: number): Promise<WeatherForecast>
}
