/**
 * Activity types available for ranking based on weather conditions
 */
export enum ActivityType {
  SKIING = 'SKIING',
  SURFING = 'SURFING',
  INDOOR_SIGHTSEEING = 'INDOOR_SIGHTSEEING',
  OUTDOOR_SIGHTSEEING = 'OUTDOOR_SIGHTSEEING',
}

/**
 * Weather conditions mapped from OpenMeteo weather codes
 */
export enum WeatherCondition {
  CLEAR = 'CLEAR',
  PARTLY_CLOUDY = 'PARTLY_CLOUDY',
  CLOUDY = 'CLOUDY',
  RAINY = 'RAINY',
  SNOWY = 'SNOWY',
  STORMY = 'STORMY',
}

/**
 * Suitability levels for activities based on score ranges
 */
export enum Suitability {
  EXCELLENT = 'EXCELLENT',
  GOOD = 'GOOD',
  FAIR = 'FAIR',
  POOR = 'POOR',
}
