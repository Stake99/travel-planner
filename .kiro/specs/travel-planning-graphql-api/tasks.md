# Implementation Plan

- [x] 1. Set up project dependencies and configuration
  - Install Apollo Server, Axios, fast-check, and other required packages
  - Configure TypeScript compiler options for strict mode
  - Set up environment variables and configuration files
  - Create folder structure as defined in design document
  - _Requirements: 5.1, 8.2_

- [x] 2. Implement domain models and types
  - Create TypeScript interfaces and enums (ActivityType, WeatherCondition, Suitability)
  - Implement City model class with validation
  - Implement WeatherForecast and DailyForecast model classes
  - Implement RankedActivity model class with suitability calculation
  - Create OpenMeteo API response type definitions
  - _Requirements: 1.4, 2.1, 3.4_

- [x] 3. Implement custom exception classes
  - Create base AppError class
  - Implement ValidationException with field and value tracking
  - Implement WeatherAPIException with original error wrapping
  - Implement NotFoundException for missing resources
  - Implement CacheException for cache-related errors
  - _Requirements: 4.3, 2.2, 2.3_

- [x] 4. Implement CacheManager
  - Create ICacheManager interface
  - Implement in-memory CacheManager with Map storage
  - Implement get, set, delete, and clear methods
  - Add TTL expiration logic with automatic cleanup
  - Implement cleanup method to remove expired entries
  - _Requirements: 10.1, 10.2, 10.3_

- [x] 4.1 Write property test for cache hit behavior
  - **Property 10: Cache hit reduces API calls**
  - **Validates: Requirements 10.1, 10.2**

- [x] 4.2 Write property test for cache expiration
  - **Property 11: Cache expiration**
  - **Validates: Requirements 10.3**

- [x] 5. Implement OpenMeteoClient
  - Create IWeatherClient interface
  - Implement OpenMeteoClient class with Axios configuration
  - Implement searchCities method with geocoding API integration
  - Implement getWeatherForecast method with weather API integration
  - Add response parsing and validation logic
  - Implement handleApiError method for error translation
  - _Requirements: 1.1, 1.4, 2.1, 9.1, 9.2_

- [x] 5.1 Write unit tests for OpenMeteoClient
  - Test timeout handling
  - Test valid response parsing
  - Test malformed response handling
  - Test HTTP error code handling (4xx, 5xx)
  - _Requirements: 9.1, 9.2_

- [x] 5.2 Write property test for response validation
  - **Property 9: OpenMeteo response validation**
  - **Validates: Requirements 9.2**

- [x] 6. Implement CityService
  - Create CityService class with dependency injection
  - Implement searchCities method with caching logic
  - Implement sanitizeQuery method for input cleaning
  - Implement orderByRelevance method for result sorting
  - Add cache key generation logic
  - _Requirements: 1.1, 1.2, 1.3, 1.5, 10.1_

- [x] 6.1 Write unit tests for CityService
  - Test empty query returns empty array
  - Test special character sanitization
  - Test cache hit behavior
  - Test result ordering by relevance
  - _Requirements: 1.1, 1.2, 1.3, 1.5_

- [x] 6.2 Write property test for city search relevance
  - **Property 1: City search returns relevant matches**
  - **Validates: Requirements 1.1, 1.2**

- [x] 6.3 Write property test for city data transformation
  - **Property 2: City data transformation completeness**
  - **Validates: Requirements 1.4**

- [x] 7. Implement WeatherService
  - Create WeatherService class with dependency injection
  - Implement getWeatherForecast method with caching
  - Implement validateCoordinates method
  - Implement mapWeatherCode method for enum mapping
  - Add cache key generation logic
  - _Requirements: 2.1, 2.2, 2.4, 2.5, 10.2_

- [x] 7.1 Write unit tests for WeatherService
  - Test coordinate validation (invalid latitude/longitude)
  - Test weather code mapping to conditions
  - Test cache hit behavior
  - Test error handling for API failures
  - _Requirements: 2.1, 2.2, 2.4_

- [x] 7.2 Write property test for weather forecast completeness
  - **Property 3: Weather forecast completeness**
  - **Validates: Requirements 2.1, 2.4**

- [x] 8. Implement ActivityRankingService
  - Create ActivityRankingService class with WeatherService dependency
  - Implement rankActivities method with score aggregation
  - Implement scoreSkiing method with temperature and snow logic
  - Implement scoreSurfing method with temperature and wind logic
  - Implement scoreIndoorSightseeing method with precipitation logic
  - Implement scoreOutdoorSightseeing method with ideal temperature range logic
  - Implement aggregateScores method for multi-day averaging
  - Add deterministic tie-breaking by enum order
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 8.1 Write unit tests for ActivityRankingService
  - Test skiing ranks highest for snowy cold weather
  - Test indoor ranks highest for rainy weather
  - Test surfing ranks high for warm dry weather
  - Test consistent ordering for same input (determinism)
  - _Requirements: 3.1, 3.2, 3.3, 3.5_

- [x] 8.2 Write property test for skiing in snowy conditions
  - **Property 4: Skiing ranks highest in snowy conditions**
  - **Validates: Requirements 3.1**

- [x] 8.3 Write property test for warm weather outdoor activities
  - **Property 5: Warm weather favors outdoor activities**
  - **Validates: Requirements 3.2**

- [x] 8.4 Write property test for rain favoring indoor activities
  - **Property 6: Rain favors indoor activities**
  - **Validates: Requirements 3.3**

- [x] 8.5 Write property test for ranking determinism
  - **Property 7: Activity ranking determinism**
  - **Validates: Requirements 3.5**

- [x] 9. Checkpoint - Ensure all service layer tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 10. Define GraphQL schema
  - Create schema.graphql file with complete type definitions
  - Define ActivityType, Suitability, and WeatherCondition enums
  - Define City, DailyForecast, WeatherForecast, RankedActivity types
  - Define ActivityRecommendations type
  - Define WeatherForecastInput input type
  - Define Query type with searchCities, getWeatherForecast, and getActivityRecommendations
  - Add documentation strings to queries
  - _Requirements: 4.1, 4.2, 4.4_

- [x] 11. Implement GraphQL resolvers
  - Create CityResolver with searchCities query resolver
  - Create WeatherResolver with getWeatherForecast query resolver
  - Create ActivityResolver with getActivityRecommendations query resolver
  - Implement error handling and translation to GraphQL errors
  - Add dependency injection for services
  - _Requirements: 4.3, 5.3_

- [x] 11.1 Write property test for GraphQL error structure
  - **Property 8: GraphQL error structure consistency**
  - **Validates: Requirements 4.3**

- [x] 12. Set up Apollo Server integration
  - Configure Apollo Server with AdonisJS
  - Set up GraphQL endpoint at /graphql
  - Configure GraphQL Playground for development
  - Add context setup for dependency injection
  - Configure error formatting
  - _Requirements: 4.1, 4.2, 4.3_

- [x] 12.1 Write integration tests for GraphQL queries
  - Test searchCities query with valid input
  - Test searchCities with empty query
  - Test getWeatherForecast with valid coordinates
  - Test getWeatherForecast with invalid coordinates
  - Test getActivityRecommendations end-to-end
  - Test error responses have correct structure
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [x] 13. Implement logging and monitoring hooks
  - Add structured logging to services using AdonisJS logger
  - Implement IMetrics interface for observability
  - Add metric tracking to service methods (counters, timings)
  - Log cache hits/misses
  - Log external API calls and response times
  - _Requirements: 10.5_

- [x] 14. Create comprehensive README documentation
  - Write project title and description with key features
  - Add table of contents
  - Document architecture overview with diagram
  - List technology stack with justifications
  - Provide getting started guide (prerequisites, installation, configuration)
  - Document API with example GraphQL queries
  - Explain technical decisions (clean architecture, GraphQL, Apollo, caching)
  - Document omissions and trade-offs due to time constraints
  - Outline future enhancements (short-term, medium-term, long-term)
  - Add testing instructions and coverage goals
  - Document development workflow (linting, type-checking, formatting)
  - Provide deployment instructions (Docker, PM2, Kubernetes options)
  - Add contributing guidelines and code style standards
  - _Requirements: 7.1, 7.2, 7.3, 7.4_

- [x] 15. Set up CI/CD pipeline configuration
  - Create .github/workflows/ci.yml for continuous integration
  - Add lint job with ESLint
  - Add typecheck job with TypeScript compiler
  - Add test job with unit and integration tests
  - Add build job to verify compilation
  - Configure test coverage reporting
  - _Requirements: 8.1, 8.2, 12.4_

- [x] 15.1 Create GitHub Actions deployment workflow
  - Create .github/workflows/deploy.yml for automated deployment to EC2
  - Configure SSH connection to EC2 instance using GitHub secrets
  - Implement build and package creation steps
  - Add deployment script that creates timestamped backups before deploying
  - Configure PM2 reload with zero-downtime deployment
  - Implement health check verification after deployment
  - Add automatic rollback on deployment failure
  - Configure cleanup of old backups (keep last 5)
  - _Requirements: 12.1, 12.2, 12.3, 12.5, 12.6, 12.8, 12.9, 12.10_

- [x] 15.2 Configure GitHub repository secrets
  - Document required secrets (EC2_SSH_PRIVATE_KEY, EC2_HOST, EC2_USER, DB_PASSWORD, HEALTH_CHECK_URL)
  - Create instructions for generating SSH key pairs for GitHub Actions
  - Document how to add secrets to GitHub repository settings
  - Document security best practices for secrets management
  - _Requirements: 12.7_

- [x] 15.3 Create deployment configuration files
  - Update ecosystem.config.js for PM2 with production environment settings
  - Configure cluster mode to use all CPU cores
  - Set up automatic restart on failure and memory limits
  - Configure log management and rotation
  - Add graceful shutdown handling
  - _Requirements: 8.4, 11.2, 12.9_

- [x] 16. Add environment configuration examples
  - Create .env.example with all configuration options
  - Document each environment variable with descriptions
  - Add comments explaining required vs optional variables
  - Include examples for development and production settings
  - _Requirements: 8.3_

- [x] 17. Implement AWS EC2 deployment infrastructure
  - Create deployment scripts directory structure
  - Implement server setup script for Amazon Linux 2/Ubuntu
  - Implement database setup script with MySQL configuration
  - Implement application deployment script with Git integration
  - Implement Nginx configuration script with reverse proxy setup
  - Implement SSL certificate setup script with Certbot
  - _Requirements: 11.1, 11.6_

- [x] 17.1 Configure PM2 for production deployment
  - Update ecosystem.config.js with production environment variables
  - Configure cluster mode to use all CPU cores
  - Set up automatic restart on failure
  - Configure log management and rotation
  - Add memory limits and restart thresholds
  - Configure graceful shutdown handling
  - _Requirements: 11.2_

- [x] 17.2 Create Nginx reverse proxy configuration
  - Create Nginx site configuration file
  - Configure upstream to PM2 application instances
  - Set up HTTP to HTTPS redirect
  - Configure SSL/TLS settings for security
  - Add security headers (HSTS, X-Frame-Options, etc.)
  - Enable gzip compression for responses
  - Configure proxy timeouts and buffering
  - Set up health check endpoint routing
  - _Requirements: 11.3, 11.7, 11.9_

- [x] 17.3 Implement SSL certificate automation with Certbot
  - Create SSL setup script using Certbot
  - Configure automatic certificate renewal via cron
  - Set up post-renewal Nginx reload hook
  - Test certificate renewal process
  - Document manual certificate troubleshooting steps
  - _Requirements: 11.4, 11.9_

- [x] 17.4 Set up MySQL database integration
  - Create database schema migration scripts
  - Implement cache_entries table for persistent caching
  - Implement user_preferences table for future features
  - Create database user with appropriate permissions
  - Configure MySQL for optimal performance
  - Add database connection configuration to application
  - Implement MySQL-based cache manager (alternative to in-memory)
  - _Requirements: 11.5, 11.8_

- [x] 17.5 Create AWS deployment documentation
  - Document EC2 instance requirements and recommendations
  - Create step-by-step deployment guide
  - Document Security Group configuration
  - Add deployment checklist for production
  - Document monitoring and maintenance procedures
  - Create backup and disaster recovery procedures
  - Add troubleshooting guide for common issues
  - _Requirements: 11.1, 11.10_

- [x] 17.6 Implement deployment automation scripts
  - Create master deployment script that orchestrates all steps
  - Add rollback script for failed deployments
  - Create backup script for database and configuration
  - Implement health check validation script
  - Add monitoring setup script for CloudWatch integration
  - _Requirements: 11.6_

- [x] 18. Update README with AWS deployment instructions
  - Add AWS EC2 deployment section to README
  - Document infrastructure requirements
  - Add deployment architecture diagram
  - Include step-by-step deployment instructions
  - Document environment variables for AWS deployment
  - Add monitoring and maintenance section
  - Include security best practices
  - _Requirements: 11.1, 11.10_

- [x] 19. Final checkpoint - Ensure all tests pass and documentation is complete
  - Ensure all tests pass, ask the user if questions arise.
