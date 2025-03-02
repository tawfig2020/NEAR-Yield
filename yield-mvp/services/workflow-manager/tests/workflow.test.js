const { WorkflowManager } = require('../index');
const { SecureKeyStore } = require('../secure-keystore');
const nearAPI = require('near-api-js');
const path = require('path');
const fs = require('fs');

// Mock near-api-js
jest.mock('near-api-js', () => ({
    connect: jest.fn(),
    keyStores: {
        UnencryptedFileSystemKeyStore: jest.fn()
    },
    utils: {
        format: {
            parseNearAmount: jest.fn().mockReturnValue('1000000000000000000000000')
        }
    }
}));

describe('WorkflowManager', () => {
    let workflowManager;
    const mockAccount = {
        functionCall: jest.fn()
    };
    const mockNear = {
        account: jest.fn().mockResolvedValue(mockAccount)
    };

    beforeEach(() => {
        // Clear all mocks
        jest.clearAllMocks();
        
        // Mock successful NEAR connection
        nearAPI.connect.mockResolvedValue(mockNear);
        
        // Initialize workflow manager
        workflowManager = new WorkflowManager();
    });

    describe('Sentiment Analysis', () => {
        it('should validate sentiment signals based on volume thresholds', async () => {
            const validSentiment = {
                score: 75,
                hourlyVolume: 100,
                dailyVolume: 2000
            };

            const invalidSentiment = {
                score: 75,
                hourlyVolume: 10, // Below threshold
                dailyVolume: 500  // Below threshold
            };

            expect(workflowManager.isValidSentimentSignal(validSentiment)).toBe(true);
            expect(workflowManager.isValidSentimentSignal(invalidSentiment)).toBe(false);
        });

        it('should properly smooth sentiment over time window', () => {
            const now = Date.now();
            const hour = 3600 * 1000;
            
            // Add some historical sentiment data
            workflowManager.sentimentHistory = [
                { score: 60, timestamp: now - (11 * hour) },
                { score: 70, timestamp: now - (8 * hour) },
                { score: 80, timestamp: now - (4 * hour) },
                { score: 90, timestamp: now }
            ];

            const smoothed = workflowManager.getSmoothedSentiment();
            expect(smoothed).toBe(75); // Average of all scores
        });
    });

    describe('Strategy Execution', () => {
        beforeEach(async () => {
            // Initialize with mock NEAR connection
            await workflowManager.initialize();
        });

        it('should skip strategy execution with invalid sentiment', async () => {
            await workflowManager.executeStrategy(null);
            expect(mockAccount.functionCall).not.toHaveBeenCalled();
        });

        it('should execute strategy with valid sentiment', async () => {
            const sentiment = 75;
            mockAccount.functionCall.mockResolvedValueOnce({ success: true });

            await workflowManager.executeStrategy(sentiment);
            
            expect(mockAccount.functionCall).toHaveBeenCalledWith({
                contractId: expect.any(String),
                methodName: 'execute_strategy',
                args: { sentiment_score: sentiment },
                gas: '300000000000000',
                attachedDeposit: '1000000000000000000000000'
            });
        });

        it('should handle strategy execution errors', async () => {
            const sentiment = 75;
            mockAccount.functionCall.mockRejectedValueOnce(new Error('Strategy failed'));

            // Mock moveToSafeHaven
            const moveToSafeHavenSpy = jest.spyOn(workflowManager, 'moveToSafeHaven');
            moveToSafeHavenSpy.mockResolvedValueOnce({ success: true });

            await workflowManager.executeStrategy(sentiment);

            expect(moveToSafeHavenSpy).toHaveBeenCalled();
        });
    });

    describe('Error Handling', () => {
        it('should handle critical errors and save state', async () => {
            const criticalError = new Error('Critical system failure');
            const errorStatePath = path.join(__dirname, '..', 'error_state.json');

            // Ensure any existing error state is removed
            if (fs.existsSync(errorStatePath)) {
                fs.unlinkSync(errorStatePath);
            }

            await workflowManager.handleCriticalError(criticalError);

            // Verify error state was saved
            expect(fs.existsSync(errorStatePath)).toBe(true);
            
            const errorState = JSON.parse(fs.readFileSync(errorStatePath, 'utf8'));
            expect(errorState.error).toBe(criticalError.message);
            
            // Clean up
            fs.unlinkSync(errorStatePath);
        });

        it('should respect minimum rebalance interval', async () => {
            const error = new Error('Strategy error');
            
            // Set last rebalance to recent time
            workflowManager.lastRebalance = Date.now();
            
            const moveToSafeHavenSpy = jest.spyOn(workflowManager, 'moveToSafeHaven');
            
            await workflowManager.handleStrategyError(error);
            
            // Should not trigger fallback if recently rebalanced
            expect(moveToSafeHavenSpy).not.toHaveBeenCalled();
        });
    });

    describe('Secure Key Storage', () => {
        let secureKeyStore;
        const testKey = Buffer.from('0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef', 'hex');
        
        beforeEach(() => {
            secureKeyStore = new SecureKeyStore(testKey.toString('hex'));
        });

        it('should encrypt and decrypt keys correctly', () => {
            const testData = {
                account_id: 'test.near',
                public_key: 'ed25519:123456',
                private_key: 'ed25519:987654'
            };

            const encrypted = secureKeyStore.encrypt(JSON.stringify(testData));
            const decrypted = secureKeyStore.decrypt(
                encrypted.encrypted,
                encrypted.iv,
                encrypted.authTag
            );

            expect(JSON.parse(decrypted)).toEqual(testData);
        });

        it('should fail on invalid encryption key', () => {
            expect(() => new SecureKeyStore()).toThrow('Encryption key is required');
        });
    });
});
