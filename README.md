# NEAR Deep Yield Platform

A decentralized yield optimization platform built on NEAR Protocol that automatically manages and optimizes DeFi yields across multiple protocols.

## Features

- Smart contract-based yield optimization
- Multi-protocol yield tracking
- Automated rebalancing strategies
- TypeScript/JavaScript implementation
- NEAR Protocol integration

## Project Structure

```
yield-mvp/
├── contract/           # Smart contract code
├── backend/           # Backend services
│   ├── services/     # Core services
│   ├── database/     # Database handlers
│   └── scripts/      # Utility scripts
└── agents/           # Automation bots
    └── keeper-bot/   # Yield optimization bot
```

## Prerequisites

- Node.js v18+
- NEAR CLI
- pnpm

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd near-deep-yield
```

2. Install dependencies:
```bash
pnpm install
```

3. Copy environment example files:
```bash
cp agents/keeper-bot/.env.example agents/keeper-bot/.env
```

4. Configure your environment variables in the .env file

## Development

1. Build the contract:
```bash
cd contract
pnpm run build
```

2. Deploy to NEAR testnet:
```bash
pnpm run deploy
```

## Testing

```bash
pnpm test
```

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a new Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Security

Please do not commit any private keys or sensitive information. Use environment variables for all sensitive data.
