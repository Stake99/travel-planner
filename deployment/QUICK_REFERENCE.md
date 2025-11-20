# Deployment Quick Reference Card

Quick commands and tips for managing the Travel Planning API deployment.

## 🚀 Initial Deployment

```bash
# 1. Setup server
sudo ./deployment/scripts/setup-server.sh

# 2. Setup database
sudo ./deployment/scripts/setup-database.sh

# 3. Clone and configure
cd /var/www/travel-api
git clone <repo-url> .
cp .env.example .env
nano .env  # Configure

# 4. Setup Nginx
sudo cp deployment/nginx/travel-api.conf /etc/nginx/sites-available/travel-api
sudo ln -s /etc/nginx/sites-available/travel-api /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

# 5. Setup SSL
sudo ./deployment/scripts/setup-ssl.sh api.yourdomain.com admin@yourdomain.com

# 6. Deploy
./deployment/scripts/deploy.sh main
```

## 📦 Regular Deployment

```bash
# Deploy latest code
./deployment/scripts/deploy.sh main

# Deploy specific branch
./deployment/scripts/deploy.sh develop
```

## ⏮️ Rollback

```bash
# Rollback to latest backup
./deployment/scripts/rollback.sh

# Rollback to specific backup
./deployment/scripts/rollback.sh 20241120_143022

# List available backups
ls -lh /var/backups/travel-api/
```

## 🏥 Health Check

```bash
# Check local instance
./deployment/scripts/health-check.sh

# Check remote instance
./deployment/scripts/health-check.sh https://api.yourdomain.com

# Quick health check
curl https://api.yourdomain.com/health
```

## 💾 Backup

```bash
# Create backup
./deployment/scripts/backup.sh

# List backups
ls -lh /var/backups/travel-api/

# Restore application backup
tar -xzf /var/backups/travel-api/app_TIMESTAMP.tar.gz -C /var/www/travel-api

# Restore database backup
gunzip < /var/backups/travel-api/db_TIMESTAMP.sql.gz | mysql -u $DB_USER -p $DB_DATABASE
```

## 📊 Monitoring

```bash
# PM2 status
pm2 status
pm2 list
pm2 monit

# View logs
pm2 logs travel-api
pm2 logs travel-api --lines 100
pm2 logs travel-api --err

# Nginx logs
sudo tail -f /var/log/nginx/travel-api-access.log
sudo tail -f /var/log/nginx/travel-api-error.log

# Application logs
tail -f /var/log/travel-api/deploy.log
tail -f /var/log/travel-api/rollback.log

# System resources
htop
df -h
free -h
```

## 🔄 PM2 Management

```bash
# Start application
pm2 start ecosystem.config.js --env production

# Restart application
pm2 restart travel-api

# Reload with zero downtime
pm2 reload travel-api

# Stop application
pm2 stop travel-api

# Delete from PM2
pm2 delete travel-api

# Save PM2 configuration
pm2 save

# Setup PM2 startup
pm2 startup
```

## 🌐 Nginx Management

```bash
# Test configuration
sudo nginx -t

# Reload configuration
sudo systemctl reload nginx

# Restart Nginx
sudo systemctl restart nginx

# Check status
sudo systemctl status nginx

# View configuration
cat /etc/nginx/sites-available/travel-api
```

## 🗄️ Database Management

```bash
# Connect to database
mysql -u travel_api -p travel_api_db

# Check database size
mysql -u travel_api -p -e "
  SELECT table_schema AS 'Database',
  ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) AS 'Size (MB)'
  FROM information_schema.tables
  WHERE table_schema = 'travel_api_db';"

# Backup database
mysqldump -u travel_api -p travel_api_db | gzip > backup.sql.gz

# Restore database
gunzip < backup.sql.gz | mysql -u travel_api -p travel_api_db

# Check MySQL status
sudo systemctl status mysqld
```

## 🔒 SSL Management

```bash
# Check certificates
sudo certbot certificates

# Test renewal
sudo certbot renew --dry-run

# Force renewal
sudo certbot renew --force-renewal

# Revoke certificate
sudo certbot revoke --cert-path /etc/letsencrypt/live/api.yourdomain.com/cert.pem

# Delete certificate
sudo certbot delete --cert-name api.yourdomain.com
```

## 🔍 Troubleshooting

```bash
# Check if port is in use
sudo netstat -tulpn | grep :3333

# Check application process
ps aux | grep node

# Check disk space
df -h

# Check memory usage
free -h

# Check system logs
sudo journalctl -xe
sudo journalctl -u nginx -f
sudo journalctl -u mysqld -f

# Test GraphQL endpoint
curl -X POST https://api.yourdomain.com/graphql \
  -H "Content-Type: application/json" \
  -d '{"query": "{ __typename }"}'

# Test with verbose output
curl -v https://api.yourdomain.com/health
```

## 🔧 Common Fixes

```bash
# Fix PM2 not starting
pm2 kill
pm2 start ecosystem.config.js --env production

# Fix Nginx configuration
sudo nginx -t
sudo systemctl restart nginx

# Fix database connection
sudo systemctl restart mysqld
mysql -u travel_api -p travel_api_db

# Clear PM2 logs
pm2 flush

# Restart everything
pm2 restart travel-api
sudo systemctl restart nginx
sudo systemctl restart mysqld
```

## 📝 Environment Variables

```bash
# View current environment
pm2 env 0

# Update environment
nano /var/www/travel-api/.env
pm2 reload travel-api --update-env

# Check environment file
cat /var/www/travel-api/.env
```

## 🔐 Security

```bash
# Check open ports
sudo netstat -tulpn

# Check firewall status
sudo firewall-cmd --list-all  # Amazon Linux
sudo ufw status               # Ubuntu

# View failed login attempts
sudo tail -f /var/log/secure  # Amazon Linux
sudo tail -f /var/log/auth.log # Ubuntu

# Update system packages
sudo yum update -y            # Amazon Linux
sudo apt update && sudo apt upgrade -y  # Ubuntu
```

## 📅 Scheduled Tasks

```bash
# View crontab
crontab -l

# Edit crontab
crontab -e

# Example: Daily backup at 2 AM
0 2 * * * /var/www/travel-api/deployment/scripts/backup.sh >> /var/log/travel-api/backup.log 2>&1

# Example: Health check every 5 minutes
*/5 * * * * /var/www/travel-api/deployment/scripts/health-check.sh >> /var/log/travel-api/health-check.log 2>&1
```

## 🆘 Emergency Procedures

### Application Down
```bash
# 1. Check PM2 status
pm2 status

# 2. Check logs
pm2 logs travel-api --lines 50

# 3. Restart application
pm2 restart travel-api

# 4. If still down, rollback
./deployment/scripts/rollback.sh
```

### High Memory Usage
```bash
# 1. Check memory
free -h
pm2 list

# 2. Restart application
pm2 restart travel-api

# 3. Monitor
pm2 monit
```

### Database Issues
```bash
# 1. Check MySQL status
sudo systemctl status mysqld

# 2. Restart MySQL
sudo systemctl restart mysqld

# 3. Check connections
mysql -u travel_api -p travel_api_db

# 4. Check logs
sudo tail -f /var/log/mysqld.log
```

### SSL Certificate Expired
```bash
# 1. Check certificate
sudo certbot certificates

# 2. Renew certificate
sudo certbot renew --force-renewal

# 3. Reload Nginx
sudo systemctl reload nginx
```

## 📞 Support

- **Documentation**: `/var/www/travel-api/deployment/AWS_DEPLOYMENT_GUIDE.md`
- **Scripts Help**: `/var/www/travel-api/deployment/scripts/README.md`
- **Logs**: `/var/log/travel-api/`
- **GitHub Issues**: [Repository Issues](https://github.com/your-repo/travel-api/issues)

## 💡 Tips

- Always create a backup before major changes
- Test in staging before deploying to production
- Monitor logs during and after deployment
- Keep scripts updated with infrastructure changes
- Document any custom modifications
- Test rollback procedure regularly
- Use health checks to validate deployments
- Schedule regular backups via cron

---

**Last Updated:** November 20, 2024  
**Version:** 1.0
