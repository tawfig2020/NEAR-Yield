const express = require('express');
const { connect, keyStores, utils } = require('near-api-js');
const router = express.Router();

// Initialize NEAR connection
const initNear = async () => {
    const config = {
        networkId: process.env.NEAR_NETWORK || 'testnet',
        nodeUrl: process.env.NEAR_NODE_URL || 'https://rpc.testnet.near.org',
        accountId: process.env.NEAR_ACCOUNT_ID,
        contractId: process.env.NEAR_CONTRACT_ID,
    };

    const keyPair = utils.KeyPair.fromString(process.env.NEAR_PRIVATE_KEY);
    const keyStore = new keyStores.InMemoryKeyStore();
    await keyStore.setKey(config.networkId, config.accountId, keyPair);

    const near = await connect({
        networkId: config.networkId,
        nodeUrl: config.nodeUrl,
        keyStore,
    });

    return {
        account: await near.account(config.accountId),
        contractId: config.contractId
    };
};

// Get all yield opportunities
router.get('/', async (req, res) => {
    try {
        const { account, contractId } = await initNear();
        
        const opportunities = await account.viewFunction({
            contractId,
            methodName: 'getOpportunities',
            args: {}
        });

        res.json(opportunities);
    } catch (error) {
        console.error('Error fetching opportunities:', error);
        res.status(500).json({ error: 'Failed to fetch opportunities' });
    }
});

// Get a specific yield opportunity
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { account, contractId } = await initNear();
        
        const opportunities = await account.viewFunction({
            contractId,
            methodName: 'getOpportunities',
            args: {}
        });

        const opportunity = opportunities.find(opp => opp.id === id);
        
        if (!opportunity) {
            return res.status(404).json({ error: 'Opportunity not found' });
        }

        res.json(opportunity);
    } catch (error) {
        console.error('Error fetching opportunity:', error);
        res.status(500).json({ error: 'Failed to fetch opportunity' });
    }
});

// Deposit into an opportunity
router.post('/:id/deposit', async (req, res) => {
    try {
        const { id } = req.params;
        const { amount } = req.body;
        const { account, contractId } = await initNear();

        const result = await account.functionCall({
            contractId,
            methodName: 'deposit',
            args: { opportunityId: id },
            attachedDeposit: utils.format.parseNearAmount(amount)
        });

        res.json({
            success: true,
            transactionHash: result.transaction.hash,
            amount
        });
    } catch (error) {
        console.error('Error depositing into opportunity:', error);
        res.status(500).json({ error: 'Failed to deposit' });
    }
});

// Withdraw from an opportunity
router.post('/:id/withdraw', async (req, res) => {
    try {
        const { id } = req.params;
        const { amount } = req.body;
        const { account, contractId } = await initNear();

        const result = await account.functionCall({
            contractId,
            methodName: 'withdraw',
            args: {
                opportunityId: id,
                amount: utils.format.parseNearAmount(amount)
            }
        });

        res.json({
            success: true,
            transactionHash: result.transaction.hash,
            amount
        });
    } catch (error) {
        console.error('Error withdrawing from opportunity:', error);
        res.status(500).json({ error: 'Failed to withdraw' });
    }
});

module.exports = router;
