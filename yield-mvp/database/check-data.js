require('dotenv').config();
const { pool } = require('./connection');

async function checkDatabase() {
    try {
        // 1. Check tables
        console.log('📊 Checking database structure...\n');
        const tables = await pool.query(`
            SELECT 
                table_name,
                (SELECT COUNT(*) 
                 FROM information_schema.columns 
                 WHERE table_name = t.table_name) as column_count,
                (SELECT COUNT(*) 
                 FROM information_schema.tables 
                 WHERE table_name = t.table_name) as row_count
            FROM information_schema.tables t
            WHERE table_schema = 'public'
            ORDER BY table_name;
        `);
        
        console.log('Tables found:');
        for (const table of tables.rows) {
            console.log(`- ${table.table_name}: ${table.column_count} columns`);
            
            // Get row count for each table
            const countResult = await pool.query(`SELECT COUNT(*) FROM ${table.table_name}`);
            console.log(`  Rows: ${countResult.rows[0].count}`);
        }

        // 2. Sample data from each table
        console.log('\n📝 Checking sample data...\n');

        // Users
        const users = await pool.query('SELECT id, email, created_at FROM users LIMIT 3');
        console.log('Users sample:');
        console.log(users.rows);

        // Trading Strategies
        const strategies = await pool.query('SELECT id, name, is_active FROM trading_strategies LIMIT 3');
        console.log('\nTrading Strategies sample:');
        console.log(strategies.rows);

        // Market Data
        const marketData = await pool.query('SELECT symbol, price, timestamp FROM market_data ORDER BY timestamp DESC LIMIT 3');
        console.log('\nMarket Data sample (latest 3 entries):');
        console.log(marketData.rows);

        // Sentiment Data
        const sentimentData = await pool.query('SELECT symbol, sentiment_score, source, timestamp FROM sentiment_data ORDER BY timestamp DESC LIMIT 3');
        console.log('\nSentiment Data sample (latest 3 entries):');
        console.log(sentimentData.rows);

        // Trades
        const trades = await pool.query('SELECT symbol, type, amount, price, status FROM trades ORDER BY timestamp DESC LIMIT 3');
        console.log('\nTrades sample (latest 3 entries):');
        console.log(trades.rows);

        // Performance Metrics
        const metrics = await pool.query('SELECT strategy_id, roi_24h, total_trades, successful_trades FROM performance_metrics ORDER BY timestamp DESC LIMIT 3');
        console.log('\nPerformance Metrics sample (latest 3 entries):');
        console.log(metrics.rows);

        // 3. Check foreign key relationships
        console.log('\n🔗 Checking relationships...\n');
        
        // Check strategy-trade relationship
        const strategyTrades = await pool.query(`
            SELECT ts.name as strategy_name, 
                   COUNT(t.id) as trade_count,
                   SUM(CASE WHEN t.status = 'completed' THEN 1 ELSE 0 END) as completed_trades
            FROM trading_strategies ts
            LEFT JOIN trades t ON ts.id = t.strategy_id
            GROUP BY ts.id, ts.name
        `);
        console.log('Strategy-Trade relationship:');
        console.log(strategyTrades.rows);

        console.log('\n✅ Database check completed successfully!');

    } catch (err) {
        console.error('❌ Error checking database:', err.message);
        console.error(err.stack);
    } finally {
        await pool.end();
    }
}

checkDatabase();
