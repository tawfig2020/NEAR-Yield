const { Pool } = require('pg');

// Pool configuration
const poolConfig = {
    user: process.env.POSTGRES_USER,
    host: process.env.POSTGRES_HOST,
    database: process.env.POSTGRES_DB,
    password: process.env.POSTGRES_PASSWORD,
    port: process.env.POSTGRES_PORT,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    
    // Connection pool settings
    max: 20, // Maximum number of clients in the pool
    idleTimeoutMillis: 30000, // How long a client is allowed to remain idle before being closed
    connectionTimeoutMillis: 2000, // How long to wait when connecting a new client
    maxUses: 7500, // Close & replace a client after it has been used this many times
};

const pool = new Pool(poolConfig);

// Error handling
pool.on('error', (err, client) => {
    console.error('Unexpected error on idle client', err);
    process.exit(-1);
});

// Connection testing
pool.query('SELECT NOW()', (err, res) => {
    if (err) {
        console.error('Database connection error:', err);
    } else {
        console.log('Database connected successfully');
    }
});

// Helper functions
const query = async (text, params) => {
    const start = Date.now();
    try {
        const res = await pool.query(text, params);
        const duration = Date.now() - start;
        console.log('Executed query', { text, duration, rows: res.rowCount });
        return res;
    } catch (err) {
        console.error('Error executing query', { text, error: err.message });
        throw err;
    }
};

const getClient = async () => {
    const client = await pool.connect();
    const query = client.query.bind(client);
    const release = () => {
        client.release();
    };
    
    // Monkey patch the query method to log queries
    client.query = async (text, params) => {
        try {
            const start = Date.now();
            const res = await query(text, params);
            const duration = Date.now() - start;
            console.log('Executed query', { text, duration, rows: res.rowCount });
            return res;
        } catch (err) {
            console.error('Error executing query', { text, error: err.message });
            throw err;
        }
    };
    
    return { client, release };
};

module.exports = {
    query,
    getClient,
    pool
};
