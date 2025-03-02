const { InfluxDB, Point } = require('@influxdata/influxdb-client');

class TimeSeriesDB {
  constructor() {
    if (!process.env.INFLUX_URL || !process.env.INFLUX_TOKEN || !process.env.INFLUX_ORG || !process.env.INFLUX_BUCKET) {
      throw new Error('Missing required InfluxDB configuration');
    }

    this.client = new InfluxDB({
      url: process.env.INFLUX_URL,
      token: process.env.INFLUX_TOKEN,
      timeout: 10000
    });

    this.org = process.env.INFLUX_ORG;
    this.bucket = process.env.INFLUX_BUCKET;
    this.writeApi = this.client.getWriteApi(this.org, this.bucket);
    this.queryApi = this.client.getQueryApi(this.org);
  }

  // Store time series data
  async store(measurement, timestamp, data) {
    try {
      const point = new Point(measurement)
        .timestamp(timestamp);

      // Add fields to the point
      Object.entries(data).forEach(([key, value]) => {
        if (typeof value === 'number') {
          point.floatField(key, value);
        } else if (typeof value === 'string') {
          point.stringField(key, value);
        } else if (typeof value === 'boolean') {
          point.booleanField(key, value);
        }
      });

      await this.writeApi.writePoint(point);
      await this.writeApi.flush();
      return true;
    } catch (error) {
      console.error('Failed to store time series data:', error);
      throw error;
    }
  }

  // Get latest value for a measurement
  async getLatest(measurement, options = {}) {
    const { timestamp } = options;
    const timeFilter = timestamp ? `and time <= ${timestamp}` : '';
    
    const query = `
      from(bucket: "${this.bucket}")
        |> range(start: -30d)
        |> filter(fn: (r) => r["_measurement"] == "${measurement}" ${timeFilter})
        |> last()
    `;

    try {
      const result = await this.queryApi.collectRows(query);
      return result.length > 0 ? result[0] : null;
    } catch (error) {
      console.error('Failed to get latest time series data:', error);
      throw error;
    }
  }

  // Get data range for a measurement
  async getRange(measurement, options = {}) {
    const { startTime = '-30d', endTime = 'now()', aggregateWindow } = options;
    
    const query = `
      from(bucket: "${this.bucket}")
        |> range(start: ${startTime}, stop: ${endTime})
        |> filter(fn: (r) => r["_measurement"] == "${measurement}")
        ${aggregateWindow ? `|> aggregateWindow(every: ${aggregateWindow}, fn: mean)` : ''}
        |> sort(columns: ["_time"])
    `;

    try {
      return await this.queryApi.collectRows(query);
    } catch (error) {
      console.error('Failed to get time series range:', error);
      throw error;
    }
  }

  // Delete old data
  async deleteOldData(measurement, cutoffTime) {
    const query = `
      from(bucket: "${this.bucket}")
        |> range(start: 0, stop: ${cutoffTime})
        |> filter(fn: (r) => r["_measurement"] == "${measurement}")
        |> delete()
    `;

    try {
      await this.queryApi.collectRows(query);
      return true;
    } catch (error) {
      console.error('Failed to delete old time series data:', error);
      throw error;
    }
  }

  // Check connection
  async checkConnection() {
    try {
      const health = await this.client.ping();
      return health;
    } catch (error) {
      console.error('Failed to connect to InfluxDB:', error);
      throw error;
    }
  }

  // Close database connection
  async close() {
    try {
      await this.writeApi.close();
      return true;
    } catch (error) {
      console.error('Failed to close time series database:', error);
      throw error;
    }
  }
}

module.exports = { TimeSeriesDB };
