import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { 
  callNextRPC, 
  startConsultationRPC, 
  completeConsultationRPC, 
  markMissedRPC, 
  holdTurnRPC, 
  createTokenRPC 
} from '@/lib/queue-api';
import { Token, ClinicSettings } from '@/types/database';
import { 
  Users, 
  BarChart3, 
  Settings as SettingsIcon, 
  Plus, 
  Printer, 
  LogOut, 
  Lock,
  LogIn,
  AlertCircle
} from 'lucide-react';

export const DoctorPage: React.FC = () => {
  const { t } = useTranslation();
  const { user, profile, isDoctor, signIn, signOut } = useAuth();

  // Authentication dialog state
  const [showLoginModal, setShowLoginModal] = useState<boolean>(false);
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [authLoading, setAuthLoading] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Active tab & queue state
  const [activeTab, setActiveTab] = useState<'queue' | 'reports' | 'settings'>('queue');
  const [tokens, setTokens] = useState<Token[]>([]);
  const [settings, setSettings] = useState<ClinicSettings | null>(null);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Walk-in form states
  const [walkInName, setWalkInName] = useState<string>('');
  const [walkInAge, setWalkInAge] = useState<string>('');
  const [walkInSenior, setWalkInSenior] = useState<boolean>(false);

  useEffect(() => {
    fetchConsoleData();

    // Subscribe to realtime tokens changes
    const channel = supabase
      .channel('doctor-console-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tokens' }, () => {
        fetchConsoleData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'clinic_settings' }, (p) => {
        setSettings(p.new as ClinicSettings);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchConsoleData = async () => {
    const today = new Date().toISOString().split('T')[0];
    const { data: tokenData } = await supabase
      .from('tokens')
      .select('*, patient:patients(*)')
      .eq('queue_date', today)
      .order('token_number', { ascending: true });

    if (tokenData) setTokens(tokenData as Token[]);

    const { data: settingsData } = await supabase
      .from('clinic_settings')
      .select('*')
      .limit(1)
      .maybeSingle();

    if (settingsData) setSettings(settingsData as ClinicSettings);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError(null);

    const { error } = await signIn(email, password);
    if (error) {
      setAuthError(error.message);
    } else {
      setShowLoginModal(false);
    }
    setAuthLoading(false);
  };

  // RPC Actions
  const handleCallNext = async () => {
    setActionLoading(true);
    setActionError(null);
    try {
      await callNextRPC(user?.id);
      await fetchConsoleData();
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Error calling next patient');
    } finally {
      setActionLoading(false);
    }
  };

  const handleStart = async (tokenId: string) => {
    setActionLoading(true);
    setActionError(null);
    try {
      await startConsultationRPC(tokenId);
      await fetchConsoleData();
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Error starting consultation');
    } finally {
      setActionLoading(false);
    }
  };

  const handleComplete = async (tokenId: string) => {
    setActionLoading(true);
    setActionError(null);
    try {
      await completeConsultationRPC(tokenId);
      await fetchConsoleData();
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Error completing consultation');
    } finally {
      setActionLoading(false);
    }
  };

  const handleHold = async (tokenId: string) => {
    setActionLoading(true);
    setActionError(null);
    try {
      await holdTurnRPC(tokenId, 10);
      await fetchConsoleData();
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Error holding turn');
    } finally {
      setActionLoading(false);
    }
  };

  const handleMissed = async (tokenId: string) => {
    setActionLoading(true);
    setActionError(null);
    try {
      await markMissedRPC(tokenId);
      await fetchConsoleData();
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Error marking missed turn');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddWalkIn = async () => {
    if (!walkInName.trim()) return;
    const ageNum = parseInt(walkInAge, 10) || 30;
    setActionLoading(true);
    setActionError(null);
    try {
      await createTokenRPC({
        fullName: walkInName.trim(),
        age: ageNum,
        accessibility: [],
        source: 'doctor_desk',
      });
      setWalkInName('');
      setWalkInAge('');
      setWalkInSenior(false);
      await fetchConsoleData();
      window.print(); // Print thermal receipt slip
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Error adding walk-in patient');
    } finally {
      setActionLoading(false);
    }
  };

  const activePatient = tokens.find((t) => t.status === 'in_progress' || t.status === 'called');
  const waitingPatients = tokens.filter((t) => t.status === 'waiting' || t.status === 'hold');

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Top Console Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-foreground flex items-center gap-2">
            <Lock className="w-6 h-6 text-primary" />
            <span>{t('doctor.title')}</span>
          </h1>
          <p className="text-sm text-muted-foreground font-medium">
            {settings?.clinic_name || 'Dhanvantri Clinic'} • {settings?.doctor_name || 'Dr Yogesh'}
          </p>
        </div>

        {/* Console Tabs */}
        <div className="flex rounded-xl border bg-muted p-1">
          <button
            onClick={() => setActiveTab('queue')}
            className={`px-4 py-2 rounded-lg font-bold flex items-center gap-2 text-sm md:text-base transition-colors ${
              activeTab === 'queue' ? 'bg-primary text-primary-foreground' : 'text-foreground'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>{t('doctor.queueTab')}</span>
          </button>
          <button
            onClick={() => setActiveTab('reports')}
            className={`px-4 py-2 rounded-lg font-bold flex items-center gap-2 text-sm md:text-base transition-colors ${
              activeTab === 'reports' ? 'bg-primary text-primary-foreground' : 'text-foreground'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>{t('doctor.reportsTab')}</span>
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`px-4 py-2 rounded-lg font-bold flex items-center gap-2 text-sm md:text-base transition-colors ${
              activeTab === 'settings' ? 'bg-primary text-primary-foreground' : 'text-foreground'
            }`}
          >
            <SettingsIcon className="w-4 h-4" />
            <span>{t('doctor.settingsTab')}</span>
          </button>
        </div>

        {user ? (
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded bg-emerald-100 text-emerald-800 text-xs font-bold">
              {profile ? `${profile.full_name} (${profile.role})` : user.email}
            </span>
            <button
              onClick={signOut}
              className="px-3 py-1.5 border rounded-lg text-sm font-bold flex items-center gap-1.5 hover:bg-muted text-destructive"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowLoginModal(true)}
            className="px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-sm font-bold flex items-center gap-1.5 hover:bg-primary-700 shadow"
          >
            <LogIn className="w-4 h-4" />
            <span>Staff Sign In</span>
          </button>
        )}
      </div>

      {/* Staff Login Modal */}
      {showLoginModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-card border rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <Lock className="w-5 h-5 text-primary" />
                <span>Doctor & Staff Sign In</span>
              </h3>
              <button
                onClick={() => setShowLoginModal(false)}
                className="text-muted-foreground hover:text-foreground font-bold text-lg"
              >
                ✕
              </button>
            </div>

            {authError && (
              <div className="p-3 bg-destructive/10 text-destructive text-sm font-semibold rounded-lg flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{authError}</span>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="text-sm font-bold text-muted-foreground">Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="doctor@dhanvantri.clinic"
                  className="w-full h-12 px-3 border rounded-xl"
                />
              </div>

              <div>
                <label className="text-sm font-bold text-muted-foreground">Password</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full h-12 px-3 border rounded-xl"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowLoginModal(false)}
                  className="w-1/2 h-12 border rounded-xl font-bold hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={authLoading}
                  className="w-1/2 h-12 bg-primary text-primary-foreground rounded-xl font-bold hover:bg-primary-700 shadow"
                >
                  {authLoading ? 'Signing in...' : 'Sign In'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Main Tab Content */}
      {activeTab === 'queue' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Active Patient & Controls (7 Cols) */}
          <div className="lg:col-span-7 space-y-6">
            {/* Active Patient Card */}
            <div className="bg-card border-2 border-primary/30 rounded-2xl p-6 shadow-md">
              <span className="text-xs font-bold text-primary uppercase tracking-widest">
                {t('doctor.currentPatient')}
              </span>

              {activePatient ? (
                <div className="my-4 space-y-2">
                  <div className="text-6xl font-black text-primary">
                    #{activePatient.token_number}
                  </div>
                  <div className="text-2xl font-bold text-foreground">
                    {activePatient.patient?.full_name || 'Walk-In Patient'}
                  </div>
                  <div className="text-muted-foreground font-semibold flex items-center gap-3">
                    <span>Age: {activePatient.patient?.age || '--'}</span>
                    {activePatient.patient?.is_senior && (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
                        Senior Care
                      </span>
                    )}
                    {activePatient.patient?.accessibility_needs && activePatient.patient.accessibility_needs.length > 0 && (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800">
                        {activePatient.patient.accessibility_needs.join(', ')}
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <div className="my-6 text-2xl font-bold text-muted-foreground">
                  No active patient in consultation
                </div>
              )}

              {actionError && (
                <div className="p-3 mb-3 bg-destructive/10 text-destructive text-sm font-semibold rounded-lg flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{actionError}</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-4 border-t">
                <button 
                  onClick={handleCallNext}
                  disabled={actionLoading}
                  className="h-14 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow disabled:opacity-50"
                >
                  {t('doctor.callNext')}
                </button>
                <button 
                  onClick={() => activePatient && handleStart(activePatient.id)}
                  disabled={actionLoading || !activePatient || activePatient.status === 'in_progress'}
                  className="h-14 bg-primary hover:bg-primary-700 text-white font-bold rounded-xl shadow disabled:opacity-50"
                >
                  {t('doctor.start')}
                </button>
                <button 
                  onClick={() => activePatient && handleComplete(activePatient.id)}
                  disabled={actionLoading || !activePatient}
                  className="h-14 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow disabled:opacity-50"
                >
                  {t('doctor.complete')}
                </button>
                <button 
                  onClick={() => activePatient && handleHold(activePatient.id)}
                  disabled={actionLoading || !activePatient}
                  className="h-14 border rounded-xl font-bold hover:bg-muted text-amber-600 disabled:opacity-50"
                >
                  {t('doctor.holdTurn')}
                </button>
                <button 
                  onClick={() => activePatient && handleMissed(activePatient.id)}
                  disabled={actionLoading || !activePatient}
                  className="h-14 border rounded-xl font-bold hover:bg-muted text-destructive disabled:opacity-50"
                >
                  {t('doctor.markMissed')}
                </button>
                <button 
                  disabled={actionLoading}
                  className="h-14 border rounded-xl font-bold hover:bg-muted disabled:opacity-50"
                >
                  {t('doctor.delayBroadcast')}
                </button>
              </div>
            </div>

            {/* Waiting Line Table */}
            <div className="bg-card border rounded-2xl p-6 shadow-sm">
              <h2 className="text-xl font-bold mb-4">{t('doctor.activeQueue')}</h2>
              <div className="divide-y">
                {waitingPatients.length === 0 ? (
                  <p className="text-muted-foreground py-4">No waiting patients.</p>
                ) : (
                  waitingPatients.map((tk) => (
                    <div key={tk.id} className="py-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl font-black text-foreground">
                          #{tk.token_number}
                        </span>
                        <div>
                          <p className="font-bold text-foreground">
                            {tk.patient?.full_name || 'Walk-In Patient'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Age {tk.patient?.age} • Source: {tk.source}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {tk.patient?.is_senior && (
                          <span className="px-2 py-0.5 rounded text-xs font-bold bg-amber-100 text-amber-800">
                            Senior
                          </span>
                        )}
                        {tk.arrived_at_clinic && (
                          <span className="px-2 py-0.5 rounded text-xs font-bold bg-emerald-100 text-emerald-800">
                            In Lobby
                          </span>
                        )}
                        <span className="text-sm font-semibold capitalize px-2 py-1 bg-muted rounded">
                          {tk.status}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Quick Walk-In Form (5 Cols) */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-card border rounded-2xl p-6 shadow-sm space-y-4">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Plus className="w-5 h-5 text-primary" />
                <span>{t('doctor.addWalkIn')}</span>
              </h2>

              <div className="space-y-3">
                <div>
                  <label className="text-sm font-bold text-muted-foreground">Patient Name</label>
                  <input
                    type="text"
                    value={walkInName}
                    onChange={(e) => setWalkInName(e.target.value)}
                    placeholder="Enter name"
                    className="w-full h-12 px-3 border rounded-xl"
                  />
                </div>

                <div>
                  <label className="text-sm font-bold text-muted-foreground">Age</label>
                  <input
                    type="number"
                    value={walkInAge}
                    onChange={(e) => {
                      setWalkInAge(e.target.value);
                      const parsed = parseInt(e.target.value, 10);
                      if (!isNaN(parsed) && parsed >= 60) setWalkInSenior(true);
                    }}
                    placeholder="e.g. 65"
                    className="w-full h-12 px-3 border rounded-xl"
                  />
                </div>

                <label className="flex items-center gap-2 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={walkInSenior}
                    onChange={(e) => setWalkInSenior(e.target.checked)}
                    className="w-5 h-5 rounded text-primary"
                  />
                  <span className="text-sm font-bold">Flag as Senior Citizen (Fair Lane)</span>
                </label>

                <button
                  type="button"
                  onClick={handleAddWalkIn}
                  disabled={actionLoading || !walkInName.trim()}
                  className="w-full h-14 bg-primary text-primary-foreground font-bold rounded-xl flex items-center justify-center gap-2 shadow hover:bg-primary-700 disabled:opacity-50"
                >
                  <Printer className="w-5 h-5" />
                  <span>{actionLoading ? 'Creating...' : t('doctor.printSlip')}</span>
                </button>
              </div>
            </div>

            {/* Quick Stats Box */}
            <div className="bg-card border rounded-2xl p-6 shadow-sm space-y-3">
              <h3 className="font-bold text-muted-foreground text-sm uppercase">
                Today's Overview
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="border p-3 rounded-xl text-center">
                  <span className="text-xs font-semibold text-muted-foreground">Total Tokens</span>
                  <p className="text-3xl font-extrabold text-foreground">{tokens.length}</p>
                </div>
                <div className="border p-3 rounded-xl text-center">
                  <span className="text-xs font-semibold text-muted-foreground">Completed</span>
                  <p className="text-3xl font-extrabold text-emerald-600">
                    {tokens.filter((t) => t.status === 'completed').length}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reports Tab Placeholder (Phase 6 full build) */}
      {activeTab === 'reports' && (
        <div className="bg-card border rounded-2xl p-8 text-center space-y-3">
          <BarChart3 className="w-12 h-12 text-primary mx-auto" />
          <h2 className="text-2xl font-bold">Clinical Reports & Audit History</h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            Operational metrics, average waiting durations, peak hour histograms, and CSV/PDF export will be activated in Phase 6.
          </p>
        </div>
      )}

      {/* Settings Tab Placeholder with Role Guard */}
      {activeTab === 'settings' && (
        <div className="bg-card border rounded-2xl p-8 text-center space-y-3">
          <SettingsIcon className="w-12 h-12 text-primary mx-auto" />
          <h2 className="text-2xl font-bold">Clinic Configuration Settings</h2>
          {!isDoctor ? (
            <div className="p-4 bg-amber-50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200 border border-amber-300 rounded-xl font-bold max-w-md mx-auto">
              Helper Access Restricted: Settings can only be modified by Dr Yogesh (Doctor role).
            </div>
          ) : (
            <p className="text-muted-foreground max-w-md mx-auto">
              Doctor consultation duration, grace period, buffer times, and interactive Simulation Mode will be activated in Phase 6.
            </p>
          )}
        </div>
      )}
    </div>
  );
};
