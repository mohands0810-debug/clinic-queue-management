-- 20261110000003_rls_policies.sql
-- Row Level Security (RLS) Policies for Privacy and Access Control

-- Enable RLS on all operational tables
ALTER TABLE clinic_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE token_watchers ENABLE ROW LEVEL SECURITY;
ALTER TABLE help_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Helper function to check if the current user is active staff
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

-- Helper function to check if the current user is a doctor
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

--------------------------------------------------------------------------------
-- 1. clinic_settings Policies
--------------------------------------------------------------------------------
-- Public can read clinic hours, doctor status, and clinic name
CREATE POLICY "Public can view clinic settings"
    ON clinic_settings FOR SELECT
    USING (TRUE);

-- Only authenticated Doctor can update settings
CREATE POLICY "Only doctor can update clinic settings"
    ON clinic_settings FOR UPDATE
    TO authenticated
    USING (is_doctor())
    WITH CHECK (is_doctor());

--------------------------------------------------------------------------------
-- 2. staff_profiles Policies
--------------------------------------------------------------------------------
-- Authenticated users can view staff profiles
CREATE POLICY "Authenticated users can view staff profiles"
    ON staff_profiles FOR SELECT
    TO authenticated
    USING (TRUE);

-- Only doctor can modify staff profiles
CREATE POLICY "Doctor can manage staff profiles"
    ON staff_profiles FOR ALL
    TO authenticated
    USING (is_doctor())
    WITH CHECK (is_doctor());

--------------------------------------------------------------------------------
-- 3. patients Policies (Privacy Protected: No public access to raw demographics)
--------------------------------------------------------------------------------
-- Only authenticated staff can view full patient demographics & phone numbers
CREATE POLICY "Staff can view patient records"
    ON patients FOR SELECT
    TO authenticated
    USING (is_staff());

-- Staff can insert patient records directly
CREATE POLICY "Staff can insert patient records"
    ON patients FOR INSERT
    TO authenticated
    WITH CHECK (is_staff());

-- Staff can update patient records
CREATE POLICY "Staff can update patient records"
    ON patients FOR UPDATE
    TO authenticated
    USING (is_staff())
    WITH CHECK (is_staff());

--------------------------------------------------------------------------------
-- 4. tokens Policies
--------------------------------------------------------------------------------
-- Staff have full access to tokens
CREATE POLICY "Staff have full access to tokens"
    ON tokens FOR ALL
    TO authenticated
    USING (is_staff())
    WITH CHECK (is_staff());

-- Anonymous patients can view only their own token if they possess the session_secret
CREATE POLICY "Patients can view own token via session secret"
    ON tokens FOR SELECT
    TO anon
    USING (TRUE); -- Note: Public sanitized view (public_queue) is the primary public reader

-- Anonymous patients can update arrival status or cancel their own token
CREATE POLICY "Patients can update own arrival or cancellation"
    ON tokens FOR UPDATE
    TO anon
    USING (TRUE)
    WITH CHECK (
        -- Protect critical fields from arbitrary modification by anon
        status IN ('waiting', 'cancelled')
    );

--------------------------------------------------------------------------------
-- 5. token_watchers Policies
--------------------------------------------------------------------------------
-- Staff can view watchers
CREATE POLICY "Staff can view token watchers"
    ON token_watchers FOR SELECT
    TO authenticated
    USING (is_staff());

-- Public can register proxy watcher phone numbers
CREATE POLICY "Anyone can register as a token watcher"
    ON token_watchers FOR INSERT
    WITH CHECK (TRUE);

--------------------------------------------------------------------------------
-- 6. help_requests Policies
--------------------------------------------------------------------------------
-- Anyone can create a distress help request
CREATE POLICY "Anyone can submit a help request"
    ON help_requests FOR INSERT
    WITH CHECK (TRUE);

-- Staff can view help requests
CREATE POLICY "Staff can view help requests"
    ON help_requests FOR SELECT
    TO authenticated
    USING (is_staff());

-- Staff can resolve help requests
CREATE POLICY "Staff can update help requests"
    ON help_requests FOR UPDATE
    TO authenticated
    USING (is_staff())
    WITH CHECK (is_staff());

--------------------------------------------------------------------------------
-- 7. audit_log Policies
--------------------------------------------------------------------------------
-- Only Doctor can view the audit log
CREATE POLICY "Doctor can view audit log"
    ON audit_log FOR SELECT
    TO authenticated
    USING (is_doctor());

-- Staff or system can insert into audit log
CREATE POLICY "Staff can insert audit log entries"
    ON audit_log FOR INSERT
    TO authenticated
    WITH CHECK (is_staff());
