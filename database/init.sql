-- Database initialization script for CFO/CTO Helper MVP
-- This script sets up the PostgreSQL database with required extensions and initial data

-- Create database (run this manually as superuser)
-- CREATE DATABASE cfo_cto_helper;
-- CREATE USER cfo_cto_helper WITH PASSWORD 'your_password';
-- GRANT ALL PRIVILEGES ON DATABASE cfo_cto_helper TO cfo_cto_helper;

-- Switch to the database
-- \c cfo_cto_helper;

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create enum types
CREATE TYPE user_role AS ENUM ('admin', 'cfo', 'cto', 'analyst');
CREATE TYPE user_status AS ENUM ('active', 'inactive', 'pending', 'suspended');
CREATE TYPE auth_provider AS ENUM ('email', 'google', 'linkedin');
CREATE TYPE data_upload_status AS ENUM ('pending', 'processing', 'completed', 'failed');
CREATE TYPE scenario_status AS ENUM ('draft', 'running', 'completed', 'failed');
CREATE TYPE alert_type AS ENUM ('threshold', 'trend', 'anomaly');
CREATE TYPE alert_status AS ENUM ('active', 'triggered', 'disabled');

-- Create users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    hashed_password VARCHAR(255),
    
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    company VARCHAR(100),
    phone VARCHAR(20),
    
    role user_role NOT NULL DEFAULT 'analyst',
    status user_status NOT NULL DEFAULT 'active',
    auth_provider auth_provider NOT NULL DEFAULT 'email',
    provider_id VARCHAR(255),
    
    is_onboarded BOOLEAN NOT NULL DEFAULT false,
    email_verified BOOLEAN NOT NULL DEFAULT false,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP WITH TIME ZONE
);

-- Create refresh tokens table
CREATE TABLE refresh_tokens (
    id SERIAL PRIMARY KEY,
    token VARCHAR(255) UNIQUE NOT NULL,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    is_revoked BOOLEAN NOT NULL DEFAULT false,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create data uploads table
CREATE TABLE data_uploads (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    name VARCHAR(100) NOT NULL,
    description TEXT,
    source_type VARCHAR(50) NOT NULL,
    
    file_path VARCHAR(500),
    file_size INTEGER,
    row_count INTEGER,
    
    status data_upload_status NOT NULL DEFAULT 'pending',
    
    raw_data JSONB,
    validation_errors JSONB,
    processing_log TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create scenarios table
CREATE TABLE scenarios (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    name VARCHAR(100) NOT NULL,
    description TEXT,
    
    parameters JSONB NOT NULL DEFAULT '{}',
    market_indicators JSONB NOT NULL DEFAULT '[]',
    
    status scenario_status NOT NULL DEFAULT 'draft',
    
    execution_log TEXT,
    execution_time_ms INTEGER,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_run TIMESTAMP WITH TIME ZONE
);

-- Create analysis results table
CREATE TABLE analysis_results (
    id SERIAL PRIMARY KEY,
    scenario_id INTEGER NOT NULL REFERENCES scenarios(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    results JSONB NOT NULL,
    chart_config JSONB NOT NULL DEFAULT '{}',
    
    execution_summary TEXT,
    risk_score INTEGER,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create alerts table
CREATE TABLE alerts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    name VARCHAR(100) NOT NULL,
    description TEXT,
    
    alert_type alert_type NOT NULL,
    status alert_status NOT NULL DEFAULT 'active',
    
    conditions JSONB NOT NULL DEFAULT '{}',
    threshold_value FLOAT,
    market_indicator VARCHAR(100) NOT NULL,
    
    trigger_count INTEGER NOT NULL DEFAULT 0,
    last_triggered TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_provider ON users(auth_provider, provider_id);
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_users_role ON users(role);

CREATE INDEX idx_refresh_tokens_token ON refresh_tokens(token);
CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_expires ON refresh_tokens(expires_at);

CREATE INDEX idx_data_uploads_user_id ON data_uploads(user_id);
CREATE INDEX idx_data_uploads_status ON data_uploads(status);
CREATE INDEX idx_data_uploads_created ON data_uploads(created_at DESC);

CREATE INDEX idx_scenarios_user_id ON scenarios(user_id);
CREATE INDEX idx_scenarios_status ON scenarios(status);
CREATE INDEX idx_scenarios_created ON scenarios(created_at DESC);

CREATE INDEX idx_analysis_results_scenario_id ON analysis_results(scenario_id);
CREATE INDEX idx_analysis_results_user_id ON analysis_results(user_id);
CREATE INDEX idx_analysis_results_created ON analysis_results(created_at DESC);

CREATE INDEX idx_alerts_user_id ON alerts(user_id);
CREATE INDEX idx_alerts_status ON alerts(status);
CREATE INDEX idx_alerts_type ON alerts(alert_type);

-- Create triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_refresh_tokens_updated_at BEFORE UPDATE ON refresh_tokens FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_data_uploads_updated_at BEFORE UPDATE ON data_uploads FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_scenarios_updated_at BEFORE UPDATE ON scenarios FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_alerts_updated_at BEFORE UPDATE ON alerts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert initial admin user (password: admin123)
INSERT INTO users (
    email, 
    hashed_password, 
    first_name, 
    last_name, 
    role, 
    status, 
    is_onboarded, 
    email_verified
) VALUES (
    'admin@cfohelper.com',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewNhA/8vJQqhqgc6',  -- admin123
    'Admin',
    'User',
    'admin',
    'active',
    true,
    true
);

-- Create sample data for testing
INSERT INTO users (
    email, 
    hashed_password, 
    first_name, 
    last_name, 
    company, 
    role, 
    status, 
    is_onboarded, 
    email_verified
) VALUES 
(
    'cfo@example.com',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewNhA/8vJQqhqgc6',  -- admin123
    'Jane',
    'Smith',
    'Example Corp',
    'cfo',
    'active',
    true,
    true
),
(
    'cto@example.com',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewNhA/8vJQqhqgc6',  -- admin123
    'John',
    'Doe',
    'Example Corp',
    'cto',
    'active',
    true,
    true
);

-- Grant permissions to application user
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO cfo_cto_helper;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO cfo_cto_helper;