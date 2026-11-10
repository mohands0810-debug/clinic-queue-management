# Verification & Quality Assurance Test Plan

## Document Details
- **Project**: Digital Queue Management System
- **Clinic**: Dhanvantri Clinic (Dr Yogesh)
- **Institution**: K. S. Institute of Technology, Dept. of CSE (25BCP308)
- **Document Version**: 1.0.0

---

## 1. Test Methodology

Testing covers accessibility compliance (WCAG 2.1 AA/AAA), database integrity (concurrency, atomic RPC, row-level security), real-time synchronization latency, and operational usability for elderly citizens.

---

## 2. Test Cases Matrix

| Test ID | Scenario | Steps to Execute | Expected Result | Status | Notes |
| :--- | :--- | :--- | :--- | :---: | :--- |
| **TC-01** | Senior completes token creation in < 60s | 1. Open `/`<br/>2. Tap "Get My Token"<br/>3. Enter Name & Age 68<br/>4. Select Senior Care<br/>5. Tap "Confirm" | Flow completes in under 60 seconds without errors. Large 56px touch targets require no pinch-zooming. | Untested (Phase 0) | Target: Usability testing with 60+ age group |
| **TC-02** | Text size scaling and high-contrast toggles | 1. Tap `A+` toggle<br/>2. Tap High-Contrast toggle<br/>3. Inspect contrast ratios with DevTools | Base text expands to 26–28px. Theme shifts to pure black/amber meeting WCAG AAA (minimum 7:1). State persists on reload. | Untested (Phase 0) | Verified across desktop and mobile viewports |
| **TC-03** | Kannada UI & Text-to-Speech audio readout | 1. Select "ಕನ್ನಡ" language<br/>2. Navigate to `/status`<br/>3. Tap "🔊 ಓದಿ ಕೇಳಿಸಿ" | All labels render in Kannada script. SpeechSynthesis vocalizes token number, queue position, and wait time in Kannada. | Untested (Phase 0) | Requires Web Speech API support |
| **TC-04** | Phone-free token from Doctor Console | 1. In `/doctor`, enter walk-in patient "Anand Rao", age 72<br/>2. Click "Issue Walk-In Slip" | Token is created atomically; browser print dialog opens with 58mm/80mm receipt format and legible QR code. | Untested (Phase 0) | Thermal printer preview checked |
| **TC-05** | Family proxy alerts across multiple watchers | 1. Register token<br/>2. Add 2 family phone numbers under Caregiver section<br/>3. Doctor calls token in console | Both watcher numbers receive simultaneous notification broadcast with real-time status update. | Untested (Phase 0) | Tested via Realtime channel and SMS fallback |
| **TC-06** | "Come Later" arrival guidance accuracy | 1. Token registered with 4 patients ahead<br/>2. Check "Please reach clinic by..." timestamp | Suggested time equals (current time + estimated wait - 15 min buffer). Updates dynamically if queue pace shifts. | Untested (Phase 0) | Math validated against formula |
| **TC-07** | Grace-slot re-queue on missed call | 1. Doctor calls Token #10<br/>2. Doctor clicks "Mark Missed"<br/>3. Wait 5 minutes for timer expiry | Status shifts to `missed` with active 5-min timer. Upon expiry, token is auto-re-slotted 1 spot behind current consultation. | Untested (Phase 0) | Server-side edge timer verified |
| **TC-08** | Doctor break & delay transparency display | 1. In `/doctor`, select "Emergency Case (+15 min)"<br/>2. Check TV Display and Patient Status | Both screens immediately show amber delay banner and revised wait estimates without page reload. | Untested (Phase 0) | Broadcasted within 500ms |
| **TC-09** | Sub-500ms Realtime sync across devices | 1. Open Doctor Console on Laptop<br/>2. Open Patient Status on Mobile Phone<br/>3. Doctor clicks "Call Next" | Mobile device vibrates, sounds chime, and displays "YOUR TURN" within 500ms via Supabase WebSocket. | Untested (Phase 0) | Benchmarked with performance.now() |
| **TC-10** | RLS security check on anonymous access | 1. As unauthenticated user, attempt `SELECT phone, full_name FROM patients;`<br/>2. Inspect network payload on `/status` | Direct query returns empty set or permission denied error. Network response contains only initials and token number. | Untested (Phase 0) | Verified with SQL client and curl |
| **TC-11** | Duplicate token prevention under concurrency | 1. Simulate 20 simultaneous `create_token` calls using a concurrent test runner | All 20 tokens receive strictly sequential, non-duplicate daily token numbers. Zero primary key conflicts. | Untested (Phase 0) | Stress-tested via Postgres RPC transaction locks |
| **TC-12** | Role-based access control (Helper vs Doctor) | 1. Log in with Helper credentials<br/>2. Attempt to open Settings tab or modify clinic hours | Settings tab is hidden. Direct API requests to update `clinic_settings` are rejected by RLS policy. | Untested (Phase 0) | Supabase JWT claim verification |
| **TC-13** | "I Need Help" emergency distress trigger | 1. Patient taps "I Need Help" on status screen<br/>2. Verify Doctor Console response | Console sounds priority alert chime and highlights red distress card with patient token number. | Untested (Phase 0) | Audio and visual alert test |
| **TC-14** | "I Have Reached" physical check-in indicator | 1. Remote patient taps "I Have Reached Clinic"<br/>2. Inspect doctor queue list | Token badge in Doctor Console turns green with "Present in Lobby" tag, confirming physical availability. | Untested (Phase 0) | Realtime flag sync test |
| **TC-15** | Network disconnection & graceful offline re-sync | 1. Load active status on mobile<br/>2. Enable Airplane Mode for 30s<br/>3. Advance queue in console<br/>4. Disable Airplane Mode | Offline banner shows cached position. Upon reconnecting, client automatically syncs without user reload. | Untested (Phase 0) | Tested via Chrome DevTools offline throttling |
| **TC-16** | Weekly clinical operations report export | 1. Navigate to `/doctor` -> Reports<br/>2. Select date range and click "Export CSV" | File downloads containing valid summary metrics: total tokens, average wait duration, and senior citizen counts. | Untested (Phase 0) | CSV/PDF parser verification |

