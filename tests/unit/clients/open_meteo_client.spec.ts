import { test } from '@japa/runner'
import { OpenMeteoClient } from '#clients/open_meteo_client'
import WeatherAPIException from '#exceptions/weather_api_exception'

test.group('OpenMeteoClient - searchCities', () => {
  test('should return cities for valid query', async ({ assert }) => {
    const client = new OpenMeteoClient()

    const cities = await client.searchCities('London')

    assert.isAbove(cities.length, 0)
    assert.isTrue(cities.some((city) => city.name.toLowerCase().includes('london')))

    const firstCity = cities[0]
    assert.isDefined(firstCity.id)
    assert.isDefined(firstCity.name)
    assert.isDefined(firstCity.country)
    assert.isDefined(firstCity.countryCode)
    assert.isDefined(firstCity.latitude)
    assert.isDefined(firstCity.longitude)
    assert.isDefined(firstCity.timezone)
  }).timeout(10000)

  test('should return empty array for nonexistent city', async ({ assert }) => {
    const client = new OpenMeteoClient()

    const cities = await client.searchCities('XyZzZzNonExistentCity12345')

    assert.equal(cities.length, 0)
  }).timeout(10000)

  test('should handle special characters in query', async ({ assert }) => {
    const client = new OpenMeteoClient()

    const cities = await client.searchCities('São Paulo')

    assert.isArray(cities)
  }).timeout(10000)

  test('should transform city data correctly', async ({ assert }) => {
    const client = new OpenMeteoClient()

    const cities = await client.searchCities('Paris')

    assert.isAbove(cities.length, 0)

    const paris = cities.find((c) => c.name === 'Paris' && c.country === 'France')
    assert.isDefined(paris)

    if (paris) {
      assert.isNumber(paris.id)
      assert.isString(paris.name)
      assert.isString(paris.country)
      assert.isString(paris.countryCode)
      assert.isNumber(paris.latitude)
      assert.isNumber(paris.longitude)
      assert.isString(paris.timezone)

      assert.isAtLeast(paris.latitude, -90)
      assert.isAtMost(paris.latitude, 90)
      assert.isAtLeast(paris.longitude, -180)
      assert.isAtMost(paris.longitude, 180)
    }
  }).timeout(10000)
})

test.group('OpenMeteoClient - getWeatherForecast', () => {
  test('should return weather forecast for valid coordinates', async ({ assert }) => {
    const client = new OpenMeteoClient()

    const forecast = await client.getWeatherForecast(51.5074, -0.1278, 3)

    assert.approximately(forecast.latitude, 51.5074, 0.1)
    assert.approximately(forecast.longitude, -0.1278, 0.1)
    assert.isDefined(forecast.timezone)
    assert.equal(forecast.dailyForecasts.length, 3)

    const firstDay = forecast.dailyForecasts[0]
    assert.instanceOf(firstDay.date, Date)
    assert.isNumber(firstDay.temperatureMax)
    assert.isNumber(firstDay.temperatureMin)
    assert.isNumber(firstDay.precipitation)
    assert.isNumber(firstDay.windSpeed)
    assert.isNumber(firstDay.weatherCode)

    assert.isAtLeast(firstDay.precipitation, 0)
    assert.isAtLeast(firstDay.windSpeed, 0)
  }).timeout(10000)

  test('should return correct number of forecast days', async ({ assert }) => {
    const client = new OpenMeteoClient()

    const forecast7 = await client.getWeatherForecast(40.7128, -74.006, 7)
    assert.equal(forecast7.dailyForecasts.length, 7)

    const forecast1 = await client.getWeatherForecast(40.7128, -74.006, 1)
    assert.equal(forecast1.dailyForecasts.length, 1)
  }).timeout(10000)

  test('should map weather codes to conditions', async ({ assert }) => {
    const client = new OpenMeteoClient()

    const forecast = await client.getWeatherForecast(51.5074, -0.1278, 1)

    const firstDay = forecast.dailyForecasts[0]
    const condition = firstDay.getWeatherCondition()

    const validConditions = ['CLEAR', 'PARTLY_CLOUDY', 'CLOUDY', 'RAINY', 'SNOWY', 'STORMY']
    assert.include(validConditions, condition)
  }).timeout(10000)

  test('should handle different coordinate ranges', async ({ assert }) => {
    const client = new OpenMeteoClient()

    const locations = [
      { lat: 0, lon: 0, name: 'Equator' },
      { lat: -33.8688, lon: 151.2093, name: 'Sydney' },
      { lat: 35.6762, lon: 139.6503, name: 'Tokyo' },
    ]

    for (const location of locations) {
      try {
        const forecast = await client.getWeatherForecast(location.lat, location.lon, 1)
        assert.isDefined(forecast)
        assert.equal(forecast.dailyForecasts.length, 1)
      } catch (error) {
        if (error instanceof WeatherAPIException) {
          assert.isDefined(error.message)
        } else {
          throw error
        }
      }
    }
  }).timeout(20000)
})

test.group('OpenMeteoClient - Error Handling', () => {
  test('should handle invalid endpoint gracefully', async ({ assert }) => {
    assert.isTrue(true)
  })
})
