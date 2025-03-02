const { connect, keyStores, utils } = require('near-api-js');
const { InfluxDB, Point } = require('@influxdata/influxdb-client');
require('dotenv').config();

class AutoCompoundBot {
    constructor() {
        this.config = {
            networkId: process.env.NEAR_NETWORK || 'testnet',
            nodeUrl: process.env.NEAR_NODE_URL || 'https://rpc.testnet.near.org',
            accountId: process.env.NEAR_ACCOUNT_ID,
            privateKey: process.env.NEAR_PRIVATE_KEY,
            contractId: process.env.NEAR_CONTRACT_ID,
        };

        // Initialize InfluxDB client
        this.influxClient = new InfluxDB({
            url: process.env.INFLUXDB_URL,
            token: process.env.INFLUXDB_TOKEN
        });
    }

    async initialize() {
        try {
            // Set up NEAR connection
            const keyPair = utils.KeyPair.fromString(this.config.privateKey);
            const keyStore = new keyStores.InMemoryKeyStore();
            await keyStore.setKey(this.config.networkId, this.config.accountId, keyPair);

            const near = await connect({
                networkId: this.config.networkId,
                nodeUrl: this.config.nodeUrl,
                keyStore,
            });

            this.account = await near.account(this.config.accountId);
            console.log('Bot initialized successfully');
            
            // Log initialization to InfluxDB
            this.logMetric('bot_status', { status: 'initialized' });
        } catch (error) {
            console.error('Failed to initialize bot:', error);
            this.logMetric('bot_status', { status: 'initialization_failed', error: error.message });
            throw error;
        }
    }

    async checkAndTriggerRebalance() {
        try {
            console.log('Checking for rebalancing opportunity...');
            
            // Check if rebalancing is needed
            const needsRebalance = await this.account.viewFunction({
                contractId: this.config.contractId,
                methodName: 'checkRebalance',
                args: {}
            });

            this.logMetric('rebalance_check', { needs_rebalance: needsRebalance });

            if (needsRebalance) {
                console.log('Rebalancing needed, triggering rebalance...');
                
                // Get current opportunities before rebalance
                const beforeOpps = await this.account.viewFunction({
                    contractId: this.config.contractId,
                    methodName: 'getOpportunities',
                    args: {}
                });

                // Trigger rebalancing
                const result = await this.account.functionCall({
                    contractId: this.config.contractId,
                    methodName: 'triggerRebalance',
                    args: {},
                    gas: '300000000000000' // 300 TGas
                });

                // Get opportunities after rebalance
                const afterOpps = await this.account.viewFunction({
                    contractId: this.config.contractId,
                    methodName: 'getOpportunities',
                    args: {}
                });

                // Log rebalancing metrics
                this.logMetric('rebalance_execution', {
                    status: 'success',
                    gas_used: result.gas_burnt,
                    opportunities_before: beforeOpps.length,
                    opportunities_after: afterOpps.length
                });

                console.log('Rebalancing completed successfully');
            } else {
                console.log('No rebalancing needed at this time');
            }
        } catch (error) {
            console.error('Error in autocompound process:', error);
            this.logMetric('rebalance_execution', {
                status: 'failed',
                error: error.message
            });
        }
    }

    logMetric(measurement, fields) {
        try {
            const point = new Point(measurement)
                .timestamp(new Date())
                .tag('bot_id', this.config.accountId)
                .tag('network', this.config.networkId);

            // Add all fields to the point
            Object.entries(fields).forEach(([key, value]) => {
                if (typeof value === 'number') {
                    point.floatField(key, value);
                } else if (typeof value === 'boolean') {
                    point.booleanField(key, value);
                } else {
                    point.stringField(key, String(value));
                }
            });

            const writeApi = this.influxClient.getWriteApi(
                process.env.INFLUXDB_ORG,
                process.env.INFLUXDB_BUCKET
            );

            writeApi.writePoint(point);
            writeApi.close();
        } catch (error) {
            console.error('Error logging metric:', error);
        }
    }

    async start() {
        await this.initialize();
        
        // Run initial check
        await this.checkAndTriggerRebalance();

        // Schedule regular checks
        setInterval(
            () => this.checkAndTriggerRebalance(),
            5 * 60 * 1000 // Every 5 minutes
        );

        console.log('Bot started successfully, monitoring for rebalancing opportunities...');
    }
}

// Create and run the bot
const bot = new AutoCompoundBot();
bot.start().catch(error => {
    console.error('Failed to start bot:', error);
    process.exit(1);
});
