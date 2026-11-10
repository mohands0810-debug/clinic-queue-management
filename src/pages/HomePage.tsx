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
  AlertTriangle 
} from 'lucide-react';

export const HomePage: React.FC = () => {
  const { t } = useTranslation();
  const { speakText } = useAccessibility();

  const [settings, setSettings] = useState<ClinicSettings | null>(null);
  const [currentServing, setCurrentServing] = useState<PublicQueueItem | null>(null);
  const [waitingCount, setWaitingCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    fetchInitialData();

    // Subscribe to realtime changes on clinic_settings and public_queue
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
    // Query sanitized public view
    const { data } = await supabase
      .from('public_queue')
      .select('*');

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
      ? `${t('home.nowServing')}: Token number ${currentServing.token_number}.`
      : 'Currently no consultations in progress.';
    const waitText = `${waitingCount} ${t('home.patientsInLine')}.`;
    speakText(`${t('clinic.name')}. ${servingText} ${waitText}`);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      {/* Doctor Status Banner */}
      <div className="rounded-xl border p-4 bg-card shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="relative flex h-4 w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500"></span>
          </div>
          <div>
            <p className="font-semibold text-foreground text-lg">
              {settings?.doctor_status === 'break' && (
                <span className="text-amber-600 flex items-center gap-1">
                  <AlertTriangle className="w-5 h-5 inline" /> {t('home.statusBreak')} ({settings.delay_reason || 'Short clinical break'})
                </span>
              )}
              {settings?.doctor_status === 'emergency' && (
                <span className="text-destructive flex items-center gap-1">
                  <AlertTriangle className="w-5 h-5 inline" /> {t('home.statusEmergency')}
                </span>
              )}
              {settings?.doctor_status === 'off_duty' && (
                <span className="text-muted-foreground">{t('home.statusOffDuty')}</span>
              )}
              {(!settings || settings.doctor_status === 'available') && (
                <span className="text-emerald-700 font-bold">{t('home.statusAvailable')}</span>
              )}
            </p>
            <p className="text-sm text-muted-foreground">
              {t('display.clinicHours')}
            </p>
          </div>
        </div>

        <button
          onClick={handleReadStatus}
          className="px-4 py-2 rounded-lg border bg-muted hover:bg-background font-semibold flex items-center gap-2 text-foreground"
        >
          <Volume2 className="w-5 h-5" />
          <span>{t('common.readToMe')}</span>
        </button>
      </div>

      {/* Now Serving Big Card */}
      <div className="rounded-2xl border-2 border-primary/20 bg-gradient-to-b from-primary/5 to-transparent p-6 text-center shadow-md">
        <div className="flex items-center justify-center gap-2 text-primary font-bold uppercase tracking-wider text-sm md:text-base">
          <HeartHandshake className="w-6 h-6" />
          <span>{t('home.nowServing')}</span>
        </div>

        <div className="my-4">
          {loading ? (
            <div className="text-4xl font-bold text-muted-foreground animate-pulse py-4">
              {t('common.loading')}
            </div>
          ) : currentServing ? (
            <div>
              <div className="text-6xl md:text-8xl font-black text-primary tracking-tight">
                #{currentServing.token_number}
              </div>
              <div className="mt-2 text-lg font-semibold text-muted-foreground flex items-center justify-center gap-2">
                <span>Patient {currentServing.patient_initials}</span>
                {currentServing.is_senior && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
                    Senior Care
                  </span>
                )}
              </div>
            </div>
          ) : (
            <div className="py-6 text-2xl font-bold text-muted-foreground">
              Ready for Next Patient
            </div>
          )}
        </div>

        {/* Queue Metrics Bar */}
        <div className="grid grid-cols-2 gap-4 max-w-md mx-auto pt-4 border-t border-border">
          <div className="flex flex-col items-center">
            <span className="text-muted-foreground text-sm flex items-center gap-1 font-medium">
              <Users className="w-4 h-4" /> {t('home.patientsInLine')}
            </span>
            <span className="text-2xl font-extrabold text-foreground">
              {waitingCount}
            </span>
          </div>

          <div className="flex flex-col items-center">
            <span className="text-muted-foreground text-sm flex items-center gap-1 font-medium">
              <Clock className="w-4 h-4" /> {t('home.averageWait')}
            </span>
            <span className="text-2xl font-extrabold text-foreground">
              ~{settings?.default_consultation_mins || 8} {t('home.minsPerPatient')}
            </span>
          </div>
        </div>
      </div>

      {/* Primary Actions (Oversized Senior-Friendly Touch Targets) */}
      <div className="space-y-4 pt-2">
        {/* Main CTA: Get My Token */}
        <Link
          to="/get-token"
          className="w-full min-h-button-tall bg-primary text-primary-foreground hover:bg-primary-700 rounded-2xl p-5 shadow-lg flex items-center justify-between group transition-all transform active:scale-[0.99]"
        >
          <div className="text-left">
            <div className="text-2xl md:text-3xl font-extrabold flex items-center gap-2">
              {t('home.getMyToken')}
              <ArrowRight className="w-7 h-7 group-hover:translate-x-1.5 transition-transform" />
            </div>
            <p className="text-primary-100 text-base md:text-lg font-medium mt-1">
              {t('home.tokenSubtitle')}
            </p>
          </div>
          <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center font-black text-2xl">
            1
          </div>
        </Link>

        {/* Secondary CTA: Check My Token */}
        <Link
          to="/status"
          className="w-full min-h-button-tall bg-card hover:bg-muted border-2 border-border text-foreground rounded-2xl p-5 shadow-sm flex items-center justify-between group transition-all"
        >
          <div className="text-left">
            <div className="text-xl md:text-2xl font-bold flex items-center gap-2">
              <Search className="w-6 h-6 text-primary" />
              {t('home.checkMyToken')}
            </div>
            <p className="text-muted-foreground text-sm md:text-base font-medium mt-1">
              Check live status, wait estimate, or arrival time
            </p>
          </div>
          <ArrowRight className="w-6 h-6 text-muted-foreground group-hover:translate-x-1 transition-transform" />
        </Link>
      </div>

      {/* Utility Navigation Footer */}
      <div className="pt-6 border-t flex flex-wrap items-center justify-between gap-4 text-sm font-semibold text-muted-foreground">
        <Link to="/display" className="flex items-center gap-1.5 hover:text-foreground">
          <Tv className="w-4 h-4 text-primary" />
          <span>{t('nav.tvDisplay')}</span>
        </Link>

        <div className="flex items-center gap-1 text-emerald-600 font-bold">
          <CheckCircle2 className="w-4 h-4" />
          <span>Realtime Sync Active</span>
        </div>

        <Link to="/doctor" className="flex items-center gap-1.5 hover:text-foreground">
          <Lock className="w-4 h-4" />
          <span>{t('nav.doctorLogin')}</span>
        </Link>
      </div>
    </div>
  );
};

