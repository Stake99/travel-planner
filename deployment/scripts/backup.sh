#!/bin/bash

###############################################################################
# Backup Script
# 
# This script creates backups of:
# - Application code and configuration
# - Database
# - Logs
#
# Usage: ./backup.sh
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
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=30

# Load database credentials
if [ -f "$APP_DIR/.env" ]; then
    export $(grep -v '^#' "$APP_DIR/.env" | xargs)
fi

# Logging function
log() {
    echo -e "${2:-$NC}$1${NC}"
}

log "╔════════════════════════════════════════════════════════════╗" "$BLUE"
log "║   Travel Planning API - Backup Script                     ║" "$BLUE"
log "╚════════════════════════════════════════════════════════════╝" "$BLUE"
log ""
log "Backup started at: $(date)" "$BLUE"
log "Timestamp: $TIMESTAMP" "$BLUE"
log ""

# Create backup directory
mkdir -p "$BACKUP_DIR"

###############################################################################
# Step 1: Backup Application
###############################################################################

log "Step 1: Backing up application" "$YELLOW"

APP_BACKUP="$BACKUP_DIR/app_$TIMESTAMP.tar.gz"

tar -czf "$APP_BACKUP" \
    -C "$APP_DIR" \
    --exclude=node_modules \
    --exclude=.git \
    --exclude=logs \
    --exclude=tmp \
    --exclude=coverage \
    . || log "⚠ Failed to backup application" "$RED"

if [ -f "$APP_BACKUP" ]; then
    APP_SIZE=$(du -h "$APP_BACKUP" | cut -f1)
    log "✓ Application backup created: $APP_BACKUP ($APP_SIZE)" "$GREEN"
else
    log "✗ Application backup failed" "$RED"
fi

log ""

###############################################################################
# Step 2: Backup Database
###############################################################################

log "Step 2: Backing up database" "$YELLOW"

if [ -n "$DB_PASSWORD" ] && [ -n "$DB_USER" ] && [ -n "$DB_DATABASE" ]; then
    DB_BACKUP="$BACKUP_DIR/db_$TIMESTAMP.sql.gz"
    
    mysqldump -u "$DB_USER" -p"$DB_PASSWORD" "$DB_DATABASE" | gzip > "$DB_BACKUP" || log "⚠ Failed to backup database" "$RED"
    
    if [ -f "$DB_BACKUP" ]; then
        DB_SIZE=$(du -h "$DB_BACKUP" | cut -f1)
        log "✓ Database backup created: $DB_BACKUP ($DB_SIZE)" "$GREEN"
    else
        log "✗ Database backup failed" "$RED"
    fi
else
    log "⚠ Database credentials not found, skipping database backup" "$YELLOW"
fi

log ""

###############################################################################
# Step 3: Backup Logs
###############################################################################

log "Step 3: Backing up logs" "$YELLOW"

if [ -d "/var/log/travel-api" ]; then
    LOG_BACKUP="$BACKUP_DIR/logs_$TIMESTAMP.tar.gz"
    
    tar -czf "$LOG_BACKUP" -C /var/log travel-api || log "⚠ Failed to backup logs" "$RED"
    
    if [ -f "$LOG_BACKUP" ]; then
        LOG_SIZE=$(du -h "$LOG_BACKUP" | cut -f1)
        log "✓ Logs backup created: $LOG_BACKUP ($LOG_SIZE)" "$GREEN"
    else
        log "✗ Logs backup failed" "$RED"
    fi
else
    log "⚠ Log directory not found, skipping logs backup" "$YELLOW"
fi

log ""

###############################################################################
# Step 4: Backup PM2 Configuration
###############################################################################

log "Step 4: Backing up PM2 configuration" "$YELLOW"

PM2_BACKUP="$BACKUP_DIR/pm2_$TIMESTAMP.json"

pm2 save --force
cp ~/.pm2/dump.pm2 "$PM2_BACKUP" 2>/dev/null || log "⚠ Failed to backup PM2 configuration" "$YELLOW"

if [ -f "$PM2_BACKUP" ]; then
    log "✓ PM2 configuration backed up: $PM2_BACKUP" "$GREEN"
else
    log "⚠ PM2 configuration backup skipped" "$YELLOW"
fi

log ""

###############################################################################
# Step 5: Upload to S3 (Optional)
###############################################################################

log "Step 5: Uploading to S3 (optional)" "$YELLOW"

if command -v aws &> /dev/null && [ -n "$S3_BACKUP_BUCKET" ]; then
    log "Uploading backups to S3..." "$BLUE"
    
    aws s3 cp "$APP_BACKUP" "s3://$S3_BACKUP_BUCKET/travel-api/app/" || log "⚠ Failed to upload app backup to S3" "$YELLOW"
    
    if [ -f "$DB_BACKUP" ]; then
        aws s3 cp "$DB_BACKUP" "s3://$S3_BACKUP_BUCKET/travel-api/db/" || log "⚠ Failed to upload db backup to S3" "$YELLOW"
    fi
    
    log "✓ Backups uploaded to S3" "$GREEN"
else
    log "⚠ AWS CLI not configured or S3_BACKUP_BUCKET not set, skipping S3 upload" "$YELLOW"
fi

log ""

###############################################################################
# Step 6: Cleanup Old Backups
###############################################################################

log "Step 6: Cleaning up old backups" "$YELLOW"

# Remove backups older than retention period
find "$BACKUP_DIR" -name "app_*.tar.gz" -mtime +$RETENTION_DAYS -delete
find "$BACKUP_DIR" -name "db_*.sql.gz" -mtime +$RETENTION_DAYS -delete
find "$BACKUP_DIR" -name "logs_*.tar.gz" -mtime +$RETENTION_DAYS -delete
find "$BACKUP_DIR" -name "pm2_*.json" -mtime +$RETENTION_DAYS -delete

BACKUP_COUNT=$(ls -1 "$BACKUP_DIR"/app_*.tar.gz 2>/dev/null | wc -l)
log "✓ Cleanup complete. Keeping $BACKUP_COUNT application backups" "$GREEN"

log ""

###############################################################################
# Summary
###############################################################################

log "╔════════════════════════════════════════════════════════════╗" "$GREEN"
log "║   Backup Complete!                                         ║" "$GREEN"
log "╚════════════════════════════════════════════════════════════╝" "$GREEN"
log ""
log "Backup Summary:" "$BLUE"
log "  Timestamp: $TIMESTAMP"
log "  Location: $BACKUP_DIR"
log "  Retention: $RETENTION_DAYS days"
log ""
log "Backup Files:" "$BLUE"
[ -f "$APP_BACKUP" ] && log "  - Application: $APP_BACKUP ($APP_SIZE)"
[ -f "$DB_BACKUP" ] && log "  - Database: $DB_BACKUP ($DB_SIZE)"
[ -f "$LOG_BACKUP" ] && log "  - Logs: $LOG_BACKUP ($LOG_SIZE)"
[ -f "$PM2_BACKUP" ] && log "  - PM2: $PM2_BACKUP"
log ""
log "Total backup size: $(du -sh $BACKUP_DIR | cut -f1)" "$BLUE"
log ""
log "Restore commands:" "$BLUE"
log "  - Application: tar -xzf $APP_BACKUP -C $APP_DIR"
log "  - Database: gunzip < $DB_BACKUP | mysql -u \$DB_USER -p \$DB_DATABASE"
log ""
log "Backup completed at: $(date)" "$BLUE"
log ""

exit 0
