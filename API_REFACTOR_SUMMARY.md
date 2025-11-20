# API Refactor Summary

## Changes Made

### 1. Version Prefix Added
All API routes now use the `/v1/api` prefix for versioning:
- GraphQL endpoint: `/v1/api/graphql`
- Apollo Sandbox: `/v1/api/graphql/sandbox`

### 2. Apollo Sandbox Enabled
- Apollo Sandbox is now accessible at `/v1/api/graphql/sandbox`
- Also accessible at `/v1/api/graphql` (GET request without query)
- Uses the official Apollo Sandbox embeddable component

### 3. JSON Request Support
- All endpoints accept JSON requests via Postman/curl
- Body parser middleware configured to handle `application/json`
- GraphQL POST endpoint properly parses JSON body

### 4. Route Structure
Routes are now organized with clear sections:
- Public routes (health, home)
- GraphQL routes (versioned)
- API routes (versioned, ready for controllers)

---

## Available Endpoints

### Public Endpoints

#### Health Check
```bash
GET /health
```

#### Home/Info
```bash
GET /
```

### GraphQL Endpoints

#### GraphQL Query (POST)
```bash
POST /v1/api/graphql
Content-Type: application/json

{
  "query": "query { searchCities(query: \"London\", limit: 5) { id name country } }",
  "variables": {},
  "operationName": null
}
```

#### Apollo Sandbox (GET)
```bash
GET /v1/api/graphql/sandbox
```
Opens the Apollo Sandbox interface in your browser.

#### GraphQL Query (GET - for simple queries)
```bash
GET /v1/api/graphql?query=query{searchCities(query:"London"){id name}}
```

---

## Testing with Postman

### 1. Search Cities Query

**Request:**
- Method: `POST`
- URL: `http://localhost:3333/v1/api/graphql`
- Headers:
  - `Content-Type: application/json`
- Body (raw JSON):
```json
{
  "query": "query { searchCities(query: \"London\", limit: 5) { id name country countryCode latitude longitude } }"
}
```

**Expected Response:**
```json
{
  "data": {
    "searchCities": [
      {
        "id": 2643743,
        "name": "London",
        "country": "United Kingdom",
        "countryCode": "GB",
        "latitude": 51.50853,
        "longitude": -0.12574
      }
    ]
  }
}
```

### 2. Weather Forecast Query

**Request:**
- Method: `POST`
- URL: `http://localhost:3333/v1/api/graphql`
- Headers:
  - `Content-Type: application/json`
- Body (raw JSON):
```json
{
  "query": "query { getWeatherForecast(input: { latitude: 51.5074 longitude: -0.1278 days: 7 }) { timezone dailyForecasts { date temperatureMax weatherCondition } } }"
}
```

### 3. Using Variables

**Request:**
- Method: `POST`
- URL: `http://localhost:3333/v1/api/graphql`
- Headers:
  - `Content-Type: application/json`
- Body (raw JSON):
```json
{
  "query": "query GetWeather($lat: Float!, $lon: Float!, $days: Int) { getWeatherForecast(input: { latitude: $lat longitude: $lon days: $days }) { timezone dailyForecasts { date temperatureMax } } }",
  "variables": {
    "lat": 51.5074,
    "lon": -0.1278,
    "days": 7
  }
}
```

---

## Testing with cURL

### Search Cities
```bash
curl -X POST http://localhost:3333/v1/api/graphql \
  -H "Content-Type: application/json" \
  -d '{
    "query": "query { searchCities(query: \"London\", limit: 5) { id name country } }"
  }'
```

### Weather Forecast
```bash
curl -X POST http://localhost:3333/v1/api/graphql \
  -H "Content-Type: application/json" \
  -d '{
    "query": "query { getWeatherForecast(input: { latitude: 51.5074 longitude: -0.1278 days: 7 }) { timezone dailyForecasts { date temperatureMax weatherCondition } } }"
  }'
```

---

## Apollo Sandbox

### Accessing the Sandbox

1. **Direct URL:**
   ```
   http://localhost:3333/v1/api/graphql/sandbox
   ```

2. **Via GraphQL Endpoint:**
   ```
   http://localhost:3333/v1/api/graphql
   ```
   (Opens sandbox if no query parameter is provided)

### Features
- Interactive GraphQL query editor
- Schema explorer
- Query history
- Variables editor
- Response viewer

---

## Route Structure Pattern

The routes file now follows this pattern for future expansion:

```typescript
const versionPrefix = '/v1/api'

// Example with middleware (as requested)
router.post(`${versionPrefix}/schedules`, async (context: HttpContext) => {
  return new SchedulesController().store(context)
}).use(middleware.auth()).use(middleware.role(['admin', 'Ops']))
```

### Ready for Controllers

You can now add controllers following this pattern:

```typescript
// Example: Cities Controller
router.get(`${versionPrefix}/cities`, async (context: HttpContext) => {
  return new CitiesController().index(context)
})

router.post(`${versionPrefix}/cities`, async (context: HttpContext) => {
  return new CitiesController().store(context)
}).use(middleware.auth())
```

---

## Configuration

### GraphQL Config
Updated in `config/graphql.ts`:
- Path: `/v1/api/graphql`
- Playground enabled: `true` (default)
- Introspection enabled: `true` (default)

### Environment Variables
```env
GRAPHQL_PLAYGROUND_ENABLED=true
GRAPHQL_INTROSPECTION_ENABLED=true
```

---

## Migration Notes

### Old Endpoints (Deprecated)
- ❌ `/graphql` - Use `/v1/api/graphql` instead

### New Endpoints
- ✅ `/v1/api/graphql` - GraphQL endpoint
- ✅ `/v1/api/graphql/sandbox` - Apollo Sandbox

---

## Next Steps

1. **Create Controllers:**
   - Create controllers in `app/controllers/`
   - Follow AdonisJS controller patterns
   - Use the version prefix for all routes

2. **Add Middleware:**
   - Use `middleware.auth()` for authenticated routes
   - Create custom middleware as needed
   - Apply to route groups or individual routes

3. **Expand API Routes:**
   - Add REST endpoints alongside GraphQL
   - Use the same version prefix
   - Follow the controller pattern shown above

---

## Testing Checklist

- [x] GraphQL POST endpoint accepts JSON
- [x] Apollo Sandbox accessible
- [x] Version prefix working
- [x] Health check endpoint working
- [x] Home endpoint updated with new paths
- [x] JSON body parsing working
- [x] Error handling maintained

---

## Summary

✅ **Versioned API:** All routes use `/v1/api` prefix  
✅ **Apollo Sandbox:** Fully functional and accessible  
✅ **JSON Support:** Works with Postman and curl  
✅ **Route Structure:** Ready for controller expansion  
✅ **Backward Compatible:** Old endpoints can be deprecated gradually  

The API is now ready for production use with proper versioning, sandbox access, and JSON request support!

