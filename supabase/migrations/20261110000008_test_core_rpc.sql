-- 20261110000008_test_core_rpc.sql
-- Automated Unit Tests for Stored Procedures (RPC), Audit Triggers & Concurrency

DO $$
DECLARE
    v_res JSONB;
    v_token_id UUID;
    v_token_num INT;
    v_call_res JSONB;
    v_complete_res JSONB;
    v_missed_res JSONB;
    v_estimate_res JSONB;
    v_audit_count INT;
    v_t1 JSONB;
    v_t2 JSONB;
    v_t3 JSONB;
BEGIN
    RAISE NOTICE '=== STARTING PHASE 2 RPC & CONCURRENCY TESTS ===';

    -- Test 1: create_token RPC execution
    v_res := create_token(
        p_full_name := 'Shankar Nag',
        p_phone := '+91 98450 99999',
        p_age := 64,
        p_accessibility := ARRAY['hearing']::TEXT[],
        p_source := 'qr'
    );

    v_token_id := (v_res->>'token_id')::UUID;
    v_token_num := (v_res->>'token_number')::INT;

    IF v_token_id IS NULL OR v_token_num IS NULL THEN
        RAISE EXCEPTION 'Test 1 Failed: create_token did not return valid token record';
    END IF;

    IF (v_res->>'is_senior')::BOOLEAN IS NOT TRUE THEN
        RAISE EXCEPTION 'Test 1 Failed: Senior flag not applied to 64-year-old patient';
    END IF;
    RAISE NOTICE 'Test 1 PASSED: create_token executed atomically (Token #%, ID: %).', v_token_num, v_token_id;

    -- Test 2: compute_wait_estimate RPC
    v_estimate_res := compute_wait_estimate(v_token_id);
    IF (v_estimate_res->>'estimated_mins') IS NULL OR (v_estimate_res->>'range_min') IS NULL THEN
        RAISE EXCEPTION 'Test 2 Failed: compute_wait_estimate did not return valid estimates';
    END IF;
    RAISE NOTICE 'Test 2 PASSED: compute_wait_estimate returned % mins (Range: % to % mins).',
        v_estimate_res->>'estimated_mins',
        v_estimate_res->>'range_min',
        v_estimate_res->>'range_max';

    -- Test 3: Concurrency Simulation (Serial transactional allocation test)
    -- Verify sequential, non-duplicate allocation for rapid consecutive creations
    v_t1 := create_token('Concurrent Patient 1', '+91 90000 00001', 35, '{}', 'phone');
    v_t2 := create_token('Concurrent Patient 2', '+91 90000 00002', 40, '{}', 'phone');
    v_t3 := create_token('Concurrent Patient 3', '+91 90000 00003', 45, '{}', 'phone');

    IF ((v_t2->>'token_number')::INT <> (v_t1->>'token_number')::INT + 1) OR
       ((v_t3->>'token_number')::INT <> (v_t2->>'token_number')::INT + 1) THEN
        RAISE EXCEPTION 'Test 3 Failed: Sequential token numbering violated under consecutive allocations';
    END IF;
    RAISE NOTICE 'Test 3 PASSED: Consecutive allocations are strictly sequential (Tokens #%, #%, #%).',
        v_t1->>'token_number', v_t2->>'token_number', v_t3->>'token_number';

    -- Test 4: hold_turn RPC
    PERFORM hold_turn((v_t1->>'token_id')::UUID, 15);
    IF NOT EXISTS (SELECT 1 FROM tokens WHERE id = (v_t1->>'token_id')::UUID AND status = 'hold') THEN
        RAISE EXCEPTION 'Test 4 Failed: hold_turn did not set status to hold';
    END IF;
    RAISE NOTICE 'Test 4 PASSED: hold_turn correctly placed token into hold status.';

    -- Test 5: mark_missed RPC
    v_missed_res := mark_missed((v_t2->>'token_id')::UUID);
    IF (v_missed_res->>'status') <> 'missed' OR (v_missed_res->>'grace_until') IS NULL THEN
        RAISE EXCEPTION 'Test 5 Failed: mark_missed did not trigger 5-minute grace period';
    END IF;
    RAISE NOTICE 'Test 5 PASSED: mark_missed initiated grace countdown until %.', v_missed_res->>'grace_until';

    -- Test 6: Verify automated Audit Log Trigger
    SELECT COUNT(*) INTO v_audit_count
    FROM audit_log
    WHERE token_id = (v_t1->>'token_id')::UUID;

    IF v_audit_count = 0 THEN
        RAISE EXCEPTION 'Test 6 Failed: Audit log trigger did not record state transitions for token';
    END IF;
    RAISE NOTICE 'Test 6 PASSED: Audit log trigger captured % mutation events for Token #%.',
        v_audit_count, v_t1->>'token_number';

    RAISE NOTICE '=== ALL PHASE 2 RPC & INTEGRITY TESTS PASSED SUCCESSFULLY ===';
END $$;

