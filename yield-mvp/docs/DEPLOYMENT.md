# NEAR Deep Yield Deployment Guide

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Environment Setup](#environment-setup)
3. [Smart Contract Deployment](#smart-contract-deployment)
4. [Dashboard Deployment](#dashboard-deployment)
5. [Security Monitoring Setup](#security-monitoring-setup)
6. [Testing and Verification](#testing-and-verification)
7. [Maintenance Procedures](#maintenance-procedures)

## Prerequisites

### Required Software
- Node.js v14 or later
- Rust with `wasm32-unknown-unknown` target
- NEAR CLI
- PowerShell 5.1 or later (Windows)
- Git

### Access Requirements
- NEAR account with deployment permissions
- Access to hosting platform (e.g., AWS, Azure, or Vercel)
- Required API keys and secrets

## Environment Setup

### 1. Clone Repository
```bash
git clone https://github.com/your-org/near-deep-yield.git
cd near-deep-yield
```

### 2. Install Dependencies
```bash
# Install contract dependencies
cd contracts/near
cargo build --target wasm32-unknown-unknown --release

# Install dashboard dependencies
cd ../../dashboard
npm install

# Install monitoring dependencies
cd ../monitoring
npm install
```

### 3. Configure Environment Variables
Create `.env` files in required directories:

```bash
# Dashboard .env
REACT_APP_API_BASE_URL=http://your-api-url
REACT_APP_CONTRACT_NAME=your-contract.near
REACT_APP_WS_URL=wss://your-websocket-url

# Monitoring .env
NEAR_ENV=mainnet
CONTRACT_NAME=your-contract.near
ALERT_EMAIL=alerts@your-domain.com
WEBHOOK_URL=https://your-webhook-url
```

## Smart Contract Deployment

### 1. Build Contract
```bash
cd contracts/near
cargo build --target wasm32-unknown-unknown --release
```

### 2. Deploy to NEAR
```bash
# Deploy to testnet first
near deploy --accountId your-contract.testnet \
  --wasmFile target/wasm32-unknown-unknown/release/near_contract.wasm

# After testing, deploy to mainnet
near deploy --accountId your-contract.near \
  --wasmFile target/wasm32-unknown-unknown/release/near_contract.wasm
```

### 3. Initialize Contract
```bash
near call your-contract.near init '{
  "owner_id": "your-account.near",
  "settings": {
    "max_slippage": 100,
    "min_deposit": "1000000000000000000000000"
  }
}' --accountId your-account.near
```

## Dashboard Deployment

### 1. Build Dashboard
```bash
cd dashboard
npm run build
```

### 2. Deploy to Hosting Platform

#### Vercel
```bash
vercel --prod
```

#### AWS S3 + CloudFront
```bash
# Configure AWS CLI first
aws s3 sync build/ s3://your-bucket-name
aws cloudfront create-invalidation --distribution-id YOUR_DIST_ID --paths "/*"
```

### 3. Configure DNS and SSL
- Set up custom domain
- Configure SSL certificates
- Update DNS records

## Security Monitoring Setup

### 1. Configure Monitoring Service
```powershell
# Windows setup
cd scripts
.\setup-security-tasks.ps1

# Verify tasks
Get-ScheduledTask -TaskName "NEARYield*"
```

### 2. Set Up Alert Channels
1. Configure email notifications
2. Set up webhook integrations
3. Test alert delivery

### 3. Initialize Security Database
```bash
cd monitoring
npm run init-db
```

## Testing and Verification

### 1. Run Integration Tests
```bash
cd tests
npm run test:integration

# Test contract interactions
npm run test:contract

# Test monitoring
npm run test:monitoring
```

### 2. Security Verification
```bash
# Run security checks
npm run security-check

# Test key rotation
npm run test:key-rotation

# Verify monitoring
npm run verify-monitoring
```

### 3. Load Testing
```bash
# Run load tests
npm run test:load

# Monitor performance
npm run monitor-performance
```

## Maintenance Procedures

### Regular Updates
1. Update dependencies monthly
2. Rotate keys every 30 days
3. Review and update security rules
4. Backup configuration

### Monitoring
1. Check system health daily
2. Review security logs
3. Monitor performance metrics
4. Track contract state

### Backup Procedures
1. Backup configuration files
2. Export security logs
3. Archive contract state
4. Store keys securely

## Recovery Procedures

### Contract Recovery
```bash
# Recover from invalid state
near call $CONTRACT_ID recover_state '{}'

# Emergency pause
near call $CONTRACT_ID pause '{}'
```

### Key Recovery
```bash
# Generate new key
near generate-key recovery-key

# Add to account
near add-key $ACCOUNT_ID recovery-key
```

### System Recovery
1. Restore from backup
2. Verify contract state
3. Test functionality
4. Resume operations

## Support and Documentation

### Resources
- [NEAR Documentation](https://docs.near.org)
- [Security Best Practices](https://docs.near.org/security)
- [Troubleshooting Guide](./TROUBLESHOOTING.md)

### Contact
- Technical Support: support@nearyield.com
- Emergency Contact: emergency@nearyield.com

## Appendix

### Security Checklist
- [ ] Contract audited
- [ ] Security monitoring configured
- [ ] Alert channels tested
- [ ] Backup procedures verified
- [ ] Recovery procedures documented
- [ ] Access controls implemented
- [ ] Logging enabled
- [ ] SSL/TLS configured
- [ ] Key rotation scheduled
- [ ] Emergency contacts updated
