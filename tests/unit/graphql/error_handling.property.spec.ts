import { test } from '@japa/runner'
import * as fc from 'fast-check'
import AppError from '#exceptions/app_error'
import ValidationException from '#exceptions/validation_exception'
import WeatherAPIException from '#exceptions/weather_api_exception'
import NotFoundException from '#exceptions/not_found_exception'
import { GraphQLError } from 'graphql'

test.group('GraphQL Error Handling - Property-Based Tests', () => {
  /**
   * Feature: travel-planning-graphql-api, Property 8: GraphQL error structure consistency
   * Validates: Requirements 4.3
   *
   * For any error condition (invalid input, API failure, not found), the GraphQL error
   * response should include a message, error code, and optional details field.
   *
   * This property verifies that:
   * 1. All errors have a message field
   * 2. All errors have a code in extensions
   * 3. Errors may have additional details in extensions
   * 4. Error structure is consistent across different error types
   */
  test('Property 8: GraphQL error structure consistency', async ({ assert }) => {
    await fc.assert(
      fc.asyncProperty(
        // Generate different types of errors with random data
        fc.oneof(
          // ValidationException
          fc.record({
            type: fc.constant('validation'),
            message: fc.string({ minLength: 1, maxLength: 100 }),
            field: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: undefined }),
            value: fc.option(fc.anything(), { nil: undefined }),
          }),
          // WeatherAPIException
          fc.record({
            type: fc.constant('weather_api'),
            message: fc.string({ minLength: 1, maxLength: 100 }),
            endpoint: fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: undefined }),
          }),
          // NotFoundException
          fc.record({
            type: fc.constant('not_found'),
            message: fc.string({ minLength: 1, maxLength: 100 }),
            resourceType: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: undefined }),
            resourceId: fc.option(
              fc.oneof(fc.string({ minLength: 1, maxLength: 50 }), fc.integer({ min: 1, max: 1000000 })),
              { nil: undefined }
            ),
          }),
          // Generic AppError
          fc.record({
            type: fc.constant('app_error'),
            message: fc.string({ minLength: 1, maxLength: 100 }),
            statusCode: fc.integer({ min: 400, max: 599 }),
            code: fc.string({ minLength: 1, maxLength: 50 }),
          })
        ),
        async (errorData) => {
          // Create the appropriate error based on type
          let error: AppError

          switch (errorData.type) {
            case 'validation':
              error = new ValidationException(
                errorData.message,
                errorData.field,
                errorData.value
              )
              break
            case 'weather_api':
              error = new WeatherAPIException(
                errorData.message,
                undefined,
                errorData.endpoint
              )
              break
            case 'not_found':
              error = new NotFoundException(
                errorData.message,
                errorData.resourceType,
                errorData.resourceId
              )
              break
            case 'app_error':
              error = new AppError(
                errorData.message,
                errorData.statusCode,
                errorData.code
              )
              break
            default:
              throw new Error('Unknown error type')
          }

          // Convert to GraphQL error format (simulating what Apollo Server does)
          const graphqlError = new GraphQLError(error.message, {
            extensions: {
              code: error.code,
              statusCode: error.statusCode,
              ...error.details,
            },
          })

          // Property 1: Error must have a message
          assert.isDefined(graphqlError.message, 'GraphQL error must have a message')
          assert.isString(graphqlError.message, 'GraphQL error message must be a string')
          assert.isTrue(
            graphqlError.message.length > 0,
            'GraphQL error message must not be empty'
          )

          // Property 2: Error must have extensions with code
          assert.isDefined(graphqlError.extensions, 'GraphQL error must have extensions')
          assert.isDefined(
            graphqlError.extensions.code,
            'GraphQL error extensions must have a code'
          )
          assert.isString(
            graphqlError.extensions.code,
            'GraphQL error code must be a string'
          )
          assert.isTrue(
            (graphqlError.extensions.code as string).length > 0,
            'GraphQL error code must not be empty'
          )

          // Property 3: Error must have statusCode in extensions
          assert.isDefined(
            graphqlError.extensions.statusCode,
            'GraphQL error extensions must have a statusCode'
          )
          assert.isNumber(
            graphqlError.extensions.statusCode,
            'GraphQL error statusCode must be a number'
          )
          assert.isTrue(
            (graphqlError.extensions.statusCode as number) >= 400 &&
              (graphqlError.extensions.statusCode as number) < 600,
            'GraphQL error statusCode must be in 4xx or 5xx range'
          )

          // Property 4: Error details should be preserved in extensions
          if (errorData.type === 'validation' && errorData.field) {
            assert.equal(
              graphqlError.extensions.field,
              errorData.field,
              'Validation error should preserve field in extensions'
            )
          }

          if (errorData.type === 'weather_api' && errorData.endpoint) {
            assert.equal(
              graphqlError.extensions.endpoint,
              errorData.endpoint,
              'Weather API error should preserve endpoint in extensions'
            )
          }

          if (errorData.type === 'not_found' && errorData.resourceType) {
            assert.equal(
              graphqlError.extensions.resourceType,
              errorData.resourceType,
              'Not found error should preserve resourceType in extensions'
            )
          }

          // Property 5: Error structure should be serializable to JSON
          const serialized = JSON.stringify({
            message: graphqlError.message,
            extensions: graphqlError.extensions,
          })

          assert.isDefined(serialized, 'GraphQL error should be serializable to JSON')
          assert.isTrue(serialized.length > 0, 'Serialized error should not be empty')

          // Verify we can parse it back
          const parsed = JSON.parse(serialized)
          assert.equal(parsed.message, graphqlError.message, 'Message should survive serialization')
          assert.equal(
            parsed.extensions.code,
            graphqlError.extensions.code,
            'Code should survive serialization'
          )
        }
      ),
      { numRuns: 100 }
    )
  })
})
