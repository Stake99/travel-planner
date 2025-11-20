# AWS EC2 Deployment Guide

This guide provides step-by-step instructions for deploying the Travel Planning GraphQL API to an AWS EC2 instance with production-grade infrastructure.

## Table of Contents

- [Prerequisites](#prerequisites)
- [EC2 Instance Requirements](#ec2-instance-requirements)
- [Security Group Configuration](#security-group-configuration)
- [Initial Server Setup](#initial-server-setup)
- [Application Deployment](#application-deployment)
- [Monitoring and Maintenance](#monitoring-and-maintenance)
- [Backup and Disaster Recovery](#backup-and-disaster-recovery)
- [Troubleshooting](#troubleshooting)

## Prerequisites

Before starting the deployment, ensure you have:

- AWS account with EC2 access
- Domain name (optional but recommended for SSL)
- SSH key pair for EC2 access
- Basic knowledge of Linux command line
- Git repository URL for the application

## EC2 Instance Requirements

### Recommended Instance Types

| Environment | Instance Type | vCPUs | Memory | Storage | Monthly Cost (approx) |
|-------------|---------------|-------|--------|---------|----------------------|
| Development | t3.micro      | 2     | 1 GB   | 20 GB   | $7-10               |
| Staging     | t3.small      | 2     | 2 GB   | 30 GB   | $15-20              |
| Production  | t3.medium     | 2     | 4 GB   | 50 GB   | $30-40              |
| High Traffic| t3.large      | 2     | 8 GB   | 100 GB  | $60-75              |

### Operating System

Choose one of the following:

- **Amazon Linux 2** (Recommended for AWS)
  - Optimized for AWS
  - Long-term support
  - Pre-configured with AWS tools

- **Ubuntu Server 22.04 LTS**
  - Popular and well-documented
  - Large community support
  - Familiar for most developers

### Storage Configuration

- **Root Volume**: 30-50 GB GP3 SSD
- **Additional Volume** (optional): For database and logs
- **Backup Strategy**: EBS snapshots or S3 backups

## Security Group Configuration

Create a security group with the following rules:

### Inbound Rules

| Type  | Protocol | Port Range | Source          | Description                    |
|-------|----------|------------|-----------------|--------------------------------|
| SSH   | TCP      | 22         | Your IP         | SSH access (restrict to your IP) |
| HTTP  | TCP      | 80         | 0.0.0.0/0       | HTTP traffic (redirects to HTTPS) |
| HTTPS | TCP      | 443        | 0.0.0.0/0       | HTTPS traffic                  |
| MySQL | TCP      | 3306       | Security Group  | MySQL (internal only)          |

**Security Best Practices:**

- Restrict SSH access to your IP address only
- Never expose MySQL port to the internet (0.0.0.0/0)
- Use AWS Systems Manager Session Manager as an alternative to SSH
- Enable VPC Flow Logs for network monitoring

### Outbound Rules

| Type        | Protocol | Port Range | Destination | Description           |
|-------------|----------|------------|-------------|-----------------------|
| All traffic | All      | All        | 0.0.0.0/0   | Allow all outbound    |

## Initial Server Setup

### Step 1: Launch EC2 Instance

1. Log in to AWS Console
2. Navigate to EC2 Dashboard
3. Click "Launch Instance"
4. Configure:
   - Name: `travel-api-production`
   - AMI: Amazon Linux 2 or Ubuntu 22.04 LTS
   - Instance Type: t3.small or larger
   - Key Pair: Select or create new
   - Security Group: Use the one created above
   - Storage: 30-50 GB GP3
5. Launch instance
6. Allocate and associate an Elastic IP

### Step 2: Connect to Instance

```bash
# SSH into your instance
ssh -i /path/to/your-key.pem ec2-user@your-elastic-ip

# Or for Ubuntu
ssh -i /path/to/your-key.pem ubuntu@your-elastic-ip
```

### Step 3: Run Server Setup Script

```bash
# Download the setup script
wget https://raw.githubusercontent.com/your-repo/travel-api/main/deployment/scripts/setup-server.sh

# Make it executable
chmod +x setup-server.sh

# Run the script
sudo ./setup-server.sh
```

The script will install:
- Node.js 20.x
- PM2 process manager
- Nginx web server
- MySQL database server
- Git and build tools
- Security updates

### Step 4: Configure DNS (Optional but Recommended)

Point your domain to the Elastic IP:

```
Type: A Record
Name: api (or your subdomain)
Value: Your Elastic IP
TTL: 300
```

Wait for DNS propagation (5-30 minutes).

### Step 5: Set Up MySQL Database

```bash
# Run database setup script
sudo ./deployment/scripts/setup-database.sh

# Save the generated credentials securely
# They will be displayed at the end of the script
```

### Step 6: Set Up SSL Certificate

```bash
# Run SSL setup script
sudo ./deployment/scripts/setup-ssl.sh api.yourdomain.com admin@yourdomain.com

# This will:
# - Install Certbot
# - Obtain SSL certificate from Let's Encrypt
# - Configure Nginx for HTTPS
# - Set up automatic renewal
```

## Application Deployment

### Step 1: Clone Repository

```bash
# Create application directory
sudo mkdir -p /var/www/travel-api
sudo chown $USER:$USER /var/www/travel-api

# Clone repository
cd /var/www/travel-api
git clone https://github.com/your-repo/travel-api.git .
```

### Step 2: Configure Environment Variables

```bash
# Create .env file
nano .env
```

Add the following configuration:

```bash
NODE_ENV=production
PORT=3333
HOST=127.0.0.1

# Application Key (generate with: openssl rand -base64 32)
APP_KEY=your-generated-app-key

# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_USER=travel_api
DB_PASSWORD=your-database-password
DB_DATABASE=travel_api_db

# Cache Configuration
CACHE_ENABLED=true
CACHE_TTL_CITY_SEARCH=3600
CACHE_TTL_WEATHER=1800

# OpenMeteo API Configuration
OPENMETEO_BASE_URL=https://api.open-meteo.com/v1
OPENMETEO_GEOCODING_URL=https://geocoding-api.open-meteo.com/v1
OPENMETEO_TIMEOUT=5000

# GraphQL Configuration
GRAPHQL_PLAYGROUND=false
GRAPHQL_INTROSPECTION=false

# Logging
LOG_LEVEL=info
```

### Step 3: Install Dependencies and Build

```bash
# Install production dependencies
npm ci --production

# Build application
npm run build
```

### Step 4: Configure Nginx

```bash
# Copy Nginx configuration
sudo cp deployment/nginx/travel-api.conf /etc/nginx/sites-available/travel-api

# Update domain name in configuration
sudo sed -i 's/api.yourdomain.com/your-actual-domain.com/g' /etc/nginx/sites-available/travel-api

# Create symlink
sudo ln -s /etc/nginx/sites-available/travel-api /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

### Step 5: Start Application with PM2

```bash
# Start application
pm2 start ecosystem.config.js --env production

# Save PM2 configuration
pm2 save

# Set up PM2 to start on boot
pm2 startup
# Follow the instructions provided by the command
```

### Step 6: Verify Deployment

```bash
# Check PM2 status
pm2 status

# Check application logs
pm2 logs travel-api

# Test health endpoint
curl https://your-domain.com/health

# Test GraphQL endpoint
curl -X POST https://your-domain.com/graphql \
  -H "Content-Type: application/json" \
  -d '{"query": "{ __typename }"}'
```

## Deployment Checklist

Use this checklist to ensure all steps are completed:

### Pre-Deployment

- [ ] EC2 instance launched and running
- [ ] Elastic IP allocated and associated
- [ ] Security Group configured correctly
- [ ] SSH access verified
- [ ] Domain DNS configured (if using custom domain)

### Initial Setup

- [ ] Server setup script executed successfully
- [ ] Node.js and PM2 installed
- [ ] Nginx installed and running
- [ ] MySQL installed and secured
- [ ] Database created with proper credentials

### Application Setup

- [ ] Repository cloned to /var/www/travel-api
- [ ] .env file created with all required variables
- [ ] Dependencies installed
- [ ] Application built successfully
- [ ] Nginx configuration deployed and tested

### SSL/Security

- [ ] SSL certificate obtained from Let's Encrypt
- [ ] HTTPS working correctly
- [ ] HTTP to HTTPS redirect configured
- [ ] Security headers configured in Nginx

### Application Launch

- [ ] Application started with PM2
- [ ] PM2 configured to start on boot
- [ ] Health endpoint responding
- [ ] GraphQL endpoint working
- [ ] Logs being written correctly

### Post-Deployment

- [ ] Monitoring configured
- [ ] Backup strategy implemented
- [ ] Documentation updated
- [ ] Team notified of deployment

## Monitoring and Maintenance

### Application Monitoring

```bash
# View PM2 status
pm2 status

# View application logs
pm2 logs travel-api

# View real-time metrics
pm2 monit

# View detailed process info
pm2 show travel-api
```

### System Monitoring

```bash
# CPU and memory usage
htop

# Disk usage
df -h

# Network connections
netstat -tulpn | grep :3333

# System logs
sudo journalctl -u nginx -f
```

### Nginx Monitoring

```bash
# Check Nginx status
sudo systemctl status nginx

# View access logs
sudo tail -f /var/log/nginx/travel-api-access.log

# View error logs
sudo tail -f /var/log/nginx/travel-api-error.log

# Test configuration
sudo nginx -t
```

### MySQL Monitoring

```bash
# Check MySQL status
sudo systemctl status mysqld

# Connect to database
mysql -u travel_api -p travel_api_db

# Check database size
mysql -u travel_api -p -e "
  SELECT table_schema AS 'Database',
  ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) AS 'Size (MB)'
  FROM information_schema.tables
  WHERE table_schema = 'travel_api_db';"

# View slow queries
sudo tail -f /var/log/mysql/slow-query.log
```

### Performance Monitoring

```bash
# Check response times
curl -w "@curl-format.txt" -o /dev/null -s https://your-domain.com/health

# Create curl-format.txt
cat > curl-format.txt << 'EOF'
    time_namelookup:  %{time_namelookup}\n
       time_connect:  %{time_connect}\n
    time_appconnect:  %{time_appconnect}\n
   time_pretransfer:  %{time_pretransfer}\n
      time_redirect:  %{time_redirect}\n
 time_starttransfer:  %{time_starttransfer}\n
                    ----------\n
         time_total:  %{time_total}\n
EOF
```

### Maintenance Tasks

**Daily:**
- Check application logs for errors
- Monitor disk space usage
- Review PM2 status

**Weekly:**
- Review slow query logs
- Check SSL certificate expiration
- Review security group rules
- Update system packages

**Monthly:**
- Review and rotate logs
- Analyze performance metrics
- Update application dependencies
- Test backup restoration

## Backup and Disaster Recovery

### Database Backups

```bash
# Create backup script
sudo tee /usr/local/bin/backup-db.sh > /dev/null << 'EOF'
#!/bin/bash
BACKUP_DIR="/var/backups/mysql"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR

# Backup database
mysqldump -u travel_api -p${DB_PASSWORD} travel_api_db | gzip > $BACKUP_DIR/travel_api_db_$DATE.sql.gz

# Upload to S3 (optional)
# aws s3 cp $BACKUP_DIR/travel_api_db_$DATE.sql.gz s3://your-backup-bucket/

# Keep only last 7 days
find $BACKUP_DIR -name "*.sql.gz" -mtime +7 -delete

echo "Backup completed: $BACKUP_DIR/travel_api_db_$DATE.sql.gz"
EOF

# Make executable
sudo chmod +x /usr/local/bin/backup-db.sh

# Add to crontab (daily at 2 AM)
echo "0 2 * * * root /usr/local/bin/backup-db.sh" | sudo tee /etc/cron.d/backup-db
```

### Application Backups

```bash
# Backup application code and configuration
tar -czf /var/backups/travel-api-$(date +%Y%m%d).tar.gz \
  -C /var/www/travel-api \
  --exclude=node_modules \
  --exclude=build \
  --exclude=logs \
  .
```

### EBS Snapshots

Create automated EBS snapshots using AWS Backup or Data Lifecycle Manager:

1. Go to AWS Console → EC2 → Elastic Block Store → Snapshots
2. Create snapshot schedule
3. Configure retention policy
4. Enable cross-region replication (optional)

### Disaster Recovery Procedure

**Recovery Time Objective (RTO):** 30 minutes  
**Recovery Point Objective (RPO):** 24 hours

**Steps to recover:**

1. Launch new EC2 instance from AMI or snapshot
2. Attach Elastic IP to new instance
3. Run setup scripts
4. Restore database from latest backup
5. Deploy application code
6. Update DNS if needed
7. Verify functionality

## Troubleshooting

### Application Won't Start

```bash
# Check PM2 logs
pm2 logs travel-api --lines 100

# Check if port is in use
sudo netstat -tulpn | grep :3333

# Verify environment variables
pm2 env 0

# Restart application
pm2 restart travel-api
```

### Nginx Errors

```bash
# Check Nginx error logs
sudo tail -f /var/log/nginx/error.log

# Test configuration
sudo nginx -t

# Check if Nginx is running
sudo systemctl status nginx

# Restart Nginx
sudo systemctl restart nginx
```

### Database Connection Issues

```bash
# Test database connection
mysql -u travel_api -p travel_api_db

# Check MySQL status
sudo systemctl status mysqld

# Check MySQL error log
sudo tail -f /var/log/mysqld.log

# Verify credentials in .env file
cat /var/www/travel-api/.env | grep DB_
```

### SSL Certificate Issues

```bash
# Check certificate status
sudo certbot certificates

# Test renewal
sudo certbot renew --dry-run

# Force renewal
sudo certbot renew --force-renewal

# Check Nginx SSL configuration
sudo nginx -t
```

### High Memory Usage

```bash
# Check memory usage
free -h

# Check PM2 memory usage
pm2 list

# Restart application to free memory
pm2 restart travel-api

# Adjust PM2 memory limit in ecosystem.config.js
# max_memory_restart: '500M'
```

### Slow Response Times

```bash
# Check application logs
pm2 logs travel-api

# Monitor real-time metrics
pm2 monit

# Check database slow queries
sudo tail -f /var/log/mysql/slow-query.log

# Check Nginx access logs for slow requests
sudo tail -f /var/log/nginx/travel-api-access.log

# Test external API response times
curl -w "@curl-format.txt" -o /dev/null -s https://api.open-meteo.com/v1/forecast
```

### Common Error Messages

**"EADDRINUSE: address already in use"**
- Port 3333 is already in use
- Solution: `pm2 delete all && pm2 start ecosystem.config.js --env production`

**"ER_ACCESS_DENIED_ERROR"**
- Database credentials are incorrect
- Solution: Verify DB_USER and DB_PASSWORD in .env file

**"ECONNREFUSED"**
- Cannot connect to database
- Solution: Check if MySQL is running: `sudo systemctl status mysqld`

**"502 Bad Gateway"**
- Application is not running or not responding
- Solution: Check PM2 status and logs: `pm2 status && pm2 logs`

## Additional Resources

- [AWS EC2 Documentation](https://docs.aws.amazon.com/ec2/)
- [PM2 Documentation](https://pm2.keymetrics.io/docs/)
- [Nginx Documentation](https://nginx.org/en/docs/)
- [Let's Encrypt Documentation](https://letsencrypt.org/docs/)
- [MySQL Documentation](https://dev.mysql.com/doc/)

## Support

For issues or questions:
- GitHub Issues: [Repository Issues](https://github.com/your-repo/travel-api/issues)
- Email: support@yourdomain.com
- Documentation: [Project README](../README.md)
