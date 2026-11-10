-- RESET_ALL_DATA.sql
-- Run this in Supabase SQL Editor to wipe all demo/test tokens, patients, and logs
-- Starting fresh from Token #1 for a live presentation

-- 1. Wipe all transactional queue data and reset sequences
TRUNCATE TABLE tokens, patients, help_requests, audit_log CASCADE;

-- 2. Reset Clinic Settings to fresh default state (Doctor Available, no delays)
UPDATE clinic_settings
SET 
    doctor_status = 'available',
    delay_reason = NULL,
    delay_until = NULL,
    simulation_mode = FALSE,
    updated_at = NOW();

-- 3. Confirm clean state
SELECT 'FRESH DEMO READY: All tokens wiped. Queue is empty and ready for Token #1.' AS status;
