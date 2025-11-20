/*
|--------------------------------------------------------------------------
| Environment variables service
|--------------------------------------------------------------------------
|
| The `Env.create` method creates an instance of the Env service. The
| service validates the environment variables and also cast values
| to JavaScript data types.
|
*/

import { Env } from '@adonisjs/core/env'

export default await Env.create(new URL('../', import.meta.url), {
  NODE_ENV: Env.schema.enum(['development', 'production', 'test'] as const),
  PORT: Env.schema.number(),
  APP_KEY: Env.schema.string(),
  HOST: Env.schema.string({ format: 'host' }),
  LOG_LEVEL: Env.schema.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']),

  /*
  |----------------------------------------------------------
  | Variables for configuring database connection
  |----------------------------------------------------------
  */
  DB_HOST: Env.schema.string({ format: 'host' }),
  DB_PORT: Env.schema.number(),
  DB_USER: Env.schema.string(),
  DB_PASSWORD: Env.schema.string.optional(),
  DB_DATABASE: Env.schema.string(),

  /*
  |----------------------------------------------------------
  | Variables for configuring GraphQL
  |----------------------------------------------------------
  */
  GRAPHQL_PLAYGROUND_ENABLED: Env.schema.boolean.optional(),
  GRAPHQL_INTROSPECTION_ENABLED: Env.schema.boolean.optional(),

  /*
  |----------------------------------------------------------
  | Variables for configuring cache
  |----------------------------------------------------------
  */
  CACHE_TTL_CITY_SEARCH: Env.schema.number.optional(),
  CACHE_TTL_WEATHER_FORECAST: Env.schema.number.optional(),

  /*
  |----------------------------------------------------------
  | Variables for configuring OpenMeteo API
  |----------------------------------------------------------
  */
  OPENMETEO_BASE_URL: Env.schema.string.optional(),
  OPENMETEO_GEOCODING_URL: Env.schema.string.optional(),
  OPENMETEO_TIMEOUT: Env.schema.number.optional(),
})
