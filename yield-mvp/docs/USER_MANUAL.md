# NEAR Deep Yield Security Dashboard User Manual

## Table of Contents
1. [Introduction](#introduction)
2. [Getting Started](#getting-started)
3. [Dashboard Overview](#dashboard-overview)
4. [Security Features](#security-features)
5. [Alerts and Notifications](#alerts-and-notifications)
6. [Key Management](#key-management)
7. [Audit Logs](#audit-logs)
8. [Recovery Procedures](#recovery-procedures)
9. [Troubleshooting](#troubleshooting)

## Introduction
The NEAR Deep Yield Security Dashboard provides real-time monitoring and management of your yield optimization platform's security. This manual will guide you through its features and help you maintain the security of your system.

## Getting Started

### System Requirements
- Modern web browser (Chrome, Firefox, Safari, Edge)
- Access to NEAR testnet or mainnet
- Valid NEAR account with sufficient permissions

### Initial Setup
1. Access the dashboard at your deployed URL
2. Connect your NEAR wallet
3. Configure alert preferences
4. Set up monitoring parameters

## Dashboard Overview

### Main Components
- **Security Status**: Overall system health
- **Recent Alerts**: Latest security notifications
- **Metrics**: Key performance indicators
- **Contract State**: Current smart contract status
- **Transaction Monitor**: Real-time transaction tracking

### Navigation
- Use the sidebar menu to access different sections
- Click on alerts for detailed information
- Use filters to customize your view

## Security Features

### Real-time Monitoring
- Contract state changes
- Transaction patterns
- Access attempts
- Performance metrics

### Automated Checks
- Smart contract vulnerabilities
- Suspicious transactions
- Access pattern analysis
- State consistency verification

## Alerts and Notifications

### Alert Types
1. **Critical Alerts**
   - Contract vulnerabilities
   - Unauthorized access attempts
   - Abnormal state changes

2. **Warning Alerts**
   - Unusual transaction patterns
   - Performance degradation
   - Resource usage warnings

3. **Info Alerts**
   - Routine operations
   - System updates
   - Maintenance notifications

### Managing Alerts
1. View alert details
2. Acknowledge alerts
3. Set alert preferences
4. Configure notification channels

## Key Management

### Key Rotation
1. Access the Key Management section
2. Review current key status
3. Initiate rotation:
   ```bash
   # Manual rotation
   near generate-key new-key-name
   near add-key account-id new-key-name
   near delete-key account-id old-key-name
   ```

### Best Practices
- Rotate keys regularly
- Store backups securely
- Monitor key usage
- Document key changes

## Audit Logs

### Viewing Logs
1. Navigate to Audit Logs section
2. Set date range
3. Apply filters
4. Export logs if needed

### Log Analysis
- Review suspicious patterns
- Track user actions
- Monitor system changes
- Generate reports

## Recovery Procedures

### Contract State Recovery
1. **Identify Issue**
   - Check error messages
   - Review recent changes
   - Analyze logs

2. **Initiate Recovery**
   ```bash
   # Basic recovery
   near call $CONTRACT_ID recover_state '{}'
   
   # Advanced recovery with parameters
   near call $CONTRACT_ID recover_state '{"mode": "full", "timestamp": "2025-02-23T00:00:00Z"}'
   ```

3. **Verify Recovery**
   - Check contract state
   - Verify transactions
   - Test functionality

### Key Recovery
1. **Lost Access Key**
   ```bash
   # Generate new key
   near generate-key recovery-key
   
   # Add to account using backup key
   near add-key $ACCOUNT_ID recovery-key
   ```

2. **Compromised Key**
   ```bash
   # Remove compromised key
   near delete-key $ACCOUNT_ID compromised-key-id
   
   # Add new key
   near add-key $ACCOUNT_ID new-key-id
   ```

### Emergency Procedures
1. **Contract Pause**
   ```bash
   near call $CONTRACT_ID pause '{}'
   ```

2. **Emergency Withdrawal**
   ```bash
   near call $CONTRACT_ID emergency_withdraw '{}'
   ```

## Troubleshooting

### Common Issues

1. **Dashboard Not Loading**
   - Check network connection
   - Verify NEAR RPC endpoint
   - Clear browser cache

2. **Alert System Issues**
   - Verify notification settings
   - Check network connectivity
   - Update contact information

3. **Key Rotation Failures**
   - Check permissions
   - Verify account balance
   - Review error logs

### Support Contacts
- Technical Support: support@nearyield.com
- Emergency Contact: emergency@nearyield.com
- Documentation: docs.nearyield.com

### Updating the System
1. Check for updates regularly
2. Review changelog
3. Test in staging environment
4. Deploy during maintenance window
