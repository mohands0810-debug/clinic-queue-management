// Database and Queue Type Definitions

export type DoctorStatus = 'available' | 'break' | 'emergency' | 'off_duty';

export type TokenStatus = 
  | 'waiting' 
  | 'called' 
  | 'in_progress' 
  | 'hold' 
  | 'missed' 
  | 'completed' 
  | 'cancelled';

export type TokenSource = 'qr' | 'doctor_desk' | 'phone';

export type UserRole = 'doctor' | 'helper';

export type AccessibilityNeed = 'wheelchair' | 'hearing' | 'vision' | 'assistance';

export interface ClinicSettings {
  id: string;
  clinic_name: string;
  doctor_name: string;
  address: string;
  phone_number: string;
  default_consultation_mins: number;
  buffer_mins: number;
  grace_period_mins: number;
  senior_interleave_ratio: number;
  max_daily_tokens: number;
  morning_start: string;
  morning_end: string;
  evening_start: string;
  evening_end: string;
  doctor_status: DoctorStatus;
  delay_reason: string | null;
  delay_until: string | null;
  simulation_mode: boolean;
  updated_at: string;
}

export interface StaffProfile {
  id: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
}

export interface Patient {
  id: string;
  full_name: string;
  phone: string | null;
  age: number;
  is_senior: boolean;
  accessibility_needs: AccessibilityNeed[];
  created_at: string;
}

export interface Token {
  id: string;
  token_number: number;
  queue_date: string;
  patient_id: string;
  doctor_id: string | null;
  status: TokenStatus;
  is_priority: boolean;
  source: TokenSource;
  arrived_at_clinic: boolean;
  arrived_at: string | null;
  come_by_time: string | null;
  hold_until: string | null;
  missed_count: number;
  position_override: number | null;
  session_secret: string;
  created_at: string;
  called_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  patient?: Patient;
}

export interface PublicQueueItem {
  token_id: string;
  token_number: number;
  queue_date: string;
  status: TokenStatus;
  is_priority: boolean;
  arrived_at_clinic: boolean;
  come_by_time: string | null;
  position_override: number | null;
  created_at: string;
  called_at: string | null;
  patient_initials: string;
  is_senior: boolean;
  accessibility_needs: AccessibilityNeed[];
}

export interface HelpRequest {
  id: string;
  token_id: string;
  status: 'pending' | 'acknowledged' | 'resolved';
  reason: string;
  created_at: string;
  resolved_at: string | null;
}

export interface AuditLogItem {
  id: string;
  token_id: string | null;
  actor_id: string | null;
  action: string;
  previous_state: Record<string, unknown> | null;
  new_state: Record<string, unknown> | null;
  reason: string | null;
  created_at: string;
}

