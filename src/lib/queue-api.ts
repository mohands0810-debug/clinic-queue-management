import { supabase } from '@/lib/supabase';
import { AccessibilityNeed, TokenStatus } from '@/types/database';

export interface CreateTokenParams {
  fullName: string;
  phone?: string | null;
  age: number;
  accessibility?: AccessibilityNeed[];
  source?: 'qr' | 'doctor_desk' | 'phone';
}

export interface CreateTokenResult {
  token_id: string;
  token_number: number;
  queue_date: string;
  status: TokenStatus;
  is_priority: boolean;
  is_senior: boolean;
  session_secret: string;
  estimated_wait_mins: number;
  come_by_time: string | null;
  arrived_at_clinic: boolean;
}

export interface CallNextResult {
  success: boolean;
  token_id?: string;
  token_number?: number;
  patient_name?: string;
  is_senior?: boolean;
  accessibility_needs?: AccessibilityNeed[];
  status?: string;
  called_at?: string;
  message?: string;
}

export interface WaitEstimateResult {
  token_id: string;
  token_number: number;
  patients_ahead: number;
  estimated_mins: number;
  range_min: number;
  range_max: number;
  delay_mins: number;
  delay_note: string | null;
  come_by_time: string | null;
}

/**
 * Invokes atomic create_token RPC function.
 * Serializes daily sequence using PostgreSQL transaction advisory lock.
 */
export async function createTokenRPC(params: CreateTokenParams): Promise<CreateTokenResult> {
  const { data, error } = await supabase.rpc('create_token', {
    p_full_name: params.fullName.trim(),
    p_phone: params.phone ? params.phone.trim() : null,
    p_age: params.age,
    p_accessibility: params.accessibility || [],
    p_source: params.source || 'phone',
  });

  if (error) {
    throw new Error(error.message || 'Failed to generate token');
  }

  return data as CreateTokenResult;
}

/**
 * Invokes atomic call_next RPC function.
 * Implements Senior Fair Interleaving (default 3:1 ratio).
 */
export async function callNextRPC(doctorId?: string): Promise<CallNextResult> {
  const { data, error } = await supabase.rpc('call_next', {
    p_doctor_id: doctorId || null,
  });

  if (error) {
    throw new Error(error.message || 'Failed to call next patient');
  }

  return data as CallNextResult;
}

/**
 * Transitions token from 'called' to 'in_progress'.
 */
export async function startConsultationRPC(tokenId: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('start_consultation', {
    p_token_id: tokenId,
  });

  if (error) {
    throw new Error(error.message || 'Failed to start consultation');
  }

  return !!data;
}

/**
 * Concludes consultation and calculates duration in minutes.
 */
export async function completeConsultationRPC(tokenId: string): Promise<{
  token_id: string;
  duration_mins: number;
  completed_at: string;
}> {
  const { data, error } = await supabase.rpc('complete_consultation', {
    p_token_id: tokenId,
  });

  if (error) {
    throw new Error(error.message || 'Failed to complete consultation');
  }

  return data;
}

/**
 * Marks token as missed and activates 5-minute countdown grace period.
 */
export async function markMissedRPC(tokenId: string): Promise<{
  token_id: string;
  status: string;
  grace_until: string;
  missed_count: number;
}> {
  const { data, error } = await supabase.rpc('mark_missed', {
    p_token_id: tokenId,
  });

  if (error) {
    throw new Error(error.message || 'Failed to mark missed turn');
  }

  return data;
}

/**
 * Temporarily freezes turn for patient who stepped out.
 */
export async function holdTurnRPC(tokenId: string, holdMins: number = 10): Promise<boolean> {
  const { data, error } = await supabase.rpc('hold_turn', {
    p_token_id: tokenId,
    p_hold_mins: holdMins,
  });

  if (error) {
    throw new Error(error.message || 'Failed to hold turn');
  }

  return !!data;
}

/**
 * Updates positions for an array of token UUIDs with audit justification.
 */
export async function reorderQueueRPC(tokenIds: string[], reason: string = 'Manual override'): Promise<boolean> {
  const { data, error } = await supabase.rpc('reorder_queue', {
    p_token_ids: tokenIds,
    p_reason: reason,
  });

  if (error) {
    throw new Error(error.message || 'Failed to reorder queue');
  }

  return !!data;
}

/**
 * Computes dynamic wait duration using rolling mean and standard deviation.
 */
export async function computeWaitEstimateRPC(tokenId: string): Promise<WaitEstimateResult> {
  const { data, error } = await supabase.rpc('compute_wait_estimate', {
    p_token_id: tokenId,
  });

  if (error) {
    throw new Error(error.message || 'Failed to compute wait estimate');
  }

  return data as WaitEstimateResult;
}

