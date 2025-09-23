-- Database initialization script for PostgreSQL
-- This script creates the necessary tables with proper constraints and indexes

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS users (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    email text UNIQUE NOT NULL,
    password_hash text NOT NULL,
    role text NOT NULL CHECK (role IN ('admin')),
    created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS coupons (
    id uuid PRIMARY KEY,
    code text UNIQUE NOT NULL,
    state text NOT NULL CHECK (state IN ('unused', 'reserved', 'used', 'invalid', 'unblinded', 'pending_admin')) DEFAULT 'unused',
    meta jsonb NOT NULL DEFAULT '{}',
    reserved_by_email text NULL,
    reserved_by_phone text NULL,
    reserved_at timestamptz NULL,
    reserved_expires_at timestamptz NULL,
    used_by_email text NULL,
    used_by_phone text NULL,
    used_at timestamptz NULL,
    is_unblinded boolean NOT NULL DEFAULT false,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    action text NOT NULL,
    details jsonb NULL,
    created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_coupons_state ON coupons(state);
CREATE INDEX IF NOT EXISTS idx_coupons_reserved_by_email ON coupons(reserved_by_email);
CREATE INDEX IF NOT EXISTS idx_logs_action ON logs(action);
CREATE INDEX IF NOT EXISTS idx_logs_created_at ON logs(created_at);

INSERT INTO users (email, password_hash, role) 
VALUES ('admin@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin')
ON CONFLICT (email) DO NOTHING;

INSERT INTO coupons (id, code, state) VALUES 
    ('750b8a33-9d1b-4726-a812-2cfc8dafbd67', 'SAVE20', 'unused'),
    ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'WELCOME10', 'unused'),
    ('12345678-1234-1234-1234-123456789012', 'EXPIRED', 'invalid')
ON CONFLICT (id) DO NOTHING;