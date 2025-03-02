# Deployment Guide

## 🚀 Deployment Overview

### Environment Types

1. **Development**
   - Local development
   - Testnet integration
   - Feature testing

2. **Staging**
   - Integration testing
   - Performance testing
   - User acceptance testing

3. **Production**
   - Mainnet deployment
   - Live user traffic
   - Production monitoring

## 📋 Prerequisites

- Docker & Docker Compose
- Node.js v16+
- NEAR CLI
- Access to deployment servers
- Required API keys and secrets

## 🔑 Environment Configuration

### Required Secrets

```bash
# Backend (.env)
NODE_ENV=production
PORT=3000
JWT_SECRET=your-secret
NEAR_NODE_URL=https://rpc.mainnet.near.org
NEAR_NETWORK_ID=mainnet
NEAR_CONTRACT_ID=contract.near
INFLUX_URL=your-influxdb-url
INFLUX_TOKEN=your-token
INFLUX_ORG=your-org
INFLUX_BUCKET=your-bucket

# Frontend (.env)
REACT_APP_API_URL=https://api.yourdomain.com
REACT_APP_WS_URL=wss://api.yourdomain.com
REACT_APP_NEAR_NODE_URL=https://rpc.mainnet.near.org
REACT_APP_NEAR_NETWORK_ID=mainnet
```

## 📦 Build Process

### Backend Build

```bash
# Install dependencies
cd backend
npm ci

# Build production version
npm run build

# Create Docker image
docker build -t near-deep-yield-backend .
```

### Frontend Build

```bash
# Install dependencies
cd frontend
npm ci

# Build production version
npm run build

# Create Docker image
docker build -t near-deep-yield-frontend .
```

## 🌐 Infrastructure Setup

### Cloud Provider Setup (AWS Example)

1. **VPC Configuration**
```bash
aws ec2 create-vpc --cidr-block 10.0.0.0/16
aws ec2 create-subnet --vpc-id vpc-id --cidr-block 10.0.1.0/24
```

2. **Security Groups**
```bash
# Create security group
aws ec2 create-security-group \
  --group-name NDY-SecurityGroup \
  --description "NEAR Deep Yield security group"

# Add rules
aws ec2 authorize-security-group-ingress \
  --group-id sg-id \
  --protocol tcp \
  --port 80 \
  --cidr 0.0.0.0/0
```

### Database Setup

1. **InfluxDB Setup**
```bash
# Create InfluxDB instance
docker run -d \
  --name influxdb \
  -p 8086:8086 \
  -v influxdb:/var/lib/influxdb2 \
  influxdb:latest

# Initialize database
influx setup \
  --org your-org \
  --bucket your-bucket \
  --username admin \
  --password your-password
```

## 🚢 Deployment Process

### Using Docker Compose

```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  backend:
    image: near-deep-yield-backend
    environment:
      - NODE_ENV=production
    ports:
      - "3000:3000"
    depends_on:
      - influxdb

  frontend:
    image: near-deep-yield-frontend
    ports:
      - "80:80"

  influxdb:
    image: influxdb:latest
    volumes:
      - influxdb_data:/var/lib/influxdb2

volumes:
  influxdb_data:
```

### Deployment Commands

```bash
# Deploy stack
docker-compose -f docker-compose.prod.yml up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f
```

## 📊 Monitoring Setup

### Metrics Collection

1. **Prometheus Configuration**
```yaml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'near-deep-yield'
    static_configs:
      - targets: ['localhost:3000']
```

2. **Grafana Dashboard Setup**
```bash
# Start Grafana
docker run -d \
  --name=grafana \
  -p 3000:3000 \
  grafana/grafana
```

## 🔄 Continuous Deployment

### GitHub Actions Workflow

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Configure AWS
        uses: aws-actions/configure-aws-credentials@v1
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          
      - name: Build and push Docker images
        run: |
          docker build -t near-deep-yield-backend ./backend
          docker build -t near-deep-yield-frontend ./frontend
          
      - name: Deploy to ECS
        run: |
          aws ecs update-service --force-new-deployment
```

## 🔧 Maintenance

### Backup Procedures

1. **Database Backup**
```bash
# Backup InfluxDB
influx backup /path/to/backup

# Automated backup script
#!/bin/bash
DATE=$(date +%Y%m%d)
influx backup /backups/$DATE
aws s3 cp /backups/$DATE s3://your-bucket/backups/$DATE
```

2. **Log Rotation**
```nginx
/var/log/nginx/*.log {
    daily
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 www-data adm
    sharedscripts
    prerotate
        if [ -d /etc/logrotate.d/httpd-prerotate ]; then
            run-parts /etc/logrotate.d/httpd-prerotate
        fi
    endscript
    postrotate
        invoke-rc.d nginx rotate >/dev/null 2>&1
    endscript
}
```

## 🚨 Incident Response

### Common Issues

1. **High CPU Usage**
```bash
# Check system resources
top -b -n 1

# Container stats
docker stats

# Restart service if needed
docker-compose restart backend
```

2. **Memory Leaks**
```bash
# Check memory usage
free -m

# Container memory
docker stats --format "table {{.Name}}\t{{.MemUsage}}"
```

### Rollback Procedure

```bash
# Tag current version
docker tag near-deep-yield-backend:latest near-deep-yield-backend:backup

# Rollback to previous version
docker-compose -f docker-compose.prod.yml down
docker tag near-deep-yield-backend:previous near-deep-yield-backend:latest
docker-compose -f docker-compose.prod.yml up -d
```
