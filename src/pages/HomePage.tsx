import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { PublicQueueItem, ClinicSettings } from '@/types/database';
import { useAccessibility } from '@/context/AccessibilityContext';
import {
  Users,
  Clock,
  Volume2,
  ArrowRight,
  Search,
  Tv,
  Lock,
  HeartHandshake,
  CheckCircle2,
  AlertTriangle,
  QrCode,
  Camera,
  Zap,
} from 'lucide-react';
import { QrScannerModal } from '@/components/common/QrScannerModal';

export const HomePage: React.FC = () => {
  const { t } = useTranslation();
  const { speakText } = useAccessibility();

  const [settings, setSettings] = useState<ClinicSettings | null>(null);
  const [currentServing, setCurrentServing] = useState<PublicQueueItem | null>(null);
  const [waitingCount, setWaitingCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [showScanner, setShowScanner] = useState<boolean>(false);

  useEffect(() => {
    fetchInitialData();

    const channel = supabase
      .channel('public-home-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'clinic_settings' },
        (payload) => {
          setSettings(payload.new as ClinicSettings);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tokens' },
        () => {
          fetchQueueData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    await Promise.all([fetchSettings(), fetchQueueData()]);
    setLoading(false);
  };

  const fetchSettings = async () => {
    const { data } = await supabase
      .from('clinic_settings')
      .select('*')
      .limit(1)
      .maybeSingle();

    if (data) {
      setSettings(data as ClinicSettings);
    }
  };

  const fetchQueueData = async () => {
    const { data } = await supabase.from('public_queue').select('*');

    if (data) {
      const items = data as PublicQueueItem[];
      const active = items.find((i) => i.status === 'in_progress' || i.status === 'called');
      setCurrentServing(active || null);
      const waiting = items.filter((i) => i.status === 'waiting' || i.status === 'hold');
      setWaitingCount(waiting.length);
    }
  };

  const handleReadStatus = () => {
    const servingText = currentServing
      ? t('home.servingSpoken', { num: currentServing.token_number })
      : t('home.noActiveSpoken');
    const waitText = t('home.waitingSpoken', { count: waitingCount });
    speakText(`${t('clinic.name')}, ${t('clinic.doctor')}. ${servingText} ${waitText}`);
  };

  const doctorStatus = settings?.doctor_status ?? 'available';
  const isDisturbedStatus =
    doctorStatus === 'break' || doctorStatus === 'emergency' || doctorStatus === 'off_duty';

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-5 animate-fade-in">

      {/* Doctor Status Banner */}
      {isDisturbedStatus ? (
        <div
          className={`rounded-2xl border-2 p-4 flex items-start gap-3 shadow-sm ${
            doctorStatus === 'emergency'
              ? 'bg-red-50 border-red-400 text-red-900'
              : doctorStatus === 'break'
              ? 'bg-amber-50 border-amber-300 text-amber-900'
              : 'bg-gray-50 border-gray-300 text-gray-700'
          }`}
        >
          <AlertTriangle className="w-7 h-7 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-xl font-extrabold leading-tight">
              {doctorStatus === 'break' && t('home.statusBreak')}
              {doctorStatus === 'emergency' && t('home.statusEmergency')}
              {doctorStatus === 'off_duty' && t('home.statusOffDuty')}
            </p>
            {settings?.delay_reason && (
              <p className="text-base font-semibold mt-1 opacity-80">{settings.delay_reason}</p>
            )}
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border p-4 bg-card shadow-sm flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="relative flex h-4 w-4">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500"></span>
            </div>
            <div>
              <p className="text-lg font-bold text-emerald-700">{t('home.statusAvailable')}</p>
              <p className="text-sm text-muted-foreground">{t('display.clinicHours')}</p>
            </div>
          </div>

          <button
            onClick={handleReadStatus}
            className="min-h-touch-target px-5 rounded-xl border-2 bg-muted hover:bg-background font-bold flex items-center gap-2 text-foreground text-base"
          >
            <Volume2 className="w-5 h-5" />
            <span>{t('common.readToMe')}</span>
          </button>
        </div>
      )}

      {/* Now Serving Hero */}
      <div className="rounded-2xl border-2 border-primary/20 bg-gradient-to-b from-primary/5 to-transparent p-6 text-center shadow-md animate-fade-in-up animate-delay-75 interactive-card">
        <div className="flex items-center justify-center gap-2 text-primary font-bold uppercase tracking-wider text-sm md:text-base mb-3">
          <HeartHandshake className="w-6 h-6" />
          <span>{t('home.nowServing')}</span>
        </div>

        {loading ? (
          <div className="text-4xl font-bold text-muted-foreground animate-pulse py-6">
            {t('common.loading')}
          </div>
        ) : currentServing ? (
          <div>
            <div
              className={`text-7xl md:text-8xl font-black text-primary tracking-tight ${
                currentServing.status === 'called' ? 'animate-pulse' : ''
              }`}
            >
              #{currentServing.token_number}
            </div>
            <div className="mt-3 text-lg font-semibold text-muted-foreground flex items-center justify-center gap-2">
              <span>Patient {currentServing.patient_initials}</span>
              {currentServing.is_senior && (
                <span className="px-3 py-0.5 rounded-full text-sm font-bold bg-amber-100 text-amber-800 border border-amber-300">
                  ⭐ Senior Care
                </span>
              )}
            </div>
          </div>
        ) : (
          <div className="py-8 text-2xl font-bold text-muted-foreground">
            {t('home.noActiveSpoken')}
          </div>
        )}

        {/* Queue Metrics Bar */}
        <div className="grid grid-cols-2 gap-4 max-w-sm mx-auto pt-5 mt-4 border-t border-border">
          <div className="flex flex-col items-center gap-1">
            <span className="text-muted-foreground text-sm flex items-center gap-1 font-semibold">
              <Users className="w-4 h-4" /> {t('home.patientsInLine')}
            </span>
            <span className="text-3xl font-extrabold text-foreground">{waitingCount}</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <span className="text-muted-foreground text-sm flex items-center gap-1 font-semibold">
              <Clock className="w-4 h-4" /> {t('home.averageWait')}
            </span>
            <span className="text-3xl font-extrabold text-foreground">
              ~{settings?.default_consultation_mins || 8}{' '}
              <span className="text-lg font-bold">{t('home.minsPerPatient')}</span>
            </span>
          </div>
        </div>
      </div>

      {/* Primary Actions */}
      <div className="space-y-4">
        {/* 1-Tap Instant Token (Zero Details / Zero Typing) */}
        <Link
          to="/instant-token"
          className="w-full min-h-button-tall bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-600 hover:to-orange-600 text-white rounded-2xl px-6 py-5 shadow-xl flex items-center justify-between group transition-all duration-200 active:scale-[0.98] border-2 border-amber-300 dark:border-amber-400 interactive-card animate-fade-in-up animate-delay-150"
        >
          <div className="text-left flex items-center gap-3.5">
            <div className="w-13 h-13 rounded-2xl bg-white/25 flex items-center justify-center shrink-0 shadow-inner p-2.5">
              <Zap className="w-8 h-8 text-white fill-white animate-pulse" />
            </div>
            <div>
              <div className="text-xl md:text-2xl font-black flex items-center gap-2 tracking-tight">
                <span>{t('home.instantTokenTitle')}</span>
                <span className="text-[11px] uppercase px-2.5 py-0.5 rounded-full bg-white text-orange-700 font-black tracking-wider shadow-sm">
                  {t('home.oneSecBadge')}
                </span>
              </div>
              <p className="text-amber-100 text-sm md:text-base font-bold mt-0.5">
                {t('home.instantTokenSubtitle')}
              </p>
            </div>
          </div>
          <ArrowRight className="w-7 h-7 text-white group-hover:translate-x-1.5 transition-transform shrink-0" />
        </Link>

        {/* Regular 3-Step Registration with Patient Name & Senior Care */}
        <Link
          to="/get-token"
          className="w-full min-h-touch-target bg-primary text-primary-foreground hover:bg-primary-700 rounded-2xl px-6 py-4 shadow-md flex items-center justify-between group transition-all duration-200 active:scale-[0.98] interactive-card animate-fade-in-up animate-delay-200"
        >
          <div className="text-left">
            <div className="text-lg md:text-xl font-bold flex items-center gap-2">
              <span>{t('home.registerFullTitle')}</span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1.5 transition-transform" />
            </div>
            <p className="text-primary-100 text-xs md:text-sm font-medium mt-0.5">
              {t('home.registerFullSubtitle')}
            </p>
          </div>
          <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center font-bold text-sm shrink-0">
            2
          </div>
        </Link>

        {/* Scan Clinic QR Button (Fast Instant Token) */}
        <button
          type="button"
          onClick={() => setShowScanner(true)}
          className="w-full min-h-touch-target bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-2xl px-6 py-4 shadow-md flex items-center justify-between group transition-all duration-200 active:scale-[0.98] interactive-card animate-fade-in-up animate-delay-300"
        >
          <div className="text-left flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
              <Camera className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="text-lg md:text-xl font-black flex items-center gap-2">
                {t('home.scanQrTitle')}
                <QrCode className="w-5 h-5 text-emerald-200" />
              </div>
              <p className="text-emerald-100 text-xs md:text-sm font-semibold mt-0.5">
                {t('home.scanQrSubtitle')}
              </p>
            </div>
          </div>
          <ArrowRight className="w-5 h-5 text-white/80 group-hover:translate-x-1.5 transition-transform shrink-0" />
        </button>

        {/* Check My Token CTA */}
        <Link
          to="/status"
          className="w-full min-h-touch-target bg-card hover:bg-muted border-2 border-border text-foreground rounded-2xl px-6 py-4 shadow-sm flex items-center justify-between group transition-all duration-200 active:scale-[0.98] interactive-card animate-fade-in-up animate-delay-400"
        >
          <div className="text-left">
            <div className="text-lg md:text-xl font-bold flex items-center gap-2">
              <Search className="w-5 h-5 text-primary" />
              {t('home.checkMyToken')}
            </div>
            <p className="text-muted-foreground text-sm font-medium mt-0.5">
              {t('status.checkSubtitle')}
            </p>
          </div>
          <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:translate-x-1 transition-transform flex-shrink-0" />
        </Link>

        {/* Read to Me (shown below disturbed status when available) */}
        {isDisturbedStatus && (
          <button
            onClick={handleReadStatus}
            className="w-full min-h-touch-target border-2 rounded-2xl font-bold text-lg flex items-center justify-center gap-2 hover:bg-muted"
          >
            <Volume2 className="w-5 h-5 text-primary" />
            <span>{t('common.readToMe')}</span>
          </button>
        )}
      </div>

      {/* Utility Navigation Footer */}
      <div className="pt-4 border-t flex flex-wrap items-center justify-between gap-4 text-sm font-semibold text-muted-foreground animate-fade-in-up animate-delay-500">
        <Link to="/display" className="flex items-center gap-1.5 hover:text-foreground">
          <Tv className="w-4 h-4 text-primary" />
          <span>{t('nav.tvDisplay')}</span>
        </Link>

        <div className="flex items-center gap-1 text-emerald-600 font-bold">
          <CheckCircle2 className="w-4 h-4" />
          <span>{t('common.realtimeSync')}</span>
        </div>

        <Link to="/doctor" className="flex items-center gap-1.5 hover:text-foreground">
          <Lock className="w-4 h-4" />
          <span>{t('nav.doctorLogin')}</span>
        </Link>
      </div>

      {/* In-Website Camera QR Scanner Modal */}
      <QrScannerModal
        isOpen={showScanner}
        onClose={() => setShowScanner(false)}
      />
    </div>
  );
};
