#!/bin/bash

###############################################################################
# MySQL Database Setup Script
# 
# This script sets up MySQL database for the Travel Planning API including:
# - Database creation
# - User creation with appropriate permissions
# - Schema migrations
# - Performance optimization
#
# Usage: sudo ./setup-database.sh
###############################################################################

set -e  # Exit on error

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if script is run as root
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}Error: This script must be run as root${NC}"
    exit 1
fi

echo -e "${GREEN}=== MySQL Database Setup ===${NC}"
echo ""

# Configuration
DB_NAME="travel_api_db"
DB_USER="travel_api"
DB_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)

echo "Database: $DB_NAME"
echo "User: $DB_USER"
echo "Password: $DB_PASSWORD"
echo ""
echo -e "${YELLOW}IMPORTANT: Save this password securely!${NC}"
echo ""

# Detect OS
if [ -f /etc/os-release ]; then
    . /etc/os-release
    OS=$ID
else
    echo -e "${RED}Error: Cannot detect operating system${NC}"
    exit 1
fi

# Check if MySQL is installed
if ! command -v mysql &> /dev/null; then
    echo -e "${RED}Error: MySQL is not installed${NC}"
    echo "Please install MySQL first:"
    if [ "$OS" = "amzn" ] || [ "$OS" = "rhel" ] || [ "$OS" = "centos" ]; then
        echo "  sudo yum install -y mysql-server"
    elif [ "$OS" = "ubuntu" ] || [ "$OS" = "debian" ]; then
        echo "  sudo apt-get install -y mysql-server"
    fi
    exit 1
fi

# Check if MySQL is running
if ! systemctl is-active --quiet mysqld && ! systemctl is-active --quiet mysql; then
    echo -e "${YELLOW}MySQL is not running. Starting MySQL...${NC}"
    systemctl start mysqld || systemctl start mysql
    systemctl enable mysqld || systemctl enable mysql
    echo -e "${GREEN}✓ MySQL started${NC}"
fi

echo -e "${YELLOW}Step 1: Creating database${NC}"

# Create database and user
mysql -u root << EOF
-- Create database
CREATE DATABASE IF NOT EXISTS ${DB_NAME} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Create user
CREATE USER IF NOT EXISTS '${DB_USER}'@'localhost' IDENTIFIED BY '${DB_PASSWORD}';

-- Grant privileges
GRANT ALL PRIVILEGES ON ${DB_NAME}.* TO '${DB_USER}'@'localhost';

-- Flush privileges
FLUSH PRIVILEGES;

-- Show databases
SHOW DATABASES LIKE '${DB_NAME}';
EOF

echo -e "${GREEN}✓ Database and user created${NC}"
echo ""

echo -e "${YELLOW}Step 2: Creating database schema${NC}"

# Create schema migration SQL
cat > /tmp/schema.sql << 'EOF'
-- Cache entries table for persistent caching
CREATE TABLE IF NOT EXISTS cache_entries (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    cache_key VARCHAR(255) NOT NULL UNIQUE,
    cache_value TEXT NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_cache_key (cache_key),
    INDEX idx_expires_at (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- User preferences table for future features
CREATE TABLE IF NOT EXISTS user_preferences (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL UNIQUE,
    preferred_activities JSON,
    temperature_preference ENUM('cold', 'mild', 'warm', 'hot') DEFAULT 'mild',
    precipitation_tolerance ENUM('low', 'medium', 'high') DEFAULT 'medium',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Favorite cities table for future features
CREATE TABLE IF NOT EXISTS favorite_cities (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    city_id INT NOT NULL,
    city_name VARCHAR(255) NOT NULL,
    country VARCHAR(255) NOT NULL,
    latitude DECIMAL(10, 7) NOT NULL,
    longitude DECIMAL(10, 7) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user_id (user_id),
    INDEX idx_city_id (city_id),
    UNIQUE KEY unique_user_city (user_id, city_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Activity recommendations log for analytics
CREATE TABLE IF NOT EXISTS activity_recommendations_log (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    city_id INT NOT NULL,
    city_name VARCHAR(255) NOT NULL,
    forecast_days INT NOT NULL,
    recommended_activity VARCHAR(50) NOT NULL,
    activity_score DECIMAL(5, 2) NOT NULL,
    weather_conditions JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_city_id (city_id),
    INDEX idx_created_at (created_at),
    INDEX idx_recommended_activity (recommended_activity)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
EOF

# Apply schema
mysql -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" < /tmp/schema.sql

echo -e "${GREEN}✓ Database schema created${NC}"
echo ""

echo -e "${YELLOW}Step 3: Optimizing MySQL configuration${NC}"

# Create MySQL configuration file for optimization
cat > /etc/my.cnf.d/travel-api.cnf << 'EOF' || cat > /etc/mysql/conf.d/travel-api.cnf << 'EOF'
[mysqld]
# Performance optimization for Travel API

# InnoDB settings
innodb_buffer_pool_size = 256M
innodb_log_file_size = 64M
innodb_flush_log_at_trx_commit = 2
innodb_flush_method = O_DIRECT

# Query cache (if MySQL < 8.0)
query_cache_type = 1
query_cache_size = 32M
query_cache_limit = 2M

# Connection settings
max_connections = 200
max_connect_errors = 100

# Table cache
table_open_cache = 2000
table_definition_cache = 1000

# Temporary tables
tmp_table_size = 32M
max_heap_table_size = 32M

# Logging
slow_query_log = 1
slow_query_log_file = /var/log/mysql/slow-query.log
long_query_time = 2

# Character set
character_set_server = utf8mb4
collation_server = utf8mb4_unicode_ci
EOF

echo -e "${GREEN}✓ MySQL configuration optimized${NC}"
echo ""

echo -e "${YELLOW}Step 4: Restarting MySQL to apply configuration${NC}"
systemctl restart mysqld || systemctl restart mysql
echo -e "${GREEN}✓ MySQL restarted${NC}"
echo ""

# Clean up
rm -f /tmp/schema.sql

# Save credentials to file
CREDS_FILE="/root/.travel-api-db-credentials"
cat > "$CREDS_FILE" << EOF
# Travel API Database Credentials
# Generated: $(date)

DB_HOST=localhost
DB_PORT=3306
DB_USER=$DB_USER
DB_PASSWORD=$DB_PASSWORD
DB_DATABASE=$DB_NAME

# Connection string
DATABASE_URL=mysql://$DB_USER:$DB_PASSWORD@localhost:3306/$DB_NAME
EOF

chmod 600 "$CREDS_FILE"

echo -e "${GREEN}=== Database Setup Complete ===${NC}"
echo ""
echo "Database credentials saved to: $CREDS_FILE"
echo ""
echo "Connection details:"
echo "  Host: localhost"
echo "  Port: 3306"
echo "  Database: $DB_NAME"
echo "  User: $DB_USER"
echo "  Password: $DB_PASSWORD"
echo ""
echo "Add these to your application .env file:"
echo "  DB_HOST=localhost"
echo "  DB_PORT=3306"
echo "  DB_USER=$DB_USER"
echo "  DB_PASSWORD=$DB_PASSWORD"
echo "  DB_DATABASE=$DB_NAME"
echo ""
echo "Test connection:"
echo "  mysql -u $DB_USER -p'$DB_PASSWORD' $DB_NAME"
echo ""

exit 0
EOF
