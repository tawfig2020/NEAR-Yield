require('dotenv').config();
const { pool } = require('./connection');

async function testConnection() {
    try {
        // Test basic connection
        const result = await pool.query('SELECT NOW()');
        console.log('✅ Database connection successful!');
        console.log('Current timestamp:', result.rows[0].now);
        
        // Get database info
        const dbInfo = await pool.query(`
            SELECT 
                current_database() as db_name,
                current_user as user,
                version() as version
        `);
        console.log('\nDatabase Information:');
        console.log(dbInfo.rows[0]);
        
        // List all tables
        const tables = await pool.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
        `);
        console.log('\nAvailable Tables:');
        tables.rows.forEach(table => console.log(`- ${table.table_name}`));
        
    } catch (err) {
        console.error('❌ Database connection error:', err.message);
    } finally {
        await pool.end();
    }
}

testConnection();
