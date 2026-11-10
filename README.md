# Dhanvantri Clinic - Digital Queue Management System

[![Community Project](https://img.shields.io/badge/KSIT%20CSE-Community%20Project%2025BCP308-blue.svg)](https://ksit.ac.in)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Built for](https://img.shields.io/badge/Clinic-Dhanvantri%20Clinic%20(Dr%20Yogesh)-orange.svg)](#)

A high-reliability, senior-friendly, real-time outpatient queue management system built for **Dhanvantri Clinic** (Dr Yogesh), located at Sandhya Theater Complex, VP Road, BTM Layout, Bengaluru. Developed as an engineering social contribution under the **K. S. Institute of Technology (KSIT), Department of Computer Science & Engineering**, Community Project **25BCP308**.

---

## 1. Project Context & Problem Statement

### The Problem
Dhanvantri Clinic is a high-volume, single-doctor outpatient clinic in urban Bengaluru. Currently, walk-in patients receive either physical paper tokens or verbal queue cues. Because patients have no visibility into:
1. Exact current queue position,
2. Reliable estimated consultation wait times,
3. Delays caused by emergency cases or clinical breaks,

patients congregate in large numbers inside the narrow clinic reception area and repeatedly interrupt Dr Yogesh during ongoing consultations. Furthermore, elderly patients (60+ years) and non-smartphone users struggle with digital systems requiring app installations, phone logins, or OTP verifications.

### The Solution
A zero-barrier digital queue platform specifically designed so that **a 75-year-old with no smartphone experience can navigate it as effortlessly as a 25-year-old tech worker**, without requiring app downloads, user registrations, or OTPs.

---

## 2. Project Objectives

1. **Digital Queue Tracking**: Provide an instant, zero-friction web token generator with live bi-directional sync between the clinic doctor console, public waiting-room TV display, and mobile devices.
2. **Transparent Wait Estimation**: Deliver dynamic wait-time ranges calculated through rolling consultation averages and standard deviations, reducing patient enquiries by >70%.
3. **Inclusive Healthcare Access**: Ensure 100% usability for elderly, non-literate, or hearing/visually impaired patients through voice readouts (English, Kannada, Hindi), high-contrast UI, large touch targets, and offline fallback.
4. **Independent Clinic Operations**: Empower the clinic doctor or a single helper to manage the queue, call patients, print tokens, record walk-ins, and inspect weekly operational reports without specialized technical maintenance.

---

## 3. Key Features

### 3.1 Differentiators & Unique Features
1. **Phone-Free Check-In**: Walk-in patients without phones can be registered from the doctor console in two clicks, immediately generating a thermal print slip containing large token numbers and tracking QR codes.
2. **"Come Later" Smart Arrival Guidance**: Displays exact suggested arrival times (e.g., *"Please reach the clinic by 11:20 AM"*) factoring in a configurable travel buffer, accompanied by an *"I have reached the clinic"* check-in button.
3. **Family/Caregiver Proxy**: Up to 3 caregivers can monitor a patient's live queue status simultaneously with automatic WhatsApp status sharing links.
4. **Senior Care Lane**: Automated detection for patients aged 60+ with configurable priority interleaving (e.g., serving 1 senior patient for every 3 general patients) and full audit transparency.
5. **Honest Wait-Time Range**: Displays realistic bounds (e.g., *"About 25 mins (could be 20–35 mins)"*) paired with live status text explaining doctor delays or emergencies.
6. **"Never Lose Your Turn" Grace Period**: Missed calls automatically trigger a 5-minute countdown grace period followed by fair re-slotting behind the next patient, plus a manual "Patient stepped out" hold function.
7. **Multilingual Voice Announcements & Chime**: Waiting-room TV display and patient web phones speak token call announcements in Kannada, English, or Hindi using Web Speech synthesis.
8. **Accessibility Profile at Token Creation**: Collects mobility, hearing, or vision needs, notifying the doctor console with visual badges and triggering phone vibration/screen flash upon turn call.
9. **Doctor-Delay Transparency**: One-tap delay presets in the doctor console (*"Emergency case"*, *"Break until 1:30 PM"*) instantly recompute wait times and notify affected patients.
10. **"Best Time to Visit" Forecast**: Historical queue density heatmaps guide walk-in patients toward less congested clinic hours.
11. **Weekly Clinical Operations Report**: Actionable analytics detailing patient volume, average waiting durations, no-show rates, and senior citizen service proportions, exportable to CSV and PDF.

### 3.2 Interfaces

#### A. Patient Side (Public, Zero Authentication)
- **Home (`/`)**: Clinic status indicator, now-serving marquee, and two oversized action buttons: **"Get my token"** and **"Check my token"**.
- **Token Creation (`/get-token`)**: 3-step streamlined flow (Name & Phone / No-Phone toggle, Age/Senior toggle, Accessibility needs, Consent notice).
- **Live Status (`/status`)**: Dynamic token badge, queue position, estimated arrival guidance, turn readiness state, *"I have reached"*, *"Leave queue"*, and *"I need help"* distress triggers.
- **TV Display Board (`/display`)**: High-contrast, 10-meter-readable display showing current token, upcoming 5 tokens, delay banners, and clinic check-in QR code.

#### B. Doctor Console (`/doctor`, Role-Guarded)
- **Queue Tab**: Active patient card, next patient preview, atomic controls (Call Next, Start, Complete, Missed, Hold, Skip, Cancel), rapid walk-in generator with thermal slip print, live draggable waiting list, and distress help alerts.
- **Reports Tab**: Operational metrics, waiting time trends, peak hour charts, and manual queue override audit trails.
- **Settings Tab**: Consultation durations, buffer times, working hours, break schedules, senior interleaving policy, and an interactive **Demo / Simulation Mode**.

---

## 4. Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend Framework** | React 18, Vite, TypeScript |
| **Styling & Components**| Tailwind CSS, shadcn/ui, Lucide Icons |
| **Internationalization**| react-i18next (English, Kannada `ಕನ್ನಡ`, Hindi `हिन्दी`) |
| **Data Visualization** | Recharts (Consultation analytics & forecasts) |
| **Application Type**   | Progressive Web App (PWA) with Service Worker offline caching |
| **Backend & Database**  | Supabase (PostgreSQL 15, Row Level Security, Triggers, RPC functions) |
| **Realtime Engine**     | Supabase Realtime (WebSocket channels for instant UI synchronization) |
| **Server Automation**   | Supabase Edge Functions (Deno/TypeScript) & pg_cron scheduled jobs |
| **External Alerts**     | Multi-channel notification pipeline (Web Speech, Web Push/Vibrate, MSG91 SMS, Twilio WhatsApp) |
| **Deployment**         | Frontend: Vercel / Netlify; Backend: Supabase Free Tier |

---

## 5. Repository Structure

```
dhanvantri-clinic/
├── .env.example              # Environment variables template
├── .gitignore                # Git exclusions
├── CHANGELOG.md              # Project change history
├── LICENSE                   # MIT Open Source License
├── README.md                 # Primary system documentation
├── docs/                     # Comprehensive architectural documentation
│   ├── assets/               # Architectural diagrams and static assets
│   ├── 01-requirements.md    # Stakeholder requirements & constraints
│   ├── 02-architecture.md    # System architecture & data flow diagrams
│   ├── 03-database-design.md # Schema, constraints, RLS & RPC specifications
│   ├── 04-ui-ux-guidelines.md# Senior-friendly design standards & wireframes
│   ├── 05-features-and-logic.md# Algorithms, wait-time math, senior policy
│   ├── 06-api-and-realtime.md# RPC endpoints, edge functions & realtime events
│   ├── 07-test-plan.md       # Comprehensive verification matrix (15+ cases)
│   ├── 08-phase-plan.md      # Phase milestone tracking checklist
│   ├── 09-user-guides.md     # Non-technical manuals for Doctor & Patients
│   └── 10-project-report-notes.md # Academic review & SDG alignment notes
├── supabase/                 # Database migrations and backend configuration
│   ├── migrations/           # SQL migration files
│   └── functions/            # Supabase Edge Functions (timers, alerts)
├── src/                      # Frontend application source code
│   ├── assets/               # Fonts, audio chimes, icons
│   ├── components/           # UI components (shadcn/ui & custom widgets)
│   │   ├── common/           # Accessibility toggles, headers, layout
│   │   ├── doctor/           # Queue management, reports, settings
│   │   └── patient/          # Token flow, status board, display board
│   ├── context/              # React Context (Auth, Language, Accessibility)
│   ├── hooks/                # Custom React hooks (Realtime, Speech, TTS)
│   ├── i18n/                 # Localization dictionaries (en, kn, hi)
│   ├── lib/                  # Supabase client, utils, notification helpers
│   ├── routes/               # Route definitions
│   ├── types/                # TypeScript data interfaces
│   ├── App.tsx               # Root component
│   └── main.tsx              # Application entrypoint
└── public/                   # Static public assets, audio, manifest.json
```

---

## 6. Setup and Installation

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm** or **pnpm**
- **Supabase CLI** (optional for local emulation) or an active Supabase cloud project

### Local Development Setup
1. **Clone the repository**:
   ```bash
   git clone https://github.com/mohands0810-debug/clinic-queue-management.git
   cd clinic-queue-management
   ```

2. **Configure Environment Variables**:
   ```bash
   cp .env.example .env
   ```
   Fill in your Supabase credentials in `.env`:
   ```env
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   VITE_CLINIC_PHONE="+91 98765 43210"
   VITE_APP_URL="http://localhost:5173"
   ```

3. **Install Dependencies**:
   ```bash
   npm install
   ```

4. **Initialize Database Migrations**:
   Run the SQL scripts in `supabase/migrations/` sequentially using the Supabase SQL Editor.

5. **Start Development Server**:
   ```bash
   npm run dev
   ```
   The application will be accessible at `http://localhost:5173`.

---

## 7. Deployment Instructions

### Frontend (Vercel / Netlify)
1. Link your GitHub repository to Vercel or Netlify.
2. Select build framework preset: **Vite**.
3. Set the build command: `npm run build` and publish directory: `dist`.
4. Configure production environment variables matching `.env.example`.

### Backend (Supabase Free Tier)
1. Deploy PostgreSQL schemas via the Supabase SQL editor or CLI migrations.
2. Deploy Supabase Edge Functions (`supabase functions deploy`).
3. Enable Realtime replication on the `tokens`, `clinic_settings`, and `help_requests` tables.

---

## 8. Interface Screenshots

*(Application screenshots will be added as frontend implementation phases complete.)*

| Screen | Preview | Description |
| :--- | :---: | :--- |
| **Patient Home** | *[Phase 4]* | High-contrast, large touch action buttons with language selector |
| **Live Token Status** | *[Phase 4]* | Real-time position, honest wait range, and "Come later" time |
| **Waiting Room TV Board** | *[Phase 6]* | High-contrast TV display with spoken announcements & QR code |
| **Doctor Console (Queue)**| *[Phase 3]* | Real-time patient flow controller, walk-in generator & help alerts |
| **Reports & Analytics** | *[Phase 6]* | Peak hour distribution, wait duration trends, and CSV export |

---

## 9. Academic Affiliation & Social Impact

This project is submitted in partial fulfillment of the requirements for the **Community Project (25BCP308)** at:
- **Institution**: K. S. Institute of Technology (KSIT), Bengaluru
- **Department**: Department of Computer Science and Engineering
- **Beneficiary**: Dhanvantri Clinic, Sandhya Theater Complex, VP Road, BTM Layout, Bengaluru (Dr Yogesh)
- **UN Sustainable Development Goals**:
  - **SDG 3 (Good Health and Well-Being)**: Minimizes cross-infection risks in congested outpatient waiting rooms and reduces clinical stress.
  - **SDG 10 (Reduced Inequalities)**: Guarantees digital healthcare inclusion for elderly, non-smartphone, and differently-abled citizens.

