-- Database initialization script for PostgreSQL
-- This script creates the necessary tables with proper constraints and indexes

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (only for admin login)
CREATE TABLE IF NOT EXISTS users (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    email text UNIQUE NOT NULL,
    password_hash text NOT NULL,
    role text NOT NULL CHECK (role IN ('admin')),
    created_at timestamptz DEFAULT now()
);

-- Coupons table
CREATE TABLE IF NOT EXISTS coupons (
    uuid uuid PRIMARY KEY,
    code text UNIQUE NOT NULL,
    status text NOT NULL CHECK (status IN ('unused','used','unvalid')),
    assigned_email text NULL,
    assigned_at timestamptz NULL,
    used_at timestamptz NULL,
    created_at timestamptz DEFAULT now()
);

-- Logs table
CREATE TABLE IF NOT EXISTS logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    action text NOT NULL,
    details jsonb,
    created_at timestamptz DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_coupons_status ON coupons(status);
CREATE INDEX IF NOT EXISTS idx_coupons_assigned_email ON coupons(assigned_email);
CREATE INDEX IF NOT EXISTS idx_logs_action ON logs(action);
CREATE INDEX IF NOT EXISTS idx_logs_created_at ON logs(created_at);

-- Insert a default admin user (password: admin123)
-- Note: In production, change this password immediately
INSERT INTO users (email, password_hash, role) 
VALUES ('admin@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin')
ON CONFLICT (email) DO NOTHING;

-- Insert some sample coupons for testing
INSERT INTO coupons (uuid, code, status) VALUES 
    ('750b8a33-9d1b-4726-a812-2cfc8dafbd67', 'SAVE20', 'unused'),
    ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'WELCOME10', 'unused'),
    ('12345678-1234-1234-1234-123456789012', 'EXPIRED', 'unvalid')
ON CONFLICT (uuid) DO NOTHING;