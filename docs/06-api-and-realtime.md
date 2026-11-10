# API, Edge Functions & Realtime Channels Reference

## Document Details
- **Project**: Digital Queue Management System
- **Clinic**: Dhanvantri Clinic (Dr Yogesh)
- **Institution**: K. S. Institute of Technology, Dept. of CSE (25BCP308)
- **Document Version**: 1.0.0

---

## 1. PostgreSQL RPC Stored Procedures

All stored procedures execute with `SECURITY DEFINER` where necessary, bounded by strict parameter checks.

### 1.1 `create_token`
Creates a daily queue token, creates or links a patient record, evaluates senior priority, and calculates arrival estimates atomically.

- **Permissions**: Public (`anon`) and Staff (`authenticated`).
- **Parameters**:
  | Parameter | Type | Required | Description |
  | :--- | :--- | :--- | :--- |
  | `p_full_name` | `TEXT` | Yes | Patient's full name (sanitized) |
  | `p_phone` | `TEXT` | No | Contact number (optional for walk-ins) |
  | `p_age` | `INT` | Yes | Patient age (0–125) |
  | `p_accessibility` | `TEXT[]`| No | Array of tags: `wheelchair`, `hearing`, `vision`, `assistance` |
  | `p_source` | `TEXT` | Yes | Origin: `'qr'`, `'doctor_desk'`, or `'phone'` |
- **Returns**: `JSONB`
  ```json
  {
    "token_id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
    "token_number": 14,
    "session_secret": "3c5f87b2-...",
    "status": "waiting",
    "queue_date": "2026-11-10",
    "estimated_wait_mins": 25,
    "come_by_time": "2026-11-10T11:20:00+05:30"
  }
  ```

---

### 1.2 `call_next`
Advances queue state by setting the next eligible token to `'called'`.

- **Permissions**: Staff (`authenticated`) only.
- **Parameters**:
  | Parameter | Type | Required | Description |
  | :--- | :--- | :--- | :--- |
  | `p_doctor_id` | `UUID` | No | ID of attending physician (Dr Yogesh) |
- **Returns**: `JSONB`
  ```json
  {
    "token_id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
    "token_number": 14,
    "patient_name": "Ramesh Kumar",
    "is_senior": true,
    "accessibility_needs": ["wheelchair"],
    "status": "called",
    "called_at": "2026-11-10T11:15:30+05:30"
  }
  ```

---

### 1.3 `start_consultation`
Transitions an active token from `'called'` to `'in_progress'`.

- **Permissions**: Staff (`authenticated`) only.
- **Parameters**: `p_token_id UUID`
- **Returns**: `BOOLEAN` (`TRUE` on successful state transition).

---

### 1.4 `complete_consultation`
Concludes the active consultation, records elapsed duration, and recalculates queue waiting averages.

- **Permissions**: Staff (`authenticated`) only.
- **Parameters**: `p_token_id UUID`
- **Returns**: `JSONB`
  ```json
  {
    "token_id": "...",
    "status": "completed",
    "duration_mins": 9,
    "completed_at": "2026-11-10T11:24:30+05:30"
  }
  ```

---

### 1.5 `mark_missed`
Flags a token as missed when a patient does not answer the call, initiating a 5-minute countdown grace period.

- **Permissions**: Staff (`authenticated`) only.
- **Parameters**: `p_token_id UUID`
- **Returns**: `JSONB`
  ```json
  {
    "token_id": "...",
    "status": "missed",
    "grace_until": "2026-11-10T11:20:30+05:30",
    "missed_count": 1
  }
  ```

---

### 1.6 `hold_turn`
Temporarily suspends a token's call status (e.g., patient stepped out to buy medicine).

- **Permissions**: Staff (`authenticated`) only.
- **Parameters**:
  | Parameter | Type | Required | Description |
  | :--- | :--- | :--- | :--- |
  | `p_token_id` | `UUID` | Yes | Token identifier |
  | `p_hold_mins` | `INT` | Yes | Freeze duration in minutes (e.g., 10) |
- **Returns**: `BOOLEAN`

---

### 1.7 `reorder_queue`
Applies manual sequence overrides to an ordered array of tokens with mandatory audit tracking.

- **Permissions**: Staff (`authenticated`) only.
- **Parameters**:
  | Parameter | Type | Required | Description |
  | :--- | :--- | :--- | :--- |
  | `p_token_ids` | `UUID[]`| Yes | Ordered array of token UUIDs |
  | `p_reason` | `TEXT` | Yes | Clinical justification for reordering |
- **Returns**: `BOOLEAN`

---

### 1.8 `compute_wait_estimate`
Calculates dynamic waiting durations and realistic bounds for any active token.

- **Permissions**: Public (`anon`) and Staff (`authenticated`).
- **Parameters**: `p_token_id UUID`
- **Returns**: `JSONB`
  ```json
  {
    "patients_ahead": 3,
    "estimated_mins": 25,
    "range_min": 20,
    "range_max": 35,
    "delay_mins": 0,
    "delay_note": null,
    "come_by_time": "2026-11-10T11:20:00+05:30"
  }
  ```

---

## 2. Supabase Edge Functions

### 2.1 `timer-worker`
- **Trigger**: Invoked every 60 seconds via `pg_cron` or Supabase cron schedule.
- **Responsibilities**:
  1. **Grace Period Expiry**: Checks for tokens in `missed` status where `NOW() > hold_until`. Re-slots the patient directly behind the active consultation.
  2. **Doctor Delay Detection**: Checks if the current `in_progress` consultation has exceeded 1.5× the average duration. If true, flags `delay_detected` and broadcasts an updated wait estimate.
  3. **Midnight Reset**: At 00:00 IST, closes remaining uncompleted tokens and resets daily sequence counters.

### 2.2 `send-notification`
- **Trigger**: HTTP POST / Webhook invoked on queue milestone transitions (`get_ready`, `called`).
- **Fallback Hierarchy**:
  1. Checks if `MSG91_AUTH_KEY` is present. If configured, dispatches SMS via Indian DLT-approved template.
  2. Checks if `TWILIO_ACCOUNT_SID` is present. If configured, dispatches WhatsApp template.
  3. If third-party keys are absent, dispatches Web Push payload and confirms in-app WebSocket delivery at zero cost.

### 2.3 `rate-limiter`
- **Trigger**: Intercepts `create_token` invocations.
- **Policy**:
  - Maximum 2 tokens per 24 hours per phone number.
  - Maximum 5 tokens per 1 hour per IP address.
  - Returns `429 Too Many Requests` with friendly multilingual message when breached.

---

## 3. Realtime WebSocket Channels

| Channel Name | Filter / Condition | Events Broadcast | Payload Content |
| :--- | :--- | :--- | :--- |
| `room:public-queue` | `tokens:queue_date=eq.CURRENT_DATE` | `INSERT`, `UPDATE` | Sanitized token changes (`token_number`, `status`, `patient_initials`, `is_senior`) |
| `room:clinic-display` | All display updates | `TOKEN_CALLED`, `DELAY_ALERT` | Called token number, patient initials, delay announcement banners |
| `token:<token_id>` | Specific patient token UUID | `STATUS_CHANGE`, `GRACE_START` | Complete individual token status, exact wait estimates, "come by" updates |
| `room:doctor-console` | Staff role only | `HELP_REQUEST`, `WALK_IN_ADDED` | Incoming help requests, arrival confirmations, queue overrides |
