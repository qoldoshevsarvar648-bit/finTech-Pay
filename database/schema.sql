-- ==============================================================================
-- FINTECH MULTI-USER MONEY TRANSFER PLATFORM
-- Production PostgreSQL DDL Schema with ACID & Double-Entry Bookkeeping Guarantees
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TYPE user_role AS ENUM ('USER', 'AGENT', 'COMPLIANCE_OFFICER', 'ADMIN');
CREATE TYPE kyc_status AS ENUM ('NOT_SUBMITTED', 'PENDING', 'VERIFIED', 'REJECTED');
CREATE TYPE wallet_status AS ENUM ('ACTIVE', 'FROZEN', 'SUSPENDED');
CREATE TYPE transaction_type AS ENUM ('DEPOSIT', 'WITHDRAWAL', 'P2P_TRANSFER', 'FEE_CHARGE');
CREATE TYPE transaction_status AS ENUM ('INITIATED', 'PENDING_2FA', 'PROCESSING', 'SUCCESS', 'FAILED', 'REVERSED');
CREATE TYPE ledger_entry_direction AS ENUM ('DEBIT', 'CREDIT');

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    phone_number VARCHAR(32) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    role user_role DEFAULT 'USER' NOT NULL,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    two_factor_enabled BOOLEAN DEFAULT FALSE NOT NULL,
    two_factor_secret VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_phone ON users(phone_number);

CREATE TABLE kyc_verifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    document_type VARCHAR(50) NOT NULL,
    document_number VARCHAR(100) NOT NULL,
    document_front_url VARCHAR(500) NOT NULL,
    document_back_url VARCHAR(500),
    selfie_url VARCHAR(500) NOT NULL,
    status kyc_status DEFAULT 'PENDING' NOT NULL,
    rejection_reason TEXT,
    reviewed_by UUID REFERENCES users(id),
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX idx_kyc_user_id ON kyc_verifications(user_id);
CREATE INDEX idx_kyc_status ON kyc_verifications(status);

CREATE TABLE wallets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    wallet_number VARCHAR(20) UNIQUE NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD' NOT NULL,
    balance NUMERIC(18, 4) DEFAULT 0.0000 NOT NULL CHECK (balance >= 0.0000),
    locked_balance NUMERIC(18, 4) DEFAULT 0.0000 NOT NULL CHECK (locked_balance >= 0.0000),
    status wallet_status DEFAULT 'ACTIVE' NOT NULL,
    daily_limit NUMERIC(18, 4) DEFAULT 10000.0000 NOT NULL,
    version BIGINT DEFAULT 1 NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT uq_user_currency UNIQUE (user_id, currency)
);

CREATE INDEX idx_wallets_user_id ON wallets(user_id);
CREATE INDEX idx_wallets_wallet_number ON wallets(wallet_number);

CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reference_number VARCHAR(64) UNIQUE NOT NULL,
    idempotency_key VARCHAR(128) UNIQUE NOT NULL,
    sender_wallet_id UUID REFERENCES wallets(id),
    receiver_wallet_id UUID REFERENCES wallets(id),
    amount NUMERIC(18, 4) NOT NULL CHECK (amount > 0),
    fee NUMERIC(18, 4) DEFAULT 0.0000 NOT NULL CHECK (fee >= 0),
    currency VARCHAR(3) NOT NULL,
    type transaction_type NOT NULL,
    status transaction_status DEFAULT 'INITIATED' NOT NULL,
    description VARCHAR(255),
    metadata JSONB DEFAULT '{}'::jsonb,
    error_message TEXT,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX idx_tx_sender_wallet ON transactions(sender_wallet_id);
CREATE INDEX idx_tx_receiver_wallet ON transactions(receiver_wallet_id);
CREATE INDEX idx_tx_reference ON transactions(reference_number);
CREATE INDEX idx_tx_idempotency ON transactions(idempotency_key);
CREATE INDEX idx_tx_status ON transactions(status);
CREATE INDEX idx_tx_created_at ON transactions(created_at DESC);

CREATE TABLE ledger_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE RESTRICT,
    wallet_id UUID NOT NULL REFERENCES wallets(id) ON DELETE RESTRICT,
    direction ledger_entry_direction NOT NULL,
    amount NUMERIC(18, 4) NOT NULL CHECK (amount > 0),
    balance_after NUMERIC(18, 4) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX idx_ledger_tx_id ON ledger_entries(transaction_id);
CREATE INDEX idx_ledger_wallet_id ON ledger_entries(wallet_id);

CREATE TABLE security_audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    ip_address VARCHAR(45) NOT NULL,
    user_agent TEXT,
    payload JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX idx_audit_user ON security_audit_logs(user_id);
CREATE INDEX idx_audit_action ON security_audit_logs(action);
CREATE INDEX idx_audit_created_at ON security_audit_logs(created_at DESC);
