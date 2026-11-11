import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { ClinicSettings } from '@/types/database';
import { CheckCircle, AlertCircle, Lock, Trash2, RefreshCw } from 'lucide-react';

interface SettingsTabProps {
  settings: ClinicSettings | null;
  isDoctor: boolean;
  onSaved: () => void;
}

type FormState = {
  morning_start: string;
  morning_end: string;
  evening_start: string;
  evening_end: string;
  default_consultation_mins: number;
  buffer_mins: number;
  grace_period_mins: number;
  senior_interleave_ratio: number;
  simulation_mode: boolean;
  max_daily_tokens: number;
};

const DEFAULT_FORM: FormState = {
  morning_start: '09:00',
  morning_end: '13:00',
  evening_start: '17:00',
  evening_end: '21:00',
  default_consultation_mins: 8,
  buffer_mins: 2,
  grace_period_mins: 5,
  senior_interleave_ratio: 3,
  simulation_mode: false,
  max_daily_tokens: 60,
};

function settingsToForm(s: ClinicSettings): FormState {
  return {
    morning_start: s.morning_start,
    morning_end: s.morning_end,
    evening_start: s.evening_start,
    evening_end: s.evening_end,
    default_consultation_mins: s.default_consultation_mins,
    buffer_mins: s.buffer_mins,
    grace_period_mins: s.grace_period_mins,
    senior_interleave_ratio: s.senior_interleave_ratio,
    simulation_mode: s.simulation_mode,
    max_daily_tokens: s.max_daily_tokens,
  };
}

export const SettingsTab: React.FC<SettingsTabProps> = ({
  settings,
  isDoctor,
  onSaved,
}) => {
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [resetSuccess, setResetSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (settings) setForm(settingsToForm(settings));
  }, [settings]);

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    if (!settings?.id) return;
    setSaving(true);
    setError(null);
    setSaveSuccess(false);

    const { error: err } = await supabase
      .from('clinic_settings')
      .update({
        morning_start: form.morning_start,
        morning_end: form.morning_end,
        evening_start: form.evening_start,
        evening_end: form.evening_end,
        default_consultation_mins: form.default_consultation_mins,
        buffer_mins: form.buffer_mins,
        grace_period_mins: form.grace_period_mins,
        senior_interleave_ratio: form.senior_interleave_ratio,
        simulation_mode: form.simulation_mode,
        max_daily_tokens: form.max_daily_tokens,
        updated_at: new Date().toISOString(),
      })
      .eq('id', settings.id);

    setSaving(false);

    if (err) {
      setError(err.message);
    } else {
      setSaveSuccess(true);
      onSaved();
      setTimeout(() => setSaveSuccess(false), 3000);
    }
  };

  const handleResetDemoData = async () => {
    const confirmed = window.confirm(
      '⚠️ RESET QUEUE FOR FRESH DEMO?\n\nThis will wipe all active tokens, patients, and waiting lines so your next token starts fresh from #1.\n\nAre you sure you want to proceed?'
    );
    if (!confirmed) return;

    setResetting(true);
    setError(null);
    setResetSuccess(null);

    try {
      const { data, error: rpcErr } = await supabase.rpc('reset_demo_data');
      if (rpcErr) throw rpcErr;
      setResetSuccess(typeof data === 'string' ? data : 'Queue wiped cleanly! Ready for Token #1.');
      onSaved();
      setTimeout(() => setResetSuccess(null), 5000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to reset queue data');
    } finally {
      setResetting(false);
    }
  };

  // ── Helper renderers ────────────────────────────────────────────────────

  const TimeInput = ({
    label,
    fieldKey,
  }: {
    label: string;
    fieldKey: 'morning_start' | 'morning_end' | 'evening_start' | 'evening_end';
  }) => (
    <div className="space-y-1">
      <label className="text-xs font-bold text-muted-foreground uppercase">{label}</label>
      <input
        type="time"
        value={form[fieldKey]}
        onChange={(e) => setField(fieldKey, e.target.value)}
        className="h-12 px-3 border rounded-xl bg-background font-medium text-base w-full focus:ring-2 focus:ring-primary focus:outline-none"
      />
    </div>
  );

  const NumberInput = ({
    label,
    fieldKey,
    min,
    max,
    helper,
  }: {
    label: string;
    fieldKey: keyof Omit<FormState, 'morning_start' | 'morning_end' | 'evening_start' | 'evening_end' | 'simulation_mode'>;
    min: number;
    max: number;
    helper?: string;
  }) => (
    <div className="space-y-1">
      <label className="text-xs font-bold text-muted-foreground uppercase">{label}</label>
      <input
        type="number"
        value={form[fieldKey] as number}
        min={min}
        max={max}
        onChange={(e) => setField(fieldKey, parseInt(e.target.value, 10) || min)}
        className="h-12 px-3 border rounded-xl bg-background font-medium text-base w-full focus:ring-2 focus:ring-primary focus:outline-none"
      />
      {helper && <p className="text-xs text-muted-foreground">{helper}</p>}
    </div>
  );

  return (
    <div className="space-y-6 max-w-2xl">
      {/* ── Guard Banner ───────────────────────────────────────────────── */}
      {!isDoctor && (
        <div className="bg-amber-50 border border-amber-300 text-amber-900 rounded-2xl p-4 font-bold flex items-start gap-3">
          <Lock className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>
            <div className="text-base">🔒 Doctor Access Only</div>
            <div className="font-normal text-sm mt-0.5">
              Settings can only be modified by Dr Yogesh (Doctor role). Sign in with doctor
              credentials to edit.
            </div>
          </div>
        </div>
      )}

      {/* ── Full form (doctor only) ────────────────────────────────────── */}
      {isDoctor && (
        <>
          {/* Success Banner */}
          {saveSuccess && (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-800 font-bold flex items-center gap-2">
              <CheckCircle className="w-5 h-5 flex-shrink-0" />
              Settings saved successfully!
            </div>
          )}

          {/* Error Banner */}
          {error && (
            <div className="p-4 rounded-2xl bg-destructive/10 border border-destructive/30 text-destructive font-bold flex items-center gap-2">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Section 1: Operating Hours */}
          <div className="border rounded-2xl p-5 space-y-4">
            <h3 className="font-black text-foreground text-base">Operating Hours</h3>
            <div className="grid grid-cols-2 gap-4">
              <TimeInput label="Morning Start" fieldKey="morning_start" />
              <TimeInput label="Morning End" fieldKey="morning_end" />
              <TimeInput label="Evening Start" fieldKey="evening_start" />
              <TimeInput label="Evening End" fieldKey="evening_end" />
            </div>
          </div>

          {/* Section 2: Queue Timing */}
          <div className="border rounded-2xl p-5 space-y-4">
            <h3 className="font-black text-foreground text-base">Queue Timing</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <NumberInput
                label="Default Consultation (mins)"
                fieldKey="default_consultation_mins"
                min={3}
                max={60}
              />
              <NumberInput
                label="Buffer Time (mins)"
                fieldKey="buffer_mins"
                min={0}
                max={60}
                helper="Extra time per session for cleanup"
              />
              <NumberInput
                label="Grace Period (mins)"
                fieldKey="grace_period_mins"
                min={1}
                max={30}
                helper="How long to wait before marking Missed"
              />
              <NumberInput
                label="Senior Interleave Ratio"
                fieldKey="senior_interleave_ratio"
                min={1}
                max={10}
                helper="Call 1 senior after every N general patients"
              />
            </div>
          </div>

          {/* Section 3: Advanced */}
          <div className="border rounded-2xl p-5 space-y-4">
            <h3 className="font-black text-foreground text-base">Advanced</h3>

            {/* Simulation Mode Toggle */}
            <div
              className={`rounded-xl p-4 border ${
                form.simulation_mode
                  ? 'bg-amber-50 border-amber-300'
                  : 'bg-background border-border'
              }`}
            >
              <label className="flex items-center gap-4 cursor-pointer select-none">
                {/* Toggle track */}
                <div className="relative flex-shrink-0">
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={form.simulation_mode}
                    onChange={(e) => setField('simulation_mode', e.target.checked)}
                  />
                  <div
                    className={`w-14 h-8 rounded-full transition-colors ${
                      form.simulation_mode ? 'bg-amber-500' : 'bg-muted'
                    }`}
                  />
                  <div
                    className={`absolute top-1 w-6 h-6 rounded-full bg-white shadow transition-transform ${
                      form.simulation_mode ? 'translate-x-7' : 'translate-x-1'
                    }`}
                  />
                </div>
                <div>
                  <div className="font-bold text-sm">Simulation Mode</div>
                  <div className="text-xs text-muted-foreground">
                    Disables real scheduling; for testing only.
                  </div>
                </div>
              </label>
            </div>

            <NumberInput
              label="Max Daily Tokens"
              fieldKey="max_daily_tokens"
              min={10}
              max={300}
            />
          </div>

          {/* Save Button */}
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full h-12 bg-primary text-primary-foreground font-bold rounded-xl hover:opacity-90 disabled:opacity-60 transition-opacity"
          >
            {saving ? 'Saving…' : 'Save Settings'}
          </button>

          {/* Reset Demo Data Card */}
          <div className="border border-destructive/30 rounded-2xl p-5 bg-destructive/5 space-y-3 mt-8">
            <div className="flex items-center gap-2 text-destructive font-black text-base">
              <Trash2 className="w-5 h-5 flex-shrink-0" />
              <span>Danger Zone • Fresh Demo Wipe</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Use this before presenting your demo or viva. It clears all registered patients, active queue lines, and consultation records so that your very next registration starts from <strong>Token #1</strong>.
            </p>
            {resetSuccess && (
              <div className="p-3 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200 text-xs font-bold rounded-xl flex items-center gap-2">
                <CheckCircle className="w-4 h-4 flex-shrink-0" />
                <span>{resetSuccess}</span>
              </div>
            )}
            <button
              onClick={handleResetDemoData}
              disabled={resetting}
              className="w-full h-11 border-2 border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground font-bold text-sm rounded-xl transition-all flex items-center justify-center gap-2"
            >
              {resetting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Wiping Queue Records...</span>
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4" />
                  <span>Wipe All Records (Start Fresh from Token #1)</span>
                </>
              )}
            </button>
          </div>
        </>
      )}
    </div>
  );
};
