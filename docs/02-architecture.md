# System Architecture & Technical Design

## Document Details
- **Project**: Digital Queue Management System
- **Clinic**: Dhanvantri Clinic (Dr Yogesh)
- **Institution**: K. S. Institute of Technology, Dept. of CSE (25BCP308)
- **Document Version**: 1.0.0

---

## 1. Architectural Overview

The Dhanvantri Clinic Queue Management System uses an event-driven, decoupled client-server architecture. The frontend is a single Progressive Web App (PWA) built with React and Vite that provides two distinct interfaces: a **Zero-Auth Public Interface** for patients and the waiting-room TV display, and a **Role-Guarded Doctor Console** for Dr Yogesh and his clinic assistant.

Supabase acts as the complete backend-as-a-service (BaaS), handling relational data persistence in PostgreSQL, authentication, row-level security (RLS), real-time WebSocket state distribution, atomic transactional logic via Postgres Functions (RPC), and automated background timers via Supabase Edge Functions.

---

## 2. System Architecture Diagram

```mermaid
flowchart TB
    subgraph Clients["Frontend Clients (React + Vite PWA)"]
        direction TB
        subgraph PublicArea["Public Client Layer (Zero-Auth)"]
            MobilePatient["Patient Smartphone<br/>(/, /get-token, /status)<br/>• Senior-Friendly UI (20-28px)<br/>• Voice Readout (KN, EN, HI)<br/>• Vibrate & Audio Alerts"]
            TVBoard["Waiting-Room TV Board<br/>(/display)<br/>• 10m High-Contrast View<br/>• Chime & Multilingual Audio<br/>• Dynamic Join QR Code"]
        end
        subgraph StaffArea["Staff Client Layer (Role-Guarded)"]
            DocConsole["Doctor Console<br/>(/doctor)<br/>• Dr Yogesh & Helper Logins<br/>• Realtime Queue Controls<br/>• Thermal Print Slips<br/>• Reports & Settings"]
        end
    end

    subgraph CDN["Edge & Delivery Layer"]
        VercelNetlify["Static Edge CDN<br/>(Vercel / Netlify)<br/>HTTPS / WSS / PWA Assets"]
    end

    subgraph SupabaseCloud["Supabase Backend-as-a-Service"]
        direction TB
        AuthSvc["Supabase Auth<br/>• Doctor / Helper Roles<br/>• JWT Verification"]
        
        RealtimeEngine["Supabase Realtime Engine<br/>• Postgres Changes (WAL)<br/>• Broadcast Channels<br/>• Sub-500ms WebSocket Sync"]

        PostgresDB[("PostgreSQL 15 Engine<br/>━━━━━━━━━━━━━━━━━━━━━<br/>• Tables (patients, tokens, settings)<br/>• Safe Public View (public_queue)<br/>• RLS Security Policies<br/>• Audit Log Triggers")]

        RPCFuncs["PostgreSQL RPC Functions<br/>• create_token (atomic numbering)<br/>• call_next / hold_turn<br/>• start_consultation / complete<br/>• compute_wait_estimate"]

        EdgeFuncs["Supabase Edge Functions<br/>• Timer Service (Grace expiry)<br/>• Delay Detection Service<br/>• Midnight Token Reset<br/>• Rate Limiter Engine"]
    end

    subgraph ExternalNotifications["External Notification Pipeline"]
        direction LR
        InAppAlerts["In-App Realtime<br/>Web Audio & Vibrate API"]
        MSG91Gateway["MSG91 SMS Gateway<br/>(Indian DLT Approved)"]
        TwilioGateway["Twilio API<br/>(WhatsApp Fallback)"]
    end

    %% Client Connections
    MobilePatient -->|HTTPS GET| VercelNetlify
    TVBoard -->|HTTPS GET| VercelNetlify
    DocConsole -->|HTTPS GET| VercelNetlify

    %% Backend Operations
    DocConsole -->|JWT Auth| AuthSvc
    DocConsole -->|RPC Invocations| RPCFuncs
    MobilePatient -->|RPC create_token| RPCFuncs
    MobilePatient -->|Query Safe View| PostgresDB
    TVBoard -->|Query Safe View| PostgresDB

    %% Realtime Connections
    PostgresDB -.->|WAL Event Stream| RealtimeEngine
    RealtimeEngine ==>|WebSocket State Updates| MobilePatient
    RealtimeEngine ==>|WebSocket State Updates| TVBoard
    RealtimeEngine ==>|WebSocket State Updates| DocConsole

    %% Edge Functions & Timers
    EdgeFuncs -->|Scheduled Worker / pg_cron| PostgresDB
    EdgeFuncs -->|Trigger Dispatches| RealtimeEngine
    EdgeFuncs -.->|Conditional Dispatch| MSG91Gateway
    EdgeFuncs -.->|Conditional Dispatch| TwilioGateway
    MobilePatient -.->|Local Execution| InAppAlerts
```

---

## 3. Subsystem Breakdown

### 3.1 Public Patient Interface (`/`, `/get-token`, `/status`)
- **Technology**: React 18, Tailwind CSS, Lucide Icons, Web Speech API, Web Vibration API.
- **Execution Model**: Runs completely client-side in the patient's browser without requiring account registration.
- **Security**: Can only query the sanitized `public_queue` database view or read personal token progress via an unguessable token UUID/session key.
- **Resilience**: Caches the last known queue position in browser memory and IndexedDB. In the event of cell-tower drops in BTM Layout, the UI displays an offline indicator with the cached status instead of a blank screen.

### 3.2 Waiting-Room TV Display Board (`/display`)
- **Technology**: Full-screen kiosk layout optimized for 1080p and 4K displays.
- **Execution Model**: Persistent WebSocket listener to the Supabase Realtime channel `room:clinic-display`.
- **Audio Pipeline**: Plays an acoustic chime upon token status changes, followed by sequential speech synthesis:
  1. Kannada: `"ಟೋಕನ್ ಸಂಖ್ಯೆ 14, ದಯವಿಟ್ಟು ವೈದ್ಯರ ಕೋಣೆಗೆ ಬನ್ನಿ."`
  2. English: `"Token number 14, please proceed to the doctor's room."`

### 3.3 Doctor Console (`/doctor`)
- **Technology**: React 18, shadcn/ui components, Recharts for clinical analytics.
- **Authentication**: Authenticated via Supabase Auth. Issues a secure JWT containing the user's role (`doctor` or `helper`).
- **Features**:
  - Direct execution of atomic stored procedures for queue manipulation.
  - Silent thermal printing of token slips using browser CSS `@media print` rules targeting 58mm/80mm receipt formats.
  - Distress alert listener with auditory priority bells when a patient triggers `"I need help"`.

### 3.4 Supabase Core Backend
- **PostgreSQL 15**: Serves as the single source of truth. All transactional state transitions are validated through foreign keys and CHECK constraints.
- **Row Level Security (RLS)**: Enforces that unauthenticated anonymous clients cannot inspect sensitive fields such as phone numbers, caregiver details, or internal clinical audit records.
- **RPC Layer**: Encapsulates concurrency-critical operations (token number generation, priority interleaving, queue reordering) to eliminate race conditions.
- **Edge Functions & Scheduled Jobs**:
  - `cron-daily-reset`: Triggers at 00:00 IST daily to archive tokens and reset daily sequence counters.
  - `timer-grace-period`: Evaluates tokens placed in `missed` status, automatically re-inserting them behind the active consultation once the 5-minute countdown expires.
  - `alert-delay-detector`: Scans for consultations exceeding 1.5× the running average, automatically updating waiting estimates and flagging doctor delays.

---

## 4. Real-Time Synchronization Strategy

```mermaid
sequenceDiagram
    autonumber
    participant D as Doctor Console (/doctor)
    participant DB as PostgreSQL Database
    participant RT as Supabase Realtime (WSS)
    participant TV as TV Board (/display)
    participant P as Patient Mobile (/status)

    Note over D,P: Doctor advances queue
    D->>DB: Invoke RPC: call_next(p_doctor_id)
    Note over DB: Lock row, update status to 'called',<br/>set called_at = NOW(), record audit_log
    DB-->>D: Return { token_id, token_number: 14, status: 'called' }
    
    DB->>RT: PostgreSQL WAL triggers change event on table 'tokens'
    
    par Realtime Broadcast
        RT-->>TV: Push change payload: { token: 14, status: 'called' }
        Note over TV: Play audio chime & vocalize call in Kannada & English
    and
        RT-->>P: Push change payload for subscribed token UUID
        Note over P: Vibrate device, display banner alert "YOUR TURN NOW"
    and
        RT-->>D: Push updated waiting count and next patient preview
    end
```

### Key Principles of the Sync Strategy:
1. **Single Source of Truth**: State is never maintained exclusively in browser memory. Every mutation flows through PostgreSQL.
2. **Postgres Logical Replication (WAL)**: The Supabase Realtime daemon monitors write-ahead logs and broadcasts event payloads to active WebSocket clients within 150–300 milliseconds.
3. **Optimistic UI with Reversion**: Doctor console buttons show instantaneous visual feedback while awaiting RPC confirmation. If a network interruption occurs, the UI rolls back and presents an explicit retry notification.
4. **Heartbeat & Exponential Backoff**: When patient smartphones enter sleep mode or lose network connectivity in the Sandhya Theater Complex basement, the client automatically re-syncs state immediately upon network resumption.

