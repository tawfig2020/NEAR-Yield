require('dotenv').config();
const { pool } = require('./connection');
const bcrypt = require('bcrypt');

async function seedDatabase() {
    try {
        // Sample users
        const users = await pool.query(`
            INSERT INTO users (email, password_hash) VALUES
            ($1, $2),
            ($3, $4)
            RETURNING id
        `, [
            'alice@example.com', await bcrypt.hash('password123', 10),
            'bob@example.com', await bcrypt.hash('password456', 10)
        ]);
        console.log('✅ Created sample users');

        // Sample trading strategies
        await pool.query(`
            INSERT INTO trading_strategies (user_id, name, description, configuration, is_active) VALUES
            ($1, 'NEAR Momentum', 'Momentum-based trading strategy for NEAR token', 
             '{"timeframe": "1h", "rsi_period": 14, "rsi_overbought": 70, "rsi_oversold": 30}', true),
            ($1, 'Sentiment Trading', 'Trading based on social media sentiment', 
             '{"sentiment_threshold": 0.7, "position_size": 0.1, "max_positions": 3}', true)
        `, [users.rows[0].id]);
        console.log('✅ Created sample trading strategies');

        // Sample market data
        await pool.query(`
            INSERT INTO market_data (symbol, price, volume_24h, timestamp, source) VALUES
            ('NEAR', 5.23, 1500000, NOW() - interval '1 hour', 'binance'),
            ('NEAR', 5.25, 1600000, NOW() - interval '45 minutes', 'binance'),
            ('NEAR', 5.28, 1700000, NOW() - interval '30 minutes', 'binance'),
            ('NEAR', 5.30, 1800000, NOW() - interval '15 minutes', 'binance'),
            ('NEAR', 5.32, 1900000, NOW(), 'binance')
        `);
        console.log('✅ Created sample market data');

        // Sample sentiment data
        await pool.query(`
            INSERT INTO sentiment_data (symbol, sentiment_score, source, timestamp, raw_data) VALUES
            ('NEAR', 0.75, 'twitter', NOW() - interval '1 hour', 
             '{"positive": 150, "negative": 50, "neutral": 100}'),
            ('NEAR', 0.82, 'reddit', NOW() - interval '30 minutes', 
             '{"positive": 200, "negative": 45, "neutral": 120}'),
            ('NEAR', 0.68, 'news', NOW(), 
             '{"positive": 80, "negative": 40, "neutral": 60}')
        `);
        console.log('✅ Created sample sentiment data');

        // Sample trades
        await pool.query(`
            INSERT INTO trades (strategy_id, symbol, type, amount, price, status, transaction_hash) VALUES
            (1, 'NEAR', 'BUY', 100.0, 5.23, 'completed', '0x123...abc'),
            (1, 'NEAR', 'SELL', 50.0, 5.30, 'completed', '0x456...def'),
            (2, 'NEAR', 'BUY', 75.0, 5.25, 'completed', '0x789...ghi')
        `);
        console.log('✅ Created sample trades');

        // Sample performance metrics
        await pool.query(`
            INSERT INTO performance_metrics (
                strategy_id, roi_24h, roi_7d, roi_30d, 
                total_trades, successful_trades, average_position_time
            ) VALUES
            (1, 2.5, 8.3, 15.7, 24, 18, interval '4 hours'),
            (2, 1.8, 6.2, 12.4, 18, 12, interval '6 hours')
        `);
        console.log('✅ Created sample performance metrics');

        console.log('\n✨ Database seeded successfully!');
    } catch (err) {
        console.error('❌ Error seeding database:', err.message);
    } finally {
        await pool.end();
    }
}

seedDatabase();
