import { WeatherCondition } from '../types/enums.js'

/**
 * Daily weather forecast for a single day
 */
export class DailyForecast {
  public readonly date: Date
  public readonly temperatureMax: number
  public readonly temperatureMin: number
  public readonly precipitation: number
  public readonly windSpeed: number
  public readonly weatherCode: number

  constructor(data: {
    date: Date | string
    temperatureMax: number
    temperatureMin: number
    precipitation: number
    windSpeed: number
    weatherCode: number
  }) {
    if (!data.date) {
      throw new Error('DailyForecast date is required')
    }
    if (data.temperatureMax === undefined || data.temperatureMax === null) {
      throw new Error('DailyForecast temperatureMax is required')
    }
    if (data.temperatureMin === undefined || data.temperatureMin === null) {
      throw new Error('DailyForecast temperatureMin is required')
    }
    if (data.precipitation === undefined || data.precipitation === null) {
      throw new Error('DailyForecast precipitation is required')
    }
    if (data.windSpeed === undefined || data.windSpeed === null) {
      throw new Error('DailyForecast windSpeed is required')
    }
    if (data.weatherCode === undefined || data.weatherCode === null) {
      throw new Error('DailyForecast weatherCode is required')
    }

    if (data.precipitation < 0) {
      throw new Error('DailyForecast precipitation must be non-negative')
    }
    if (data.windSpeed < 0) {
      throw new Error('DailyForecast windSpeed must be non-negative')
    }

    this.date = typeof data.date === 'string' ? new Date(data.date) : data.date
    this.temperatureMax = data.temperatureMax
    this.temperatureMin = data.temperatureMin
    this.precipitation = data.precipitation
    this.windSpeed = data.windSpeed
    this.weatherCode = data.weatherCode
  }

  /**
   * Maps OpenMeteo weather code to WeatherCondition enum
   * Based on WMO Weather interpretation codes
   */
  getWeatherCondition(): WeatherCondition {
    if (this.weatherCode === 0 || this.weatherCode === 1) {
      return WeatherCondition.CLEAR
    }
    if (this.weatherCode === 2 || this.weatherCode === 3) {
      return WeatherCondition.PARTLY_CLOUDY
    }
    if (this.weatherCode >= 45 && this.weatherCode <= 48) {
      return WeatherCondition.CLOUDY
    }
    if (
      (this.weatherCode >= 51 && this.weatherCode <= 67) ||
      (this.weatherCode >= 80 && this.weatherCode <= 82)
    ) {
      return WeatherCondition.RAINY
    }
    if (
      (this.weatherCode >= 71 && this.weatherCode <= 77) ||
      (this.weatherCode >= 85 && this.weatherCode <= 86)
    ) {
      return WeatherCondition.SNOWY
    }
    if (this.weatherCode >= 95 && this.weatherCode <= 99) {
      return WeatherCondition.STORMY
    }

    return WeatherCondition.CLOUDY
  }
}

/**
 * Multi-day weather forecast for a location
 */
export class WeatherForecast {
  public readonly latitude: number
  public readonly longitude: number
  public readonly timezone: string
  public readonly dailyForecasts: DailyForecast[]

  constructor(data: {
    latitude: number
    longitude: number
    timezone: string
    dailyForecasts: DailyForecast[]
  }) {
    if (data.latitude === undefined || data.latitude === null) {
      throw new Error('WeatherForecast latitude is required')
    }
    if (data.longitude === undefined || data.longitude === null) {
      throw new Error('WeatherForecast longitude is required')
    }
    if (!data.timezone || data.timezone.trim().length === 0) {
      throw new Error('WeatherForecast timezone is required')
    }
    if (!data.dailyForecasts || !Array.isArray(data.dailyForecasts)) {
      throw new Error('WeatherForecast dailyForecasts must be an array')
    }
    if (data.dailyForecasts.length === 0) {
      throw new Error('WeatherForecast must have at least one daily forecast')
    }

    if (data.latitude < -90 || data.latitude > 90) {
      throw new Error('WeatherForecast latitude must be between -90 and 90')
    }
    if (data.longitude < -180 || data.longitude > 180) {
      throw new Error('WeatherForecast longitude must be between -180 and 180')
    }

    this.latitude = data.latitude
    this.longitude = data.longitude
    this.timezone = data.timezone.trim()
    this.dailyForecasts = data.dailyForecasts
  }
}
