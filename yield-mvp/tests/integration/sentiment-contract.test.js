const { connect, keyStores, utils } = require('near-api-js');
const BN = require('bn.js');

describe('Sentiment Analysis Contract Integration Tests', () => {
  let near;
  let contract;
  let accountId;

  beforeAll(async () => {
    const keyStore = new keyStores.InMemoryKeyStore();
    const config = {
      networkId: 'testnet',
      keyStore,
      nodeUrl: 'https://rpc.testnet.near.org',
      walletUrl: 'https://wallet.testnet.near.org',
      helperUrl: 'https://helper.testnet.near.org',
      explorerUrl: 'https://explorer.testnet.near.org',
    };

    near = await connect(config);
    accountId = 'test.testnet';
    contract = await near.loadContract('sentiment.testnet', {
      viewMethods: ['getSentiment', 'getThresholds'],
      changeMethods: ['updateSentiment', 'setThresholds'],
      sender: accountId,
    });
  });

  test('should update and retrieve sentiment data', async () => {
    const testSentiment = {
      twitter: 75,
      reddit: 65,
      santiment: 70,
      timestamp: Date.now(),
    };

    await contract.updateSentiment({
      args: { sentiment: testSentiment },
      gas: new BN('300000000000000'),
    });

    const result = await contract.getSentiment();
    expect(result.twitter).toBe(testSentiment.twitter);
    expect(result.reddit).toBe(testSentiment.reddit);
    expect(result.santiment).toBe(testSentiment.santiment);
  });

  test('should set and get thresholds', async () => {
    const thresholds = {
      bearish: 30,
      bullish: 70,
    };

    await contract.setThresholds({
      args: { thresholds },
      gas: new BN('300000000000000'),
    });

    const result = await contract.getThresholds();
    expect(result.bearish).toBe(thresholds.bearish);
    expect(result.bullish).toBe(thresholds.bullish);
  });

  test('should trigger rebalancing when sentiment changes significantly', async () => {
    const newSentiment = {
      twitter: 25,
      reddit: 20,
      santiment: 22,
      timestamp: Date.now(),
    };

    const result = await contract.updateSentiment({
      args: { sentiment: newSentiment },
      gas: new BN('300000000000000'),
    });

    expect(result.events).toContainEqual(
      expect.objectContaining({
        event: 'RebalanceTriggered',
      })
    );
  });
});
