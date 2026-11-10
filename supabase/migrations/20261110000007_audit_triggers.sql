-- 20261110000007_audit_triggers.sql
-- Automated PostgreSQL Triggers for Clinical State Changes & Audit Logging

-- 1. Trigger function for Token State Changes
CREATE OR REPLACE FUNCTION trg_token_audit_log()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Only log when status or priority changes
    IF (OLD.status IS DISTINCT FROM NEW.status) OR 
       (OLD.position_override IS DISTINCT FROM NEW.position_override) OR
       (OLD.is_priority IS DISTINCT FROM NEW.is_priority) THEN
       
        INSERT INTO audit_log (
            token_id,
            actor_id,
            action,
            previous_state,
            new_state,
            reason
        )
        VALUES (
            NEW.id,
            auth.uid(),
            'token_state_transition',
            jsonb_build_object(
                'status', OLD.status,
                'position_override', OLD.position_override,
                'is_priority', OLD.is_priority
            ),
            jsonb_build_object(
                'status', NEW.status,
                'position_override', NEW.position_override,
                'is_priority', NEW.is_priority
            ),
            format('Status changed from %s to %s', OLD.status, NEW.status)
        );
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_token_status_change ON tokens;
CREATE TRIGGER trg_token_status_change
    AFTER UPDATE ON tokens
    FOR EACH ROW
    EXECUTE FUNCTION trg_token_audit_log();

-- 2. Trigger function for Clinic Settings Changes (Doctor status, breaks, delays)
CREATE OR REPLACE FUNCTION trg_settings_audit_log()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF (OLD.doctor_status IS DISTINCT FROM NEW.doctor_status) OR
       (OLD.delay_reason IS DISTINCT FROM NEW.delay_reason) OR
       (OLD.default_consultation_mins IS DISTINCT FROM NEW.default_consultation_mins) THEN

        INSERT INTO audit_log (
            token_id,
            actor_id,
            action,
            previous_state,
            new_state,
            reason
        )
        VALUES (
            NULL,
            auth.uid(),
            'clinic_settings_update',
            jsonb_build_object(
                'doctor_status', OLD.doctor_status,
                'delay_reason', OLD.delay_reason,
                'default_consultation_mins', OLD.default_consultation_mins
            ),
            jsonb_build_object(
                'doctor_status', NEW.doctor_status,
                'delay_reason', NEW.delay_reason,
                'default_consultation_mins', NEW.default_consultation_mins
            ),
            format('Doctor updated clinic status to: %s (%s)', NEW.doctor_status, COALESCE(NEW.delay_reason, 'No reason given'))
        );
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_clinic_settings_change ON clinic_settings;
CREATE TRIGGER trg_clinic_settings_change
    AFTER UPDATE ON clinic_settings
    FOR EACH ROW
    EXECUTE FUNCTION trg_settings_audit_log();

