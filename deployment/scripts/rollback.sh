#!/bin/bash

###############################################################################
# Rollback Script
# 
# This script rolls back the application to a previous version from backup.
#
# Usage: ./rollback.sh [timestamp]
# Example: ./rollback.sh 20241120_143022
#
# If no timestamp is provided, rolls back to the most recent backup.
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
LOG_FILE="/var/log/travel-api/rollback.log"
TIMESTAMP="${1:-}"

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

log "╔════════════════════════════════════════════════════════════╗" "$YELLOW"
log "║   Travel Planning API - Rollback Script                   ║" "$YELLOW"
log "╚════════════════════════════════════════════════════════════╝" "$YELLOW"
log ""
log "Rollback started at: $(date)" "$BLUE"
log ""

###############################################################################
# Step 1: Find Backup File
###############################################################################

log "Step 1: Finding backup file" "$YELLOW"

if [ -z "$TIMESTAMP" ]; then
    # Find most recent backup
    BACKUP_FILE=$(ls -t "$BACKUP_DIR"/backup_*.tar.gz 2>/dev/null | head -1)
    
    if [ -z "$BACKUP_FILE" ]; then
        error_exit "No backup files found in $BACKUP_DIR"
    fi
    
    log "Using most recent backup: $(basename $BACKUP_FILE)" "$BLUE"
else
    # Use specified timestamp
    BACKUP_FILE="$BACKUP_DIR/backup_$TIMESTAMP.tar.gz"
    
    if [ ! -f "$BACKUP_FILE" ]; then
        log "Available backups:" "$BLUE"
        ls -lh "$BACKUP_DIR"/backup_*.tar.gz 2>/dev/null || log "No backups found" "$RED"
        error_exit "Backup file not found: $BACKUP_FILE"
    fi
    
    log "Using specified backup: $(basename $BACKUP_FILE)" "$BLUE"
fi

log "✓ Backup file found" "$GREEN"
log ""

###############################################################################
# Step 2: Confirm Rollback
###############################################################################

log "Step 2: Confirming rollback" "$YELLOW"

log "⚠ WARNING: This will replace the current application with the backup version" "$RED"
log "Backup file: $BACKUP_FILE" "$BLUE"
log "Backup size: $(du -h $BACKUP_FILE | cut -f1)" "$BLUE"
log "Backup date: $(stat -c %y $BACKUP_FILE 2>/dev/null || stat -f %Sm $BACKUP_FILE)" "$BLUE"
log ""

read -p "Are you sure you want to proceed? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    log "Rollback cancelled by user" "$YELLOW"
    exit 0
fi

log ""

###############################################################################
# Step 3: Create Safety Backup
###############################################################################

log "Step 3: Creating safety backup of current version" "$YELLOW"

SAFETY_BACKUP="$BACKUP_DIR/pre_rollback_$(date +%Y%m%d_%H%M%S).tar.gz"

tar -czf "$SAFETY_BACKUP" \
    -C "$APP_DIR" \
    --exclude=node_modules \
    --exclude=.git \
    --exclude=logs \
    --exclude=tmp \
    . || log "⚠ Failed to create safety backup" "$YELLOW"

log "✓ Safety backup created: $SAFETY_BACKUP" "$GREEN"
log ""

###############################################################################
# Step 4: Stop Application
###############################################################################

log "Step 4: Stopping application" "$YELLOW"

if pm2 list | grep -q "travel-api"; then
    pm2 stop travel-api || error_exit "Failed to stop PM2 process"
    log "✓ Application stopped" "$GREEN"
else
    log "⚠ Application not running" "$YELLOW"
fi

log ""

###############################################################################
# Step 5: Restore Backup
###############################################################################

log "Step 5: Restoring backup" "$YELLOW"

# Clear current build directory
if [ -d "$APP_DIR/build" ]; then
    rm -rf "$APP_DIR/build"
fi

# Extract backup
tar -xzf "$BACKUP_FILE" -C "$APP_DIR" || error_exit "Failed to extract backup"

log "✓ Backup restored" "$GREEN"
log ""

###############################################################################
# Step 6: Restart Application
###############################################################################

log "Step 6: Restarting application" "$YELLOW"

pm2 start ecosystem.config.js --env production || pm2 restart travel-api || error_exit "Failed to restart application"

log "✓ Application restarted" "$GREEN"
log ""

###############################################################################
# Step 7: Health Check
###############################################################################

log "Step 7: Running health check" "$YELLOW"

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
    log "Please check application logs: pm2 logs travel-api" "$YELLOW"
    error_exit "Rollback completed but health check failed"
fi

log ""

###############################################################################
# Summary
###############################################################################

log "╔════════════════════════════════════════════════════════════╗" "$GREEN"
log "║   Rollback Successful!                                     ║" "$GREEN"
log "╚════════════════════════════════════════════════════════════╝" "$GREEN"
log ""
log "Rollback Summary:" "$BLUE"
log "  Restored from: $(basename $BACKUP_FILE)"
log "  Safety backup: $SAFETY_BACKUP"
log ""
log "Application Status:" "$BLUE"
pm2 list | grep travel-api
log ""
log "Useful commands:" "$BLUE"
log "  - View logs: pm2 logs travel-api"
log "  - View status: pm2 status"
log "  - Restart: pm2 restart travel-api"
log ""
log "Rollback completed at: $(date)" "$BLUE"
log ""

exit 0
