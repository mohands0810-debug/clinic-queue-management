-- 20261110000010_create_doctor_account.sql
-- Create Dr Yogesh's authenticated staff profile in Supabase Auth
-- Email: doctor@dhanvantri.clinic
-- Password: Doctor@123

DO $$
DECLARE
  v_user_id UUID;
  v_encrypted_pw TEXT;
BEGIN
  -- Check if user already exists in auth.users
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'doctor@dhanvantri.clinic';
  
  IF v_user_id IS NULL THEN
    v_user_id := gen_random_uuid();
    v_encrypted_pw := crypt('Doctor@123', gen_salt('bf'));

    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      v_user_id,
      'authenticated',
      'authenticated',
      'doctor@dhanvantri.clinic',
      v_encrypted_pw,
      NOW(),
      '{"provider":"email","providers":["email"]}',
      '{"full_name":"Dr Yogesh"}',
      NOW(),
      NOW()
    );
  ELSE
    -- If already exists, update password to Doctor@123
    UPDATE auth.users
    SET encrypted_password = crypt('Doctor@123', gen_salt('bf')),
        email_confirmed_at = COALESCE(email_confirmed_at, NOW())
    WHERE id = v_user_id;
  END IF;

  -- Link with staff_profiles table with 'doctor' role
  INSERT INTO staff_profiles (id, full_name, role, is_active)
  VALUES (v_user_id, 'Dr Yogesh', 'doctor', TRUE)
  ON CONFLICT (id) DO UPDATE
  SET full_name = 'Dr Yogesh',
      role = 'doctor',
      is_active = TRUE;

  RAISE NOTICE 'Staff account created successfully: doctor@dhanvantri.clinic';
END $$;

