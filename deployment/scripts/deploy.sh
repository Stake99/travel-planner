#!/bin/bash

###############################################################################
# Master Deployment Script
# 
# This script orchestrates the complete deployment process:
# - Creates backup of current version
# - Pulls latest code from Git
# - Installs dependencies
# - Builds application
# - Runs database migrations
# - Reloads PM2 with zero downtime
# - Validates deployment
#
# Usage: ./deploy.sh [branch]
# Example: ./deploy.sh main
###############################################################################

set -e  # Exit on error

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
APP_DIR="/var/www/travel-api"
BACKUP_DIR="/var/backups/travel-api"
LOG_FILE="/var/log/travel-api/deploy.log"
BRANCH="${1:-main}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Logging function
log() {
    echo -e "${2:-$NC}$1${NC}"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"
}

# Error handler
error_exit() {
    log "ERROR: $1" "$RED"
    exit 1
}

# Check if running in correct directory
if [ ! -d "$APP_DIR" ]; then
    error_exit "Application directory not found: $APP_DIR"
fi

log "╔════════════════════════════════════════════════════════════╗" "$GREEN"
log "║   Travel Planning API - Deployment Script                 ║" "$GREEN"
log "╚════════════════════════════════════════════════════════════╝" "$GREEN"
log ""
log "Deployment started at: $(date)" "$BLUE"
log "Branch: $BRANCH" "$BLUE"
log "Timestamp: $TIMESTAMP" "$BLUE"
log ""

###############################################################################
# Step 1: Pre-deployment Checks
###############################################################################

log "Step 1: Running pre-deployment checks" "$YELLOW"

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
    error_exit "PM2 is not installed"
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    error_exit "Node.js is not installed"
fi

# Check if Git is installed
if ! command -v git &> /dev/null; then
    error_exit "Git is not installed"
fi

# Check if .env file exists
if [ ! -f "$APP_DIR/.env" ]; then
    error_exit ".env file not found. Please create it before deploying."
fi

log "✓ Pre-deployment checks passed" "$GREEN"
log ""

###############################################################################
# Step 2: Create Backup
###############################################################################

log "Step 2: Creating backup of current version" "$YELLOW"

mkdir -p "$BACKUP_DIR"

if [ -d "$APP_DIR/build" ]; then
    BACKUP_FILE="$BACKUP_DIR/backup_$TIMESTAMP.tar.gz"
    
    tar -czf "$BACKUP_FILE" \
        -C "$APP_DIR" \
        --exclude=node_modules \
        --exclude=.git \
        --exclude=logs \
        --exclude=tmp \
        . || error_exit "Failed to create backup"
    
    log "✓ Backup created: $BACKUP_FILE" "$GREEN"
else
    log "⚠ No existing build found, skipping backup" "$YELLOW"
fi

log ""

###############################################################################
# Step 3: Pull Latest Code
###############################################################################

log "Step 3: Pulling latest code from Git" "$YELLOW"

cd "$APP_DIR"

# Stash any local changes
git stash || true

# Fetch latest changes
git fetch origin || error_exit "Failed to fetch from Git"

# Checkout branch
git checkout "$BRANCH" || error_exit "Failed to checkout branch: $BRANCH"

# Pull latest changes
git pull origin "$BRANCH" || error_exit "Failed to pull latest changes"

COMMIT_HASH=$(git rev-parse --short HEAD)
COMMIT_MESSAGE=$(git log -1 --pretty=%B)

log "✓ Code updated to commit: $COMMIT_HASH" "$GREEN"
log "  Message: $COMMIT_MESSAGE" "$BLUE"
log ""

###############################################################################
# Step 4: Install Dependencies
###############################################################################

log "Step 4: Installing dependencies" "$YELLOW"

npm ci --production || error_exit "Failed to install dependencies"

log "✓ Dependencies installed" "$GREEN"
log ""

###############################################################################
# Step 5: Build Application
###############################################################################

log "Step 5: Building application" "$YELLOW"

npm run build || error_exit "Failed to build application"

log "✓ Application built successfully" "$GREEN"
log ""

###############################################################################
# Step 6: Run Database Migrations (if any)
###############################################################################

log "Step 6: Running database migrations" "$YELLOW"

if [ -f "node_modules/.bin/ace" ]; then
    node ace migration:run --force || log "⚠ No migrations to run or migration failed" "$YELLOW"
else
    log "⚠ AdonisJS CLI not found, skipping migrations" "$YELLOW"
fi

log ""

###############################################################################
# Step 7: Reload PM2
###############################################################################

log "Step 7: Reloading PM2 with zero downtime" "$YELLOW"

# Check if app is already running
if pm2 list | grep -q "travel-api"; then
    log "Reloading existing PM2 process..." "$BLUE"
    pm2 reload ecosystem.config.js --env production --update-env || error_exit "Failed to reload PM2"
else
    log "Starting new PM2 process..." "$BLUE"
    pm2 start ecosystem.config.js --env production || error_exit "Failed to start PM2"
fi

# Save PM2 configuration
pm2 save || error_exit "Failed to save PM2 configuration"

log "✓ PM2 reloaded successfully" "$GREEN"
log ""

###############################################################################
# Step 8: Health Check
###############################################################################

log "Step 8: Running health check" "$YELLOW"

# Wait for application to start
log "Waiting for application to start..." "$BLUE"
sleep 10

# Try health check up to 5 times
HEALTH_CHECK_URL="http://localhost:3333/health"
MAX_ATTEMPTS=5
ATTEMPT=1

while [ $ATTEMPT -le $MAX_ATTEMPTS ]; do
    log "Health check attempt $ATTEMPT/$MAX_ATTEMPTS..." "$BLUE"
    
    if curl -f -s "$HEALTH_CHECK_URL" > /dev/null 2>&1; then
        log "✓ Health check passed!" "$GREEN"
        HEALTH_CHECK_PASSED=true
        break
    fi
    
    ATTEMPT=$((ATTEMPT + 1))
    sleep 5
done

if [ "$HEALTH_CHECK_PASSED" != "true" ]; then
    log "✗ Health check failed after $MAX_ATTEMPTS attempts" "$RED"
    log "Rolling back to previous version..." "$YELLOW"
    
    # Rollback
    if [ -f "$BACKUP_FILE" ]; then
        tar -xzf "$BACKUP_FILE" -C "$APP_DIR"
        pm2 reload ecosystem.config.js --env production
        log "✓ Rollback completed" "$GREEN"
    else
        log "✗ No backup found for rollback" "$RED"
    fi
    
    error_exit "Deployment failed - health check did not pass"
fi

log ""

###############################################################################
# Step 9: Cleanup Old Backups
###############################################################################

log "Step 9: Cleaning up old backups" "$YELLOW"

# Keep only last 5 backups
cd "$BACKUP_DIR"
ls -t backup_*.tar.gz 2>/dev/null | tail -n +6 | xargs -r rm

BACKUP_COUNT=$(ls -1 backup_*.tar.gz 2>/dev/null | wc -l)
log "✓ Cleanup complete. Keeping $BACKUP_COUNT backups" "$GREEN"
log ""

###############################################################################
# Step 10: Post-deployment Tasks
###############################################################################

log "Step 10: Running post-deployment tasks" "$YELLOW"

# Clear application cache if needed
# Add any custom post-deployment tasks here

log "✓ Post-deployment tasks completed" "$GREEN"
log ""

###############################################################################
# Summary
###############################################################################

log "╔════════════════════════════════════════════════════════════╗" "$GREEN"
log "║   Deployment Successful!                                   ║" "$GREEN"
log "╚════════════════════════════════════════════════════════════╝" "$GREEN"
log ""
log "Deployment Summary:" "$BLUE"
log "  Branch: $BRANCH"
log "  Commit: $COMMIT_HASH"
log "  Timestamp: $TIMESTAMP"
log "  Backup: $BACKUP_FILE"
log ""
log "Application Status:" "$BLUE"
pm2 list | grep travel-api
log ""
log "Useful commands:" "$BLUE"
log "  - View logs: pm2 logs travel-api"
log "  - View status: pm2 status"
log "  - Restart: pm2 restart travel-api"
log "  - Rollback: ./rollback.sh $TIMESTAMP"
log ""
log "Deployment completed at: $(date)" "$BLUE"
log ""

exit 0
