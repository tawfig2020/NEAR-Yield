# NEAR Deep Yield MVP

An automated yield optimization platform built on NEAR Protocol and Aurora.

## Project Structure

```plaintext
yield-mvp/
├── agents/                     # Autonomous agent logic
│   ├── near-agent/            # On-chain "agent" (smart contract)
│   │   ├── src/              
│   │   │   └── lib.rs        # Agent logic (e.g., rebalance triggers)
│   │   └── Cargo.toml
│   └── keeper-bot/           # Off-chain agent (scripts/backend)
│       ├── autocompound.js   # Cron job using Bitte/Octopus
│       └── .env
├── contracts/                # Core DeFi interactions
│   ├── near/                # NEAR contracts (deposit/withdraw)
│   └── aurora/              # Aurora contracts (auto-compound)
├── frontend/                # BOS components (user UI)
├── dashboard/              # Security monitoring dashboard
│   ├── src/               # Dashboard source code
│   ├── public/            # Static assets
│   └── tests/             # Dashboard tests
├── scripts/               # Automation scripts
│   ├── security-check.ps1 # Security monitoring
│   ├── rotate-keys.ps1    # Key rotation
│   └── setup-security-tasks.ps1 # Security task setup
└── tests/                   # Test suite
```

## Setup Instructions

### Near Agent Setup

1. Install Rust and the `wasm32-unknown-unknown` target
2. Navigate to `agents/near-agent`
3. Build the contract:

   ```bash
   cargo build --target wasm32-unknown-unknown --release
   ```

### Keeper Bot Setup

1. Copy `.env.example` to `.env` in the `agents/keeper-bot` directory
2. Fill in your environment variables
3. Install dependencies:

   ```bash
   npm install
   ```

4. Run the bot:

   ```bash
   node autocompound.js
   ```

### Dashboard Setup

1. Navigate to the `dashboard` directory
2. Install dependencies:

   ```bash
   npm install
   ```

3. Set up environment variables:

   ```bash
   cp .env.example .env
   ```

4. Edit `.env` with your configuration:

   ```plaintext
   REACT_APP_API_BASE_URL=http://localhost:3001
   REACT_APP_CONTRACT_NAME=your-contract.testnet
   ```

5. Start the development server:

   ```bash
   npm start
   ```

## Monitoring and Alerts

### System Monitoring
1. Performance metrics
2. Error tracking
3. User activity
4. Contract state

### Alert Configuration
1. Setup channels:
   - Email notifications
   - Slack integration
   - Discord webhooks
   - SMS alerts (optional)

2. Configure thresholds:
   - Response time > 500ms
   - Error rate > 1%
   - Failed transactions
   - Gas price spikes

3. Alert Management:
   - Check logs in `logs/security`
   - Verify scheduled tasks are running
   - Test alert channels
   - Review contract state

## Security Measures

### Access Control
1. Role-based permissions
2. Multi-sig requirements
3. Rate limiting
4. IP whitelisting

### Data Protection
1. Encryption at rest
2. Secure key storage
3. Regular backups
4. Audit logging

### Smart Contract Security
1. Automated testing
2. Manual code review
3. External audit
4. Bug bounty program

## Development Guide

### Prerequisites

1. Rust with `wasm32-unknown-unknown` target
2. Node.js (v14 or later)
3. NEAR CLI
4. Aurora CLI
5. PowerShell 5.1 or later

### Testing Guide

1. Run contract tests:

   ```bash
   cd tests
   npm test
   ```

2. Run dashboard tests:

   ```bash
   cd dashboard
   npm test                 # Unit tests
   npm run e2e             # End-to-end tests
   npm run e2e:open        # Open Cypress test runner
   ```

## Deployment Guide

### Contract Deployment

1. Build the contract:

   ```bash
   cd agents/near-agent
   cargo build --target wasm32-unknown-unknown --release
   ```

2. Deploy to testnet:

   ```bash
   near deploy --accountId your-contract.testnet --wasmFile target/wasm32-unknown-unknown/release/near_agent.wasm
   ```

### Dashboard Deployment

1. Build the dashboard:

   ```bash
   cd dashboard
   npm run build
   ```

2. Deploy to your hosting service
3. Set up environment variables

### Monitor Deployment

1. Set up the security configuration:

   ```powershell
   cd scripts
   .\setup-security-tasks.ps1
   ```

2. Verify monitoring is active:

   ```powershell
   Get-ScheduledTask -TaskName "NEARYield*"
   ```

## Support

For additional support:

1. Check the `docs` directory for detailed documentation
2. Submit issues on GitHub
3. Contact the development team

## License

MIT
