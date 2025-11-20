#!/bin/bash

###############################################################################
# Health Check Validation Script
# 
# This script performs comprehensive health checks on the deployed application.
#
# Usage: ./health-check.sh [url]
# Example: ./health-check.sh https://api.yourdomain.com
###############################################################################

set -e  # Exit on error

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BASE_URL="${1:-http://localhost:3333}"
TIMEOUT=10

# Logging function
log() {
    echo -e "${2:-$NC}$1${NC}"
}

# Check function
check() {
    local name="$1"
    local command="$2"
    
    echo -n "  Checking $name... "
    
    if eval "$command" > /dev/null 2>&1; then
        log "✓" "$GREEN"
        return 0
    else
        log "✗" "$RED"
        return 1
    fi
}

log "╔════════════════════════════════════════════════════════════╗" "$BLUE"
log "║   Travel Planning API - Health Check                      ║" "$BLUE"
log "╚════════════════════════════════════════════════════════════╝" "$BLUE"
log ""
log "Target: $BASE_URL" "$BLUE"
log "Timestamp: $(date)" "$BLUE"
log ""

FAILED_CHECKS=0

###############################################################################
# System Checks
###############################################################################

log "System Checks:" "$YELLOW"

if ! check "PM2 is running" "pm2 list | grep -q travel-api"; then
    FAILED_CHECKS=$((FAILED_CHECKS + 1))
fi

if ! check "Nginx is running" "systemctl is-active --quiet nginx"; then
    FAILED_CHECKS=$((FAILED_CHECKS + 1))
fi

if ! check "MySQL is running" "systemctl is-active --quiet mysqld || systemctl is-active --quiet mysql"; then
    FAILED_CHECKS=$((FAILED_CHECKS + 1))
fi

log ""

###############################################################################
# Application Checks
###############################################################################

log "Application Checks:" "$YELLOW"

# Health endpoint
if check "Health endpoint" "curl -f -s --max-time $TIMEOUT $BASE_URL/health"; then
    HEALTH_RESPONSE=$(curl -s --max-time $TIMEOUT $BASE_URL/health)
    log "  Response: $HEALTH_RESPONSE" "$BLUE"
else
    FAILED_CHECKS=$((FAILED_CHECKS + 1))
fi

# GraphQL endpoint
if check "GraphQL endpoint" "curl -f -s --max-time $TIMEOUT -X POST $BASE_URL/graphql -H 'Content-Type: application/json' -d '{\"query\":\"{__typename}\"}'"; then
    GRAPHQL_RESPONSE=$(curl -s --max-time $TIMEOUT -X POST $BASE_URL/graphql -H 'Content-Type: application/json' -d '{"query":"{__typename}"}')
    log "  Response: $GRAPHQL_RESPONSE" "$BLUE"
else
    FAILED_CHECKS=$((FAILED_CHECKS + 1))
fi

log ""

###############################################################################
# Performance Checks
###############################################################################

log "Performance Checks:" "$YELLOW"

# Response time check
RESPONSE_TIME=$(curl -o /dev/null -s -w '%{time_total}' --max-time $TIMEOUT $BASE_URL/health)
log "  Response time: ${RESPONSE_TIME}s" "$BLUE"

if (( $(echo "$RESPONSE_TIME < 1.0" | bc -l) )); then
    log "  ✓ Response time is good" "$GREEN"
else
    log "  ⚠ Response time is slow" "$YELLOW"
fi

log ""

###############################################################################
# Resource Checks
###############################################################################

log "Resource Checks:" "$YELLOW"

# Memory usage
MEMORY_USAGE=$(free | grep Mem | awk '{printf "%.1f", $3/$2 * 100.0}')
log "  Memory usage: ${MEMORY_USAGE}%" "$BLUE"

if (( $(echo "$MEMORY_USAGE < 80" | bc -l) )); then
    log "  ✓ Memory usage is normal" "$GREEN"
else
    log "  ⚠ Memory usage is high" "$YELLOW"
fi

# Disk usage
DISK_USAGE=$(df -h / | tail -1 | awk '{print $5}' | sed 's/%//')
log "  Disk usage: ${DISK_USAGE}%" "$BLUE"

if [ "$DISK_USAGE" -lt 80 ]; then
    log "  ✓ Disk usage is normal" "$GREEN"
else
    log "  ⚠ Disk usage is high" "$YELLOW"
fi

# CPU load
CPU_LOAD=$(uptime | awk -F'load average:' '{print $2}' | awk '{print $1}' | sed 's/,//')
log "  CPU load: $CPU_LOAD" "$BLUE"

log ""

###############################################################################
# PM2 Status
###############################################################################

log "PM2 Status:" "$YELLOW"
pm2 list | grep travel-api || log "  ⚠ Application not found in PM2" "$YELLOW"
log ""

###############################################################################
# Summary
###############################################################################

if [ $FAILED_CHECKS -eq 0 ]; then
    log "╔════════════════════════════════════════════════════════════╗" "$GREEN"
    log "║   All Health Checks Passed!                                ║" "$GREEN"
    log "╚════════════════════════════════════════════════════════════╝" "$GREEN"
    exit 0
else
    log "╔════════════════════════════════════════════════════════════╗" "$RED"
    log "║   Health Checks Failed: $FAILED_CHECKS                                    ║" "$RED"
    log "╚════════════════════════════════════════════════════════════╝" "$RED"
    log ""
    log "Please check:" "$YELLOW"
    log "  - Application logs: pm2 logs travel-api" "$YELLOW"
    log "  - Nginx logs: sudo tail -f /var/log/nginx/error.log" "$YELLOW"
    log "  - System logs: sudo journalctl -xe" "$YELLOW"
    exit 1
fi
