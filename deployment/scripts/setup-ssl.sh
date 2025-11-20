#!/bin/bash

###############################################################################
# SSL Certificate Setup Script with Certbot
# 
# This script automates the process of obtaining and configuring SSL 
# certificates from Let's Encrypt using Certbot.
#
# Usage: sudo ./setup-ssl.sh <domain> <email>
# Example: sudo ./setup-ssl.sh api.yourdomain.com admin@yourdomain.com
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

# Check arguments
if [ $# -lt 2 ]; then
    echo -e "${RED}Error: Missing required arguments${NC}"
    echo "Usage: $0 <domain> <email>"
    echo "Example: $0 api.yourdomain.com admin@yourdomain.com"
    exit 1
fi

DOMAIN=$1
EMAIL=$2

echo -e "${GREEN}=== SSL Certificate Setup with Certbot ===${NC}"
echo "Domain: $DOMAIN"
echo "Email: $EMAIL"
echo ""

# Detect OS
if [ -f /etc/os-release ]; then
    . /etc/os-release
    OS=$ID
else
    echo -e "${RED}Error: Cannot detect operating system${NC}"
    exit 1
fi

echo -e "${YELLOW}Step 1: Installing Certbot${NC}"

# Install Certbot based on OS
if [ "$OS" = "amzn" ] || [ "$OS" = "rhel" ] || [ "$OS" = "centos" ]; then
    # Amazon Linux 2 / RHEL / CentOS
    echo "Detected Amazon Linux/RHEL/CentOS"
    
    # Install EPEL repository if not already installed
    if ! rpm -q epel-release &> /dev/null; then
        yum install -y epel-release
    fi
    
    # Install Certbot and Nginx plugin
    yum install -y certbot python3-certbot-nginx
    
elif [ "$OS" = "ubuntu" ] || [ "$OS" = "debian" ]; then
    # Ubuntu / Debian
    echo "Detected Ubuntu/Debian"
    
    # Update package list
    apt-get update
    
    # Install Certbot and Nginx plugin
    apt-get install -y certbot python3-certbot-nginx
    
else
    echo -e "${RED}Error: Unsupported operating system: $OS${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Certbot installed successfully${NC}"
echo ""

# Create webroot directory for ACME challenge
echo -e "${YELLOW}Step 2: Creating webroot directory${NC}"
mkdir -p /var/www/certbot
chown -R nginx:nginx /var/www/certbot || chown -R www-data:www-data /var/www/certbot
echo -e "${GREEN}✓ Webroot directory created${NC}"
echo ""

# Test Nginx configuration
echo -e "${YELLOW}Step 3: Testing Nginx configuration${NC}"
if nginx -t; then
    echo -e "${GREEN}✓ Nginx configuration is valid${NC}"
else
    echo -e "${RED}Error: Nginx configuration test failed${NC}"
    exit 1
fi
echo ""

# Reload Nginx to apply changes
echo -e "${YELLOW}Step 4: Reloading Nginx${NC}"
systemctl reload nginx
echo -e "${GREEN}✓ Nginx reloaded${NC}"
echo ""

# Obtain SSL certificate
echo -e "${YELLOW}Step 5: Obtaining SSL certificate from Let's Encrypt${NC}"
echo "This may take a few moments..."
echo ""

# Run Certbot
if certbot certonly \
    --webroot \
    --webroot-path=/var/www/certbot \
    --email "$EMAIL" \
    --agree-tos \
    --no-eff-email \
    --force-renewal \
    -d "$DOMAIN"; then
    
    echo -e "${GREEN}✓ SSL certificate obtained successfully${NC}"
else
    echo -e "${RED}Error: Failed to obtain SSL certificate${NC}"
    echo "Please check:"
    echo "  1. Domain DNS is correctly pointing to this server"
    echo "  2. Port 80 is open in firewall/security group"
    echo "  3. Nginx is running and accessible"
    exit 1
fi
echo ""

# Update Nginx configuration with SSL certificate paths
echo -e "${YELLOW}Step 6: Updating Nginx configuration${NC}"

NGINX_CONF="/etc/nginx/sites-available/travel-api"
if [ ! -f "$NGINX_CONF" ]; then
    NGINX_CONF="/etc/nginx/conf.d/travel-api.conf"
fi

if [ -f "$NGINX_CONF" ]; then
    # Replace placeholder domain with actual domain
    sed -i "s/api\.yourdomain\.com/$DOMAIN/g" "$NGINX_CONF"
    echo -e "${GREEN}✓ Nginx configuration updated${NC}"
else
    echo -e "${YELLOW}Warning: Nginx configuration file not found at expected location${NC}"
    echo "Please manually update the server_name and SSL certificate paths"
fi
echo ""

# Test Nginx configuration again
echo -e "${YELLOW}Step 7: Testing updated Nginx configuration${NC}"
if nginx -t; then
    echo -e "${GREEN}✓ Nginx configuration is valid${NC}"
else
    echo -e "${RED}Error: Nginx configuration test failed after SSL setup${NC}"
    exit 1
fi
echo ""

# Reload Nginx with SSL configuration
echo -e "${YELLOW}Step 8: Reloading Nginx with SSL configuration${NC}"
systemctl reload nginx
echo -e "${GREEN}✓ Nginx reloaded with SSL${NC}"
echo ""

# Set up automatic certificate renewal
echo -e "${YELLOW}Step 9: Setting up automatic certificate renewal${NC}"

# Create renewal hook script
cat > /etc/letsencrypt/renewal-hooks/post/reload-nginx.sh << 'EOF'
#!/bin/bash
# Post-renewal hook to reload Nginx after certificate renewal
systemctl reload nginx
EOF

chmod +x /etc/letsencrypt/renewal-hooks/post/reload-nginx.sh

# Test automatic renewal (dry run)
echo "Testing automatic renewal (dry run)..."
if certbot renew --dry-run; then
    echo -e "${GREEN}✓ Automatic renewal test passed${NC}"
else
    echo -e "${YELLOW}Warning: Automatic renewal test failed${NC}"
    echo "Certificates will still be obtained, but automatic renewal may need manual configuration"
fi
echo ""

# Set up cron job for automatic renewal (if not already set up by Certbot)
if ! crontab -l 2>/dev/null | grep -q "certbot renew"; then
    echo "Setting up cron job for automatic renewal..."
    (crontab -l 2>/dev/null; echo "0 3 * * * certbot renew --quiet --post-hook 'systemctl reload nginx'") | crontab -
    echo -e "${GREEN}✓ Cron job created${NC}"
else
    echo -e "${GREEN}✓ Cron job already exists${NC}"
fi
echo ""

# Display certificate information
echo -e "${GREEN}=== SSL Certificate Setup Complete ===${NC}"
echo ""
echo "Certificate details:"
certbot certificates -d "$DOMAIN"
echo ""
echo -e "${GREEN}Your site is now secured with HTTPS!${NC}"
echo "Certificate location: /etc/letsencrypt/live/$DOMAIN/"
echo "Certificate will auto-renew before expiration"
echo ""
echo "Next steps:"
echo "  1. Test HTTPS access: https://$DOMAIN/health"
echo "  2. Verify certificate: https://www.ssllabs.com/ssltest/analyze.html?d=$DOMAIN"
echo "  3. Monitor renewal: sudo certbot renew --dry-run"
echo ""

# Troubleshooting information
echo -e "${YELLOW}Troubleshooting:${NC}"
echo "  - View certificates: sudo certbot certificates"
echo "  - Renew manually: sudo certbot renew"
echo "  - Revoke certificate: sudo certbot revoke --cert-path /etc/letsencrypt/live/$DOMAIN/cert.pem"
echo "  - Delete certificate: sudo certbot delete --cert-name $DOMAIN"
echo "  - Check renewal timer: sudo systemctl status certbot.timer"
echo ""

exit 0
