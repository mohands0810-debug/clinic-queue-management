-- ==============================================================================
-- FIX_AND_CLEAN_ALL.sql
-- Run this in Supabase SQL Editor (https://supabase.com/dashboard/project/npgnnbquqehaqzhxvhss/sql/new)
-- 
-- 1. Cleans corrupted user doctor@dhanvantri.clinic from auth tables (fixing "Database error loading user")
-- 2. Wipes all demo tokens and patients (so queue resets cleanly to Token #1)
-- 3. Resets clinic settings to default available state
-- ==============================================================================

-- STEP 1: Wipe all demo tokens, patients, and queue history
TRUNCATE TABLE public.tokens, public.patients, public.help_requests, public.audit_log CASCADE;

-- STEP 2: Safely remove the corrupted user from staff_profiles and auth schema
DELETE FROM public.staff_profiles WHERE full_name = 'Dr Yogesh';
DELETE FROM auth.identities WHERE identity_data->>'email' = 'doctor@dhanvantri.clinic' OR user_id IN (SELECT id FROM auth.users WHERE email = 'doctor@dhanvantri.clinic');
DELETE FROM auth.users WHERE email = 'doctor@dhanvantri.clinic';

-- STEP 3: Reset clinic settings to default
UPDATE public.clinic_settings
SET 
    doctor_status = 'available',
    delay_reason = NULL,
    delay_until = NULL,
    simulation_mode = FALSE,
    updated_at = NOW();

-- STEP 4: Success confirmation
SELECT 'SUCCESS: Corrupted user removed and all queue records wiped! Ready for fresh Token #1 demo.' AS result;

