const nearAPI = require('near-api-js');
const { connect, keyStores, utils } = nearAPI;
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const { SecureKeyStore } = require('./secure-keystore');

// Load configuration
const CONFIG_PATH = path.join(__dirname, '..', '..', 'config', 'workflow-config.yaml');
const MONITORING_CONFIG_PATH = path.join(__dirname, '..', '..', 'config', 'monitoring-config.yaml');

class WorkflowManager {
    constructor() {
        this.config = yaml.load(fs.readFileSync(CONFIG_PATH, 'utf8'));
        this.monitoringConfig = yaml.load(fs.readFileSync(MONITORING_CONFIG_PATH, 'utf8'));
        this.nearConfig = {
            networkId: process.env.NETWORK_ID || 'testnet',
            nodeUrl: `https://rpc.${process.env.NETWORK_ID || 'testnet'}.near.org`,
            walletUrl: `https://wallet.${process.env.NETWORK_ID || 'testnet'}.near.org`,
            helperUrl: `https://helper.${process.env.NETWORK_ID || 'testnet'}.near.org`,
            explorerUrl: `https://explorer.${process.env.NETWORK_ID || 'testnet'}.near.org`,
        };
        
        // Initialize sentiment tracking
        this.sentimentHistory = [];
        this.lastRebalance = Date.now();
    }

    async initialize() {
        try {
            // Initialize secure key storage
            const keyStore = process.env.NODE_ENV === 'production' 
                ? new SecureKeyStore(process.env.KEY_ENCRYPTION_KEY)
                : new keyStores.UnencryptedFileSystemKeyStore(
                    path.join(require('os').homedir(), '.near-credentials')
                );
            
            this.nearConfig.keyStore = keyStore;
            this.near = await connect(this.nearConfig);
            
            // Initialize monitoring
            await this.setupMonitoring();
            
            console.log('Workflow Manager initialized successfully');
        } catch (error) {
            console.error('Failed to initialize Workflow Manager:', error);
            await this.handleCriticalError(error);
            throw error;
        }
    }

    async setupMonitoring() {
        const { alertThresholds, healthChecks } = this.monitoringConfig;
        
        this.healthCheck = {
            status: 'healthy',
            lastCheck: new Date().toISOString(),
            checks: {}
        };

        this.metrics = {
            sentimentScores: [],
            allocationHistory: [],
            performanceMetrics: {
                apy: 0,
                tvl: 0,
                risk: 0
            }
        };

        console.log('Monitoring setup completed');
    }

    isValidSentimentSignal(sentiment) {
        const { volume_thresholds, smoothing } = this.config.scraping;
        
        // Check volume requirements
        if (sentiment.hourlyVolume < volume_thresholds.min_hourly ||
            sentiment.dailyVolume < volume_thresholds.min_24h) {
            console.log('Insufficient tweet volume, skipping signal');
            return false;
        }

        // Add to history and check for minimum samples
        this.sentimentHistory.push({
            score: sentiment.score,
            timestamp: Date.now()
        });

        // Remove old samples
        const windowMs = smoothing.window_size * 3600 * 1000;
        this.sentimentHistory = this.sentimentHistory.filter(
            s => (Date.now() - s.timestamp) <= windowMs
        );

        return this.sentimentHistory.length >= smoothing.min_samples;
    }

    getSmoothedSentiment() {
        if (this.sentimentHistory.length === 0) return null;
        
        const sum = this.sentimentHistory.reduce((acc, s) => acc + s.score, 0);
        return sum / this.sentimentHistory.length;
    }

    async executeSentimentAnalysis() {
        try {
            // TODO: Implement sentiment analysis
            const mockSentiment = {
                score: Math.random() * 100,
                hourlyVolume: Math.floor(Math.random() * 200),
                dailyVolume: Math.floor(Math.random() * 2000)
            };
            
            if (!this.isValidSentimentSignal(mockSentiment)) {
                console.log('Invalid sentiment signal, using previous allocation');
                return null;
            }

            const smoothedScore = this.getSmoothedSentiment();
            console.log('Smoothed sentiment score:', smoothedScore);
            return smoothedScore;
            
        } catch (error) {
            console.error('Sentiment analysis failed:', error);
            return null;
        }
    }

    async moveToSafeHaven() {
        try {
            const account = await this.near.account(this.config.accountId);
            await account.functionCall({
                contractId: this.config.safetyProxyContract,
                methodName: 'move_to_staking',
                args: {},
                gas: '300000000000000',
                attachedDeposit: utils.format.parseNearAmount('0.1')
            });
            console.log('Successfully moved funds to safe staking position');
        } catch (error) {
            console.error('Failed to move to safe haven:', error);
            throw error;
        }
    }

    async executeStrategy(sentimentScore) {
        try {
            if (sentimentScore === null) {
                console.log('No valid sentiment score, skipping strategy execution');
                return;
            }

            const account = await this.near.account(this.config.accountId);
            const result = await account.functionCall({
                contractId: this.config.safetyProxyContract,
                methodName: 'execute_strategy',
                args: { sentiment_score: Math.floor(sentimentScore) },
                gas: '300000000000000',
                attachedDeposit: utils.format.parseNearAmount('0.1')
            });
            
            this.lastRebalance = Date.now();
            console.log('Strategy execution result:', result);
            return result;
            
        } catch (error) {
            console.error('Strategy execution failed:', error);
            await this.handleStrategyError(error);
        }
    }

    async handleStrategyError(error) {
        console.error('Strategy error:', error);
        
        // Check if minimum rebalance interval has passed
        const timeSinceLastRebalance = Date.now() - this.lastRebalance;
        if (timeSinceLastRebalance < this.config.rebalancing.min_rebalance_interval * 1000) {
            console.log('Skipping fallback due to recent rebalance');
            return;
        }

        try {
            console.log('Executing fallback strategy: Moving to safe haven');
            await this.moveToSafeHaven();
        } catch (fallbackError) {
            console.error('Fallback strategy failed:', fallbackError);
            await this.handleCriticalError(fallbackError);
        }
    }

    async handleCriticalError(error) {
        console.error('Critical error:', error);
        this.healthCheck.status = 'critical';
        this.healthCheck.lastError = error.message;
        
        // Notify administrators
        // TODO: Implement notification system
        
        // Try to save current state
        try {
            fs.writeFileSync(
                path.join(__dirname, 'error_state.json'),
                JSON.stringify({
                    timestamp: new Date().toISOString(),
                    error: error.message,
                    stack: error.stack,
                    metrics: this.metrics
                }, null, 2)
            );
        } catch (saveError) {
            console.error('Failed to save error state:', saveError);
        }
    }

    async start() {
        try {
            await this.initialize();
            
            // Start main workflow loop
            setInterval(async () => {
                try {
                    // Execute sentiment analysis
                    const sentiment = await this.executeSentimentAnalysis();
                    
                    // Execute strategy based on sentiment
                    await this.executeStrategy(sentiment);
                    
                    // Update health check
                    this.healthCheck.lastCheck = new Date().toISOString();
                    this.healthCheck.status = 'healthy';
                } catch (error) {
                    console.error('Workflow iteration failed:', error);
                    await this.handleCriticalError(error);
                }
            }, this.config.scraping.default_interval * 1000);
            
            console.log('Workflow Manager started successfully');
        } catch (error) {
            console.error('Failed to start Workflow Manager:', error);
            await this.handleCriticalError(error);
            throw error;
        }
    }
}

// Start the workflow manager
const manager = new WorkflowManager();
manager.start().catch(console.error);
