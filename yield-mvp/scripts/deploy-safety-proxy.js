const fs = require('fs');
const path = require('path');
const os = require('os');
const nearAPI = require('near-api-js');
const { connect, KeyPair, keyStores, utils } = nearAPI;

const NETWORK_ID = process.env.NETWORK_ID || 'testnet';
const CONTRACT_NAME = 'safety-proxy.tawfig2030ai.testnet';
const OWNER_ID = 'tawfig2030ai.testnet';

const initParams = {
    owner_id: OWNER_ID,
    sentiment_threshold: 30,
    staking_ratio: 50,
    allowed_pools: [
        "v2.ref-finance.near",
        "aurora.near",
        "meta-pool.near"
    ]
};

async function deployContract() {
    try {
        // Configure NEAR connection
        const homedir = os.homedir();
        const keyStore = new keyStores.UnencryptedFileSystemKeyStore(path.join(homedir, ".near-credentials"));
        const config = {
            networkId: NETWORK_ID,
            keyStore,
            nodeUrl: `https://rpc.${NETWORK_ID}.near.org`,
            walletUrl: `https://wallet.${NETWORK_ID}.near.org`,
            helperUrl: `https://helper.${NETWORK_ID}.near.org`,
            explorerUrl: `https://explorer.${NETWORK_ID}.near.org`,
        };

        // Connect to NEAR
        const near = await connect(config);
        const account = await near.account(CONTRACT_NAME);

        // Read WASM file
        const wasmPath = path.join(__dirname, '..', 'contracts', 'safety-proxy', 'target', 'wasm32-unknown-unknown', 'release', 'safety_proxy.wasm');
        console.log('Looking for WASM file at:', wasmPath);
        const wasmBytes = fs.readFileSync(wasmPath);

        // Deploy the contract
        console.log("Deploying Safety Proxy contract...");
        const result = await account.deployContract(wasmBytes);

        console.log("Contract deployed successfully!");
        console.log("Transaction hash:", result.transaction.hash);

        // Initialize the contract
        console.log("Initializing contract...");
        await account.functionCall({
            contractId: CONTRACT_NAME,
            methodName: "new",
            args: initParams,
            gas: "300000000000000",
            attachedDeposit: utils.format.parseNearAmount("5") // 5 NEAR for storage
        });

        console.log("Contract initialized successfully!");
        
        return {
            success: true,
            contractId: CONTRACT_NAME,
            transactionHash: result.transaction.hash
        };
    } catch (error) {
        console.error("Deployment failed:", error);
        return {
            success: false,
            error: error.message
        };
    }
}

// Execute deployment
deployContract()
    .then(console.log)
    .catch(console.error);
