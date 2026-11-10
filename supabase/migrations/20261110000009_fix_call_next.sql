-- 20261110000009_fix_call_next.sql
-- Fix: call_next record variable access on unassigned RECORD (no rows returned)
-- In PL/pgSQL, accessing any field on a RECORD that received no rows from SELECT INTO
-- raises "record is not assigned yet". Use FOUND flag instead.

CREATE OR REPLACE FUNCTION call_next(p_doctor_id UUID DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_today          DATE := CURRENT_DATE;
    v_token_id       UUID;
    v_token_number   INT;
    v_patient_id     UUID;
    v_patient_name   TEXT;
    v_is_senior      BOOLEAN;
    v_accessibility  TEXT[];
    v_senior_ratio   INT;
    v_consecutive_gen INT := 0;
    v_candidate_id   UUID;   -- store just the ID, not a RECORD
    v_found_senior   BOOLEAN := FALSE;
BEGIN
    -- Authorization check
    IF NOT is_staff() THEN
        RAISE EXCEPTION 'Unauthorized: Only clinic staff can advance the queue.';
    END IF;

    -- Retrieve senior interleave ratio (default 3)
    SELECT COALESCE(senior_interleave_ratio, 3)
    INTO v_senior_ratio
    FROM clinic_settings
    LIMIT 1;

    IF NOT FOUND THEN
        v_senior_ratio := 3;
    END IF;

    -- Count consecutive general patients called since the last senior
    SELECT COUNT(*) INTO v_consecutive_gen
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

    -- Try senior candidate first if interleave ratio is reached
    IF v_consecutive_gen >= v_senior_ratio THEN
        SELECT t.id INTO v_candidate_id
        FROM tokens t
        JOIN patients p ON t.patient_id = p.id
        WHERE t.queue_date = v_today
          AND t.status = 'waiting'
          AND p.is_senior = TRUE
        ORDER BY COALESCE(t.position_override, t.token_number) ASC
        LIMIT 1;

        IF FOUND THEN
            v_found_senior := TRUE;
        END IF;
    END IF;

    -- Fall back to earliest waiting token
    IF v_candidate_id IS NULL THEN
        SELECT t.id INTO v_candidate_id
        FROM tokens t
        WHERE t.queue_date = v_today
          AND t.status = 'waiting'
        ORDER BY COALESCE(t.position_override, t.token_number) ASC
        LIMIT 1;

        IF NOT FOUND THEN
            RETURN jsonb_build_object(
                'success', false,
                'message', 'No waiting patients in queue.'
            );
        END IF;
    END IF;

    -- Advance candidate token to 'called'
    UPDATE tokens
    SET status    = 'called',
        called_at = NOW(),
        doctor_id = COALESCE(p_doctor_id, auth.uid())
    WHERE id = v_candidate_id
    RETURNING id, token_number, patient_id
    INTO v_token_id, v_token_number, v_patient_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Token could not be updated. Please refresh and try again.'
        );
    END IF;

    -- Fetch patient metadata
    SELECT full_name, is_senior, accessibility_needs
    INTO v_patient_name, v_is_senior, v_accessibility
    FROM patients
    WHERE id = v_patient_id;

    -- Audit log
    INSERT INTO audit_log (token_id, actor_id, action, new_state, reason)
    VALUES (
        v_token_id,
        auth.uid(),
        'call_next',
        jsonb_build_object('token_number', v_token_number, 'status', 'called'),
        CASE WHEN v_found_senior
             THEN 'Senior Care Fair Interleaving'
             ELSE 'Normal sequential queue call' END
    );

    RETURN jsonb_build_object(
        'success',            true,
        'token_id',           v_token_id,
        'token_number',       v_token_number,
        'patient_name',       v_patient_name,
        'is_senior',          v_is_senior,
        'accessibility_needs', v_accessibility,
        'status',             'called',
        'called_at',          NOW()
    );
END;
$$;

-- Re-grant permissions
GRANT EXECUTE ON FUNCTION call_next(UUID) TO authenticated;

