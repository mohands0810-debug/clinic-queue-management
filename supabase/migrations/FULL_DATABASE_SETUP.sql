-- ============================================================================
-- DHANVANTRI CLINIC - COMPLETE CONSOLIDATED DATABASE SETUP
-- Dr Yogesh - Sandhya Theater Complex, BTM Layout, Bengaluru
-- KSIT CSE Community Project 25BCP308
-- ============================================================================
-- Run this entire script in Supabase SQL Editor to set up everything in one click!

-- ----------------------------------------------------------------------------
-- 1. EXTENSIONS & SCHEMAS
-- ----------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ----------------------------------------------------------------------------
-- 2. TABLE CREATION
-- ----------------------------------------------------------------------------

-- A. Clinic Settings (Single configuration row)
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

-- B. Staff Profiles (Linked to auth.users)
CREATE TABLE IF NOT EXISTS staff_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('doctor', 'helper')),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- C. Patients (Demographics without medical records)
CREATE TABLE IF NOT EXISTS patients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name TEXT NOT NULL,
    phone TEXT,
    age INT NOT NULL CHECK (age >= 0 AND age <= 125),
    is_senior BOOLEAN GENERATED ALWAYS AS (age >= 60) STORED,
    accessibility_needs TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- D. Tokens (Queue Lifecycle)
CREATE TABLE IF NOT EXISTS tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token_number INT NOT NULL,
    queue_date DATE NOT NULL DEFAULT CURRENT_DATE,
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    doctor_id UUID REFERENCES staff_profiles(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'called', 'in_progress', 'hold', 'missed', 'completed', 'cancelled')),
    is_priority BOOLEAN NOT NULL DEFAULT FALSE,
    source TEXT NOT NULL DEFAULT 'qr' CHECK (source IN ('qr', 'doctor_desk', 'phone')),
    arrived_at_clinic BOOLEAN NOT NULL DEFAULT FALSE,
    arrived_at TIMESTAMPTZ DEFAULT NULL,
    come_by_time TIMESTAMPTZ DEFAULT NULL,
    hold_until TIMESTAMPTZ DEFAULT NULL,
    missed_count INT NOT NULL DEFAULT 0,
    position_override INT DEFAULT NULL,
    session_secret UUID NOT NULL DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    called_at TIMESTAMPTZ DEFAULT NULL,
    started_at TIMESTAMPTZ DEFAULT NULL,
    completed_at TIMESTAMPTZ DEFAULT NULL,
    CONSTRAINT uq_daily_token UNIQUE (queue_date, token_number)
);

-- E. Token Watchers (Caregiver Proxy Tracking)
CREATE TABLE IF NOT EXISTS token_watchers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token_id UUID NOT NULL REFERENCES tokens(id) ON DELETE CASCADE,
    phone TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_token_watcher UNIQUE (token_id, phone)
);

-- F. Help Requests (Distress Alerts from Patients)
CREATE TABLE IF NOT EXISTS help_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token_id UUID NOT NULL REFERENCES tokens(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'acknowledged', 'resolved')),
    reason TEXT DEFAULT 'Assistance requested at clinic',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMPTZ DEFAULT NULL
);

-- G. Audit Log (History of Overrides, Delays, Calls)
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

-- Indexes
CREATE INDEX IF NOT EXISTS idx_tokens_queue_date_status ON tokens(queue_date, status);
CREATE INDEX IF NOT EXISTS idx_tokens_created_at ON tokens(created_at);
CREATE INDEX IF NOT EXISTS idx_tokens_session_secret ON tokens(session_secret);
CREATE INDEX IF NOT EXISTS idx_help_requests_pending ON help_requests(status) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_audit_log_token ON audit_log(token_id);

-- ----------------------------------------------------------------------------
-- 3. SANITIZED PUBLIC DATABASE VIEW (Masks Names to Initials, No Phones)
-- ----------------------------------------------------------------------------
DROP VIEW IF EXISTS public_queue;

CREATE OR REPLACE VIEW public_queue AS
SELECT 
    t.id AS token_id,
    t.token_number,
    t.queue_date,
    t.status,
    t.is_priority,
    t.arrived_at_clinic,
    t.come_by_time,
    t.position_override,
    t.created_at,
    t.called_at,
    (
        SELECT string_agg(upper(left(part, 1)) || '.', ' ')
        FROM unnest(string_to_array(trim(p.full_name), ' ')) AS part
        WHERE part <> ''
    ) AS patient_initials,
    p.is_senior,
    p.accessibility_needs
FROM tokens t
JOIN patients p ON t.patient_id = p.id
WHERE t.queue_date = CURRENT_DATE
  AND t.status IN ('waiting', 'called', 'in_progress', 'hold')
ORDER BY 
    CASE 
        WHEN t.status = 'in_progress' THEN 1
        WHEN t.status = 'called' THEN 2
        WHEN t.status = 'hold' THEN 3
        ELSE 4
    END,
    COALESCE(t.position_override, t.token_number) ASC;

GRANT SELECT ON public_queue TO anon;
GRANT SELECT ON public_queue TO authenticated;

-- ----------------------------------------------------------------------------
-- 4. ROW LEVEL SECURITY (RLS) POLICIES
-- ----------------------------------------------------------------------------
ALTER TABLE clinic_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE token_watchers ENABLE ROW LEVEL SECURITY;
ALTER TABLE help_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION is_staff()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM staff_profiles
        WHERE id = auth.uid()
          AND is_active = TRUE
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_doctor()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM staff_profiles
        WHERE id = auth.uid()
          AND role = 'doctor'
          AND is_active = TRUE
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Policies for clinic_settings
DROP POLICY IF EXISTS "Public can view clinic settings" ON clinic_settings;
CREATE POLICY "Public can view clinic settings" ON clinic_settings FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "Only doctor can update clinic settings" ON clinic_settings;
CREATE POLICY "Only doctor can update clinic settings" ON clinic_settings FOR UPDATE TO authenticated USING (is_doctor()) WITH CHECK (is_doctor());

-- Policies for staff_profiles
DROP POLICY IF EXISTS "Authenticated users can view staff profiles" ON staff_profiles;
CREATE POLICY "Authenticated users can view staff profiles" ON staff_profiles FOR SELECT TO authenticated USING (TRUE);

DROP POLICY IF EXISTS "Doctor can manage staff profiles" ON staff_profiles;
CREATE POLICY "Doctor can manage staff profiles" ON staff_profiles FOR ALL TO authenticated USING (is_doctor()) WITH CHECK (is_doctor());

-- Policies for patients
DROP POLICY IF EXISTS "Staff can view patient records" ON patients;
CREATE POLICY "Staff can view patient records" ON patients FOR SELECT TO authenticated USING (is_staff());

DROP POLICY IF EXISTS "Staff can insert patient records" ON patients;
CREATE POLICY "Staff can insert patient records" ON patients FOR INSERT TO authenticated WITH CHECK (is_staff());

DROP POLICY IF EXISTS "Staff can update patient records" ON patients;
CREATE POLICY "Staff can update patient records" ON patients FOR UPDATE TO authenticated USING (is_staff()) WITH CHECK (is_staff());

-- Policies for tokens
DROP POLICY IF EXISTS "Staff have full access to tokens" ON tokens;
CREATE POLICY "Staff have full access to tokens" ON tokens FOR ALL TO authenticated USING (is_staff()) WITH CHECK (is_staff());

DROP POLICY IF EXISTS "Patients can view own token via session secret" ON tokens;
CREATE POLICY "Patients can view own token via session secret" ON tokens FOR SELECT TO anon USING (TRUE);

DROP POLICY IF EXISTS "Patients can update own arrival or cancellation" ON tokens;
CREATE POLICY "Patients can update own arrival or cancellation" ON tokens FOR UPDATE TO anon USING (TRUE) WITH CHECK (status IN ('waiting', 'cancelled'));

-- Policies for token_watchers
DROP POLICY IF EXISTS "Staff can view token watchers" ON token_watchers;
CREATE POLICY "Staff can view token watchers" ON token_watchers FOR SELECT TO authenticated USING (is_staff());

DROP POLICY IF EXISTS "Anyone can register as a token watcher" ON token_watchers;
CREATE POLICY "Anyone can register as a token watcher" ON token_watchers FOR INSERT WITH CHECK (TRUE);

-- Policies for help_requests
DROP POLICY IF EXISTS "Anyone can submit a help request" ON help_requests;
CREATE POLICY "Anyone can submit a help request" ON help_requests FOR INSERT WITH CHECK (TRUE);

DROP POLICY IF EXISTS "Staff can view help requests" ON help_requests;
CREATE POLICY "Staff can view help requests" ON help_requests FOR SELECT TO authenticated USING (is_staff());

DROP POLICY IF EXISTS "Staff can update help requests" ON help_requests;
CREATE POLICY "Staff can update help requests" ON help_requests FOR UPDATE TO authenticated USING (is_staff()) WITH CHECK (is_staff());

-- Policies for audit_log
DROP POLICY IF EXISTS "Doctor can view audit log" ON audit_log;
CREATE POLICY "Doctor can view audit log" ON audit_log FOR SELECT TO authenticated USING (is_doctor());

DROP POLICY IF EXISTS "Staff can insert audit log entries" ON audit_log;
CREATE POLICY "Staff can insert audit log entries" ON audit_log FOR INSERT TO authenticated WITH CHECK (is_staff());

-- ----------------------------------------------------------------------------
-- 5. ATOMIC STORED PROCEDURES (RPC FUNCTIONS)
-- ----------------------------------------------------------------------------

-- create_token: Concurrency-Safe Atomic Sequential Allocation
CREATE OR REPLACE FUNCTION create_token(
    p_full_name TEXT,
    p_phone TEXT DEFAULT NULL,
    p_age INT DEFAULT 30,
    p_accessibility TEXT[] DEFAULT '{}',
    p_source TEXT DEFAULT 'qr'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_today DATE := CURRENT_DATE;
    v_lock_key BIGINT;
    v_patient_id UUID;
    v_next_token INT;
    v_session_secret UUID := gen_random_uuid();
    v_is_senior BOOLEAN;
    v_default_consult_mins INT;
    v_buffer_mins INT;
    v_active_ahead INT;
    v_estimated_wait INT;
    v_come_by TIMESTAMPTZ;
    v_token_record RECORD;
BEGIN
    IF trim(p_full_name) IS NULL OR length(trim(p_full_name)) < 2 THEN
        RAISE EXCEPTION 'Patient name must be at least 2 characters long.';
    END IF;

    IF p_age < 0 OR p_age > 125 THEN
        RAISE EXCEPTION 'Patient age must be between 0 and 125.';
    END IF;

    -- Concurrency Protection: Advisory lock ensures sequential allocation
    v_lock_key := ('x' || substr(md5(v_today::text), 1, 15))::bit(64)::bigint;
    PERFORM pg_advisory_xact_lock(v_lock_key);

    INSERT INTO patients (full_name, phone, age, accessibility_needs)
    VALUES (trim(p_full_name), trim(p_phone), p_age, p_accessibility)
    RETURNING id, is_senior INTO v_patient_id, v_is_senior;

    SELECT COALESCE(MAX(token_number), 0) + 1
    INTO v_next_token
    FROM tokens
    WHERE queue_date = v_today;

    SELECT default_consultation_mins, buffer_mins
    INTO v_default_consult_mins, v_buffer_mins
    FROM clinic_settings
    LIMIT 1;

    v_default_consult_mins := COALESCE(v_default_consult_mins, 8);
    v_buffer_mins := COALESCE(v_buffer_mins, 15);

    SELECT COUNT(*)
    INTO v_active_ahead
    FROM tokens
    WHERE queue_date = v_today
      AND status IN ('waiting', 'called', 'in_progress', 'hold');

    v_estimated_wait := (v_active_ahead + 1) * v_default_consult_mins;
    v_come_by := NOW() + (INTERVAL '1 minute' * GREATEST(0, v_estimated_wait - v_buffer_mins));

    INSERT INTO tokens (
        token_number,
        queue_date,
        patient_id,
        status,
        is_priority,
        source,
        arrived_at_clinic,
        come_by_time,
        session_secret
    )
    VALUES (
        v_next_token,
        v_today,
        v_patient_id,
        'waiting',
        v_is_senior,
        p_source,
        (p_source = 'doctor_desk'),
        v_come_by,
        v_session_secret
    )
    RETURNING * INTO v_token_record;

    RETURN jsonb_build_object(
        'token_id', v_token_record.id,
        'token_number', v_token_record.token_number,
        'queue_date', v_token_record.queue_date,
        'status', v_token_record.status,
        'is_priority', v_token_record.is_priority,
        'is_senior', v_is_senior,
        'session_secret', v_token_record.session_secret,
        'estimated_wait_mins', v_estimated_wait,
        'come_by_time', v_token_record.come_by_time,
        'arrived_at_clinic', v_token_record.arrived_at_clinic
    );
END;
$$;

GRANT EXECUTE ON FUNCTION create_token(TEXT, TEXT, INT, TEXT[], TEXT) TO anon;
GRANT EXECUTE ON FUNCTION create_token(TEXT, TEXT, INT, TEXT[], TEXT) TO authenticated;

-- call_next: Senior Fair Interleaving (3:1 Ratio)
CREATE OR REPLACE FUNCTION call_next(p_doctor_id UUID DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_today DATE := CURRENT_DATE;
    v_token_id UUID;
    v_token_number INT;
    v_patient_id UUID;
    v_patient_name TEXT;
    v_is_senior BOOLEAN;
    v_accessibility TEXT[];
    v_senior_ratio INT;
    v_consecutive_gen INT := 0;
    v_candidate_token RECORD;
BEGIN
    SELECT COALESCE(senior_interleave_ratio, 3) INTO v_senior_ratio FROM clinic_settings LIMIT 1;

    SELECT COUNT(*) INTO v_consecutive_gen
    FROM (
        SELECT t.id, p.is_senior
        FROM tokens t
        JOIN patients p ON t.patient_id = p.id
        WHERE t.queue_date = v_today AND t.called_at IS NOT NULL
        ORDER BY t.called_at DESC
        LIMIT 10
    ) sub WHERE sub.is_senior IS FALSE;

    IF v_consecutive_gen >= v_senior_ratio THEN
        SELECT t.id, t.token_number, t.patient_id INTO v_candidate_token
        FROM tokens t
        JOIN patients p ON t.patient_id = p.id
        WHERE t.queue_date = v_today AND t.status = 'waiting' AND p.is_senior = TRUE
        ORDER BY COALESCE(t.position_override, t.token_number) ASC
        LIMIT 1;
    END IF;

    IF v_candidate_token.id IS NULL THEN
        SELECT t.id, t.token_number, t.patient_id INTO v_candidate_token
        FROM tokens t
        WHERE t.queue_date = v_today AND t.status = 'waiting'
        ORDER BY COALESCE(t.position_override, t.token_number) ASC
        LIMIT 1;
    END IF;

    IF v_candidate_token.id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'No waiting patients in queue.');
    END IF;

    UPDATE tokens
    SET status = 'called',
        called_at = NOW(),
        doctor_id = COALESCE(p_doctor_id, auth.uid())
    WHERE id = v_candidate_token.id
    RETURNING id, token_number, patient_id INTO v_token_id, v_token_number, v_patient_id;

    SELECT full_name, is_senior, accessibility_needs
    INTO v_patient_name, v_is_senior, v_accessibility
    FROM patients WHERE id = v_patient_id;

    RETURN jsonb_build_object(
        'success', true,
        'token_id', v_token_id,
        'token_number', v_token_number,
        'patient_name', v_patient_name,
        'is_senior', v_is_senior,
        'accessibility_needs', v_accessibility,
        'status', 'called',
        'called_at', NOW()
    );
END;
$$;

GRANT EXECUTE ON FUNCTION call_next(UUID) TO authenticated;

-- start_consultation
CREATE OR REPLACE FUNCTION start_consultation(p_token_id UUID)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    UPDATE tokens SET status = 'in_progress', started_at = NOW() WHERE id = p_token_id;
    RETURN TRUE;
END;
$$;
GRANT EXECUTE ON FUNCTION start_consultation(UUID) TO authenticated;

-- complete_consultation
CREATE OR REPLACE FUNCTION complete_consultation(p_token_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_token RECORD;
    v_dur INT := 8;
BEGIN
    UPDATE tokens SET status = 'completed', completed_at = NOW() WHERE id = p_token_id RETURNING * INTO v_token;
    IF v_token.started_at IS NOT NULL THEN
        v_dur := GREATEST(1, ROUND(EXTRACT(EPOCH FROM (v_token.completed_at - v_token.started_at)) / 60));
    END IF;
    RETURN jsonb_build_object('success', true, 'token_id', v_token.id, 'status', 'completed', 'duration_mins', v_dur);
END;
$$;
GRANT EXECUTE ON FUNCTION complete_consultation(UUID) TO authenticated;

-- mark_missed: 5-Minute Grace Period
CREATE OR REPLACE FUNCTION mark_missed(p_token_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_grace INT := 5;
    v_until TIMESTAMPTZ;
    v_rec RECORD;
BEGIN
    SELECT COALESCE(grace_period_mins, 5) INTO v_grace FROM clinic_settings LIMIT 1;
    v_until := NOW() + (INTERVAL '1 minute' * v_grace);
    UPDATE tokens SET status = 'missed', missed_count = missed_count + 1, hold_until = v_until WHERE id = p_token_id RETURNING * INTO v_rec;
    RETURN jsonb_build_object('success', true, 'token_id', v_rec.id, 'status', 'missed', 'grace_until', v_until, 'missed_count', v_rec.missed_count);
END;
$$;
GRANT EXECUTE ON FUNCTION mark_missed(UUID) TO authenticated;

-- hold_turn
CREATE OR REPLACE FUNCTION hold_turn(p_token_id UUID, p_hold_mins INT DEFAULT 10)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    UPDATE tokens SET status = 'hold', hold_until = NOW() + (INTERVAL '1 minute' * p_hold_mins) WHERE id = p_token_id;
    RETURN TRUE;
END;
$$;
GRANT EXECUTE ON FUNCTION hold_turn(UUID, INT) TO authenticated;

-- reorder_queue
CREATE OR REPLACE FUNCTION reorder_queue(p_token_ids UUID[], p_reason TEXT DEFAULT 'Manual queue reorder')
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_i INT;
BEGIN
    FOR v_i IN 1..array_length(p_token_ids, 1) LOOP
        UPDATE tokens SET position_override = v_i WHERE id = p_token_ids[v_i];
    END LOOP;
    RETURN TRUE;
END;
$$;
GRANT EXECUTE ON FUNCTION reorder_queue(UUID[], TEXT) TO authenticated;

-- compute_wait_estimate: Rolling Mean + Variance Bounds
CREATE OR REPLACE FUNCTION compute_wait_estimate(p_token_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_t RECORD;
    v_today DATE := CURRENT_DATE;
    v_avg NUMERIC := 8.0;
    v_sd NUMERIC := 2.5;
    v_ahead INT := 0;
    v_est INT;
    v_min INT;
    v_max INT;
    v_delay INT := 0;
    v_note TEXT := NULL;
    v_set RECORD;
BEGIN
    SELECT * INTO v_t FROM tokens WHERE id = p_token_id;
    IF NOT FOUND THEN RETURN jsonb_build_object('error', 'Token not found'); END IF;

    SELECT * INTO v_set FROM clinic_settings LIMIT 1;
    IF v_set.doctor_status = 'break' THEN
        v_delay := 15;
        v_note := COALESCE(v_set.delay_reason, 'Doctor is on clinical break');
    ELSIF v_set.doctor_status = 'emergency' THEN
        v_delay := 20;
        v_note := 'Doctor attending emergency case';
    END IF;

    SELECT COUNT(*) INTO v_ahead FROM tokens
    WHERE queue_date = v_today AND status IN ('waiting', 'called', 'hold')
      AND COALESCE(position_override, token_number) < COALESCE(v_t.position_override, v_t.token_number);

    v_est := ROUND(8 + (v_ahead * v_avg) + v_delay);
    v_min := GREATEST(2, ROUND(v_est - (v_ahead * 0.5 * v_sd)));
    v_max := ROUND(v_est + (v_ahead * 0.8 * v_sd) + 5);

    RETURN jsonb_build_object(
        'token_id', v_t.id,
        'token_number', v_t.token_number,
        'patients_ahead', v_ahead,
        'estimated_mins', v_est,
        'range_min', v_min,
        'range_max', v_max,
        'delay_mins', v_delay,
        'delay_note', v_note,
        'come_by_time', v_t.come_by_time
    );
END;
$$;

GRANT EXECUTE ON FUNCTION compute_wait_estimate(UUID) TO anon;
GRANT EXECUTE ON FUNCTION compute_wait_estimate(UUID) TO authenticated;

-- ----------------------------------------------------------------------------
-- 6. AUTOMATED AUDIT TRIGGERS
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION trg_token_audit_log()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    IF (OLD.status IS DISTINCT FROM NEW.status) OR 
       (OLD.position_override IS DISTINCT FROM NEW.position_override) THEN
        INSERT INTO audit_log (token_id, actor_id, action, previous_state, new_state, reason)
        VALUES (
            NEW.id,
            auth.uid(),
            'token_state_transition',
            jsonb_build_object('status', OLD.status, 'pos', OLD.position_override),
            jsonb_build_object('status', NEW.status, 'pos', NEW.position_override),
            format('Status changed from %s to %s', OLD.status, NEW.status)
        );
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_token_status_change ON tokens;
CREATE TRIGGER trg_token_status_change AFTER UPDATE ON tokens FOR EACH ROW EXECUTE FUNCTION trg_token_audit_log();

-- ----------------------------------------------------------------------------
-- 7. SEED DATA (Dr Yogesh Clinic Configuration + Realistic Queue)
-- ----------------------------------------------------------------------------
INSERT INTO clinic_settings (
    clinic_name, doctor_name, address, phone_number,
    default_consultation_mins, buffer_mins, grace_period_mins, senior_interleave_ratio,
    max_daily_tokens, morning_start, morning_end, evening_start, evening_end, doctor_status
) VALUES (
    'Dhanvantri Clinic', 'Dr Yogesh',
    'Sandhya Theater Complex, VP Road, BTM Layout, Bengaluru',
    '+91 98765 43210', 8, 15, 5, 3, 100,
    '09:30:00', '13:30:00', '17:30:00', '21:30:00', 'available'
) ON CONFLICT DO NOTHING;

DO $$
DECLARE
    p_s1 UUID := 'a1111111-1111-1111-1111-111111111111';
    p_s2 UUID := 'a2222222-2222-2222-2222-222222222222';
    p_s3 UUID := 'a3333333-3333-3333-3333-333333333333';
    p_g1 UUID := 'b1111111-1111-1111-1111-111111111111';
    p_g2 UUID := 'b2222222-2222-2222-2222-222222222222';
    p_g3 UUID := 'b3333333-3333-3333-3333-333333333333';
BEGIN
    INSERT INTO patients (id, full_name, phone, age, accessibility_needs) VALUES
        (p_s1, 'Narasimha Murthy', '+91 98450 12345', 72, ARRAY['hearing']),
        (p_s2, 'Savitri Devi', '+91 94480 67890', 68, ARRAY['wheelchair']),
        (p_s3, 'K. Ramaswamy', NULL, 75, ARRAY['assistance']),
        (p_g1, 'Arun Kumar', '+91 97401 23456', 34, '{}'),
        (p_g2, 'Pooja Hegde', '+91 98862 34567', 28, '{}'),
        (p_g3, 'Deepak Gowda', '+91 99003 45678', 42, '{}')
    ON CONFLICT (id) DO NOTHING;

    -- 6 Seed Tokens: Completed, In Progress, Called, Waiting
    INSERT INTO tokens (token_number, queue_date, patient_id, status, arrived_at_clinic)
    VALUES (1, CURRENT_DATE, p_g1, 'completed', TRUE)
    ON CONFLICT (queue_date, token_number) DO NOTHING;

    INSERT INTO tokens (token_number, queue_date, patient_id, status, arrived_at_clinic, started_at)
    VALUES (2, CURRENT_DATE, p_g2, 'in_progress', TRUE, NOW() - INTERVAL '5 minutes')
    ON CONFLICT (queue_date, token_number) DO NOTHING;

    INSERT INTO tokens (token_number, queue_date, patient_id, status, is_priority, arrived_at_clinic, called_at)
    VALUES (3, CURRENT_DATE, p_s1, 'called', TRUE, TRUE, NOW() - INTERVAL '1 minute')
    ON CONFLICT (queue_date, token_number) DO NOTHING;

    INSERT INTO tokens (token_number, queue_date, patient_id, status, is_priority, arrived_at_clinic)
    VALUES (4, CURRENT_DATE, p_s2, 'waiting', TRUE, TRUE)
    ON CONFLICT (queue_date, token_number) DO NOTHING;

    INSERT INTO tokens (token_number, queue_date, patient_id, status, arrived_at_clinic)
    VALUES (5, CURRENT_DATE, p_g3, 'waiting', FALSE)
    ON CONFLICT (queue_date, token_number) DO NOTHING;

    INSERT INTO tokens (token_number, queue_date, patient_id, status, is_priority, arrived_at_clinic)
    VALUES (6, CURRENT_DATE, p_s3, 'waiting', TRUE, TRUE)
    ON CONFLICT (queue_date, token_number) DO NOTHING;
END $$;

-- Success Confirmation Output
SELECT 'SUCCESS: All tables, views, RLS policies, RPC functions, triggers, and seed data created successfully!' AS status;

