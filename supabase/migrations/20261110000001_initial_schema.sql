-- 20261110000001_initial_schema.sql
-- Dhanvantri Clinic - Core Relational Schema

-- 1. Clinic Settings Table (Single-row configuration)
CREATE TABLE IF NOT EXISTS clinic_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_name TEXT NOT NULL DEFAULT 'Dhanvantri Clinic',
    doctor_name TEXT NOT NULL DEFAULT 'Dr Yogesh',
    address TEXT NOT NULL DEFAULT 'Sandhya Theater Complex, VP Road, BTM Layout, Bengaluru',
    phone_number TEXT NOT NULL DEFAULT '+91 98765 43210',
    default_consultation_mins INT NOT NULL DEFAULT 8 CHECK (default_consultation_mins BETWEEN 2 AND 60),
    buffer_mins INT NOT NULL DEFAULT 15 CHECK (buffer_mins BETWEEN 0 AND 60),
    grace_period_mins INT NOT NULL DEFAULT 5 CHECK (grace_period_mins BETWEEN 1 AND 30),
    senior_interleave_ratio INT NOT NULL DEFAULT 3 CHECK (senior_interleave_ratio BETWEEN 1 AND 10),
    max_daily_tokens INT NOT NULL DEFAULT 100 CHECK (max_daily_tokens > 0),
    morning_start TIME NOT NULL DEFAULT '09:30:00',
    morning_end TIME NOT NULL DEFAULT '13:30:00',
    evening_start TIME NOT NULL DEFAULT '17:30:00',
    evening_end TIME NOT NULL DEFAULT '21:30:00',
    doctor_status TEXT NOT NULL DEFAULT 'available' CHECK (doctor_status IN ('available', 'break', 'emergency', 'off_duty')),
    delay_reason TEXT DEFAULT NULL,
    delay_until TIMESTAMPTZ DEFAULT NULL,
    simulation_mode BOOLEAN NOT NULL DEFAULT FALSE,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Staff Profiles Table (Linked to auth.users)
CREATE TABLE IF NOT EXISTS staff_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('doctor', 'helper')),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Patients Table (Demographic metadata without medical records)
CREATE TABLE IF NOT EXISTS patients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name TEXT NOT NULL,
    phone TEXT, -- Optional for walk-ins without phones
    age INT NOT NULL CHECK (age >= 0 AND age <= 125),
    is_senior BOOLEAN GENERATED ALWAYS AS (age >= 60) STORED,
    accessibility_needs TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Tokens Table (Queue lifecycle tracking)
CREATE TABLE IF NOT EXISTS tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token_number INT NOT NULL,
    queue_date DATE NOT NULL DEFAULT CURRENT_DATE,
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    doctor_id UUID REFERENCES staff_profiles(id) ON DELETE SET NULL, -- Nullable for multi-doctor scaling
    status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'called', 'in_progress', 'hold', 'missed', 'completed', 'cancelled')),
    is_priority BOOLEAN NOT NULL DEFAULT FALSE,
    source TEXT NOT NULL DEFAULT 'qr' CHECK (source IN ('qr', 'doctor_desk', 'phone')),
    arrived_at_clinic BOOLEAN NOT NULL DEFAULT FALSE,
    arrived_at TIMESTAMPTZ DEFAULT NULL,
    come_by_time TIMESTAMPTZ DEFAULT NULL,
    hold_until TIMESTAMPTZ DEFAULT NULL,
    missed_count INT NOT NULL DEFAULT 0,
    position_override INT DEFAULT NULL,
    session_secret UUID NOT NULL DEFAULT gen_random_uuid(), -- Authorizes anonymous patient actions
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    called_at TIMESTAMPTZ DEFAULT NULL,
    started_at TIMESTAMPTZ DEFAULT NULL,
    completed_at TIMESTAMPTZ DEFAULT NULL,
    CONSTRAINT uq_daily_token UNIQUE (queue_date, token_number)
);

-- 5. Token Watchers Table (Caregiver proxy tracking)
CREATE TABLE IF NOT EXISTS token_watchers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token_id UUID NOT NULL REFERENCES tokens(id) ON DELETE CASCADE,
    phone TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_token_watcher UNIQUE (token_id, phone)
);

-- 6. Help Requests Table (Distress triggers from patient phones)
CREATE TABLE IF NOT EXISTS help_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token_id UUID NOT NULL REFERENCES tokens(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'acknowledged', 'resolved')),
    reason TEXT DEFAULT 'Assistance requested at clinic',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMPTZ DEFAULT NULL
);

-- 7. Audit Log Table (Chronicle of manual reorders and delay overrides)
CREATE TABLE IF NOT EXISTS audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token_id UUID REFERENCES tokens(id) ON DELETE SET NULL,
    actor_id UUID REFERENCES staff_profiles(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    previous_state JSONB DEFAULT NULL,
    new_state JSONB DEFAULT NULL,
    reason TEXT DEFAULT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance & Realtime filtering
CREATE INDEX IF NOT EXISTS idx_tokens_queue_date_status ON tokens(queue_date, status);
CREATE INDEX IF NOT EXISTS idx_tokens_created_at ON tokens(created_at);
CREATE INDEX IF NOT EXISTS idx_tokens_session_secret ON tokens(session_secret);
CREATE INDEX IF NOT EXISTS idx_help_requests_pending ON help_requests(status) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_audit_log_token ON audit_log(token_id);

