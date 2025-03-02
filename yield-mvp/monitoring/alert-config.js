const nodemailer = require('nodemailer');
const axios = require('axios');

class AlertSystem {
  constructor() {
    this.emailTransporter = process.env.ALERT_EMAIL ? this.setupEmailTransporter() : null;
  }

  setupEmailTransporter() {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: true,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD
      }
    });
  }

  async sendSlackAlert(alert) {
    try {
      await axios.post(process.env.SLACK_WEBHOOK_URL, {
        text: `🚨 *Alert: ${alert.type}*\n${alert.message}`,
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `🚨 *Alert: ${alert.type}*\n${alert.message}`
            }
          },
          {
            type: 'section',
            fields: [
              {
                type: 'mrkdwn',
                text: `*Time:*\n${alert.timestamp}`
              },
              {
                type: 'mrkdwn',
                text: `*Severity:*\n${alert.data.severity || 'Info'}`
              }
            ]
          }
        ]
      });
    } catch (error) {
      console.error('Failed to send Slack alert:', error);
    }
  }

  async sendDiscordAlert(alert) {
    try {
      await axios.post(process.env.DISCORD_WEBHOOK_URL, {
        embeds: [{
          title: `🚨 Alert: ${alert.type}`,
          description: alert.message,
          color: 0xFF0000,
          fields: [
            {
              name: 'Time',
              value: alert.timestamp,
              inline: true
            },
            {
              name: 'Severity',
              value: alert.data.severity || 'Info',
              inline: true
            }
          ]
        }]
      });
    } catch (error) {
      console.error('Failed to send Discord alert:', error);
    }
  }

  async sendEmailAlert(alert) {
    if (!this.emailTransporter) return;

    try {
      await this.emailTransporter.sendMail({
        from: process.env.ALERT_EMAIL,
        to: process.env.ALERT_EMAIL,
        subject: `🚨 Alert: ${alert.type}`,
        html: `
          <h2>🚨 Alert: ${alert.type}</h2>
          <p><strong>Message:</strong> ${alert.message}</p>
          <p><strong>Time:</strong> ${alert.timestamp}</p>
          <p><strong>Severity:</strong> ${alert.data.severity || 'Info'}</p>
          ${alert.data.details ? `<pre>${JSON.stringify(alert.data.details, null, 2)}</pre>` : ''}
        `
      });
    } catch (error) {
      console.error('Failed to send email alert:', error);
    }
  }

  // Alert thresholds and conditions
  checkThresholds(metrics) {
    const alerts = [];

    // CPU Usage
    if (metrics.cpu[0] > 80) {
      alerts.push({
        type: 'High CPU Usage',
        message: `CPU usage is at ${metrics.cpu[0]}%`,
        severity: 'Warning'
      });
    }

    // Memory Usage
    const memoryUsagePercent = (metrics.memory.used / metrics.memory.total) * 100;
    if (memoryUsagePercent > 90) {
      alerts.push({
        type: 'High Memory Usage',
        message: `Memory usage is at ${memoryUsagePercent.toFixed(2)}%`,
        severity: 'Warning'
      });
    }

    // Error Rate
    if (metrics.errorsPerSecond > 1) {
      alerts.push({
        type: 'High Error Rate',
        message: `Error rate is ${metrics.errorsPerSecond} errors/second`,
        severity: 'Critical'
      });
    }

    // Response Time
    if (metrics.averageResponseTime > 1000) {
      alerts.push({
        type: 'High Response Time',
        message: `Average response time is ${metrics.averageResponseTime.toFixed(2)}ms`,
        severity: 'Warning'
      });
    }

    return alerts;
  }
}

module.exports = new AlertSystem();
