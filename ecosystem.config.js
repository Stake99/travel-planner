module.exports = {
  apps: [
    {
      name: 'travel-api',
      script: './build/bin/server.js',
      
      // Cluster mode configuration - use all CPU cores for maximum performance
      instances: 'max',
      exec_mode: 'cluster',
      instance_var: 'INSTANCE_ID',
      
      // Environment configuration
      env_production: {
        NODE_ENV: 'production',
        PORT: 3333,
        HOST: '127.0.0.1', // Bind to localhost, Nginx will proxy
        LOG_LEVEL: 'info',
        
        // Application secrets
        APP_KEY: process.env.APP_KEY,
        
        // Database configuration
        DB_HOST: process.env.DB_HOST || 'localhost',
        DB_PORT: process.env.DB_PORT || 3306,
        DB_USER: process.env.DB_USER || 'travel_api',
        DB_PASSWORD: process.env.DB_PASSWORD,
        DB_DATABASE: process.env.DB_DATABASE || 'travel_api_db',
        
        // Cache configuration
        CACHE_ENABLED: process.env.CACHE_ENABLED || 'true',
        CACHE_TTL_CITY_SEARCH: process.env.CACHE_TTL_CITY_SEARCH || 3600,
        CACHE_TTL_WEATHER: process.env.CACHE_TTL_WEATHER || 1800,
        
        // OpenMeteo API configuration
        OPENMETEO_BASE_URL: process.env.OPENMETEO_BASE_URL || 'https://api.open-meteo.com/v1',
        OPENMETEO_GEOCODING_URL: process.env.OPENMETEO_GEOCODING_URL || 'https://geocoding-api.open-meteo.com/v1',
        OPENMETEO_TIMEOUT: process.env.OPENMETEO_TIMEOUT || 5000,
        
        // GraphQL configuration
        GRAPHQL_PLAYGROUND: 'false',
        GRAPHQL_INTROSPECTION: 'false',
      },

      // Automatic restart on failure
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      restart_delay: 4000,
      exp_backoff_restart_delay: 100,

      // Memory management and restart thresholds
      max_memory_restart: '500M',
      
      // Log management with rotation
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      log_file: './logs/pm2-combined.log',
      time: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      log_type: 'json',
      
      // Graceful shutdown handling
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 10000,
      shutdown_with_message: true,

      // Process management
      watch: false,
      ignore_watch: ['node_modules', 'logs', 'coverage', '.git', 'tmp'],
      
      // Source map support for better error traces
      source_map_support: true,
      
      // Crash analysis
      pmx: true,
      automation: false,
    },
  ],

  // Deployment configuration for PM2 deploy command
  deploy: {
    production: {
      user: process.env.EC2_USER || 'ec2-user',
      host: process.env.EC2_HOST,
      ref: 'origin/main',
      repo: process.env.GIT_REPO,
      path: '/var/www/travel-api',
      'post-deploy': 'npm ci --production && npm run build && pm2 reload ecosystem.config.js --env production --update-env',
      'pre-deploy-local': '',
      'post-setup': 'npm ci --production && npm run build',
    },
  },
}
