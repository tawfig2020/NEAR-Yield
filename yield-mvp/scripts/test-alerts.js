require('dotenv').config();
const alertSystem = require('../monitoring/alert-config');

async function testAlerts() {
  const testAlert = {
    type: 'TEST_ALERT',
    message: 'This is a test alert from NEAR Deep Yield',
    timestamp: new Date().toISOString(),
    data: {
      severity: 'info',
      details: {
        test: true,
        time: Date.now()
      }
    }
  };

  try {
    // Test Discord
    console.log('Testing Discord alert...');
    await alertSystem.sendDiscordAlert(testAlert);
    console.log('Discord alert sent successfully!');

    // Test Slack
    console.log('Testing Slack alert...');
    await alertSystem.sendSlackAlert(testAlert);
    console.log('Slack alert sent successfully!');

    // Test Email
    console.log('Testing Email alert...');
    await alertSystem.sendEmailAlert(testAlert);
    console.log('Email alert sent successfully!');

  } catch (error) {
    console.error('Error testing alerts:', error);
  }
}

testAlerts();
