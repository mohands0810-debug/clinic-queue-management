# Academic Project Report Notes & Review Presentation Guide

## Project Identification
- **Project Title**: Digital Queue Management System for Outpatient Healthcare
- **Course**: Community Project (25BCP308)
- **Institution**: K. S. Institute of Technology (KSIT), Bengaluru
- **Department**: Department of Computer Science & Engineering
- **Target Beneficiary**: Dhanvantri Clinic (Dr Yogesh), Sandhya Theater Complex, VP Road, BTM Layout, Bengaluru
- **Document Version**: 1.0.0

---

## 1. Problem Statement
Dhanvantri Clinic operates as a high-density, single-doctor outpatient clinic in BTM Layout. Patients face a lack of transparency regarding queue positioning, waiting times, and clinical emergencies. This causes severe lobby crowding, heightened risk of cross-infection in enclosed spaces, and repeated disruptions to Dr Yogesh during medical examinations. Existing virtual queue systems enforce app downloads, phone logins, or OTP gates, which alienate elderly and non-digitally literate patients.

---

## 2. Project Objectives
1. **Zero-Friction Token Generation**: Provide a 3-step digital queue enrollment accessible via mobile web, entrance QR scan, or helper desk registration without app installation or OTP verification.
2. **Dynamic Wait Estimation**: Deliver honest wait-time ranges combining a rolling mean of recent consultations, variance bounds, and doctor-delay broadcasting to minimize enquiry interruptions by >70%.
3. **Senior-Centric Accessibility**: Implement an inclusive UI/UX standard (base font 20–28px, 56px touch targets, WCAG AAA high contrast, tri-lingual voice synthesis in Kannada, English, and Hindi).
4. **Resilient Clinical Operations**: Equip clinic staff with an atomic queue progression console, thermal slip printing, distress alert reception, and weekly operational analytics with zero cloud subscription overhead.

---

## 3. Existing Solutions vs. Proposed Solution (Gap Analysis)

| Feature | Physical Paper Tokens | Commercial Hospital Apps (e.g. Practo) | Basic QR Virtual Queues | **Dhanvantri Clinic System (Proposed)** |
| :--- | :--- | :--- | :--- | :--- |
| **Elderly Usability** | High (Paper) | Low (Complex UI, OTPs) | Moderate | **High (Oversized UI, Kannada Voice, Slip option)** |
| **Wait Time Range** | None | Fixed Time Slots Only | Static Average | **Dynamic Rolling Mean + Variance ($\pm \sigma$)** |
| **Arrival Guidance** | None | Fixed Appointment | None | **"Come Later" minus Transit Buffer** |
| **Senior Priority** | Manual argument | None | None | **Configurable Fair Interleaving (3:1)** |
| **Missed Call Recovery** | Lost turn | Re-book next day | Cancelled | **5-Min Grace Period + Auto Re-Slotting** |
| **Language Inclusivity**| None | English Only | English / Hindi | **Native Kannada, English, Hindi Audio & UI** |
| **Cost to Clinic** | Paper stationery | High SaaS Monthly Fee | Paid Tier | **Zero Cost (Supabase Free Tier + Open Source)** |

---

## 4. Methodological Approach
1. **Ethnographic Field Study & Requirement Gathering**: Observed patient flow and physical lobby constraints at Dhanvantri Clinic, Sandhya Theater Complex.
2. **Senior-First UX Engineering**: Designed touch interfaces adhering to W3C WAI Guidelines, targeting motor and visual limitations common in 60+ demographics.
3. **Event-Driven Reactive Architecture**: Implemented PostgreSQL logical replication (WAL) via Supabase Realtime to push sub-500ms updates to waiting-room TV and mobile clients simultaneously.
4. **Mathematical Modeling for Wait Variance**: Derived rolling average algorithms with standard deviation bounding to prevent false precision in wait estimates.

---

## 5. Technology Stack & Toolchain
- **Frontend**: React 18, Vite, TypeScript, Tailwind CSS, shadcn/ui, Lucide Icons, Recharts.
- **Audio & Accessibility Engine**: Web Speech API (`kn-IN`, `en-IN`, `hi-IN`), Web Vibration API.
- **Backend & Relational Persistence**: Supabase, PostgreSQL 15, Row Level Security (RLS), Postgres Functions (PL/pgSQL).
- **Background Automation**: Supabase Edge Functions (Deno), `pg_cron`.
- **Infrastructure & Hosting**: Netlify / Vercel Edge Network, Supabase Cloud Free Tier.

---

## 6. Measurable Project Results (Evaluation Metrics)

### Quantitative Metrics
- **Queue Progress Synchronization Latency**: Target $< 500\text{ ms}$ between doctor console advance and TV/mobile notification.
- **Lobby Enquiries Reduction**: Target $> 75\%$ reduction in patient door-knocks inquiring about remaining wait times.
- **Token Creation Speed**: Under $45\text{ seconds}$ for elderly walk-in or mobile self-service.
- **Lighthouse Performance Score**: Minimum 95+ in Accessibility, 90+ in Performance on 3G mobile devices.

### Qualitative Metrics
- Patient satisfaction across elderly cohort evaluated through post-consultation Likert surveys.
- Dr Yogesh's workflow satisfaction regarding uninterrupted consultations and ease of walk-in ticketing.

---

## 7. United Nations Sustainable Development Goals (SDG Alignment)

- **SDG 3: Good Health and Well-Being (Target 3.8)**:
  *Justification*: Reduces crowded waiting-room congregation, mitigating airborne cross-infections and improving clinical stress levels for both patients and healthcare providers.
- **SDG 10: Reduced Inequalities (Target 10.2)**:
  *Justification*: Eliminates digital exclusion in public health by providing a zero-app, phone-free, high-contrast, Kannada-vocalized queue system accessible to underprivileged and elderly citizens.

---

## 8. Sustainability & Handover Strategy
- **Zero-Cost Operation**: The software runs comfortably within Supabase and Vercel free tier allowances (up to 500MB DB storage and 50,000 monthly active users; Dhanvantri Clinic handles ~60–100 patients/day).
- **Clinic Autonomy**: Non-technical staff guides enable Dr Yogesh or a clinic helper to independently manage queue settings, print slips, and troubleshoot without engineering intervention.
- **Open Source Licensing**: Released under the MIT License on GitHub, enabling other single-doctor community clinics across Karnataka to replicate the system.

---

## 9. Future Scope
1. **Multi-Doctor Clinic Scaling**: Activation of the nullable `doctor_id` schema to support multi-specialty community health centers.
2. **Digital Prescription Integration**: Optional secure prescription delivery directly to the patient's token session upon consultation completion.
3. **Primary Health Center (PHC) & Referral Network**: Connecting outpatient clinic queues to local government hospitals and diagnostic labs across Bengaluru.
