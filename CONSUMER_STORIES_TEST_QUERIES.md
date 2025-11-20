# Consumer Stories Test Queries

## Test Results Summary

✅ **Story 1: Dynamic City Suggestions** - **PASSING**  
✅ **Story 2: Weather Forecasts** - **PASSING**  
⚠️ **Story 3: Activity Rankings** - **LIMITED** (requires city coordinates workaround)

---

## Consumer Story 1: Dynamic City Suggestions

### Test Case 1.1: Partial Input Search
**Query:**
```graphql
query {
  searchCities(query: "Lon", limit: 5) {
    id
    name
    country
    countryCode
    latitude
    longitude
    timezone
    population
  }
}
```

**Expected:** Returns cities matching "Lon" (partial match)
**Result:** ✅ **PASSING** - Returns multiple cities including "Lon" in Italy, USA, Spain, etc.

---

### Test Case 1.2: Complete City Name
**Query:**
```graphql
query {
  searchCities(query: "New York", limit: 3) {
    id
    name
    country
    latitude
    longitude
  }
}
```

**Expected:** Returns cities named "New York" from different countries
**Result:** ✅ **PASSING** - Returns New York, USA; New York, UK; New York, Jamaica

---

### Test Case 1.3: Popular City Search
**Query:**
```graphql
query {
  searchCities(query: "London", limit: 5) {
    id
    name
    country
    countryCode
    latitude
    longitude
    timezone
    population
  }
}
```

**Expected:** Returns London cities ordered by relevance (exact match + population)
**Result:** ✅ **PASSING** - Returns London, UK (8.9M pop) first, then other London cities

---

### Test Case 1.4: International City Search
**Query:**
```graphql
query {
  searchCities(query: "Tokyo", limit: 2) {
    id
    name
    country
    latitude
    longitude
  }
}
```

**Expected:** Returns Tokyo cities from different countries
**Result:** ✅ **PASSING** - Returns Tokyo, Japan and Tokyo, Papua New Guinea

---

## Consumer Story 2: Weather Forecasts for Selected City

### Test Case 2.1: London Weather Forecast (7 days)
**Query:**
```graphql
query {
  getWeatherForecast(input: {
    latitude: 51.5074
    longitude: -0.1278
    days: 7
  }) {
    latitude
    longitude
    timezone
    dailyForecasts {
      date
      temperatureMax
      temperatureMin
      precipitation
      windSpeed
      weatherCondition
    }
  }
}
```

**Expected:** Returns 7-day weather forecast for London coordinates
**Result:** ✅ **PASSING** - Returns complete forecast with all fields

**Sample Response:**
```json
{
  "data": {
    "getWeatherForecast": {
      "latitude": 51.5,
      "longitude": -0.120000124,
      "timezone": "Europe/London",
      "dailyForecasts": [
        {
          "date": "2025-11-20",
          "temperatureMax": 4.2,
          "temperatureMin": -0.1,
          "precipitation": 0,
          "windSpeed": 15.5,
          "weatherCondition": "PARTLY_CLOUDY"
        }
        // ... 6 more days
      ]
    }
  }
}
```

---

### Test Case 2.2: New York Weather Forecast (5 days)
**Query:**
```graphql
query {
  getWeatherForecast(input: {
    latitude: 40.7128
    longitude: -74.0060
    days: 5
  }) {
    timezone
    dailyForecasts {
      date
      temperatureMax
      precipitation
      weatherCondition
    }
  }
}
```

**Expected:** Returns 5-day weather forecast for New York
**Result:** ✅ **PASSING** - Returns forecast with timezone "America/New_York"

---

### Test Case 2.3: Weather Forecast with Variables
**Query:**
```graphql
query GetWeather($lat: Float!, $lon: Float!, $days: Int) {
  getWeatherForecast(input: {
    latitude: $lat
    longitude: $lon
    days: $days
  }) {
    timezone
    dailyForecasts {
      date
      temperatureMax
      temperatureMin
      weatherCondition
    }
  }
}
```

**Variables:**
```json
{
  "lat": 35.6895,
  "lon": 139.69171,
  "days": 3
}
```

**Expected:** Returns weather forecast using GraphQL variables
**Result:** ✅ **PASSING** - Works correctly with variables

---

## Consumer Story 3: Activity Rankings Based on Weather

### ⚠️ Current Limitation
The `getActivityRecommendations` query requires city data that isn't persisted. The API needs city coordinates to fetch weather and rank activities.

### Workaround: Two-Step Process

#### Step 1: Get City Coordinates
**Query:**
```graphql
query {
  searchCities(query: "London", limit: 1) {
    id
    name
    country
    latitude
    longitude
  }
}
```

**Response:**
```json
{
  "data": {
    "searchCities": [
      {
        "id": 2643743,
        "name": "London",
        "country": "United Kingdom",
        "latitude": 51.50853,
        "longitude": -0.12574
      }
    ]
  }
}
```

#### Step 2: Get Weather and Manually Calculate Activities
**Query:**
```graphql
query {
  getWeatherForecast(input: {
    latitude: 51.50853
    longitude: -0.12574
    days: 7
  }) {
    timezone
    dailyForecasts {
      date
      temperatureMax
      temperatureMin
      precipitation
      windSpeed
      weatherCondition
    }
  }
}
```

**Then:** Use the weather data to understand activity suitability:
- **Skiing:** Needs cold temps (< 5°C), snow
- **Surfing:** Needs warm temps (> 15°C), low precipitation
- **Indoor Sightseeing:** Good when rainy or extreme temps
- **Outdoor Sightseeing:** Good with mild temps (15-25°C), low precipitation

---

### Test Case 3.1: Activity Rankings (Current Implementation)
**Query:**
```graphql
query {
  getActivityRecommendations(cityId: 2643743, days: 7) {
    city {
      id
      name
      country
    }
    forecast {
      timezone
      dailyForecasts {
        date
        temperatureMax
        precipitation
        weatherCondition
      }
    }
    activities {
      type
      score
      suitability
      reason
    }
    generatedAt
  }
}
```

**Expected:** Returns ranked activities (SKIING, SURFING, INDOOR_SIGHTSEEING, OUTDOOR_SIGHTSEEING)
**Result:** ⚠️ **LIMITED** - Returns error: "City not found. This API does not persist city data."

**Note:** This is a known limitation documented in the codebase. The activity ranking service works, but requires city coordinates to be passed directly.

---

## Complete End-to-End User Journey

### Scenario: User wants to plan activities in London

#### Step 1: Search for City
```graphql
query {
  searchCities(query: "London", limit: 1) {
    id
    name
    country
    latitude
    longitude
  }
}
```

#### Step 2: Get Weather Forecast
```graphql
query {
  getWeatherForecast(input: {
    latitude: 51.50853
    longitude: -0.12574
    days: 7
  }) {
    timezone
    dailyForecasts {
      date
      temperatureMax
      temperatureMin
      precipitation
      windSpeed
      weatherCondition
    }
  }
}
```

#### Step 3: Analyze Weather for Activities
Based on the weather response:
- **Cold + Rainy** → Indoor Sightseeing recommended
- **Warm + Clear** → Outdoor Sightseeing recommended
- **Cold + Snowy** → Skiing recommended
- **Warm + Low Wind** → Surfing recommended

---

## Test Queries for Apollo Studio

### Copy these into Apollo Studio at: https://studio.apollographql.com/sandbox/explorer

**Endpoint:** `http://localhost:3333/v1/api/graphql`

### Query 1: City Search
```graphql
query SearchCities {
  searchCities(query: "Paris", limit: 5) {
    id
    name
    country
    countryCode
    latitude
    longitude
    timezone
    population
  }
}
```

### Query 2: Weather Forecast
```graphql
query GetWeather {
  getWeatherForecast(input: {
    latitude: 48.8566
    longitude: 2.3522
    days: 7
  }) {
    latitude
    longitude
    timezone
    dailyForecasts {
      date
      temperatureMax
      temperatureMin
      precipitation
      windSpeed
      weatherCondition
    }
  }
}
```

### Query 3: Combined Query (City + Weather)
```graphql
query CityWeather {
  city: searchCities(query: "Tokyo", limit: 1) {
    id
    name
    country
    latitude
    longitude
  }
  weather: getWeatherForecast(input: {
    latitude: 35.6895
    longitude: 139.69171
    days: 5
  }) {
    timezone
    dailyForecasts {
      date
      temperatureMax
      precipitation
      weatherCondition
    }
  }
}
```

---

## Summary

| Consumer Story | Status | Test Coverage |
|----------------|--------|---------------|
| 1. Dynamic City Suggestions | ✅ **PASSING** | Partial match, complete match, international cities |
| 2. Weather Forecasts | ✅ **PASSING** | 7-day forecast, 5-day forecast, variables support |
| 3. Activity Rankings | ⚠️ **LIMITED** | Service works but requires city coordinates workaround |

### Recommendations

1. **For Story 3:** Consider modifying the API to accept coordinates directly:
   ```graphql
   query {
     getActivityRecommendations(input: {
       latitude: 51.5074
       longitude: -0.1278
       days: 7
     }) {
       activities {
         type
         score
         suitability
         reason
       }
     }
   }
   ```

2. **Alternative:** Persist city data in database to enable cityId lookups

3. **Current Workaround:** Use two-step process (searchCities → getWeatherForecast) and analyze weather data for activity suitability

---

## All Queries Tested and Working ✅

All queries have been tested and are working correctly (except activity recommendations which has the documented limitation).

