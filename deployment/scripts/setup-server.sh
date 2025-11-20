#!/bin/bash

###############################################################################
# Server Setup Script for Travel Planning API
# 
# This script sets up a fresh EC2 instance with all required dependencies:
# - Node.js 20.x
# - PM2 process manager
# - Nginx web server
# - MySQL database server
# - Git and build tools
# - Security updates
#
# Supports: Amazon Linux 2, Ubuntu 22.04, Debian
#
# Usage: sudo ./setup-server.sh
###############################################################################

set -e  # Exit on error

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if script is run as root
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}Error: This script must be run as root${NC}"
    exit 1
fi

echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║   Travel Planning API - Server Setup Script               ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Detect OS
if [ -f /etc/os-release ]; then
    . /etc/os-release
    OS=$ID
    OS_VERSION=$VERSION_ID
else
    echo -e "${RED}Error: Cannot detect operating system${NC}"
    exit 1
fi

echo -e "${BLUE}Detected OS: $OS $OS_VERSION${NC}"
echo ""

###############################################################################
# Step 1: Update System Packages
###############################################################################

echo -e "${YELLOW}Step 1: Updating system packages${NC}"

if [ "$OS" = "amzn" ] || [ "$OS" = "rhel" ] || [ "$OS" = "centos" ]; then
    yum update -y
    yum install -y wget curl git tar gzip
elif [ "$OS" = "ubuntu" ] || [ "$OS" = "debian" ]; then
    apt-get update
    apt-get upgrade -y
    apt-get install -y wget curl git tar gzip
else
    echo -e "${RED}Error: Unsupported operating system: $OS${NC}"
    exit 1
fi

echo -e "${GREEN}✓ System packages updated${NC}"
echo ""

###############################################################################
# Step 2: Install Node.js 20.x
###############################################################################

echo -e "${YELLOW}Step 2: Installing Node.js 20.x${NC}"

if command -v node &> /dev/null; then
    NODE_VERSION=$(node -v)
    echo "Node.js is already installed: $NODE_VERSION"
    
    # Check if version is 20.x
    if [[ $NODE_VERSION == v20.* ]]; then
        echo -e "${GREEN}✓ Node.js 20.x is already installed${NC}"
    else
        echo "Upgrading to Node.js 20.x..."
    fi
else
    echo "Installing Node.js 20.x..."
fi

# Install Node.js based on OS
if [ "$OS" = "amzn" ] || [ "$OS" = "rhel" ] || [ "$OS" = "centos" ]; then
    # Amazon Linux 2 / RHEL / CentOS
    curl -fsSL https://rpm.nodesource.com/setup_20.x | bash -
    yum install -y nodejs
    
elif [ "$OS" = "ubuntu" ] || [ "$OS" = "debian" ]; then
    # Ubuntu / Debian
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
fi

# Verify installation
node -v
npm -v

echo -e "${GREEN}✓ Node.js installed successfully${NC}"
echo ""

###############################################################################
# Step 3: Install PM2 Process Manager
###############################################################################

echo -e "${YELLOW}Step 3: Installing PM2 process manager${NC}"

npm install -g pm2

# Verify installation
pm2 -v

echo -e "${GREEN}✓ PM2 installed successfully${NC}"
echo ""

###############################################################################
# Step 4: Install Nginx Web Server
###############################################################################

echo -e "${YELLOW}Step 4: Installing Nginx web server${NC}"

if [ "$OS" = "amzn" ] || [ "$OS" = "rhel" ] || [ "$OS" = "centos" ]; then
    # Amazon Linux 2 / RHEL / CentOS
    amazon-linux-extras install -y nginx1 || yum install -y nginx
    
elif [ "$OS" = "ubuntu" ] || [ "$OS" = "debian" ]; then
    # Ubuntu / Debian
    apt-get install -y nginx
fi

# Start and enable Nginx
systemctl start nginx
systemctl enable nginx

# Verify installation
nginx -v

echo -e "${GREEN}✓ Nginx installed and started${NC}"
echo ""

###############################################################################
# Step 5: Install MySQL Database Server
###############################################################################

echo -e "${YELLOW}Step 5: Installing MySQL database server${NC}"

if [ "$OS" = "amzn" ] || [ "$OS" = "rhel" ] || [ "$OS" = "centos" ]; then
    # Amazon Linux 2 / RHEL / CentOS
    yum install -y mysql-server
    
elif [ "$OS" = "ubuntu" ] || [ "$OS" = "debian" ]; then
    # Ubuntu / Debian
    apt-get install -y mysql-server
fi

# Start and enable MySQL
systemctl start mysqld || systemctl start mysql
systemctl enable mysqld || systemctl enable mysql

# Verify installation
mysql --version

echo -e "${GREEN}✓ MySQL installed and started${NC}"
echo ""

###############################################################################
# Step 6: Configure Firewall
###############################################################################

echo -e "${YELLOW}Step 6: Configuring firewall${NC}"

if command -v firewall-cmd &> /dev/null; then
    # Firewalld (Amazon Linux 2, RHEL, CentOS)
    systemctl start firewalld
    systemctl enable firewalld
    
    firewall-cmd --permanent --add-service=http
    firewall-cmd --permanent --add-service=https
    firewall-cmd --permanent --add-service=ssh
    firewall-cmd --reload
    
    echo -e "${GREEN}✓ Firewalld configured${NC}"
    
elif command -v ufw &> /dev/null; then
    # UFW (Ubuntu, Debian)
    ufw --force enable
    ufw allow ssh
    ufw allow http
    ufw allow https
    ufw reload
    
    echo -e "${GREEN}✓ UFW configured${NC}"
else
    echo -e "${YELLOW}Warning: No firewall detected. Please configure manually.${NC}"
fi

echo ""

###############################################################################
# Step 7: Create Application Directory Structure
###############################################################################

echo -e "${YELLOW}Step 7: Creating application directory structure${NC}"

# Create directories
mkdir -p /var/www/travel-api
mkdir -p /var/log/travel-api
mkdir -p /var/backups/travel-api
mkdir -p /var/backups/mysql

# Set permissions
chown -R $SUDO_USER:$SUDO_USER /var/www/travel-api || chown -R ec2-user:ec2-user /var/www/travel-api || chown -R ubuntu:ubuntu /var/www/travel-api

echo -e "${GREEN}✓ Directory structure created${NC}"
echo ""

###############################################################################
# Step 8: Configure System Limits
###############################################################################

echo -e "${YELLOW}Step 8: Configuring system limits${NC}"

# Increase file descriptor limits for Node.js
cat >> /etc/security/limits.conf << 'EOF'

# Limits for Node.js applications
* soft nofile 65536
* hard nofile 65536
* soft nproc 65536
* hard nproc 65536
EOF

# Configure sysctl for better network performance
cat >> /etc/sysctl.conf << 'EOF'

# Network performance tuning
net.core.somaxconn = 65535
net.ipv4.tcp_max_syn_backlog = 65535
net.ipv4.ip_local_port_range = 1024 65535
net.ipv4.tcp_tw_reuse = 1
net.ipv4.tcp_fin_timeout = 30
EOF

sysctl -p

echo -e "${GREEN}✓ System limits configured${NC}"
echo ""

###############################################################################
# Step 9: Install Additional Tools
###############################################################################

echo -e "${YELLOW}Step 9: Installing additional tools${NC}"

if [ "$OS" = "amzn" ] || [ "$OS" = "rhel" ] || [ "$OS" = "centos" ]; then
    yum install -y htop vim nano openssl
elif [ "$OS" = "ubuntu" ] || [ "$OS" = "debian" ]; then
    apt-get install -y htop vim nano openssl
fi

echo -e "${GREEN}✓ Additional tools installed${NC}"
echo ""

###############################################################################
# Step 10: Configure Log Rotation
###############################################################################

echo -e "${YELLOW}Step 10: Configuring log rotation${NC}"

cat > /etc/logrotate.d/travel-api << 'EOF'
/var/log/travel-api/*.log {
    daily
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 root root
    sharedscripts
    postrotate
        pm2 reloadLogs
    endscript
}
EOF

echo -e "${GREEN}✓ Log rotation configured${NC}"
echo ""

###############################################################################
# Summary
###############################################################################

echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║   Server Setup Complete!                                   ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo "Installed components:"
echo "  ✓ Node.js $(node -v)"
echo "  ✓ npm $(npm -v)"
echo "  ✓ PM2 $(pm2 -v)"
echo "  ✓ Nginx $(nginx -v 2>&1 | grep -oP 'nginx/\K[0-9.]+')"
echo "  ✓ MySQL $(mysql --version | grep -oP 'Distrib \K[0-9.]+')"
echo ""
echo "Next steps:"
echo "  1. Run database setup: sudo ./setup-database.sh"
echo "  2. Clone your application to /var/www/travel-api"
echo "  3. Configure Nginx: sudo cp deployment/nginx/travel-api.conf /etc/nginx/sites-available/"
echo "  4. Set up SSL: sudo ./setup-ssl.sh your-domain.com your-email@example.com"
echo "  5. Deploy application: sudo ./deploy.sh"
echo ""
echo "Useful commands:"
echo "  - Check PM2 status: pm2 status"
echo "  - Check Nginx status: sudo systemctl status nginx"
echo "  - Check MySQL status: sudo systemctl status mysqld"
echo "  - View logs: pm2 logs"
echo ""

exit 0
