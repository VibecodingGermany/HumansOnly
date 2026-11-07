# Deployment Documentation - Humans Only

**Production Server:** 5.182.17.148 (Ubuntu 24.04)
**Live URL:** https://ho.nm-forum.de
**Last Updated:** 2025-12-21

---

## Table of Contents

1. [Server Overview](#server-overview)
2. [Initial Setup](#initial-setup)
3. [Deployment Process](#deployment-process)
4. [PM2 Management](#pm2-management)
5. [Nginx Configuration](#nginx-configuration)
6. [SSL Certificate](#ssl-certificate)
7. [Database Management](#database-management)
8. [Troubleshooting](#troubleshooting)
9. [Maintenance Tasks](#maintenance-tasks)
10. [Monitoring & Logs](#monitoring--logs)

---

## Server Overview

### System Specifications
```
OS: Ubuntu 24.04 LTS
Node.js: 20.19.6
npm: 10.8.2
PostgreSQL: 16.11
Nginx: 1.24.0
PM2: Latest (Global)
```

### Server Access
```bash
Host: 5.182.17.148
User: root
SSH: ssh root@5.182.17.148
```

**IMPORTANT**: Password stored securely (not documented here for security)

### Important Paths
```
Application Root:     /var/www/humansonly/
Nginx Config:         /etc/nginx/sites-available/humansonly
Nginx Enabled:        /etc/nginx/sites-enabled/humansonly
SSL Certificates:     /etc/letsencrypt/live/ho.nm-forum.de/
PM2 Logs:             /root/.pm2/logs/
App Logs:             /var/log/humansonly/
Environment File:     /var/www/humansonly/.env
PM2 Config:           /var/www/humansonly/ecosystem.config.js
```

---

## Initial Setup

### 1. Server Preparation

#### Update System
```bash
apt update && apt upgrade -y
```

#### Install Node.js 20.x
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
apt install -y nodejs
node --version  # Verify: v20.19.6
npm --version   # Verify: 10.8.2
```

#### Install Build Tools
```bash
apt install -y build-essential gcc g++ make
```

#### Install PostgreSQL 16
```bash
apt install -y postgresql-16 postgresql-contrib
systemctl enable postgresql
systemctl start postgresql
```

#### Install Nginx
```bash
apt install -y nginx
systemctl enable nginx
systemctl start nginx
```

#### Install PM2 Globally
```bash
npm install -g pm2
```

#### Install Certbot (SSL)
```bash
apt install -y certbot python3-certbot-nginx
```

#### Configure Firewall
```bash
ufw allow 22        # SSH
ufw allow 80        # HTTP
ufw allow 443       # HTTPS
ufw enable
ufw status
```

---

### 2. Database Setup

#### Create Database User
```bash
sudo -u postgres psql
```

```sql
CREATE DATABASE humansonly_prod;
CREATE USER humansonly_user WITH ENCRYPTED PASSWORD '<strong-password>';
GRANT ALL PRIVILEGES ON DATABASE humansonly_prod TO humansonly_user;
\q
```

#### Test Connection
```bash
PGPASSWORD='<strong-password>' psql -h localhost -U humansonly_user -d humansonly_prod -c "SELECT 1"
```

---

### 3. Application Setup

#### Create Application Directory
```bash
mkdir -p /var/www/humansonly
cd /var/www/humansonly
```

#### Transfer Application Files
**From Local Machine:**
```bash
cd /Users/denniswestermann/Desktop/Coding\ Projekte/HumansOnly/app

# Sync files to server (excluding build artifacts)
rsync -avz \
  --exclude 'node_modules' \
  --exclude '.next' \
  --exclude '.git' \
  --exclude '.env' \
  ./ root@5.182.17.148:/var/www/humansonly/
```

#### Create Environment File
**On Server:**
```bash
cd /var/www/humansonly
nano .env
```

**Environment Configuration:**
```env
# DATABASE
DATABASE_URL="postgresql://humansonly_user:<strong-password>@localhost:5432/humansonly_prod?schema=public"
DIRECT_DATABASE_URL="postgresql://humansonly_user:<strong-password>@localhost:5432/humansonly_prod?schema=public"

# AUTHENTICATION
JWT_SECRET_KEY="<generate-with-openssl-rand-hex-32>"
CREATION_SECRET_KEY="<generate-with-openssl-rand-hex-32>"
BLUE_SECRET_KEY="<set-a-private-verification-code>"

# APPLICATION
NEXT_PUBLIC_HOST_URL="https://ho.nm-forum.de"
NODE_ENV="production"
PORT=3001

# STORAGE (Placeholder - needs real Supabase credentials)
NEXT_PUBLIC_SUPABASE_URL="https://placeholder.supabase.co"
NEXT_PUBLIC_SUPABASE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
NEXT_PUBLIC_STORAGE_URL="https://placeholder.supabase.co/storage/v1/object/public/"
```

**Security Note:** Generate secure secrets with:
```bash
openssl rand -hex 32
```

**Important:** Production must point to `humansonly_prod` (not `humansonly_dev`).
Validate before restart:
```bash
cd /var/www/humansonly
grep -E 'DATABASE_URL|DIRECT_DATABASE_URL' .env
```

#### Install Dependencies
```bash
cd /var/www/humansonly
npm ci  # Clean install for production
```

#### Run Database Migrations
```bash
cd /var/www/humansonly/src
npx prisma migrate deploy
npx prisma generate
cd ..
```

#### Build Application
```bash
npm run build
```

---

### 4. PM2 Configuration

#### Create PM2 Ecosystem File
```bash
nano /var/www/humansonly/ecosystem.config.js
```

**Content:**
```javascript
module.exports = {
  apps: [{
    name: 'humansonly',
    script: 'npm',
    args: 'start',
    cwd: '/var/www/humansonly',
    env: {
      NODE_ENV: 'production',
      PORT: 3001
    },
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    error_file: '/var/log/humansonly/error.log',
    out_file: '/var/log/humansonly/out.log',
    log_file: '/var/log/humansonly/combined.log',
    time: true
  }]
}
```

#### Create Log Directory
```bash
mkdir -p /var/log/humansonly
```

#### Start Application with PM2
```bash
cd /var/www/humansonly
pm2 start ecosystem.config.js
pm2 save
pm2 startup systemd -u root --hp /root
```

**Verify:**
```bash
pm2 status
pm2 logs humansonly --lines 50
```

---

### 5. Nginx Setup

#### Create Nginx Configuration
```bash
nano /etc/nginx/sites-available/humansonly
```

**Content:**
```nginx
server {
    listen 80;
    server_name ho.nm-forum.de;

    client_max_body_size 20M;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 300s;
        proxy_connect_timeout 300s;
    }

    location /storage/ {
        alias /var/www/humansonly/public/uploads/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    location /_next/static/ {
        alias /var/www/humansonly/.next/static/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

#### Enable Site
```bash
ln -s /etc/nginx/sites-available/humansonly /etc/nginx/sites-enabled/
nginx -t  # Test configuration
systemctl reload nginx
```

---

### 6. SSL Certificate Setup

#### Install Certificate
```bash
certbot --nginx -d ho.nm-forum.de
```

**Follow prompts:**
- Enter email for renewal notifications
- Agree to Terms of Service
- Choose to redirect HTTP to HTTPS (recommended)

**Verify:**
```bash
certbot certificates
```

**Auto-renewal is enabled by default via systemd timer.**

---

## Deployment Process

### GitHub Auto-Deploy (Recommended)

Repository includes workflow:
- `.github/workflows/deploy.yml`

This workflow runs on every push to `main` (for selected paths) and performs:
1. `npm ci`, `npm run lint`, `npm run build` in `app/`
2. `rsync` upload of `app/` to `/var/www/humansonly`
3. remote `npm ci`, `prisma migrate deploy`, `npm run build`
4. `pm2 restart humansonly --update-env` + health probe

Required GitHub repository secrets:
- `DEPLOY_SSH_KEY` (private key, e.g. matching server authorized key)
- `DEPLOY_HOST` (e.g. `5.182.17.148`)
- `DEPLOY_PORT` (e.g. `2222`)
- `DEPLOY_USER` (e.g. `root`)
- `DEPLOY_PATH` (e.g. `/var/www/humansonly`)

### Manual Deploy (Fallback / Ops)

Use local script:
```bash
./scripts/deploy-server.sh
```

Dry-run (no server changes):
```bash
./scripts/deploy-server.sh --dry-run
```

### Standard Deployment Workflow

#### 1. Local Changes
```bash
# On local machine
cd /Users/denniswestermann/Desktop/Coding\ Projekte/HumansOnly

# Make changes, test locally
./scripts/baseline-check.sh

# Commit changes
git add .
git commit -m "feat: Your changes"
git push origin main
```

#### 2. Deploy to Server
```bash
# Preferred: push to main triggers GitHub auto-deploy workflow
# Fallback: run local deployment script
./scripts/deploy-server.sh
```

#### 3. Verify Deployment
```bash
# Check PM2 status
pm2 status

# Check logs
pm2 logs humansonly --lines 50

# Test application
curl -I http://localhost:3001
curl -I https://ho.nm-forum.de
```

---

### Quick Deployment Script

Create deployment script for faster updates:

```bash
nano /root/deploy-humansonly.sh
```

**Content:**
```bash
#!/bin/bash
set -e

echo "Starting Humans Only deployment..."

cd /var/www/humansonly

echo "Pulling latest changes..."
git pull origin main

echo "Installing dependencies..."
npm ci

echo "Running database migrations..."
cd src
npx prisma migrate deploy
npx prisma generate
cd ..

echo "Building application..."
npm run build

echo "Restarting PM2..."
pm2 restart humansonly --update-env
pm2 save

echo "Deployment complete!"
pm2 status
```

**Make executable:**
```bash
chmod +x /root/deploy-humansonly.sh
```

**Usage:**
```bash
/root/deploy-humansonly.sh
```

---

## PM2 Management

### Essential PM2 Commands

#### Status & Monitoring
```bash
pm2 status                      # Show all processes
pm2 info humansonly             # Detailed info
pm2 monit                       # Real-time monitoring
pm2 logs humansonly             # Live logs
pm2 logs humansonly --lines 100 # Last 100 lines
pm2 logs humansonly --err       # Error logs only
```

#### Process Control
```bash
pm2 start ecosystem.config.js   # Start application
pm2 restart humansonly          # Restart application
pm2 restart humansonly --update-env  # Restart with new .env
pm2 stop humansonly             # Stop application
pm2 delete humansonly           # Remove from PM2
pm2 save                        # Save current process list
pm2 resurrect                   # Restore saved processes
```

#### System Integration
```bash
pm2 startup                     # Generate startup script
pm2 startup systemd -u root --hp /root  # Systemd startup
systemctl status pm2-root       # Check systemd service
```

#### Logs & Cleanup
```bash
pm2 flush                       # Clear all logs
pm2 reloadLogs                  # Reload log configuration
pm2 install pm2-logrotate       # Install log rotation
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

---

### PM2 Troubleshooting

#### High Restart Count
```bash
# Check logs for errors
pm2 logs humansonly --lines 200 --err

# Common causes:
# - Port conflict (check with: lsof -i :3001)
# - Database connection error
# - Missing environment variables
# - Build errors
```

#### Memory Issues
```bash
# Check memory usage
pm2 monit

# Restart with updated memory limit
pm2 delete humansonly
# Edit ecosystem.config.js: max_memory_restart: '2G'
pm2 start ecosystem.config.js
pm2 save
```

#### Process Won't Start
```bash
# Kill zombie processes
pkill -f "next-server"
pkill -f "next-router"

# Clean PM2 state
pm2 delete all
pm2 flush

# Restart with ecosystem config
cd /var/www/humansonly
pm2 start ecosystem.config.js
pm2 save
```

---

## Nginx Configuration

### Testing Configuration
```bash
nginx -t  # Test syntax
nginx -T  # Show full configuration
```

### Reload & Restart
```bash
systemctl reload nginx   # Reload config (no downtime)
systemctl restart nginx  # Full restart
systemctl status nginx   # Check status
```

### Common Nginx Issues

#### 502 Bad Gateway
```bash
# Check if PM2 is running
pm2 status

# Check if port is open
curl http://localhost:3001

# Check Nginx error logs
tail -f /var/log/nginx/error.log
```

#### 413 Request Entity Too Large
```bash
# Increase client_max_body_size in nginx config
nano /etc/nginx/sites-available/humansonly
# Add: client_max_body_size 50M;
nginx -t && systemctl reload nginx
```

---

## SSL Certificate

### Certificate Information
```
Domain: ho.nm-forum.de
Issuer: Let's Encrypt
Valid Until: 2026-03-21 (auto-renews)
Certificate Path: /etc/letsencrypt/live/ho.nm-forum.de/fullchain.pem
Private Key Path: /etc/letsencrypt/live/ho.nm-forum.de/privkey.pem
```

### Certbot Commands
```bash
certbot certificates              # List all certificates
certbot renew --dry-run          # Test renewal
certbot renew                     # Manual renewal
certbot renew --force-renewal    # Force renewal
```

### Auto-Renewal
Certbot creates a systemd timer for automatic renewal:
```bash
systemctl status certbot.timer
systemctl list-timers certbot.timer
```

### Manual Renewal (if needed)
```bash
certbot renew
systemctl reload nginx
```

---

## Database Management

### PostgreSQL Access
```bash
# Connect to database
PGPASSWORD='<strong-password>' psql -h localhost -U humansonly_user -d humansonly_prod

# As postgres superuser
sudo -u postgres psql
```

### Common Database Commands
```sql
-- List databases
\l

-- Connect to database
\c humansonly_prod

-- List tables
\dt

-- List users
\du

-- View table structure
\d+ "User"

-- Check migrations
SELECT * FROM "_prisma_migrations" ORDER BY finished_at DESC;

-- Quit
\q
```

### Database Backup

#### Manual Backup
```bash
# Create backup
pg_dump -U humansonly_user -h localhost humansonly_prod > backup_$(date +%F).sql

# With password
PGPASSWORD='<strong-password>' pg_dump -h localhost -U humansonly_user humansonly_prod > backup_$(date +%F).sql
```

#### Automated Daily Backup Script
```bash
nano /root/backup-humansonly-db.sh
```

**Content:**
```bash
#!/bin/bash
BACKUP_DIR="/var/backups/humansonly"
DATE=$(date +%F)
KEEP_DAYS=7

mkdir -p $BACKUP_DIR

# Create backup
PGPASSWORD='<strong-password>' pg_dump -h localhost -U humansonly_user humansonly_prod > $BACKUP_DIR/humansonly_$DATE.sql

# Compress
gzip $BACKUP_DIR/humansonly_$DATE.sql

# Delete old backups
find $BACKUP_DIR -name "humansonly_*.sql.gz" -mtime +$KEEP_DAYS -delete

echo "Backup completed: humansonly_$DATE.sql.gz"
```

**Make executable:**
```bash
chmod +x /root/backup-humansonly-db.sh
```

**Add to crontab (daily at 2 AM):**
```bash
crontab -e
# Add:
0 2 * * * /root/backup-humansonly-db.sh >> /var/log/humansonly/backup.log 2>&1
```

#### Restore from Backup
```bash
# Uncompress backup
gunzip backup_2025-12-21.sql.gz

# Restore database (WARNING: This will overwrite existing data)
PGPASSWORD='<strong-password>' psql -h localhost -U humansonly_user -d humansonly_prod < backup_2025-12-21.sql
```

---

## Troubleshooting

### Application Won't Start

#### Check PM2 Status
```bash
pm2 status
pm2 logs humansonly --lines 100 --err
```

#### Common Issues

**Port Conflict:**
```bash
# Check what's using the port
lsof -i :3001

# Kill process if needed
kill -9 $(lsof -ti:3001)

# Restart PM2
pm2 restart humansonly
```

**Database Connection Error:**
```bash
# Test database connection
PGPASSWORD='<strong-password>' psql -h localhost -U humansonly_user -d humansonly_prod -c "SELECT 1"

# Check .env file
cat /var/www/humansonly/.env | grep DATABASE_URL

# Restart PostgreSQL
systemctl restart postgresql
```

**Build Errors:**
```bash
cd /var/www/humansonly
rm -rf .next node_modules package-lock.json
npm install
npm run build
pm2 restart humansonly
```

---

### Website Not Accessible

#### Check Nginx
```bash
systemctl status nginx
nginx -t
tail -f /var/log/nginx/error.log
```

#### Check SSL Certificate
```bash
certbot certificates
curl -I https://ho.nm-forum.de
```

#### Check Firewall
```bash
ufw status
# Ensure ports 80 and 443 are open
```

---

### Performance Issues

#### Check Server Resources
```bash
# Memory usage
free -h

# Disk space
df -h

# CPU usage
top

# PM2 monitoring
pm2 monit
```

#### Database Performance
```bash
# Check database size
sudo -u postgres psql -c "\l+ humansonly_prod"

# Check active connections
sudo -u postgres psql -c "SELECT count(*) FROM pg_stat_activity WHERE datname='humansonly_prod';"
```

---

## Maintenance Tasks

### Weekly Tasks

#### Update System Packages
```bash
apt update
apt upgrade -y
```

#### Check PM2 Status
```bash
pm2 status
pm2 logs humansonly --lines 20
```

#### Verify Backups
```bash
ls -lh /var/backups/humansonly/
```

---

### Monthly Tasks

#### Review Logs
```bash
# PM2 logs
pm2 logs humansonly --lines 500

# Nginx logs
tail -500 /var/log/nginx/access.log
tail -500 /var/log/nginx/error.log

# PostgreSQL logs
tail -500 /var/log/postgresql/postgresql-16-main.log
```

#### Update Dependencies (carefully)
```bash
cd /var/www/humansonly
npm outdated
# Review and update as needed
npm update
npm audit fix
npm run build
pm2 restart humansonly
```

#### Clean Old Logs
```bash
pm2 flush
find /var/log/humansonly -name "*.log" -mtime +30 -delete
```

---

### Security Updates

#### Node.js Updates
```bash
# Check current version
node --version

# Update to latest LTS
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
apt install -y nodejs
pm2 restart humansonly
```

#### PostgreSQL Updates
```bash
apt update
apt upgrade postgresql-16
systemctl restart postgresql
```

---

## Monitoring & Logs

### Application Logs

#### PM2 Logs
```bash
# Real-time logs
pm2 logs humansonly

# Last N lines
pm2 logs humansonly --lines 200

# Only errors
pm2 logs humansonly --err

# Only output
pm2 logs humansonly --out

# Log files location
ls -lh /var/log/humansonly/
ls -lh /root/.pm2/logs/
```

---

### Nginx Logs
```bash
# Access log (real-time)
tail -f /var/log/nginx/access.log

# Error log (real-time)
tail -f /var/log/nginx/error.log

# Last 100 lines
tail -100 /var/log/nginx/access.log
tail -100 /var/log/nginx/error.log

# Search for specific IP
grep "123.456.789.0" /var/log/nginx/access.log
```

---

### Database Logs
```bash
# PostgreSQL log location
tail -f /var/log/postgresql/postgresql-16-main.log

# Slow queries (if logging enabled)
grep "duration:" /var/log/postgresql/postgresql-16-main.log
```

---

### System Monitoring

#### Resource Usage
```bash
# Memory
free -h

# Disk
df -h

# CPU & Processes
htop  # or: top

# Network
netstat -tuln
```

#### PM2 Monitoring
```bash
# Real-time dashboard
pm2 monit

# Process info
pm2 info humansonly
```

---

## Emergency Procedures

### Complete Application Restart
```bash
# Stop application
pm2 stop humansonly

# Restart PostgreSQL
systemctl restart postgresql

# Restart Nginx
systemctl restart nginx

# Start application
pm2 start humansonly
pm2 save

# Verify
pm2 status
curl -I https://ho.nm-forum.de
```

---

### Rollback Deployment
```bash
cd /var/www/humansonly

# Find previous commit
git log --oneline -10

# Rollback to previous version
git reset --hard <commit-hash>

# Rebuild
npm ci
npm run build

# Restart
pm2 restart humansonly --update-env
```

---

### Database Emergency Restore
```bash
# Stop application
pm2 stop humansonly

# Restore latest backup
LATEST_BACKUP=$(ls -t /var/backups/humansonly/*.sql.gz | head -1)
gunzip -c $LATEST_BACKUP | PGPASSWORD='<strong-password>' psql -h localhost -U humansonly_user -d humansonly_prod

# Restart application
pm2 start humansonly
```

---

## Additional Resources

### Useful Commands Summary

#### Quick Health Check
```bash
# One-line health check
systemctl status nginx && systemctl status postgresql && pm2 status && curl -I https://ho.nm-forum.de
```

#### Full System Status
```bash
#!/bin/bash
echo "=== System Status ==="
echo "Uptime: $(uptime)"
echo "Memory: $(free -h | grep Mem:)"
echo "Disk: $(df -h / | tail -1)"
echo ""
echo "=== Services ==="
systemctl status nginx --no-pager
systemctl status postgresql --no-pager
echo ""
echo "=== PM2 ==="
pm2 status
echo ""
echo "=== SSL Certificate ==="
certbot certificates
echo ""
echo "=== Website Check ==="
curl -I https://ho.nm-forum.de
```

---

## Support & Contacts

**Server Administrator:** d.westermann@ol-mg.de
**Documentation:** /docs/DEPLOYMENT.md
**Architecture Docs:** /docs/ARCHITECTURE.md
**API Docs:** /docs/API_CONSUMERS.md

---

**Last Updated:** 2025-12-21
**Version:** 1.0
**Status:** Production Ready
