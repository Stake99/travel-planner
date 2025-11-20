# Travel Planning GraphQL API

A scalable, production-ready GraphQL API for travel planning that provides city search, weather forecasts, and intelligent activity recommendations based on weather conditions. Built with clean architecture principles, comprehensive testing, and property-based testing for correctness guarantees.

## Key Features

- **City Search**: Dynamic city suggestions with partial name matching and relevance ranking
- **Weather Forecasts**: Multi-day weather forecasts with detailed conditions (temperature, precipitation, wind speed)
- **Activity Recommendations**: Intelligent ranking of activities (skiing, surfing, indoor/outdoor sightseeing) based on weather suitability
- **Clean Architecture**: Clear separation of concerns with dependency inversion and testability
- **Comprehensive Testing**: Unit tests, integration tests, and property-based tests for correctness
- **Caching Strategy**: Intelligent caching to reduce external API calls and improve response times
- **GraphQL API**: Type-safe, self-documenting API with introspection and playground
- **Production Ready**: Structured logging, error handling, and observability hooks

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Technology Stack](#technology-stack)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Configuration](#configuration)
  - [Running the Application](#running-the-application)
- [API Documentation](#api-documentation)
  - [GraphQL Queries](#graphql-queries)
  - [Example Requests](#example-requests)
- [Technical Decisions](#technical-decisions)
- [Testing](#testing)
- [Development Workflow](#development-workflow)
- [Deployment](#deployment)
- [Omissions and Trade-offs](#omissions-and-trade-offs)
- [Future Enhancements](#future-enhancements)
- [Contributing](#contributing)

## Architecture Overview

The application follows clean architecture principles with clear separation between layers:

```
┌─────────────────────────────────────────────────────────────┐
│                     GraphQL Layer                            │
│  (Schema, Resolvers, Type Definitions)                      │
│  - Handles HTTP requests                                     │
│  - Validates GraphQL queries                                 │
│  - Delegates to service layer                                │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                     Service Layer                            │
│  (CityService, WeatherService, ActivityRankingService)      │
│  - Contains business logic                                   │
│  - Orchestrates data operations                              │
│  - Independent of delivery mechanism                         │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                     Client Layer                             │
│  (OpenMeteoClient, CacheManager)                            │
│  - Abstracts external API communication                      │
│  - Handles HTTP requests/responses                           │
│  - Manages caching and error translation                     │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                  External Services                           │
│  (OpenMeteo API)                                            │
└─────────────────────────────────────────────────────────────┘
```

### Architecture Benefits

- **Testability**: Each layer can be tested independently with mocked dependencies
- **Maintainability**: Changes to external APIs are isolated to the client layer
- **Scalability**: Stateless services enable horizontal scaling
- **Flexibility**: Business logic is independent of GraphQL, allowing easy migration to REST or gRPC

## Technology Stack

### Core Framework
- **AdonisJS v6**: Full-featured Node.js framework with built-in IoC container, excellent TypeScript support, and integrated testing utilities

### GraphQL
- **Apollo Server v5**: Industry-standard GraphQL server with built-in error handling, validation, and playground
- **GraphQL v16**: Type-safe schema definition and query execution

### HTTP Client
- **Axios v1**: Promise-based HTTP client with interceptors, timeout configuration, and error handling

### Testing
- **Japa**: AdonisJS native testing framework with excellent async support
- **Fast-check v4**: Property-based testing library for correctness guarantees
- **API Client**: Integration testing for GraphQL endpoints

### Database
- **Lucid ORM**: AdonisJS ORM with query builder and migrations
- **MySQL**: Relational database for user management (extensible for future features)

### Development Tools
- **TypeScript v5.8**: Static typing with strict mode enabled
- **ESLint**: Code linting with AdonisJS configuration
- **Prettier**: Code formatting for consistency

### External APIs
- **OpenMeteo API**: Free weather and geocoding API with no authentication required

## Getting Started

### Prerequisites

- **Node.js**: v20.x or higher
- **npm**: v10.x or higher
- **MySQL**: v8.x or higher (for user management features)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd travel-planner
```

2. Install dependencies:
```bash
npm install
```

3. Copy environment configuration:
```bash
cp .env.example .env
```

4. Generate application key:
```bash
node ace generate:key
```

5. Configure database connection in `.env`:
```env
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_DATABASE=travel_planner
```

6. Run database migrations:
```bash
node ace migration:run
```

### Configuration

The application uses environment variables for configuration. Key settings:

#### Application Settings
```env
PORT=3333                    # Server port
HOST=localhost               # Server host
NODE_ENV=development         # Environment (development, production, test)
LOG_LEVEL=info              # Logging level (debug, info, warn, error)
```

#### GraphQL Settings
```env
GRAPHQL_PLAYGROUND_ENABLED=true        # Enable GraphQL Playground
GRAPHQL_INTROSPECTION_ENABLED=true     # Enable schema introspection
```

#### Cache Settings
```env
CACHE_TTL_CITY_SEARCH=3600            # City search cache TTL (seconds)
CACHE_TTL_WEATHER_FORECAST=1800       # Weather forecast cache TTL (seconds)
```

#### OpenMeteo API Settings
```env
OPENMETEO_BASE_URL=https://api.open-meteo.com/v1
OPENMETEO_GEOCODING_URL=https://geocoding-api.open-meteo.com/v1
OPENMETEO_TIMEOUT=5000                # API timeout (milliseconds)
```

### Running the Application

#### Development Mode
```bash
npm run dev
```
The server will start at `http://localhost:3333` with hot module reloading.

#### Production Mode
```bash
npm run build
npm start
```

#### Access GraphQL Playground
Navigate to `http://localhost:3333/graphql` in your browser to access the interactive GraphQL Playground.

## API Documentation

### GraphQL Queries

The API exposes three main queries:

#### 1. Search Cities
Search for cities by name (partial or complete match).

```graphql
query SearchCities($query: String!, $limit: Int) {
  searchCities(query: $query, limit: $limit) {
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

#### 2. Get Weather Forecast
Retrieve weather forecast for specific coordinates.

```graphql
query GetWeatherForecast($input: WeatherForecastInput!) {
  getWeatherForecast(input: $input) {
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

#### 3. Get Activity Recommendations
Get ranked activity recommendations based on weather conditions.

```graphql
query GetActivityRecommendations($cityId: Int!, $days: Int) {
  getActivityRecommendations(cityId: $cityId, days: $days) {
    city {
      name
      country
    }
    forecast {
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

### Example Requests

#### Example 1: Search for Cities
```graphql
query {
  searchCities(query: "London", limit: 5) {
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
        "latitude": 51.5074,
        "longitude": -0.1278
      },
      {
        "id": 6058560,
        "name": "London",
        "country": "Canada",
        "latitude": 42.9834,
        "longitude": -81.2497
      }
    ]
  }
}
```

#### Example 2: Get Weather Forecast
```graphql
query {
  getWeatherForecast(input: {
    latitude: 51.5074
    longitude: -0.1278
    days: 7
  }) {
    timezone
    dailyForecasts {
      date
      temperatureMax
      temperatureMin
      precipitation
      weatherCondition
    }
  }
}
```

**Response:**
```json
{
  "data": {
    "getWeatherForecast": {
      "timezone": "Europe/London",
      "dailyForecasts": [
        {
          "date": "2025-11-20",
          "temperatureMax": 12.5,
          "temperatureMin": 8.2,
          "precipitation": 2.3,
          "weatherCondition": "RAINY"
        }
      ]
    }
  }
}
```

#### Example 3: Get Activity Recommendations
```graphql
query {
  getActivityRecommendations(cityId: 2643743, days: 7) {
    city {
      name
      country
    }
    activities {
      type
      score
      suitability
      reason
    }
  }
}
```

**Response:**
```json
{
  "data": {
    "getActivityRecommendations": {
      "city": {
        "name": "London",
        "country": "United Kingdom"
      },
      "activities": [
        {
          "type": "INDOOR_SIGHTSEEING",
          "score": 75.0,
          "suitability": "GOOD",
          "reason": "Rainy conditions favor indoor activities"
        },
        {
          "type": "OUTDOOR_SIGHTSEEING",
          "score": 55.0,
          "suitability": "FAIR",
          "reason": "Mild temperatures but some precipitation"
        },
        {
          "type": "SURFING",
          "score": 30.0,
          "suitability": "POOR",
          "reason": "Too cold and wet for surfing"
        },
        {
          "type": "SKIING",
          "score": 15.0,
          "suitability": "POOR",
          "reason": "No snow and temperatures too warm"
        }
      ]
    }
  }
}
```

### Error Handling

The API returns structured errors with meaningful messages and error codes:

```json
{
  "errors": [
    {
      "message": "Invalid coordinates provided",
      "extensions": {
        "code": "VALIDATION_ERROR",
        "details": "Latitude must be between -90 and 90"
      }
    }
  ]
}
```

**Error Codes:**
- `VALIDATION_ERROR`: Invalid input parameters
- `WEATHER_API_ERROR`: OpenMeteo API failures
- `NOT_FOUND`: City or resource not found
- `CACHE_ERROR`: Caching operation failures
- `INTERNAL_SERVER_ERROR`: Unexpected errors

## Technical Decisions

### Clean Architecture

**Decision**: Implement layered architecture with dependency inversion.

**Rationale**:
- Business logic remains independent of delivery mechanism (GraphQL)
- Services can be tested without mocking HTTP or GraphQL layers
- External API changes are isolated to client layer
- Easy to add new delivery mechanisms (REST, gRPC) without changing business logic

### GraphQL over REST

**Decision**: Use GraphQL as the API layer.

**Rationale**:
- Clients can request exactly the data they need (no over-fetching)
- Strong typing with schema validation
- Self-documenting with introspection
- Single endpoint simplifies routing
- Built-in playground for development and testing

### Apollo Server

**Decision**: Use Apollo Server for GraphQL implementation.

**Rationale**:
- Industry standard with excellent documentation
- Built-in error handling and validation
- Extensible plugin system
- Strong TypeScript support
- Active community and regular updates

### In-Memory Caching

**Decision**: Start with in-memory cache, abstract behind interface for Redis migration.

**Rationale**:
- Simple implementation for MVP
- No additional infrastructure required
- Easy to test
- Interface abstraction allows seamless Redis migration
- Sufficient for moderate traffic loads

### Property-Based Testing

**Decision**: Use fast-check for property-based testing alongside traditional unit tests.

**Rationale**:
- Provides correctness guarantees beyond example-based tests
- Discovers edge cases automatically
- Documents system properties formally
- Complements traditional testing approaches
- Increases confidence in business logic

### OpenMeteo API

**Decision**: Use OpenMeteo as the weather data provider.

**Rationale**:
- Free tier with generous limits
- No authentication required
- Comprehensive weather data
- Reliable geocoding service
- Good documentation and API design

## Testing

### Running Tests

```bash
# Run all tests
npm test

# Run unit tests only
npm test -- --tests=unit

# Run functional tests only
npm test -- --tests=functional

# Run specific test file
npm test -- tests/unit/services/city_service.spec.ts

# Run tests with coverage
npm test -- --coverage
```

### Test Structure

```
tests/
├── unit/                           # Unit tests
│   ├── clients/                    # Client layer tests
│   │   ├── cache_manager.spec.ts
│   │   ├── open_meteo_client.spec.ts
│   │   └── open_meteo_client_pbt.spec.ts
│   ├── services/                   # Service layer tests
│   │   ├── city_service.spec.ts
│   │   ├── city_service_pbt.spec.ts
│   │   ├── weather_service.spec.ts
│   │   ├── weather_service.property.spec.ts
│   │   ├── activity_ranking_service.spec.ts
│   │   └── activity_ranking_service.property.spec.ts
│   └── graphql/                    # GraphQL layer tests
│       ├── resolvers.spec.ts
│       └── error_handling.property.spec.ts
└── functional/                     # Integration tests
    └── graphql/
        └── queries.spec.ts         # End-to-end GraphQL tests
```

### Test Coverage Goals

- **Unit Tests**: 80%+ coverage of business logic
- **Integration Tests**: Cover all GraphQL queries and error scenarios
- **Property-Based Tests**: Verify correctness properties for critical algorithms

### Property-Based Tests

The project includes property-based tests that verify system correctness:

1. **City search returns relevant matches**: All results contain the search query
2. **City data transformation completeness**: All required fields are present
3. **Weather forecast completeness**: Correct number of days with all fields
4. **Skiing ranks highest in snowy conditions**: Correctness of activity scoring
5. **Warm weather favors outdoor activities**: Temperature-based ranking
6. **Rain favors indoor activities**: Precipitation-based ranking
7. **Activity ranking determinism**: Consistent results for same input
8. **GraphQL error structure consistency**: All errors have required fields
9. **OpenMeteo response validation**: API responses are validated
10. **Cache hit reduces API calls**: Caching behavior verification
11. **Cache expiration**: TTL behavior verification

## Development Workflow

### Code Quality Tools

```bash
# Lint code
npm run lint

# Format code
npm run format

# Type check
npm run typecheck

# Run all quality checks
npm run lint && npm run typecheck && npm test
```

### Development Best Practices

1. **Type Safety**: Use TypeScript strict mode, avoid `any` types
2. **Error Handling**: Always handle errors explicitly, use custom exception classes
3. **Testing**: Write tests before or alongside implementation
4. **Code Style**: Follow ESLint and Prettier configurations
5. **Commits**: Write clear, descriptive commit messages
6. **Documentation**: Document complex logic with inline comments

### Project Structure Conventions

- **Services**: Business logic, orchestration, no HTTP/GraphQL knowledge
- **Clients**: External API communication, error translation
- **Resolvers**: GraphQL query handling, delegate to services
- **Models**: Domain entities with validation
- **Types**: Shared type definitions and enums
- **Exceptions**: Custom error classes with meaningful messages

## Deployment

### Environment Preparation

1. Set `NODE_ENV=production` in environment variables
2. Generate a secure `APP_KEY`
3. Configure production database credentials
4. Disable GraphQL playground and introspection in production:
```env
GRAPHQL_PLAYGROUND_ENABLED=false
GRAPHQL_INTROSPECTION_ENABLED=false
```

### AWS EC2 Deployment (Recommended for Production)

The application includes comprehensive AWS EC2 deployment infrastructure with production-grade configuration.

#### Quick Start

```bash
# 1. Launch EC2 instance (t3.small or larger)
# 2. SSH into instance
ssh -i your-key.pem ec2-user@your-elastic-ip

# 3. Run automated setup
sudo ./deployment/scripts/setup-server.sh
sudo ./deployment/scripts/setup-database.sh

# 4. Clone and configure application
cd /var/www/travel-api
git clone <repo-url> .
cp .env.example .env
nano .env  # Configure environment variables

# 5. Setup Nginx reverse proxy
sudo cp deployment/nginx/travel-api.conf /etc/nginx/sites-available/travel-api
sudo ln -s /etc/nginx/sites-available/travel-api /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

# 6. Setup SSL certificate
sudo ./deployment/scripts/setup-ssl.sh api.yourdomain.com admin@yourdomain.com

# 7. Deploy application
./deployment/scripts/deploy.sh main
```

#### Infrastructure Components

**PM2 Process Manager:**
- Cluster mode using all CPU cores
- Automatic restart on failure
- Zero-downtime deployments
- Memory limits and monitoring
- Graceful shutdown handling

**Nginx Reverse Proxy:**
- SSL/TLS termination with modern ciphers
- HTTP to HTTPS redirect
- Security headers (HSTS, CSP, X-Frame-Options)
- Gzip compression
- Health check routing

**MySQL Database:**
- Persistent caching across restarts
- User preferences storage
- Connection pooling
- Automatic cleanup of expired data

**SSL Certificates:**
- Automated Let's Encrypt certificates
- Automatic renewal via cron
- Post-renewal Nginx reload

#### Deployment Architecture

```
Internet
    ↓
AWS Elastic IP
    ↓
Security Group (Firewall)
    ↓
Nginx (Port 443/80)
    ↓ (Reverse Proxy)
PM2 Cluster (Port 3333)
    ↓
Node.js Application (Multiple Instances)
    ↓
MySQL Database (Port 3306)
```

#### EC2 Instance Requirements

| Environment | Instance Type | vCPUs | Memory | Storage | Est. Cost/Month |
|-------------|---------------|-------|--------|---------|-----------------|
| Development | t3.micro      | 2     | 1 GB   | 20 GB   | $7-10          |
| Staging     | t3.small      | 2     | 2 GB   | 30 GB   | $15-20         |
| Production  | t3.medium     | 2     | 4 GB   | 50 GB   | $30-40         |
| High Traffic| t3.large      | 2     | 8 GB   | 100 GB  | $60-75         |

#### Security Group Configuration

**Inbound Rules:**
- SSH (22): Your IP only
- HTTP (80): 0.0.0.0/0 (redirects to HTTPS)
- HTTPS (443): 0.0.0.0/0
- MySQL (3306): Internal only (never expose publicly)

#### Environment Variables for AWS

```env
# Production Configuration
NODE_ENV=production
PORT=3333
HOST=127.0.0.1

# Application Key (generate with: openssl rand -base64 32)
APP_KEY=your-generated-app-key

# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_USER=travel_api
DB_PASSWORD=your-secure-password
DB_DATABASE=travel_api_db

# Cache Configuration
CACHE_ENABLED=true
CACHE_TTL_CITY_SEARCH=3600
CACHE_TTL_WEATHER=1800

# GraphQL Configuration (disable in production)
GRAPHQL_PLAYGROUND=false
GRAPHQL_INTROSPECTION=false

# Logging
LOG_LEVEL=info
```

#### Deployment Scripts

**Initial Setup:**
```bash
./deployment/scripts/setup-server.sh      # Install Node.js, PM2, Nginx, MySQL
./deployment/scripts/setup-database.sh    # Configure MySQL database
./deployment/scripts/setup-ssl.sh         # Setup SSL certificates
```

**Regular Deployment:**
```bash
./deployment/scripts/deploy.sh main       # Deploy from main branch
./deployment/scripts/deploy.sh develop    # Deploy from develop branch
```

**Rollback:**
```bash
./deployment/scripts/rollback.sh          # Rollback to previous version
```

**Backup:**
```bash
./deployment/scripts/backup.sh            # Create backup (app + database)
```

**Health Check:**
```bash
./deployment/scripts/health-check.sh      # Validate deployment
```

#### Monitoring and Maintenance

**Application Monitoring:**
```bash
pm2 status                    # View PM2 status
pm2 logs travel-api           # View application logs
pm2 monit                     # Real-time monitoring
```

**System Monitoring:**
```bash
htop                          # CPU and memory usage
df -h                         # Disk usage
sudo tail -f /var/log/nginx/travel-api-access.log  # Nginx logs
```

**Database Monitoring:**
```bash
mysql -u travel_api -p travel_api_db  # Connect to database
sudo tail -f /var/log/mysqld.log      # MySQL logs
```

#### Backup and Disaster Recovery

**Automated Backups:**
- Daily database backups at 2 AM
- Application backups before each deployment
- Retention: Last 5 deployment backups, 30 days for scheduled backups
- Optional S3 upload for off-site storage

**Recovery Procedure:**
```bash
# Restore application
tar -xzf /var/backups/travel-api/app_TIMESTAMP.tar.gz -C /var/www/travel-api

# Restore database
gunzip < /var/backups/travel-api/db_TIMESTAMP.sql.gz | mysql -u travel_api -p travel_api_db

# Restart application
pm2 restart travel-api
```

**Recovery Objectives:**
- RTO (Recovery Time Objective): 30 minutes
- RPO (Recovery Point Objective): 24 hours

#### Security Best Practices

1. **SSH Access**: Restrict to your IP address only
2. **Database**: Never expose MySQL port to internet
3. **SSL/TLS**: Use HTTPS only, modern cipher suites
4. **Security Headers**: HSTS, CSP, X-Frame-Options configured
5. **Secrets**: Store sensitive data in environment variables
6. **Updates**: Regular system and package updates
7. **Firewall**: Use AWS Security Groups as firewall
8. **Monitoring**: Enable CloudWatch for metrics and alerts

#### Troubleshooting

**Application Won't Start:**
```bash
pm2 logs travel-api --lines 100  # Check logs
pm2 restart travel-api           # Restart application
```

**502 Bad Gateway:**
```bash
pm2 status                       # Check if app is running
sudo systemctl status nginx      # Check Nginx status
sudo nginx -t                    # Test Nginx config
```

**Database Connection Issues:**
```bash
mysql -u travel_api -p travel_api_db  # Test connection
sudo systemctl status mysqld          # Check MySQL status
```

**SSL Certificate Issues:**
```bash
sudo certbot certificates        # Check certificate status
sudo certbot renew --dry-run     # Test renewal
```

#### Complete Documentation

For detailed deployment instructions, see:
- **[AWS Deployment Guide](deployment/AWS_DEPLOYMENT_GUIDE.md)** - Complete step-by-step guide
- **[Deployment Summary](deployment/DEPLOYMENT_SUMMARY.md)** - Implementation overview
- **[Quick Reference](deployment/QUICK_REFERENCE.md)** - Common commands and tips
- **[Scripts Documentation](deployment/scripts/README.md)** - Deployment scripts reference

### Docker Deployment

Create a `Dockerfile`:

```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3333

CMD ["node", "bin/server.js"]
```

Build and run:
```bash
docker build -t travel-planner .
docker run -p 3333:3333 --env-file .env.production travel-planner
```

### Docker Compose with Redis

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3333:3333"
    environment:
      - NODE_ENV=production
      - REDIS_HOST=redis
    depends_on:
      - redis
      - mysql

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  mysql:
    image: mysql:8
    environment:
      MYSQL_ROOT_PASSWORD: ${DB_PASSWORD}
      MYSQL_DATABASE: ${DB_DATABASE}
    ports:
      - "3306:3306"
    volumes:
      - mysql_data:/var/lib/mysql

volumes:
  mysql_data:
```

### PM2 Deployment

Install PM2:
```bash
npm install -g pm2
```

Create `ecosystem.config.js`:

```javascript
module.exports = {
  apps: [{
    name: 'travel-planner',
    script: './bin/server.js',
    instances: 'max',
    exec_mode: 'cluster',
    env_production: {
      NODE_ENV: 'production',
      PORT: 3333
    }
  }]
}
```

Deploy:
```bash
npm run build
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup
```

### Kubernetes Deployment

Create deployment manifests:

**deployment.yaml**:
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: travel-planner
spec:
  replicas: 3
  selector:
    matchLabels:
      app: travel-planner
  template:
    metadata:
      labels:
        app: travel-planner
    spec:
      containers:
      - name: travel-planner
        image: travel-planner:latest
        ports:
        - containerPort: 3333
        env:
        - name: NODE_ENV
          value: "production"
        - name: REDIS_HOST
          value: "redis-service"
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
```

**service.yaml**:
```yaml
apiVersion: v1
kind: Service
metadata:
  name: travel-planner-service
spec:
  selector:
    app: travel-planner
  ports:
  - protocol: TCP
    port: 80
    targetPort: 3333
  type: LoadBalancer
```

Deploy:
```bash
kubectl apply -f deployment.yaml
kubectl apply -f service.yaml
```

### Production Considerations

1. **Caching**: Migrate to Redis for distributed caching
2. **Monitoring**: Add APM tools (New Relic, DataDog, Prometheus)
3. **Logging**: Use structured logging with log aggregation (ELK, Splunk)
4. **Rate Limiting**: Implement rate limiting to prevent abuse
5. **HTTPS**: Use SSL/TLS certificates (Let's Encrypt, AWS Certificate Manager)
6. **CDN**: Consider CDN for static assets if added
7. **Database**: Use connection pooling and read replicas for scaling
8. **Secrets**: Use secret management (AWS Secrets Manager, HashiCorp Vault)

## Omissions and Trade-offs

Due to time constraints, the following features were omitted or simplified:

### Omitted Features

1. **Authentication & Authorization**: No user authentication or API key management
2. **Rate Limiting**: No request throttling or quota management
3. **Redis Caching**: Using in-memory cache instead of distributed Redis
4. **Database Persistence**: City data not persisted, fetched from API each time
5. **Pagination**: Simple limit-based pagination instead of cursor-based
6. **Mutations**: No GraphQL mutations for creating/updating data
7. **Subscriptions**: No real-time updates via GraphQL subscriptions
8. **Batch Operations**: No DataLoader for N+1 query optimization
9. **Monitoring Dashboard**: No built-in metrics visualization
10. **API Versioning**: No versioning strategy for breaking changes

### Simplified Implementations

1. **Activity Scoring**: Rule-based algorithm instead of machine learning
2. **Error Handling**: Basic error codes instead of comprehensive error taxonomy
3. **Logging**: Console logging instead of structured log aggregation
4. **Testing**: Core functionality tested, some edge cases not covered
5. **Documentation**: API documentation in README instead of separate docs site

### Technical Debt

1. **Cache Invalidation**: Simple TTL-based expiration, no smart invalidation
2. **Retry Logic**: No automatic retry for failed API calls
3. **Circuit Breaker**: No circuit breaker pattern for external API failures
4. **Health Checks**: Basic health endpoint, no detailed health metrics
5. **Performance Optimization**: No query optimization or response compression

## Future Enhancements

### Short-term (1-2 weeks)

1. **Redis Integration**: Replace in-memory cache with Redis for distributed caching
2. **Rate Limiting**: Implement request throttling per IP/API key
3. **Health Checks**: Add comprehensive health check endpoint with dependency status
4. **Retry Logic**: Add exponential backoff retry for OpenMeteo API calls
5. **API Documentation**: Generate interactive API docs with GraphQL Voyager
6. **Docker Compose**: Complete docker-compose setup with all services

### Medium-term (1-2 months)

1. **Authentication**: Implement JWT-based authentication and API keys
2. **User Preferences**: Store user preferences for activities and locations
3. **Favorites**: Allow users to save favorite cities and activities
4. **Notifications**: Email/SMS notifications for weather changes
5. **DataLoader**: Implement batching and caching for N+1 queries
6. **Monitoring**: Integrate APM tools (New Relic, DataDog)
7. **CI/CD Pipeline**: Automated testing, building, and deployment
8. **Database Persistence**: Cache city data in database for faster lookups

### Long-term (3-6 months)

1. **Machine Learning**: ML-based activity recommendations using historical data
2. **Multi-provider Support**: Support multiple weather APIs with fallback
3. **Real-time Updates**: GraphQL subscriptions for live weather updates
4. **Mobile App**: Native mobile apps consuming the GraphQL API
5. **Social Features**: Share recommendations, reviews, and photos
6. **Advanced Analytics**: User behavior tracking and recommendation optimization
7. **Internationalization**: Multi-language support for cities and activities
8. **Trip Planning**: Multi-day itinerary planning with activity scheduling
9. **Cost Estimation**: Integrate pricing data for activities and accommodations
10. **Booking Integration**: Partner with booking platforms for direct reservations

## Contributing

### Code Style

- Follow the ESLint configuration
- Use Prettier for code formatting
- Write TypeScript with strict mode enabled
- Avoid `any` types, use proper type definitions
- Document complex logic with comments

### Pull Request Process

1. Create a feature branch from `main`
2. Write tests for new functionality
3. Ensure all tests pass: `npm test`
4. Run linting and type checking: `npm run lint && npm run typecheck`
5. Format code: `npm run format`
6. Write clear commit messages
7. Submit pull request with description of changes
8. Address review feedback

### Commit Message Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types**: feat, fix, docs, style, refactor, test, chore

**Example**:
```
feat(activity): add hiking activity type

- Add HIKING to ActivityType enum
- Implement scoreHiking method
- Add tests for hiking recommendations

Closes #123
```

### Testing Requirements

- All new features must include unit tests
- Integration tests for new GraphQL queries
- Property-based tests for critical algorithms
- Maintain 80%+ code coverage

---

## License

UNLICENSED - Private project

## Support

For questions or issues, please open an issue on the repository.

---

Built with ❤️ using AdonisJS, Apollo Server, and TypeScript
