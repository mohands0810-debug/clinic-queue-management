-- 20261110000004_seed_data.sql
-- Initial Clinic Configuration & Seed Outpatient Data

-- 1. Insert Default Clinic Settings
INSERT INTO clinic_settings (
    clinic_name,
    doctor_name,
    address,
    phone_number,
    default_consultation_mins,
    buffer_mins,
    grace_period_mins,
    senior_interleave_ratio,
    max_daily_tokens,
    morning_start,
    morning_end,
    evening_start,
    evening_end,
    doctor_status
) VALUES (
    'Dhanvantri Clinic',
    'Dr Yogesh',
    'Sandhya Theater Complex, VP Road, BTM Layout, Bengaluru',
    '+91 98765 43210',
    8,
    15,
    5,
    3,
    100,
    '09:30:00',
    '13:30:00',
    '17:30:00',
    '21:30:00',
    'available'
) ON CONFLICT DO NOTHING;

-- 2. Seed Patient Profiles (Including 3 Senior Citizens and Accessibility Profiles)
DO $$
DECLARE
    -- Seniors (Age >= 60)
    p_senior1 UUID := 'a1111111-1111-1111-1111-111111111111';
    p_senior2 UUID := 'a2222222-2222-2222-2222-222222222222';
    p_senior3 UUID := 'a3333333-3333-3333-3333-333333333333';
    
    -- General Patients
    p_gen1 UUID := 'b1111111-1111-1111-1111-111111111111';
    p_gen2 UUID := 'b2222222-2222-2222-2222-222222222222';
    p_gen3 UUID := 'b3333333-3333-3333-3333-333333333333';
    p_gen4 UUID := 'b4444444-4444-4444-4444-444444444444';
    p_gen5 UUID := 'b5555555-5555-5555-5555-555555555555';
    p_gen6 UUID := 'b6666666-6666-6666-6666-666666666666';
BEGIN
    -- Insert Seniors
    INSERT INTO patients (id, full_name, phone, age, accessibility_needs) VALUES
        (p_senior1, 'Narasimha Murthy', '+91 98450 12345', 72, ARRAY['hearing']),
        (p_senior2, 'Savitri Devi', '+91 94480 67890', 68, ARRAY['wheelchair']),
        (p_senior3, 'K. Ramaswamy', NULL, 75, ARRAY['assistance']) -- Phone-free walk-in
    ON CONFLICT (id) DO NOTHING;

    -- Insert General Patients
    INSERT INTO patients (id, full_name, phone, age, accessibility_needs) VALUES
        (p_gen1, 'Arun Kumar', '+91 97401 23456', 34, '{}'),
        (p_gen2, 'Pooja Hegde', '+91 98862 34567', 28, '{}'),
        (p_gen3, 'Deepak Gowda', '+91 99003 45678', 42, '{}'),
        (p_gen4, 'Ananya Sharma', '+91 96114 56789', 24, '{}'),
        (p_gen5, 'Mohan Prasad', '+91 98445 67890', 51, '{}'),
        (p_gen6, 'Sneha Rao', '+91 97396 78901', 31, '{}')
    ON CONFLICT (id) DO NOTHING;

    -- 3. Insert 12 Sample Daily Tokens in Realistic Queue Lifecycle States
    -- Token 1 (Completed earlier today)
    INSERT INTO tokens (token_number, queue_date, patient_id, status, source, arrived_at_clinic, created_at, called_at, started_at, completed_at)
    VALUES (1, CURRENT_DATE, p_gen1, 'completed', 'qr', TRUE, NOW() - INTERVAL '60 minutes', NOW() - INTERVAL '58 minutes', NOW() - INTERVAL '56 minutes', NOW() - INTERVAL '48 minutes')
    ON CONFLICT (queue_date, token_number) DO NOTHING;

    -- Token 2 (Completed earlier today)
    INSERT INTO tokens (token_number, queue_date, patient_id, status, source, arrived_at_clinic, created_at, called_at, started_at, completed_at)
    VALUES (2, CURRENT_DATE, p_gen2, 'completed', 'qr', TRUE, NOW() - INTERVAL '55 minutes', NOW() - INTERVAL '47 minutes', NOW() - INTERVAL '46 minutes', NOW() - INTERVAL '37 minutes')
    ON CONFLICT (queue_date, token_number) DO NOTHING;

    -- Token 3 (Completed earlier today)
    INSERT INTO tokens (token_number, queue_date, patient_id, status, source, arrived_at_clinic, created_at, called_at, started_at, completed_at)
    VALUES (3, CURRENT_DATE, p_gen3, 'completed', 'doctor_desk', TRUE, NOW() - INTERVAL '45 minutes', NOW() - INTERVAL '36 minutes', NOW() - INTERVAL '35 minutes', NOW() - INTERVAL '27 minutes')
    ON CONFLICT (queue_date, token_number) DO NOTHING;

    -- Token 4 (Currently IN PROGRESS with Dr Yogesh)
    INSERT INTO tokens (token_number, queue_date, patient_id, status, source, arrived_at_clinic, created_at, called_at, started_at)
    VALUES (4, CURRENT_DATE, p_gen4, 'in_progress', 'qr', TRUE, NOW() - INTERVAL '30 minutes', NOW() - INTERVAL '8 minutes', NOW() - INTERVAL '7 minutes')
    ON CONFLICT (queue_date, token_number) DO NOTHING;

    -- Token 5 (Currently CALLED - Walking into consulting room)
    INSERT INTO tokens (token_number, queue_date, patient_id, status, is_priority, source, arrived_at_clinic, created_at, called_at)
    VALUES (5, CURRENT_DATE, p_senior1, 'called', TRUE, 'qr', TRUE, NOW() - INTERVAL '25 minutes', NOW() - INTERVAL '1 minute')
    ON CONFLICT (queue_date, token_number) DO NOTHING;

    -- Token 6 (HOLD - Patient stepped out to pharmacy)
    INSERT INTO tokens (token_number, queue_date, patient_id, status, source, arrived_at_clinic, hold_until, created_at)
    VALUES (6, CURRENT_DATE, p_gen5, 'hold', 'qr', TRUE, NOW() + INTERVAL '10 minutes', NOW() - INTERVAL '22 minutes')
    ON CONFLICT (queue_date, token_number) DO NOTHING;

    -- Token 7 (MISSED - In 5-minute grace period)
    INSERT INTO tokens (token_number, queue_date, patient_id, status, source, arrived_at_clinic, missed_count, hold_until, created_at, called_at)
    VALUES (7, CURRENT_DATE, p_gen6, 'missed', 'phone', FALSE, 1, NOW() + INTERVAL '4 minutes', NOW() - INTERVAL '20 minutes', NOW() - INTERVAL '2 minutes')
    ON CONFLICT (queue_date, token_number) DO NOTHING;

    -- Token 8 (WAITING - Senior Citizen prioritized via Fair Interleave)
    INSERT INTO tokens (token_number, queue_date, patient_id, status, is_priority, source, arrived_at_clinic, come_by_time, created_at)
    VALUES (8, CURRENT_DATE, p_senior2, 'waiting', TRUE, 'doctor_desk', TRUE, NOW() + INTERVAL '10 minutes', NOW() - INTERVAL '18 minutes')
    ON CONFLICT (queue_date, token_number) DO NOTHING;

    -- Token 9 (WAITING - General walk-in)
    INSERT INTO tokens (token_number, queue_date, patient_id, status, source, arrived_at_clinic, come_by_time, created_at)
    VALUES (9, CURRENT_DATE, p_gen1, 'waiting', 'qr', FALSE, NOW() + INTERVAL '18 minutes', NOW() - INTERVAL '15 minutes')
    ON CONFLICT (queue_date, token_number) DO NOTHING;

    -- Token 10 (WAITING - Phone-free Senior Walk-In)
    INSERT INTO tokens (token_number, queue_date, patient_id, status, is_priority, source, arrived_at_clinic, come_by_time, created_at)
    VALUES (10, CURRENT_DATE, p_senior3, 'waiting', TRUE, 'doctor_desk', TRUE, NOW() + INTERVAL '26 minutes', NOW() - INTERVAL '12 minutes')
    ON CONFLICT (queue_date, token_number) DO NOTHING;

    -- Token 11 (WAITING - General)
    INSERT INTO tokens (token_number, queue_date, patient_id, status, source, arrived_at_clinic, come_by_time, created_at)
    VALUES (11, CURRENT_DATE, p_gen2, 'waiting', 'qr', FALSE, NOW() + INTERVAL '34 minutes', NOW() - INTERVAL '8 minutes')
    ON CONFLICT (queue_date, token_number) DO NOTHING;

    -- Token 12 (WAITING - General)
    INSERT INTO tokens (token_number, queue_date, patient_id, status, source, arrived_at_clinic, come_by_time, created_at)
    VALUES (12, CURRENT_DATE, p_gen3, 'waiting', 'qr', FALSE, NOW() + INTERVAL '42 minutes', NOW() - INTERVAL '3 minutes')
    ON CONFLICT (queue_date, token_number) DO NOTHING;

END $$;
