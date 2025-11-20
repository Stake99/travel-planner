import { test } from '@japa/runner'
import AppError from '#exceptions/app_error'
import ValidationException from '#exceptions/validation_exception'
import WeatherAPIException from '#exceptions/weather_api_exception'
import NotFoundException from '#exceptions/not_found_exception'
import CacheException from '#exceptions/cache_exception'

test.group('Exception Classes', () => {
  test('AppError should create base error with correct properties', ({ assert }) => {
    const error = new AppError('Test error', 500, 'TEST_ERROR', { key: 'value' })

    assert.equal(error.message, 'Test error')
    assert.equal(error.statusCode, 500)
    assert.equal(error.code, 'TEST_ERROR')
    assert.deepEqual(error.details, { key: 'value' })
    assert.equal(error.name, 'AppError')
  })

  test('AppError should convert to JSON correctly', ({ assert }) => {
    const error = new AppError('Test error', 400, 'BAD_REQUEST', { field: 'test' })
    const json = error.toJSON()

    assert.deepEqual(json, {
      message: 'Test error',
      code: 'BAD_REQUEST',
      statusCode: 400,
      details: { field: 'test' },
    })
  })

  test('ValidationException should track field and value', ({ assert }) => {
    const error = new ValidationException('Invalid input', 'email', 'not-an-email')

    assert.equal(error.message, 'Invalid input')
    assert.equal(error.statusCode, 400)
    assert.equal(error.code, 'VALIDATION_ERROR')
    assert.equal(error.field, 'email')
    assert.equal(error.value, 'not-an-email')
    assert.deepEqual(error.details, { field: 'email', value: 'not-an-email' })
  })

  test('ValidationException.invalidCoordinates should create proper error', ({ assert }) => {
    const error = ValidationException.invalidCoordinates(200, 50)

    assert.equal(error.statusCode, 400)
    assert.equal(error.code, 'VALIDATION_ERROR')
    assert.equal(error.field, 'coordinates')
    assert.deepEqual(error.value, { latitude: 200, longitude: 50 })
    assert.include(error.message, 'Invalid coordinates')
  })

  test('ValidationException.invalidInput should create proper error', ({ assert }) => {
    const error = ValidationException.invalidInput('days', -1, 'must be positive')

    assert.equal(error.statusCode, 400)
    assert.equal(error.code, 'VALIDATION_ERROR')
    assert.equal(error.field, 'days')
    assert.equal(error.value, -1)
    assert.include(error.message, 'Invalid days')
    assert.include(error.message, 'must be positive')
  })

  test('WeatherAPIException should wrap original error', ({ assert }) => {
    const originalError = new Error('Network timeout')
    const error = new WeatherAPIException('API failed', originalError, '/forecast')

    assert.equal(error.message, 'API failed')
    assert.equal(error.statusCode, 502)
    assert.equal(error.code, 'WEATHER_API_ERROR')
    assert.equal(error.originalError, originalError)
    assert.equal(error.endpoint, '/forecast')
    assert.deepEqual(error.details, {
      originalMessage: 'Network timeout',
      originalName: 'Error',
      endpoint: '/forecast',
    })
  })

  test('WeatherAPIException.timeout should create proper error', ({ assert }) => {
    const error = WeatherAPIException.timeout('/forecast', 5000)

    assert.equal(error.statusCode, 502)
    assert.equal(error.code, 'WEATHER_API_ERROR')
    assert.equal(error.endpoint, '/forecast')
    assert.include(error.message, 'timed out')
    assert.include(error.message, '5000ms')
  })

  test('WeatherAPIException.networkError should create proper error', ({ assert }) => {
    const originalError = new Error('Connection refused')
    const error = WeatherAPIException.networkError(originalError, '/search')

    assert.equal(error.statusCode, 502)
    assert.equal(error.code, 'WEATHER_API_ERROR')
    assert.equal(error.originalError, originalError)
    assert.include(error.message, 'Unable to connect')
  })

  test('WeatherAPIException.apiError should create proper error', ({ assert }) => {
    const error = WeatherAPIException.apiError(500, 'Internal Server Error', '/forecast')

    assert.equal(error.statusCode, 502)
    assert.equal(error.code, 'WEATHER_API_ERROR')
    assert.include(error.message, '500')
    assert.include(error.message, 'Internal Server Error')
  })

  test('WeatherAPIException.malformedResponse should create proper error', ({ assert }) => {
    const error = WeatherAPIException.malformedResponse('/forecast', 'missing required fields')

    assert.equal(error.statusCode, 502)
    assert.equal(error.code, 'WEATHER_API_ERROR')
    assert.include(error.message, 'malformed response')
    assert.include(error.message, 'missing required fields')
  })

  test('NotFoundException should track resource type and ID', ({ assert }) => {
    const error = new NotFoundException('Resource not found', 'city', 12345)

    assert.equal(error.message, 'Resource not found')
    assert.equal(error.statusCode, 404)
    assert.equal(error.code, 'NOT_FOUND')
    assert.equal(error.resourceType, 'city')
    assert.equal(error.resourceId, 12345)
    assert.deepEqual(error.details, { resourceType: 'city', resourceId: 12345 })
  })

  test('NotFoundException.city should create proper error', ({ assert }) => {
    const error = NotFoundException.city(999)

    assert.equal(error.statusCode, 404)
    assert.equal(error.code, 'NOT_FOUND')
    assert.equal(error.resourceType, 'city')
    assert.equal(error.resourceId, 999)
    assert.include(error.message, 'City not found')
    assert.include(error.message, '999')
  })

  test('NotFoundException.resource should create proper error', ({ assert }) => {
    const error = NotFoundException.resource('user', 'abc123')

    assert.equal(error.statusCode, 404)
    assert.equal(error.code, 'NOT_FOUND')
    assert.equal(error.resourceType, 'user')
    assert.equal(error.resourceId, 'abc123')
    assert.include(error.message, 'user not found')
  })

  test('CacheException should track operation and key', ({ assert }) => {
    const originalError = new Error('Redis connection failed')
    const error = new CacheException('Cache failed', 'get', 'city:123', originalError)

    assert.equal(error.message, 'Cache failed')
    assert.equal(error.statusCode, 500)
    assert.equal(error.code, 'CACHE_ERROR')
    assert.equal(error.operation, 'get')
    assert.equal(error.cacheKey, 'city:123')
    assert.equal(error.originalError, originalError)
    assert.deepEqual(error.details, {
      operation: 'get',
      cacheKey: 'city:123',
      originalMessage: 'Redis connection failed',
      originalName: 'Error',
    })
  })

  test('CacheException.connectionError should create proper error', ({ assert }) => {
    const originalError = new Error('Connection refused')
    const error = CacheException.connectionError(originalError)

    assert.equal(error.statusCode, 500)
    assert.equal(error.code, 'CACHE_ERROR')
    assert.equal(error.originalError, originalError)
    assert.include(error.message, 'Failed to connect')
  })

  test('CacheException.getError should create proper error', ({ assert }) => {
    const originalError = new Error('Key not found')
    const error = CacheException.getError('weather:123', originalError)

    assert.equal(error.statusCode, 500)
    assert.equal(error.code, 'CACHE_ERROR')
    assert.equal(error.operation, 'get')
    assert.equal(error.cacheKey, 'weather:123')
    assert.include(error.message, 'retrieve')
  })

  test('CacheException.setError should create proper error', ({ assert }) => {
    const originalError = new Error('Write failed')
    const error = CacheException.setError('city:456', originalError)

    assert.equal(error.statusCode, 500)
    assert.equal(error.code, 'CACHE_ERROR')
    assert.equal(error.operation, 'set')
    assert.equal(error.cacheKey, 'city:456')
    assert.include(error.message, 'store')
  })

  test('CacheException.deleteError should create proper error', ({ assert }) => {
    const originalError = new Error('Delete failed')
    const error = CacheException.deleteError('city:789', originalError)

    assert.equal(error.statusCode, 500)
    assert.equal(error.code, 'CACHE_ERROR')
    assert.equal(error.operation, 'delete')
    assert.equal(error.cacheKey, 'city:789')
    assert.include(error.message, 'delete')
  })

  test('CacheException.serializationError should create proper error', ({ assert }) => {
    const originalError = new Error('Cannot serialize circular structure')
    const error = CacheException.serializationError('data:123', originalError)

    assert.equal(error.statusCode, 500)
    assert.equal(error.code, 'CACHE_ERROR')
    assert.equal(error.operation, 'set')
    assert.include(error.message, 'serialize')
  })

  test('CacheException.deserializationError should create proper error', ({ assert }) => {
    const originalError = new Error('Invalid JSON')
    const error = CacheException.deserializationError('data:456', originalError)

    assert.equal(error.statusCode, 500)
    assert.equal(error.code, 'CACHE_ERROR')
    assert.equal(error.operation, 'get')
    assert.include(error.message, 'deserialize')
  })

  test('All exceptions should extend AppError', ({ assert }) => {
    const validationError = new ValidationException('test')
    const weatherError = new WeatherAPIException('test')
    const notFoundError = new NotFoundException('test')
    const cacheError = new CacheException('test')

    assert.instanceOf(validationError, AppError)
    assert.instanceOf(weatherError, AppError)
    assert.instanceOf(notFoundError, AppError)
    assert.instanceOf(cacheError, AppError)
  })

  test('All exceptions should have proper stack traces', ({ assert }) => {
    const error = new ValidationException('test')

    assert.isDefined(error.stack)
    assert.include(error.stack!, 'ValidationException')
  })
})
