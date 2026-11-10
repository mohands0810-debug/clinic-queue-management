# Supabase Cloud Setup & Database Migration Guide

## Document Details
- **Project**: Digital Queue Management System
- **Clinic**: Dhanvantri Clinic (Dr Yogesh), Sandhya Theater Complex, BTM Layout
- **Institution**: K. S. Institute of Technology, Dept. of CSE (25BCP308)
- **Document Version**: 1.0.0

---

## 1. Prerequisites & Supabase Cloud Project Creation

1. Navigate to [https://supabase.com](https://supabase.com) and sign in (or create a free account).
2. Click **"New Project"**.
3. Fill in the project details:
   - **Name**: `dhanvantri-clinic-queue`
   - **Database Password**: Set a strong, secure password (store securely; never commit).
   - **Region**: `ap-south-1 (Mumbai)` or `ap-southeast-1 (Singapore)` for lowest latency from Bengaluru.
   - **Pricing Plan**: **Free Tier** ($0/month).
4. Wait approximately 90 seconds for your PostgreSQL database to provision.

---

## 2. Configuring Local Environment Variables

1. In your Supabase Project Dashboard, navigate to **Project Settings** (gear icon) -> **API**.
2. Locate the following credentials:
   - **Project URL**: `https://<your-project-id>.supabase.co`
   - **Project API Keys**:
     - `anon` `public`: `eyJhbGciOi...`
     - `service_role` `secret`: (Keep this secret! Never paste into frontend code).
3. In your local clinic project directory, open your `.env` file (copied from `.env.example`) and paste your keys:
   ```env
   VITE_SUPABASE_URL=https://<your-project-id>.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
   VITE_CLINIC_PHONE="+91 98765 43210"
   VITE_APP_URL="http://localhost:5173"
   ```

---

## 3. Running Database Migrations

You can execute the migrations either directly in the **Supabase Dashboard SQL Editor** or via the **Supabase CLI**.

### Option A: Via Supabase Web Dashboard (Recommended)
Open your Supabase Project Dashboard -> **SQL Editor** -> **New query**, and execute the migration files sequentially:

1. **Step 1: Core Relational Schema**
   - Open and copy the contents of: [`supabase/migrations/20261110000001_initial_schema.sql`](file:///c:/Users/mohan/OneDrive/Desktop/dhanvantri-clinic/supabase/migrations/20261110000001_initial_schema.sql)
   - Paste into the SQL Editor and click **Run**.
   - *Result*: Creates tables `clinic_settings`, `staff_profiles`, `patients`, `tokens`, `token_watchers`, `help_requests`, `audit_log`, and indexes.

2. **Step 2: Sanitized Public Database View**
   - Open and copy: [`supabase/migrations/20261110000002_safe_public_view.sql`](file:///c:/Users/mohan/OneDrive/Desktop/dhanvantri-clinic/supabase/migrations/20261110000002_safe_public_view.sql)
   - Paste into the SQL Editor and click **Run**.
   - *Result*: Creates the privacy-safe `public_queue` view that produces initials (e.g., `N. M.`) and strips sensitive phone numbers.

3. **Step 3: Row Level Security (RLS) Policies**
   - Open and copy: [`supabase/migrations/20261110000003_rls_policies.sql`](file:///c:/Users/mohan/OneDrive/Desktop/dhanvantri-clinic/supabase/migrations/20261110000003_rls_policies.sql)
   - Paste into the SQL Editor and click **Run**.
   - *Result*: Enables RLS across all tables and establishes strict access barriers between anonymous patients and authenticated clinic staff.

4. **Step 4: Seed Initial Clinic Data & 12 Sample Tokens**
   - Open and copy: [`supabase/migrations/20261110000004_seed_data.sql`](file:///c:/Users/mohan/OneDrive/Desktop/dhanvantri-clinic/supabase/migrations/20261110000004_seed_data.sql)
   - Paste into the SQL Editor and click **Run**.
   - *Result*: Seeds Dr Yogesh's clinic configuration, 3 senior patient profiles, 6 general patients, and 12 sample tokens in realistic lifecycle states (`completed`, `in_progress`, `called`, `hold`, `missed`, `waiting`).

---

## 4. Testing RLS and Database Integrity

To confirm that all constraints, views, and security rules are operating correctly:

1. In the Supabase **SQL Editor**, open: [`supabase/migrations/20261110000005_test_rls.sql`](file:///c:/Users/mohan/OneDrive/Desktop/dhanvantri-clinic/supabase/migrations/20261110000005_test_rls.sql)
2. Paste the SQL script and click **Run**.
3. In the output console, verify all 5 automated assertions pass:
   ```
   NOTICE: === STARTING DATABASE VERIFICATION TESTS ===
   NOTICE: Test 1 PASSED: Clinic settings verified for Dhanvantri Clinic.
   NOTICE: Test 2 PASSED: Senior age auto-calculation verified.
   NOTICE: Test 3 PASSED: Public view computes initials correctly (Narasimha Murthy -> N. M.).
   NOTICE: Test 4 PASSED: 12 seed tokens verified across queue lifecycle.
   NOTICE: Test 5 PASSED: Unique token constraint correctly rejected duplicate token #1 on today.
   NOTICE: === ALL DATABASE & SECURITY CHECKS PASSED SUCCESSFULLY ===
   ```

---

## 5. Creating Dr Yogesh's Staff Account

To grant Dr Yogesh access to the `/doctor` console:

1. In the Supabase Dashboard, go to **Authentication** -> **Users** -> **Add user** -> **Create user**.
2. Enter:
   - **Email**: `doctor@dhanvantri.clinic` (or Dr Yogesh's preferred email)
   - **Password**: Set a secure password
   - Check **"Auto Confirm User?"** -> **Yes**.
3. Click **Create User**. Copy the generated **User UID** (UUID).
4. Go to **SQL Editor** and run the following query, replacing `'<PASTE-USER-UID-HERE>'`:
   ```sql
   INSERT INTO staff_profiles (id, full_name, role, is_active)
   VALUES (
       '<PASTE-USER-UID-HERE>',
       'Dr Yogesh',
       'doctor',
       TRUE
   ) ON CONFLICT (id) DO UPDATE SET role = 'doctor', is_active = TRUE;
   ```
5. Dr Yogesh can now log into `https://your-domain.com/doctor` with full administrative rights.

---

## 6. Enabling Realtime Replication

To guarantee sub-500ms instantaneous screen synchronization across patient phones, the TV board, and the doctor console:

1. In the Supabase Dashboard, navigate to **Database** -> **Replication**.
2. Under **Source: supabase_realtime**, click **"0 tables"** (or existing count).
3. Toggle the switches to **ON** for:
   - `tokens`
   - `clinic_settings`
   - `help_requests`
4. Click **Save**. Instant WebSocket broadcasts are now enabled for the clinic!
