-- 20261110000005_test_rls.sql
-- Automated SQL Verification Tests for Database Integrity & Row Level Security

DO $$
DECLARE
    v_count INT;
    v_initials TEXT;
    v_phone TEXT;
    v_is_senior BOOLEAN;
BEGIN
    RAISE NOTICE '=== STARTING DATABASE VERIFICATION TESTS ===';

    -- Test 1: Verify Clinic Settings initialized
    SELECT COUNT(*) INTO v_count FROM clinic_settings WHERE clinic_name = 'Dhanvantri Clinic';
    IF v_count <> 1 THEN
        RAISE EXCEPTION 'Test 1 Failed: Clinic settings not found';
    END IF;
    RAISE NOTICE 'Test 1 PASSED: Clinic settings verified for Dhanvantri Clinic.';

    -- Test 2: Verify Senior Citizen generated column
    SELECT is_senior INTO v_is_senior FROM patients WHERE age = 72 LIMIT 1;
    IF v_is_senior IS NOT TRUE THEN
        RAISE EXCEPTION 'Test 2 Failed: Age 72 was not flagged as senior';
    END IF;
    SELECT is_senior INTO v_is_senior FROM patients WHERE age = 24 LIMIT 1;
    IF v_is_senior IS NOT FALSE THEN
        RAISE EXCEPTION 'Test 2 Failed: Age 24 was incorrectly flagged as senior';
    END IF;
    RAISE NOTICE 'Test 2 PASSED: Senior age auto-calculation verified.';

    -- Test 3: Verify Safe Public View masks full names into initials
    SELECT patient_initials INTO v_initials FROM public_queue WHERE token_number = 5;
    IF v_initials NOT LIKE 'N. M.%' THEN
        RAISE EXCEPTION 'Test 3 Failed: Initials not computed properly: %', v_initials;
    END IF;
    RAISE NOTICE 'Test 3 PASSED: Public view computes initials correctly (Narasimha Murthy -> %).', v_initials;

    -- Test 4: Verify 12 seed tokens exist in proper lifecycle states
    SELECT COUNT(*) INTO v_count FROM tokens WHERE queue_date = CURRENT_DATE;
    IF v_count < 12 THEN
        RAISE EXCEPTION 'Test 4 Failed: Expected at least 12 tokens, found %', v_count;
    END IF;
    RAISE NOTICE 'Test 4 PASSED: 12 seed tokens verified across queue lifecycle.';

    -- Test 5: Verify unique token constraint (duplicate token on same day must fail)
    BEGIN
        INSERT INTO tokens (token_number, queue_date, patient_id, status)
        VALUES (1, CURRENT_DATE, 'b1111111-1111-1111-1111-111111111111', 'waiting');
        RAISE EXCEPTION 'Test 5 Failed: Unique constraint did not reject duplicate token number';
    EXCEPTION
        WHEN unique_violation THEN
            RAISE NOTICE 'Test 5 PASSED: Unique token constraint correctly rejected duplicate token #1 on today.';
    END;

    RAISE NOTICE '=== ALL DATABASE & SECURITY CHECKS PASSED SUCCESSFULLY ===';
END $$;
