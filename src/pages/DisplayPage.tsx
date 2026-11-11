import React, { useEffect, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/lib/supabase';
import { PublicQueueItem, ClinicSettings } from '@/types/database';
import { AlertTriangle, Wifi, Info } from 'lucide-react';

export const DisplayPage: React.FC = () => {
  const { t } = useTranslation();
  const [currentServing, setCurrentServing] = useState<PublicQueueItem | null>(null);
  const [upcoming, setUpcoming] = useState<PublicQueueItem[]>([]);
  const [settings, setSettings] = useState<ClinicSettings | null>(null);
  const [time, setTime] = useState<string>('');
  const lastCalledTokenRef = useRef<number | null>(null);

  // ── Live Clock ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const tick = () =>
      setTime(
        new Date().toLocaleTimeString('en-IN', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
        })
      );
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  // ── Realtime + Initial Fetch ─────────────────────────────────────────────────
  useEffect(() => {
    fetchDisplayData();

    const channel = supabase
      .channel('display-room-v2')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tokens' },
        () => { fetchDisplayData(); }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'clinic_settings' },
        () => { fetchDisplayData(); }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Data Fetch ───────────────────────────────────────────────────────────────
  const fetchDisplayData = async () => {
    const { data: settingsData } = await supabase
      .from('clinic_settings')
      .select('*')
      .limit(1)
      .maybeSingle();

    if (settingsData) setSettings(settingsData as ClinicSettings);

    const { data: queueData } = await supabase
      .from('public_queue')
      .select('*');

    if (queueData) {
      const items = queueData as PublicQueueItem[];
      const active = items.find(
        (i) => i.status === 'in_progress' || i.status === 'called'
      ) ?? null;
      const waiting = items
        .filter((i) => i.status === 'waiting' || i.status === 'hold')
        .slice(0, 6);

      setCurrentServing(active);
      setUpcoming(waiting);

      if (
        active &&
        active.status === 'called' &&
        active.token_number !== lastCalledTokenRef.current
      ) {
        lastCalledTokenRef.current = active.token_number;
        playCallAnnouncement(active.token_number);
      }
    }
  };

  // ── Audio + Voice Announcement ───────────────────────────────────────────────
  const playCallAnnouncement = (num: number) => {
    // Web Audio chime 440 → 880 Hz
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.3);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
      osc.start();
      osc.stop(ctx.currentTime + 0.5);
    } catch (e) {
      console.warn('Audio Context error:', e);
    }

    // Voice in Kannada then English
    if (!('speechSynthesis' in window)) return;
    setTimeout(() => {
      const uKn = new SpeechSynthesisUtterance(
        `ಟೋಕನ್ ಸಂಖ್ಯೆ ${num}, ದಯವಿಟ್ಟು ವೈದ್ಯರ ಕೋಣೆಗೆ ಬನ್ನಿ.`
      );
      uKn.lang = 'kn-IN';
      uKn.rate = 0.85;

      const uEn = new SpeechSynthesisUtterance(
        `Token number ${num}, please proceed to the doctor's room.`
      );
      uEn.lang = 'en-IN';
      uEn.rate = 0.9;

      window.speechSynthesis.speak(uKn);
      window.speechSynthesis.speak(uEn);
    }, 600);
  };

  // ── Doctor Status Pill ───────────────────────────────────────────────────────
  const renderDoctorStatus = () => {
    const status = settings?.doctor_status ?? 'available';

    if (status === 'available') {
      return (
        <div className="flex items-center gap-3 bg-emerald-500/20 border-2 border-emerald-400 text-emerald-300 px-6 py-3 rounded-2xl">
          <span className="w-4 h-4 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" />
          <span className="text-xl font-bold">Doctor Available</span>
        </div>
      );
    }
    if (status === 'break') {
      return (
        <div className="flex items-center gap-3 bg-amber-500/20 border-2 border-amber-500 text-amber-300 px-6 py-3 rounded-2xl">
          <AlertTriangle className="w-6 h-6 flex-shrink-0" />
          <div className="text-left">
            <div className="text-xl font-bold">On Break</div>
            {settings?.delay_reason && (
              <div className="text-sm opacity-80">{settings.delay_reason}</div>
            )}
          </div>
        </div>
      );
    }
    if (status === 'emergency') {
      return (
        <div className="flex items-center gap-3 bg-red-500/20 border-2 border-red-500 text-red-300 px-6 py-3 rounded-2xl">
          <AlertTriangle className="w-6 h-6 flex-shrink-0" />
          <span className="text-xl font-bold">Attending Emergency</span>
        </div>
      );
    }
    // off_duty
    return (
      <div className="flex items-center gap-3 bg-slate-700 border border-slate-600 text-slate-400 px-6 py-3 rounded-2xl">
        <span className="text-xl font-bold">Consultations Closed</span>
      </div>
    );
  };

  // ── Accessibility Icons ───────────────────────────────────────────────────────
  const renderAccessibilityPills = (needs: string[]) => {
    if (!needs || needs.length === 0) return null;
    const icons: Record<string, string> = {
      wheelchair: '♿',
      hearing: '🔇',
      vision: '👁',
      assistance: '🤝',
    };
    return (
      <div className="flex flex-wrap gap-3 justify-center mt-4">
        {needs.map((need) => (
          <span
            key={need}
            className="text-2xl px-4 py-2 rounded-full bg-blue-500/20 border border-blue-400/50 text-blue-200 font-bold"
          >
            {icons[need] ?? need}
          </span>
        ))}
      </div>
    );
  };

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col overflow-hidden">

      {/* ══ ZONE 1 — Top Bar (10%) ══════════════════════════════════════════════ */}
      <div className="flex items-center justify-between px-8 py-4 border-b border-slate-800 shrink-0">
        {/* Clinic Logo + Name + Doctor */}
        <div className="flex-1 min-w-0 flex items-center gap-4">
          <img
            src="/clinic-icon.svg"
            alt="Dhanvantri Clinic Logo"
            className="w-14 h-14 md:w-16 md:h-16 rounded-full shadow-lg object-contain shrink-0 border border-slate-700"
          />
          <div className="min-w-0">
            <h1 className="text-3xl md:text-5xl font-black text-white truncate">
              {settings?.clinic_name ?? 'DHANVANTRI CLINIC'}
            </h1>
            <p className="text-xl text-slate-400 mt-0.5 truncate">
              {settings?.doctor_name ?? 'Dr Yogesh'}{' '}
              {settings?.address ? `• ${settings.address}` : '• Sandhya Theater Complex, BTM Layout'}
            </p>
          </div>
        </div>

        {/* Live Clock */}
        <div className="text-4xl md:text-6xl font-black font-mono text-primary px-8 shrink-0 tabular-nums">
          {time || '--:--:--'}
        </div>

        {/* Doctor Status Pill */}
        <div className="flex-1 flex justify-end min-w-0">
          {renderDoctorStatus()}
        </div>
      </div>

      {/* ══ ZONE 2 — Main Content Grid (flex-1 / 80%) ════════════════════════ */}
      <div className="flex-1 flex gap-6 px-8 py-6 overflow-hidden">

        {/* ── LEFT 60% — Now Serving ─────────────────────────────────────────── */}
        <div className="w-[60%] bg-slate-900 border-2 border-primary/30 rounded-3xl p-8 flex flex-col items-center justify-center text-center shadow-2xl overflow-hidden">

          <span className="text-2xl font-black tracking-widest text-primary uppercase mb-4">
            {t('display.nowServing')}
          </span>

          {currentServing ? (
            <div className="flex flex-col items-center w-full">
              {/* Giant token number */}
              <div
                className={`text-[16rem] leading-none font-black text-white drop-shadow-2xl ${
                  currentServing.status === 'called' ? 'animate-pulse' : ''
                }`}
              >
                #{currentServing.token_number}
              </div>

              {/* Status banner */}
              {currentServing.status === 'called' ? (
                <div className="text-2xl font-black animate-bounce text-emerald-300 mt-4">
                  🔔 PLEASE PROCEED TO DOCTOR&apos;S ROOM
                </div>
              ) : (
                <div className="text-xl font-bold text-slate-400 mt-4">
                  ⚕ CONSULTATION IN PROGRESS
                </div>
              )}

              {/* Patient initials */}
              <div className="text-3xl font-bold text-slate-300 mt-6">
                {currentServing.patient_initials}
              </div>

              {/* Senior badge */}
              {currentServing.is_senior && (
                <div className="mt-5 inline-flex items-center gap-2 bg-amber-400/20 border border-amber-400 text-amber-300 text-xl font-bold px-6 py-2 rounded-full">
                  ✦ SENIOR CITIZEN PRIORITY
                </div>
              )}

              {/* Accessibility pills */}
              {renderAccessibilityPills(currentServing.accessibility_needs)}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4">
              <div className="text-5xl font-bold text-slate-500">
                Ready for Next Patient
              </div>
              <div className="text-2xl text-slate-600">
                Doctor will call shortly
              </div>
            </div>
          )}
        </div>

        {/* ── RIGHT 40% — Upcoming + QR ──────────────────────────────────────── */}
        <div className="w-[40%] flex flex-col gap-6 overflow-hidden">

          {/* Upcoming Queue Panel */}
          <div className="flex-1 bg-slate-900 border border-slate-800 rounded-3xl p-6 flex flex-col overflow-hidden">
            <h2 className="text-xl font-black tracking-widest text-slate-300 uppercase border-b border-slate-800 pb-3 mb-3 shrink-0">
              NEXT IN QUEUE
            </h2>

            {upcoming.length === 0 ? (
              <div className="flex-1 flex items-center justify-center">
                <p className="text-slate-500 text-xl font-semibold">
                  No patients waiting
                </p>
              </div>
            ) : (
              <div className="flex-1 flex flex-col divide-y divide-slate-800 overflow-hidden">
                {upcoming.map((item, idx) => (
                  <div
                    key={item.token_id}
                    className="flex items-center justify-between py-3"
                  >
                    <div className="flex items-center gap-4">
                      {/* Position badge */}
                      <span className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center font-bold text-slate-300 shrink-0">
                        {idx + 1}
                      </span>
                      {/* Token number */}
                      <span className="text-4xl font-black text-white">
                        #{item.token_number}
                      </span>
                      {/* Patient initials */}
                      <span className="text-xl text-slate-400 font-semibold">
                        {item.patient_initials}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {item.status === 'hold' && (
                        <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 px-3 py-1 rounded-md text-sm font-bold">
                          HOLD
                        </span>
                      )}
                      {item.is_senior && (
                        <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 px-3 py-1 rounded-md text-sm font-bold">
                          SENIOR
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Clinic Guidance Panel */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 flex items-center gap-5 shrink-0">
            <div className="w-14 h-14 rounded-2xl bg-primary/20 border border-primary/40 flex items-center justify-center text-primary-400 font-bold shrink-0">
              <Info className="w-7 h-7" />
            </div>
            <div>
              <p className="text-xl font-black text-white">
                Queue Instructions & Senior Care
              </p>
              <p className="text-sm text-slate-300 mt-1">
                Patients are called in sequential order. Senior Citizens (60+) receive automatic priority care.
              </p>
              <p className="text-xs text-slate-400 mt-1.5 font-medium">
                Please remain seated in the waiting lobby until your token number is announced.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ══ ZONE 3 — Bottom Ticker (10%) ════════════════════════════════════════ */}
      <div className="flex items-center justify-between px-8 py-4 border-t border-slate-800 shrink-0">
        {/* Left — Clinic hours */}
        <div className="text-lg font-semibold text-slate-400">
          🕘 {t('display.clinicHours')}
        </div>

        {/* Center — Live dot */}
        <div className="flex items-center gap-2 text-emerald-400 font-bold">
          <Wifi className="w-5 h-5" />
          <span className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse" />
          <span>LIVE</span>
        </div>

        {/* Right — Project credit */}
        <div className="text-sm text-slate-600">
          KSIT CSE Project • 25BCP308
        </div>
      </div>
    </div>
  );
};
