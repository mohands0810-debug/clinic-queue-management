-- 20261110000002_safe_public_view.sql
-- Sanitized Public Database View for Waiting-Room TV & Public Status Tracking

DROP VIEW IF EXISTS public_queue;

CREATE OR REPLACE VIEW public_queue AS
SELECT 
    t.id AS token_id,
    t.token_number,
    t.queue_date,
    t.status,
    t.is_priority,
    t.arrived_at_clinic,
    t.come_by_time,
    t.position_override,
    t.created_at,
    t.called_at,
    -- Compute initials only (e.g. "Ramesh Kumar" -> "R. K.", "Ananya" -> "A.")
    (
        SELECT string_agg(upper(left(part, 1)) || '.', ' ')
        FROM unnest(string_to_array(trim(p.full_name), ' ')) AS part
        WHERE part <> ''
    ) AS patient_initials,
    p.is_senior,
    p.accessibility_needs
FROM tokens t
JOIN patients p ON t.patient_id = p.id
WHERE t.queue_date = CURRENT_DATE
  AND t.status IN ('waiting', 'called', 'in_progress', 'hold')
ORDER BY 
    CASE 
        WHEN t.status = 'in_progress' THEN 1
        WHEN t.status = 'called' THEN 2
        WHEN t.status = 'hold' THEN 3
        ELSE 4
    END,
    COALESCE(t.position_override, t.token_number) ASC;

-- Grant SELECT permission to anonymous and authenticated users
GRANT SELECT ON public_queue TO anon;
GRANT SELECT ON public_queue TO authenticated;
