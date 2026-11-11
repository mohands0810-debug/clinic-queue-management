-- 20261111000011_reset_demo_data_rpc.sql
-- Function to instantly wipe all demo tokens, patients, and logs for fresh presentations

CREATE OR REPLACE FUNCTION reset_demo_data()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Wipe all queue transactions
  TRUNCATE TABLE tokens, patients, help_requests, audit_log CASCADE;

  -- Reset clinic settings to default
  UPDATE clinic_settings
  SET 
    doctor_status = 'available',
    delay_reason = NULL,
    delay_until = NULL,
    simulation_mode = FALSE,
    updated_at = NOW();

  RETURN 'SUCCESS: All records wiped. Ready for fresh Token #1.';
END;
$$;

-- Allow executing from doctor console or client API
GRANT EXECUTE ON FUNCTION reset_demo_data() TO authenticated, anon;

-- Run once immediately to wipe current records
SELECT reset_demo_data();

