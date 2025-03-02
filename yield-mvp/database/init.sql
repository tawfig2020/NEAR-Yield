-- Create database
CREATE DATABASE near_yield;

-- Connect to database
\c near_yield

-- Create users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create trading_strategies table
CREATE TABLE trading_strategies (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    configuration JSONB,
    is_active BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create market_data table
CREATE TABLE market_data (
    id SERIAL PRIMARY KEY,
    symbol VARCHAR(50) NOT NULL,
    price DECIMAL(18,8) NOT NULL,
    volume_24h DECIMAL(24,8),
    timestamp TIMESTAMP NOT NULL,
    source VARCHAR(50) NOT NULL,
    UNIQUE(symbol, timestamp, source)
);

-- Create sentiment_data table
CREATE TABLE sentiment_data (
    id SERIAL PRIMARY KEY,
    symbol VARCHAR(50) NOT NULL,
    sentiment_score DECIMAL(5,2) NOT NULL,
    source VARCHAR(50) NOT NULL,
    timestamp TIMESTAMP NOT NULL,
    raw_data JSONB,
    UNIQUE(symbol, timestamp, source)
);

-- Create trades table
CREATE TABLE trades (
    id SERIAL PRIMARY KEY,
    strategy_id INTEGER REFERENCES trading_strategies(id),
    symbol VARCHAR(50) NOT NULL,
    type VARCHAR(10) NOT NULL, -- BUY or SELL
    amount DECIMAL(18,8) NOT NULL,
    price DECIMAL(18,8) NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) DEFAULT 'pending',
    transaction_hash VARCHAR(255)
);

-- Create performance_metrics table
CREATE TABLE performance_metrics (
    id SERIAL PRIMARY KEY,
    strategy_id INTEGER REFERENCES trading_strategies(id),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    roi_24h DECIMAL(8,4),
    roi_7d DECIMAL(8,4),
    roi_30d DECIMAL(8,4),
    total_trades INTEGER,
    successful_trades INTEGER,
    average_position_time INTERVAL
);

-- Create indexes
CREATE INDEX idx_market_data_symbol_timestamp ON market_data(symbol, timestamp);
CREATE INDEX idx_sentiment_data_symbol_timestamp ON sentiment_data(symbol, timestamp);
CREATE INDEX idx_trades_strategy_timestamp ON trades(strategy_id, timestamp);
CREATE INDEX idx_performance_strategy_timestamp ON performance_metrics(strategy_id, timestamp);

-- Create audit log table
CREATE TABLE audit_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    action VARCHAR(255) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id INTEGER,
    changes JSONB,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
