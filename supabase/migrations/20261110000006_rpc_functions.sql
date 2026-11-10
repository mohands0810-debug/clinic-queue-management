-- 20261110000006_rpc_functions.sql
-- Atomic Stored Procedures (RPC) for Core Queue Operations

--------------------------------------------------------------------------------
-- 1. create_token
-- Concurrency-safe atomic token generation using advisory locks on the current date
--------------------------------------------------------------------------------
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
    v_token_id UUID;
    v_session_secret UUID := gen_random_uuid();
    v_is_senior BOOLEAN;
    v_default_consult_mins INT;
    v_buffer_mins INT;
    v_active_ahead INT;
    v_estimated_wait INT;
    v_come_by TIMESTAMPTZ;
    v_token_record RECORD;
BEGIN
    -- Input sanitization and validation
    IF trim(p_full_name) IS NULL OR length(trim(p_full_name)) < 2 THEN
        RAISE EXCEPTION 'Patient name must be at least 2 characters long.';
    END IF;

    IF p_age < 0 OR p_age > 125 THEN
        RAISE EXCEPTION 'Patient age must be between 0 and 125.';
    END IF;

    -- Concurrency Protection: Acquire transactional advisory lock based on date hash
    -- Ensures concurrent requests serialize token number allocation without deadlock
    v_lock_key := ('x' || substr(md5(v_today::text), 1, 15))::bit(64)::bigint;
    PERFORM pg_advisory_xact_lock(v_lock_key);

    -- 1. Create or retrieve patient record
    INSERT INTO patients (full_name, phone, age, accessibility_needs)
    VALUES (trim(p_full_name), trim(p_phone), p_age, p_accessibility)
    RETURNING id, is_senior INTO v_patient_id, v_is_senior;

    -- 2. Allocate strictly sequential daily token number
    SELECT COALESCE(MAX(token_number), 0) + 1
    INTO v_next_token
    FROM tokens
    WHERE queue_date = v_today;

    -- 3. Retrieve clinic configuration
    SELECT default_consultation_mins, buffer_mins
    INTO v_default_consult_mins, v_buffer_mins
    FROM clinic_settings
    LIMIT 1;

    IF v_default_consult_mins IS NULL THEN
        v_default_consult_mins := 8;
        v_buffer_mins := 15;
    END IF;

    -- 4. Count active patients ahead
    SELECT COUNT(*)
    INTO v_active_ahead
    FROM tokens
    WHERE queue_date = v_today
      AND status IN ('waiting', 'called', 'in_progress', 'hold');

    -- Compute wait and arrival guidance
    v_estimated_wait := (v_active_ahead + 1) * v_default_consult_mins;
    v_come_by := NOW() + (INTERVAL '1 minute' * GREATEST(0, v_estimated_wait - v_buffer_mins));

    -- 5. Insert token
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
        (p_source = 'doctor_desk'), -- Desk walk-ins are already present
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

-- Grant execution to public and authenticated users
GRANT EXECUTE ON FUNCTION create_token(TEXT, TEXT, INT, TEXT[], TEXT) TO anon;
GRANT EXECUTE ON FUNCTION create_token(TEXT, TEXT, INT, TEXT[], TEXT) TO authenticated;

--------------------------------------------------------------------------------
-- 2. call_next
-- Selects the next eligible token adhering to Senior Fair Interleaving (default 3:1)
--------------------------------------------------------------------------------
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
    -- Check staff authorization
    IF NOT is_staff() THEN
        RAISE EXCEPTION 'Unauthorized: Only clinic staff can advance the queue.';
    END IF;

    -- Retrieve senior interleave policy ratio (default: 3 general before 1 senior)
    SELECT COALESCE(senior_interleave_ratio, 3)
    INTO v_senior_ratio
    FROM clinic_settings
    LIMIT 1;

    -- Count consecutive general patients called since the last senior patient
    SELECT COUNT(*)
    INTO v_consecutive_gen
    FROM (
        SELECT t.id, p.is_senior
        FROM tokens t
        JOIN patients p ON t.patient_id = p.id
        WHERE t.queue_date = v_today
          AND t.called_at IS NOT NULL
        ORDER BY t.called_at DESC
        LIMIT 10
    ) sub
    WHERE sub.is_senior IS FALSE;

    -- If >= senior_ratio general patients were called, check if a senior is waiting
    IF v_consecutive_gen >= v_senior_ratio THEN
        SELECT t.id, t.token_number, t.patient_id
        INTO v_candidate_token
        FROM tokens t
        JOIN patients p ON t.patient_id = p.id
        WHERE t.queue_date = v_today
          AND t.status = 'waiting'
          AND p.is_senior = TRUE
        ORDER BY COALESCE(t.position_override, t.token_number) ASC
        LIMIT 1;
    END IF;

    -- If no senior candidate selected under policy, choose the earliest waiting token
    IF v_candidate_token.id IS NULL THEN
        SELECT t.id, t.token_number, t.patient_id
        INTO v_candidate_token
        FROM tokens t
        WHERE t.queue_date = v_today
          AND t.status = 'waiting'
        ORDER BY COALESCE(t.position_override, t.token_number) ASC
        LIMIT 1;
    END IF;

    IF v_candidate_token.id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'No waiting patients in queue.'
        );
    END IF;

    -- Advance candidate token to 'called'
    UPDATE tokens
    SET status = 'called',
        called_at = NOW(),
        doctor_id = COALESCE(p_doctor_id, auth.uid())
    WHERE id = v_candidate_token.id
    RETURNING id, token_number, patient_id INTO v_token_id, v_token_number, v_patient_id;

    -- Fetch patient metadata
    SELECT full_name, is_senior, accessibility_needs
    INTO v_patient_name, v_is_senior, v_accessibility
    FROM patients
    WHERE id = v_patient_id;

    -- Record in audit log
    INSERT INTO audit_log (token_id, actor_id, action, new_state, reason)
    VALUES (
        v_token_id,
        auth.uid(),
        'call_next',
        jsonb_build_object('token_number', v_token_number, 'status', 'called'),
        CASE WHEN v_is_senior AND v_consecutive_gen >= v_senior_ratio 
             THEN 'Senior Care Fair Interleaving' 
             ELSE 'Normal sequential queue call' END
    );

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

--------------------------------------------------------------------------------
-- 3. start_consultation
--------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION start_consultation(p_token_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF NOT is_staff() THEN
        RAISE EXCEPTION 'Unauthorized: Only clinic staff can start consultations.';
    END IF;

    UPDATE tokens
    SET status = 'in_progress',
        started_at = NOW()
    WHERE id = p_token_id
      AND status IN ('called', 'hold');

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Token not found or not in called/hold status.';
    END IF;

    INSERT INTO audit_log (token_id, actor_id, action, new_state, reason)
    VALUES (p_token_id, auth.uid(), 'start_consultation', jsonb_build_object('status', 'in_progress'), 'Consultation started with doctor');

    RETURN TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION start_consultation(UUID) TO authenticated;

--------------------------------------------------------------------------------
-- 4. complete_consultation
--------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION complete_consultation(p_token_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_token RECORD;
    v_duration_mins INT;
BEGIN
    IF NOT is_staff() THEN
        RAISE EXCEPTION 'Unauthorized: Only clinic staff can complete consultations.';
    END IF;

    UPDATE tokens
    SET status = 'completed',
        completed_at = NOW()
    WHERE id = p_token_id
    RETURNING * INTO v_token;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Token not found.';
    END IF;

    IF v_token.started_at IS NOT NULL THEN
        v_duration_mins := GREATEST(1, ROUND(EXTRACT(EPOCH FROM (v_token.completed_at - v_token.started_at)) / 60));
    ELSE
        v_duration_mins := 8;
    END IF;

    INSERT INTO audit_log (token_id, actor_id, action, new_state, reason)
    VALUES (
        p_token_id, 
        auth.uid(), 
        'complete_consultation', 
        jsonb_build_object('status', 'completed', 'duration_mins', v_duration_mins), 
        'Consultation completed'
    );

    RETURN jsonb_build_object(
        'success', true,
        'token_id', v_token.id,
        'token_number', v_token.token_number,
        'status', 'completed',
        'duration_mins', v_duration_mins,
        'completed_at', v_token.completed_at
    );
END;
$$;

GRANT EXECUTE ON FUNCTION complete_consultation(UUID) TO authenticated;

--------------------------------------------------------------------------------
-- 5. mark_missed
-- Triggers 5-minute grace period
--------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION mark_missed(p_token_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_grace_mins INT;
    v_hold_until TIMESTAMPTZ;
    v_token RECORD;
BEGIN
    IF NOT is_staff() THEN
        RAISE EXCEPTION 'Unauthorized: Only clinic staff can mark missed turns.';
    END IF;

    SELECT COALESCE(grace_period_mins, 5) INTO v_grace_mins FROM clinic_settings LIMIT 1;
    v_hold_until := NOW() + (INTERVAL '1 minute' * v_grace_mins);

    UPDATE tokens
    SET status = 'missed',
        missed_count = missed_count + 1,
        hold_until = v_hold_until
    WHERE id = p_token_id
    RETURNING * INTO v_token;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Token not found.';
    END IF;

    INSERT INTO audit_log (token_id, actor_id, action, new_state, reason)
    VALUES (
        p_token_id, 
        auth.uid(), 
        'mark_missed', 
        jsonb_build_object('status', 'missed', 'hold_until', v_hold_until, 'missed_count', v_token.missed_count), 
        'Patient not present at call; 5-min grace period started'
    );

    RETURN jsonb_build_object(
        'success', true,
        'token_id', v_token.id,
        'status', 'missed',
        'grace_until', v_hold_until,
        'missed_count', v_token.missed_count
    );
END;
$$;

GRANT EXECUTE ON FUNCTION mark_missed(UUID) TO authenticated;

--------------------------------------------------------------------------------
-- 6. hold_turn
--------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION hold_turn(p_token_id UUID, p_hold_mins INT DEFAULT 10)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_hold_until TIMESTAMPTZ;
BEGIN
    IF NOT is_staff() THEN
        RAISE EXCEPTION 'Unauthorized: Only clinic staff can hold turns.';
    END IF;

    v_hold_until := NOW() + (INTERVAL '1 minute' * GREATEST(1, p_hold_mins));

    UPDATE tokens
    SET status = 'hold',
        hold_until = v_hold_until
    WHERE id = p_token_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Token not found.';
    END IF;

    INSERT INTO audit_log (token_id, actor_id, action, new_state, reason)
    VALUES (
        p_token_id, 
        auth.uid(), 
        'hold_turn', 
        jsonb_build_object('status', 'hold', 'hold_until', v_hold_until), 
        format('Patient stepped out; held for %s mins', p_hold_mins)
    );

    RETURN TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION hold_turn(UUID, INT) TO authenticated;

--------------------------------------------------------------------------------
-- 7. reorder_queue
--------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION reorder_queue(p_token_ids UUID[], p_reason TEXT DEFAULT 'Manual queue reorder')
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_idx INT;
    v_tid UUID;
BEGIN
    IF NOT is_staff() THEN
        RAISE EXCEPTION 'Unauthorized: Only clinic staff can reorder the queue.';
    END IF;

    FOR v_idx IN 1..array_length(p_token_ids, 1) LOOP
        v_tid := p_token_ids[v_idx];
        UPDATE tokens
        SET position_override = v_idx
        WHERE id = v_tid;
    END LOOP;

    INSERT INTO audit_log (actor_id, action, new_state, reason)
    VALUES (
        auth.uid(),
        'reorder_queue',
        jsonb_build_object('reordered_count', array_length(p_token_ids, 1)),
        p_reason
    );

    RETURN TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION reorder_queue(UUID[], TEXT) TO authenticated;

--------------------------------------------------------------------------------
-- 8. compute_wait_estimate
-- Returns rolling average, standard deviation bounds, and doctor delay note
--------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION compute_wait_estimate(p_token_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_token RECORD;
    v_today DATE := CURRENT_DATE;
    v_default_mins INT := 8;
    v_rolling_avg NUMERIC := 8.0;
    v_std_dev NUMERIC := 2.5;
    v_completed_count INT;
    v_patients_ahead INT;
    v_est_mins INT;
    v_range_min INT;
    v_range_max INT;
    v_delay_mins INT := 0;
    v_delay_note TEXT := NULL;
    v_settings RECORD;
    v_active_token RECORD;
    v_active_remaining NUMERIC := 0;
BEGIN
    SELECT * INTO v_token FROM tokens WHERE id = p_token_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Token not found.';
    END IF;

    -- Retrieve clinic settings
    SELECT * INTO v_settings FROM clinic_settings LIMIT 1;
    IF v_settings.default_consultation_mins IS NOT NULL THEN
        v_default_mins := v_settings.default_consultation_mins;
    END IF;

    -- Check if doctor is on break or has delay
    IF v_settings.doctor_status = 'break' THEN
        v_delay_mins := 15;
        v_delay_note := COALESCE(v_settings.delay_reason, 'Doctor is on a clinical break');
    ELSIF v_settings.doctor_status = 'emergency' THEN
        v_delay_mins := 20;
        v_delay_note := 'Doctor attending emergency case';
    END IF;

    -- Calculate rolling average and std dev of completed consultations today
    SELECT 
        COUNT(*),
        COALESCE(AVG(EXTRACT(EPOCH FROM (completed_at - started_at)) / 60), v_default_mins),
        COALESCE(STDDEV_SAMP(EXTRACT(EPOCH FROM (completed_at - started_at)) / 60), 2.5)
    INTO v_completed_count, v_rolling_avg, v_std_dev
    FROM tokens
    WHERE queue_date = v_today
      AND status = 'completed'
      AND started_at IS NOT NULL
      AND completed_at IS NOT NULL;

    -- If fewer than 3 completed, fallback to default
    IF v_completed_count < 3 THEN
        v_rolling_avg := v_default_mins;
        v_std_dev := 2.5;
    END IF;

    -- Count active patients ahead of this token
    SELECT COUNT(*)
    INTO v_patients_ahead
    FROM tokens
    WHERE queue_date = v_today
      AND status IN ('waiting', 'called', 'hold')
      AND COALESCE(position_override, token_number) < COALESCE(v_token.position_override, v_token.token_number);

    -- Calculate active consultation remaining time
    SELECT * INTO v_active_token FROM tokens WHERE queue_date = v_today AND status = 'in_progress' LIMIT 1;
    IF v_active_token.started_at IS NOT NULL THEN
        v_active_remaining := GREATEST(1.0, v_rolling_avg - (EXTRACT(EPOCH FROM (NOW() - v_active_token.started_at)) / 60));
    ELSE
        v_active_remaining := 0;
    END IF;

    -- Total estimate
    v_est_mins := ROUND(v_active_remaining + (v_patients_ahead * v_rolling_avg) + v_delay_mins);
    v_range_min := GREATEST(2, ROUND(v_est_mins - (v_patients_ahead * 0.5 * v_std_dev)));
    v_range_max := ROUND(v_est_mins + (v_patients_ahead * 0.8 * v_std_dev) + 5);

    RETURN jsonb_build_object(
        'token_id', v_token.id,
        'token_number', v_token.token_number,
        'patients_ahead', v_patients_ahead,
        'estimated_mins', v_est_mins,
        'range_min', v_range_min,
        'range_max', v_range_max,
        'delay_mins', v_delay_mins,
        'delay_note', v_delay_note,
        'come_by_time', v_token.come_by_time
    );
END;
$$;

GRANT EXECUTE ON FUNCTION compute_wait_estimate(UUID) TO anon;
GRANT EXECUTE ON FUNCTION compute_wait_estimate(UUID) TO authenticated;

