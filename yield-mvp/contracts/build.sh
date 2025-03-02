#!/bin/bash

# Build the contract
npm run build

# Deploy the contract
near deploy --accountId tawfig2030ai.testnet --wasmFile ./build/deep-yield.wasm --initFunction init --initArgs '{}'
