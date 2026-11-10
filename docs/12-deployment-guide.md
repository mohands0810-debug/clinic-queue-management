# Dhanvantri Clinic Queue Management System — Production Deployment Guide

**Institution:** KSIT, Dept. of Computer Science & Engineering  
**Project:** Community Project 25BCP308  
**Client Clinic:** Dhanvantri Clinic (Dr Yogesh), Sandhya Theater Complex, VP Road, BTM Layout, Bengaluru  
**Live Repository:** [mohands0810-debug/clinic-queue-management](https://github.com/mohands0810-debug/clinic-queue-management)

---

## 1. System Architecture Overview

```
                      +---------------------------------------+
                      |       Dhanvantri Clinic Clients       |
                      |  - Patient Smartphone (/get-token)    |
                      |  - Waiting Room TV (/display)         |
                      |  - Doctor Console Desk (/doctor)      |
                      +-------------------+-------------------+
                                          |
                                          | HTTPS / WSS
                                          v
                      +---------------------------------------+
                      |     Cloud Hosting (Vercel / Netlify)  |
                      |  - Vite React 18 SPA + Tailwind CSS   |
                      |  - Workbox Service Worker PWA Cache   |
                      |  - Multilingual Engine (en/kn/hi)     |
                      +-------------------+-------------------+
                                          |
                                          | PostgREST / Realtime
                                          v
                      +---------------------------------------+
                      |        Supabase Cloud Backend         |
                      |  - PostgreSQL with RLS Policies       |
                      |  - Advisory Lock Atomic RPC Functions |
                      |  - WebSocket Realtime Replication     |
                      |  - Immutable Audit Log Triggers       |
                      +---------------------------------------+
```

---

## 2. Prerequisites & Environment Variables

To deploy to production, prepare the following environment keys:

| Environment Variable | Description | Example / Production Value |
|----------------------|-------------|----------------------------|
| `VITE_SUPABASE_URL` | Supabase Project REST Endpoint | `https://npgnnbquqehaqzhxvhss.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Public Anon / Publishable Client Key | `sb_publishable_...` or legacy JWT `eyJ...` |
| `VITE_CLINIC_PHONE` | Clinic Reception Contact Phone | `+91 98765 43210` |
| `VITE_APP_URL` | Canonical Production Domain URL | `https://dhanvantri-clinic.vercel.app` |

---

## 3. Production Deployment on Vercel (Recommended)

Vercel provides zero-configuration deployment with global Edge CDN caching and automatic SPA rewrite handling.

### Step 3.1: Connect GitHub Repository
1. Log in to [Vercel Dashboard](https://vercel.com).
2. Click **Add New Project** → **Import Git Repository**.
3. Select `clinic-queue-management` from your GitHub account.

### Step 3.2: Configure Build Settings
- **Framework Preset**: Vite
- **Root Directory**: `./`
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Install Command**: `npm install`

### Step 3.3: Add Environment Variables
Under the **Environment Variables** section, add:
- `VITE_SUPABASE_URL`: `https://npgnnbquqehaqzhxvhss.supabase.co`
- `VITE_SUPABASE_ANON_KEY`: `sb_publishable_3GZgAisiBB-Su5UViN_hsQ_61uKUcTB`
- `VITE_CLINIC_PHONE`: `+91 98765 43210`
- `VITE_APP_URL`: `https://your-vercel-domain.vercel.app`

### Step 3.4: Configure SPA Routing Rewrite (`vercel.json`)
The repository includes standard routing support. If needed, create `vercel.json` in the root:
```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

Click **Deploy**. Your clinic application will be live in ~45 seconds.

---

## 4. Alternative: Deployment on Netlify

1. In [Netlify Dashboard](https://app.netlify.com), click **Add new site** → **Import an existing project**.
2. Connect to `mohands0810-debug/clinic-queue-management`.
3. Set Build Settings:
   - Build command: `npm run build`
   - Publish directory: `dist`
4. Add Environment Variables under **Site configuration** → **Environment variables**.
5. Add `_redirects` file in `public/_redirects`:
   ```
   /*    /index.html   200
   ```
6. Click **Deploy site**.

---

## 5. Supabase Production Security Checklist

Before official clinic launch, verify all database safeguards:

### 1. Row Level Security (RLS) Active
Ensure all tables have RLS enabled:
```sql
SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';
```
*Expected: `tokens`, `clinic_settings`, `patients`, `staff_profiles`, `help_requests`, `audit_log` must all return `rowsecurity = true`.*

### 2. Realtime WebSocket Publication
Verify realtime replication is listening:
```sql
SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';
```
*Expected: `tokens`, `clinic_settings`, and `help_requests` must be listed.*

### 3. Doctor Account Credentials
Ensure Dr Yogesh's doctor account exists in Supabase Auth and has an active profile:
```sql
SELECT * FROM staff_profiles WHERE role = 'doctor';
```

---

## 6. Clinic Hardware Setup (Dr Yogesh's Clinic)

### 6.1 Waiting Room TV Screen Setup
1. Mount a Smart TV or connect an inexpensive HDMI Mini PC / Chromecast / Raspberry Pi behind the TV screen.
2. Open Chrome or Chromium in kiosk mode:
   ```bash
   google-chrome --kiosk "https://your-domain.vercel.app/display" --autoplay-policy=no-user-gesture-required
   ```
3. Set the system display audio to connected speakers for the bilingual voice chimes (Kannada + English).

### 6.2 Reception Desk Thermal Slip Printer (58mm / 80mm)
1. Connect thermal receipt printer via USB or Bluetooth.
2. In Chrome settings on the desk computer:
   - Navigate to **Settings** → **Privacy and Security** → **Site Settings** → **Pop-ups and redirects** → Allow for clinic URL.
   - For silent auto-printing without print prompt dialog:
     Start Chrome with the flag `--kiosk-printing`:
     ```bash
     chrome.exe --kiosk-printing "https://your-domain.vercel.app/doctor"
     ```
3. Paper width: set driver default to 58mm or 80mm receipt paper. The CSS `@media print` rules format the slip with QR code automatically.

### 6.3 Patient Smartphone PWA Installation
- **Android (Chrome)**: Tap the 3-dot menu → **Add to Home screen** / **Install app**.
- **iOS (Safari)**: Tap the Share button → **Add to Home Screen**.
- No Google Play or Apple App Store account required.

---

## 7. Emergency Offline Contingency Plan

If internet connectivity drops at the clinic:
1. The Workbox Service Worker serves the cached application shell instantly.
2. The desk staff can switch to the local manual backup log sheets pre-printed in `docs/09-user-guides.md`.
3. Once internet reconnects, all pending local events sync back with Supabase.
