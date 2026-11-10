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
  createTokenRPC, 
  reorderQueueRPC 
} from '@/lib/queue-api';
import { Token, ClinicSettings, DoctorStatus, AccessibilityNeed } from '@/types/database';

import { DailySummaryCards } from '@/components/doctor/DailySummaryCards';
import { CurrentPatientCard } from '@/components/doctor/CurrentPatientCard';
import { NextPatientPreview } from '@/components/doctor/NextPatientPreview';
import { WalkInForm } from '@/components/doctor/WalkInForm';
import { QueueTable } from '@/components/doctor/QueueTable';
import { HelpRequestsBanner } from '@/components/doctor/HelpRequestsBanner';
import { DelayBroadcastModal } from '@/components/doctor/DelayBroadcastModal';
import { ThermalPrintSlip } from '@/components/doctor/ThermalPrintSlip';
import { ReportsTab } from '@/components/doctor/ReportsTab';
import { SettingsTab } from '@/components/doctor/SettingsTab';

import { 
  Users, 
  BarChart3, 
  Settings as SettingsIcon, 
  LogOut, 
  Lock, 
  LogIn, 
  AlertCircle, 
  RefreshCw 
} from 'lucide-react';

export const DoctorPage: React.FC = () => {
  const { t } = useTranslation();
  const { user, profile, isDoctor, signIn, signOut } = useAuth();

  // Auth Modal State
  const [showLoginModal, setShowLoginModal] = useState<boolean>(false);
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [authLoading, setAuthLoading] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Tabs & Console State
  const [activeTab, setActiveTab] = useState<'queue' | 'reports' | 'settings'>('queue');
  const [tokens, setTokens] = useState<Token[]>([]);
  const [settings, setSettings] = useState<ClinicSettings | null>(null);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Last printed slip state
  const [printedSlipData, setPrintedSlipData] = useState<{
    tokenNumber: number;
    patientName: string;
    age: number;
    isSenior: boolean;
    tokenId: string;
  } | null>(null);

  useEffect(() => {
    fetchConsoleData();

    // Supabase Realtime WebSocket subscription on tokens and clinic_settings
    const channel = supabase
      .channel('doctor-console-live-feed')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tokens' }, () => {
        fetchConsoleData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'clinic_settings' }, () => {
        fetchConsoleData();
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
      .order('position_override', { ascending: true, nullsFirst: false })
      .order('token_number', { ascending: true });

    if (tokenData) {
      setTokens(tokenData as Token[]);
    }

    const { data: settingsData } = await supabase
      .from('clinic_settings')
      .select('*')
      .limit(1)
      .maybeSingle();

    if (settingsData) {
      setSettings(settingsData as ClinicSettings);
    }
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

  // Operational Action Handlers
  const handleCallNext = async () => {
    setActionLoading(true);
    setActionError(null);
    try {
      const res = await callNextRPC(user?.id);
      if (!res.success && res.message) {
        setActionError(res.message);
      }
      await fetchConsoleData();
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Error calling next patient');
    } finally {
      setActionLoading(false);
    }
  };

  const handleStartConsultation = async (tokenId: string) => {
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

  const handleCompleteConsultation = async (tokenId: string) => {
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

  const handleHoldTurn = async (tokenId: string, holdMins: number = 10) => {
    setActionLoading(true);
    setActionError(null);
    try {
      await holdTurnRPC(tokenId, holdMins);
      await fetchConsoleData();
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Error holding turn');
    } finally {
      setActionLoading(false);
    }
  };

  const handleMarkMissed = async (tokenId: string) => {
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

  const handleCancelToken = async (tokenId: string) => {
    setActionLoading(true);
    setActionError(null);
    try {
      await supabase.from('tokens').update({ status: 'cancelled' }).eq('id', tokenId);
      await fetchConsoleData();
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Error cancelling token');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReorderQueue = async (tokenIds: string[], reason: string) => {
    setActionLoading(true);
    setActionError(null);
    try {
      await reorderQueueRPC(tokenIds, reason);
      await fetchConsoleData();
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Error reordering queue');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddWalkIn = async (params: {
    fullName: string;
    phone: string | null;
    age: number;
    accessibility: AccessibilityNeed[];
  }) => {
    setActionLoading(true);
    setActionError(null);
    try {
      const res = await createTokenRPC({
        fullName: params.fullName,
        phone: params.phone,
        age: params.age,
        accessibility: params.accessibility,
        source: 'doctor_desk',
      });

      // Prepare slip data for printing
      setPrintedSlipData({
        tokenNumber: res.token_number,
        patientName: params.fullName,
        age: params.age,
        isSenior: res.is_senior,
        tokenId: res.token_id,
      });

      await fetchConsoleData();

      // Trigger automatic print dialog
      setTimeout(() => {
        window.print();
      }, 250);
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Error issuing walk-in token');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateDoctorStatus = async (status: DoctorStatus, reason: string | null) => {
    setActionLoading(true);
    setActionError(null);
    try {
      if (!settings?.id) throw new Error('Clinic settings not loaded yet');
      const { error } = await supabase
        .from('clinic_settings')
        .update({
          doctor_status: status,
          delay_reason: reason,
          updated_at: new Date().toISOString(),
        })
        .eq('id', settings.id);

      if (error) throw error;
      await fetchConsoleData();
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Error broadcasting delay');
    } finally {
      setActionLoading(false);
    }
  };

  const handleResolveHelpRequest = async (requestId: string) => {
    await supabase
      .from('help_requests')
      .update({ status: 'resolved', resolved_at: new Date().toISOString() })
      .eq('id', requestId);
  };

  // Queue segments
  const activePatient = tokens.find((t) => t.status === 'in_progress' || t.status === 'called') || null;
  const waitingPatients = tokens.filter((t) => t.status === 'waiting' || t.status === 'hold');
  const nextPatient = waitingPatients.length > 0 ? waitingPatients[0] : null;

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Hidden Thermal Print Slip for Browser Print Engine */}
      {printedSlipData && (
        <ThermalPrintSlip
          tokenNumber={printedSlipData.tokenNumber}
          patientName={printedSlipData.patientName}
          age={printedSlipData.age}
          isSenior={printedSlipData.isSenior}
          tokenId={printedSlipData.tokenId}
          clinicName={settings?.clinic_name}
          doctorName={settings?.doctor_name}
          phone={settings?.phone_number}
        />
      )}

      {/* Top Console Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl md:text-3xl font-black text-foreground tracking-tight">
              {settings?.clinic_name || 'Dhanvantri Clinic'}
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-primary/10 text-primary border border-primary/20">
              Doctor Console
            </span>
          </div>
          <p className="text-sm font-semibold text-muted-foreground mt-0.5">
            {settings?.doctor_name || 'Dr Yogesh'} • Sandhya Theater Complex, BTM Layout
          </p>
        </div>

        {/* Tab Controls */}
        <div className="flex rounded-xl border bg-muted p-1">
          <button
            onClick={() => setActiveTab('queue')}
            className={`px-4 py-2 rounded-lg font-bold flex items-center gap-2 text-sm transition-colors ${
              activeTab === 'queue' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-foreground'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>{t('doctor.queueTab')}</span>
          </button>
          <button
            onClick={() => setActiveTab('reports')}
            className={`px-4 py-2 rounded-lg font-bold flex items-center gap-2 text-sm transition-colors ${
              activeTab === 'reports' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-foreground'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>{t('doctor.reportsTab')}</span>
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`px-4 py-2 rounded-lg font-bold flex items-center gap-2 text-sm transition-colors ${
              activeTab === 'settings' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-foreground'
            }`}
          >
            <SettingsIcon className="w-4 h-4" />
            <span>{t('doctor.settingsTab')}</span>
          </button>
        </div>

        {/* Status Broadcast & Staff Authentication */}
        <div className="flex items-center gap-2">
          {/* Delay Broadcast Trigger */}
          <DelayBroadcastModal
            currentStatus={settings?.doctor_status || 'available'}
            currentReason={settings?.delay_reason || null}
            onUpdateStatus={handleUpdateDoctorStatus}
            loading={actionLoading}
          />

          <button
            onClick={fetchConsoleData}
            title="Refresh Queue"
            className="p-2.5 border rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          {user ? (
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 text-xs font-bold border border-emerald-300">
                {profile ? `${profile.full_name} (${profile.role})` : user.email}
              </span>
              <button
                onClick={signOut}
                className="px-3 py-1.5 border rounded-xl text-xs font-bold flex items-center gap-1.5 hover:bg-muted text-destructive transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowLoginModal(true)}
              className="px-3 py-1.5 bg-primary text-primary-foreground rounded-xl text-xs font-bold flex items-center gap-1.5 hover:bg-primary-700 shadow"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Staff Sign In</span>
            </button>
          )}
        </div>
      </div>

      {/* Distress Help Requests Alert Banner */}
      <HelpRequestsBanner onResolve={handleResolveHelpRequest} />

      {/* Action Error Banner */}
      {actionError && (
        <div className="p-4 rounded-2xl bg-destructive/10 border border-destructive/30 text-destructive font-bold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{actionError}</span>
          </div>
          <button
            onClick={() => setActionError(null)}
            className="text-xs uppercase font-extrabold hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* TAB 1: LIVE QUEUE TAB */}
      {activeTab === 'queue' && (
        <div className="space-y-6">
          {/* Daily Summary Cards */}
          <DailySummaryCards
            tokens={tokens}
            defaultConsultMins={settings?.default_consultation_mins || 8}
          />

          {/* Main 2-Column Operational Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column (7 Cols): Current Patient & Waiting Queue List */}
            <div className="lg:col-span-7 space-y-6">
              <CurrentPatientCard
                token={activePatient}
                onCallNext={handleCallNext}
                onStart={handleStartConsultation}
                onComplete={handleCompleteConsultation}
                onHold={handleHoldTurn}
                onMissed={handleMarkMissed}
                onCancel={handleCancelToken}
                loading={actionLoading}
                defaultDurationMins={settings?.default_consultation_mins || 8}
              />

              <QueueTable
                tokens={tokens}
                onCall={handleStartConsultation}
                onHold={(id) => handleHoldTurn(id, 10)}
                onCancel={handleCancelToken}
                onReorder={handleReorderQueue}
                loading={actionLoading}
              />
            </div>

            {/* Right Column (5 Cols): Next Patient Preview & Quick Walk-In Form */}
            <div className="lg:col-span-5 space-y-6">
              <NextPatientPreview
                token={nextPatient}
                onCallNow={handleCallNext}
                loading={actionLoading}
              />

              <WalkInForm
                onSubmit={handleAddWalkIn}
                loading={actionLoading}
              />
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: REPORTS TAB */}
      {activeTab === 'reports' && (
        <ReportsTab tokens={tokens} settings={settings} />
      )}

      {/* TAB 3: SETTINGS TAB */}
      {activeTab === 'settings' && (
        <SettingsTab
          settings={settings}
          isDoctor={isDoctor}
          onSaved={fetchConsoleData}
        />
      )}

      {/* Staff Sign-In Modal */}
      {showLoginModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-card border rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <Lock className="w-5 h-5 text-primary" />
                <span>Doctor & Staff Sign In</span>
              </h3>
              <button
                onClick={() => setShowLoginModal(false)}
                className="text-muted-foreground hover:text-foreground font-bold text-lg p-1"
              >
                ✕
              </button>
            </div>

            {authError && (
              <div className="p-3 bg-destructive/10 text-destructive text-sm font-semibold rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{authError}</span>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase">Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="doctor@dhanvantri.clinic"
                  className="w-full h-12 px-3 border rounded-xl text-sm bg-background font-medium focus:ring-2 focus:ring-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase">Password</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full h-12 px-3 border rounded-xl text-sm bg-background font-medium focus:ring-2 focus:ring-primary focus:outline-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowLoginModal(false)}
                  className="w-1/2 h-12 border rounded-xl font-bold text-sm hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={authLoading}
                  className="w-1/2 h-12 bg-primary text-primary-foreground rounded-xl font-bold text-sm hover:bg-primary-700 shadow"
                >
                  {authLoading ? 'Signing In...' : 'Sign In'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
