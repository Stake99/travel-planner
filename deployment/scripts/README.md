# Deployment Scripts

This directory contains automation scripts for deploying and managing the Travel Planning API on AWS EC2.

## Scripts Overview

| Script | Purpose | Usage |
|--------|---------|-------|
| `setup-server.sh` | Initial server setup with all dependencies | `sudo ./setup-server.sh` |
| `setup-database.sh` | MySQL database setup and configuration | `sudo ./setup-database.sh` |
| `setup-ssl.sh` | SSL certificate setup with Let's Encrypt | `sudo ./setup-ssl.sh <domain> <email>` |
| `deploy.sh` | Deploy application with zero downtime | `./deploy.sh [branch]` |
| `rollback.sh` | Rollback to previous version | `./rollback.sh [timestamp]` |
| `backup.sh` | Create backups of app, database, and logs | `./backup.sh` |
| `health-check.sh` | Validate application health | `./health-check.sh [url]` |

## Quick Start

### 1. Initial Server Setup

```bash
# SSH into your EC2 instance
ssh -i your-key.pem ec2-user@your-server-ip

# Download setup script
wget https://raw.githubusercontent.com/your-repo/travel-api/main/deployment/scripts/setup-server.sh

# Run setup
sudo ./setup-server.sh
```

### 2. Database Setup

```bash
sudo ./setup-database.sh

# Save the generated credentials!
# They will be displayed at the end
```

### 3. Clone Application

```bash
sudo mkdir -p /var/www/travel-api
sudo chown $USER:$USER /var/www/travel-api
cd /var/www/travel-api
git clone https://github.com/your-repo/travel-api.git .
```

### 4. Configure Environment

```bash
# Create .env file
nano .env

# Add your configuration (see .env.example)
```

### 5. Configure Nginx

```bash
sudo cp deployment/nginx/travel-api.conf /etc/nginx/sites-available/travel-api
sudo ln -s /etc/nginx/sites-available/travel-api /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 6. Setup SSL

```bash
sudo ./deployment/scripts/setup-ssl.sh api.yourdomain.com admin@yourdomain.com
```

### 7. Deploy Application

```bash
./deployment/scripts/deploy.sh main
```

## Detailed Script Documentation

### setup-server.sh

Sets up a fresh EC2 instance with all required dependencies.

**What it does:**
- Updates system packages
- Installs Node.js 20.x
- Installs PM2 process manager
- Installs Nginx web server
- Installs MySQL database server
- Configures firewall
- Creates directory structure
- Configures system limits
- Sets up log rotation

**Requirements:**
- Root access
- Internet connection
- Supported OS: Amazon Linux 2, Ubuntu 22.04, Debian

**Example:**
```bash
sudo ./setup-server.sh
```

### setup-database.sh

Creates and configures MySQL database for the application.

**What it does:**
- Creates database
- Creates database user with secure password
- Grants appropriate permissions
- Creates schema (tables)
- Optimizes MySQL configuration
- Saves credentials securely

**Requirements:**
- MySQL installed and running
- Root access

**Example:**
```bash
sudo ./setup-database.sh
```

**Output:**
- Database credentials saved to `/root/.travel-api-db-credentials`
- Credentials displayed in terminal (save them!)

### setup-ssl.sh

Obtains and configures SSL certificates from Let's Encrypt.

**What it does:**
- Installs Certbot
- Obtains SSL certificate
- Configures Nginx for HTTPS
- Sets up automatic renewal
- Creates renewal hooks

**Requirements:**
- Domain pointing to server
- Port 80 open
- Nginx installed and running
- Root access

**Example:**
```bash
sudo ./setup-ssl.sh api.yourdomain.com admin@yourdomain.com
```

**Arguments:**
- `domain`: Your domain name
- `email`: Email for Let's Encrypt notifications

### deploy.sh

Deploys the application with zero downtime.

**What it does:**
- Creates backup of current version
- Pulls latest code from Git
- Installs dependencies
- Builds application
- Runs database migrations
- Reloads PM2 with zero downtime
- Validates deployment with health check
- Rolls back on failure

**Requirements:**
- Application already set up
- Git repository configured
- PM2 installed

**Example:**
```bash
# Deploy main branch
./deploy.sh main

# Deploy specific branch
./deploy.sh develop
```

**Logs:**
- Deployment logs saved to `/var/log/travel-api/deploy.log`

### rollback.sh

Rolls back to a previous version from backup.

**What it does:**
- Finds backup file (latest or specified)
- Creates safety backup of current version
- Stops application
- Restores backup
- Restarts application
- Validates with health check

**Requirements:**
- Backup files exist in `/var/backups/travel-api`
- PM2 installed

**Example:**
```bash
# Rollback to most recent backup
./rollback.sh

# Rollback to specific backup
./rollback.sh 20241120_143022
```

**Interactive:**
- Prompts for confirmation before proceeding

### backup.sh

Creates comprehensive backups of application, database, and logs.

**What it does:**
- Backs up application code and configuration
- Backs up database
- Backs up logs
- Backs up PM2 configuration
- Optionally uploads to S3
- Cleans up old backups

**Requirements:**
- Application installed
- Database credentials in .env

**Example:**
```bash
./backup.sh
```

**Configuration:**
- Retention period: 30 days (configurable in script)
- Backup location: `/var/backups/travel-api`

**S3 Upload (Optional):**
```bash
# Set environment variable
export S3_BACKUP_BUCKET=your-backup-bucket

# Run backup
./backup.sh
```

### health-check.sh

Performs comprehensive health checks on the application.

**What it does:**
- Checks system services (PM2, Nginx, MySQL)
- Tests application endpoints
- Measures response times
- Checks resource usage (memory, disk, CPU)
- Displays PM2 status

**Requirements:**
- Application running
- curl installed

**Example:**
```bash
# Check local instance
./health-check.sh

# Check remote instance
./health-check.sh https://api.yourdomain.com
```

**Exit codes:**
- 0: All checks passed
- 1: One or more checks failed

## Automation

### Scheduled Backups

Add to crontab for daily backups:

```bash
# Edit crontab
crontab -e

# Add daily backup at 2 AM
0 2 * * * /var/www/travel-api/deployment/scripts/backup.sh >> /var/log/travel-api/backup.log 2>&1
```

### Scheduled Health Checks

Add to crontab for periodic health checks:

```bash
# Add health check every 5 minutes
*/5 * * * * /var/www/travel-api/deployment/scripts/health-check.sh >> /var/log/travel-api/health-check.log 2>&1
```

## Troubleshooting

### Script Fails with Permission Error

```bash
# Make script executable
chmod +x deployment/scripts/*.sh

# Run with sudo if needed
sudo ./script-name.sh
```

### Deployment Fails

```bash
# Check logs
tail -f /var/log/travel-api/deploy.log

# Check PM2 logs
pm2 logs travel-api

# Run health check
./deployment/scripts/health-check.sh
```

### Rollback Fails

```bash
# List available backups
ls -lh /var/backups/travel-api/

# Check backup integrity
tar -tzf /var/backups/travel-api/backup_TIMESTAMP.tar.gz

# Manual restore
cd /var/www/travel-api
tar -xzf /var/backups/travel-api/backup_TIMESTAMP.tar.gz
pm2 restart travel-api
```

### SSL Certificate Issues

```bash
# Check certificate status
sudo certbot certificates

# Test renewal
sudo certbot renew --dry-run

# Force renewal
sudo certbot renew --force-renewal
```

## Best Practices

1. **Always test in staging first** before deploying to production
2. **Create backups** before major changes
3. **Monitor logs** during and after deployment
4. **Keep scripts updated** with your infrastructure changes
5. **Document custom modifications** to scripts
6. **Test rollback procedure** regularly
7. **Secure credentials** - never commit to Git
8. **Use version control** for configuration files

## Security Notes

- Scripts require root access - review before running
- Database credentials are stored in `/root/.travel-api-db-credentials`
- SSL certificates are stored in `/etc/letsencrypt/`
- Backups may contain sensitive data - secure appropriately
- Restrict SSH access to specific IP addresses
- Use AWS Systems Manager Session Manager as SSH alternative

## Support

For issues or questions:
- Check logs: `/var/log/travel-api/`
- Review documentation: `../AWS_DEPLOYMENT_GUIDE.md`
- GitHub Issues: [Repository Issues](https://github.com/your-repo/travel-api/issues)
