import React, { useEffect, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/lib/supabase';
import { PublicQueueItem, ClinicSettings } from '@/types/database';
import { QRCodeSVG } from 'qrcode.react';
import { AlertTriangle, Clock, Sparkles } from 'lucide-react';

export const DisplayPage: React.FC = () => {
  const { t } = useTranslation();
  const [currentServing, setCurrentServing] = useState<PublicQueueItem | null>(null);
  const [upcoming, setUpcoming] = useState<PublicQueueItem[]>([]);
  const [settings, setSettings] = useState<ClinicSettings | null>(null);
  const lastCalledTokenRef = useRef<number | null>(null);

  const appUrl = window.location.origin;

  useEffect(() => {
    fetchDisplayData();

    // Listen to real-time changes
    const channel = supabase
      .channel('display-room')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tokens' },
        () => {
          fetchDisplayData();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'clinic_settings' },
        (payload) => {
          setSettings(payload.new as ClinicSettings);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchDisplayData = async () => {
    // 1. Fetch clinic settings
    const { data: settingsData } = await supabase
      .from('clinic_settings')
      .select('*')
      .limit(1)
      .maybeSingle();

    if (settingsData) setSettings(settingsData as ClinicSettings);

    // 2. Fetch public queue
    const { data: queueData } = await supabase
      .from('public_queue')
      .select('*');

    if (queueData) {
      const items = queueData as PublicQueueItem[];
      const active = items.find((i) => i.status === 'in_progress' || i.status === 'called');
      const waiting = items.filter((i) => i.status === 'waiting').slice(0, 5);

      setCurrentServing(active || null);
      setUpcoming(waiting);

      // Play audio chime and voice announcement if a new token is called
      if (active && active.status === 'called' && active.token_number !== lastCalledTokenRef.current) {
        lastCalledTokenRef.current = active.token_number;
        playCallAnnouncement(active.token_number);
      }
    }
  };

  const playCallAnnouncement = (num: number) => {
    if (!('speechSynthesis' in window)) return;

    // Web Audio Chime (440Hz -> 880Hz)
    try {
      const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
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

    // Voice announcement in Kannada then English
    setTimeout(() => {
      const uKn = new SpeechSynthesisUtterance(`ಟೋಕನ್ ಸಂಖ್ಯೆ ${num}, ದಯವಿಟ್ಟು ವೈದ್ಯರ ಕೋಣೆಗೆ ಬನ್ನಿ.`);
      uKn.lang = 'kn-IN';
      uKn.rate = 0.85;

      const uEn = new SpeechSynthesisUtterance(`Token number ${num}, please proceed to the doctor's room.`);
      uEn.lang = 'en-IN';
      uEn.rate = 0.9;

      window.speechSynthesis.speak(uKn);
      window.speechSynthesis.speak(uEn);
    }, 600);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6 md:p-10 flex flex-col justify-between">
      {/* Top Banner */}
      <div className="flex flex-wrap items-center justify-between border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-3xl md:text-5xl font-black tracking-tight text-white">
            {settings?.clinic_name || 'DHANVANTRI CLINIC'}
          </h1>
          <p className="text-xl md:text-2xl text-slate-400 font-semibold mt-1">
            {settings?.doctor_name || 'Dr Yogesh'} • Sandhya Theater Complex, BTM Layout
          </p>
        </div>

        {/* Doctor Status Banner on TV */}
        <div className="text-right">
          {settings?.doctor_status === 'break' && (
            <div className="bg-amber-500/20 border-2 border-amber-500 text-amber-300 px-6 py-2 rounded-xl text-xl font-bold flex items-center gap-2">
              <AlertTriangle className="w-6 h-6" />
              <span>Break: {settings.delay_reason || 'Clinical break'}</span>
            </div>
          )}
          {settings?.doctor_status === 'emergency' && (
            <div className="bg-red-500/20 border-2 border-red-500 text-red-300 px-6 py-2 rounded-xl text-xl font-bold flex items-center gap-2">
              <AlertTriangle className="w-6 h-6" />
              <span>Doctor Attending Emergency Consultation</span>
            </div>
          )}
          {(!settings || settings.doctor_status === 'available') && (
            <div className="bg-emerald-500/20 border-2 border-emerald-500 text-emerald-300 px-6 py-2 rounded-xl text-xl font-bold flex items-center gap-2">
              <span className="w-4 h-4 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>Doctor Available</span>
            </div>
          )}
        </div>
      </div>

      {/* Main Grid: Left = Now Serving (Oversized), Right = Next in line & QR */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 my-auto py-6">
        {/* Left Column: Now Serving (7 cols) */}
        <div className="lg:col-span-7 bg-slate-900 border-2 border-primary/40 rounded-3xl p-8 flex flex-col items-center justify-center text-center shadow-2xl">
          <span className="text-2xl md:text-3xl font-black text-primary-400 tracking-widest uppercase">
            {t('display.nowServing')}
          </span>

          {currentServing ? (
            <div className="my-6">
              <div className="text-8xl md:text-[12rem] font-black tracking-tight text-white drop-shadow-lg leading-none">
                #{currentServing.token_number}
              </div>
              <div className="mt-4 text-3xl font-bold text-slate-300">
                Patient: {currentServing.patient_initials}
              </div>
              {currentServing.is_senior && (
                <div className="mt-3 inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-400/20 border border-amber-400 text-amber-300 text-xl font-bold">
                  <Sparkles className="w-6 h-6" />
                  <span>Senior Citizen Priority</span>
                </div>
              )}
            </div>
          ) : (
            <div className="my-12 text-4xl font-bold text-slate-500">
              Ready for next consultation
            </div>
          )}
        </div>

        {/* Right Column: Upcoming Tokens & Scan to Join (5 cols) */}
        <div className="lg:col-span-5 flex flex-col justify-between gap-6">
          {/* Upcoming Tokens List */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
            <h2 className="text-xl md:text-2xl font-bold text-slate-300 uppercase tracking-wider mb-4 border-b border-slate-800 pb-2">
              {t('display.upcomingQueue')}
            </h2>

            <div className="space-y-3">
              {upcoming.length === 0 ? (
                <p className="text-slate-500 text-lg font-semibold py-4">
                  No upcoming waiting patients
                </p>
              ) : (
                upcoming.map((item, idx) => (
                  <div
                    key={item.token_id}
                    className="flex items-center justify-between p-3.5 bg-slate-800/80 rounded-xl border border-slate-700/50"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center font-bold text-slate-300 text-sm">
                        {idx + 1}
                      </span>
                      <span className="text-3xl font-black text-white">
                        #{item.token_number}
                      </span>
                      <span className="text-xl text-slate-300 font-semibold">
                        ({item.patient_initials})
                      </span>
                    </div>

                    {item.is_senior && (
                      <span className="px-3 py-1 rounded-md bg-amber-500/20 text-amber-300 text-sm font-bold border border-amber-500/40">
                        Senior
                      </span>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Join Queue QR Code Box */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 flex items-center gap-6">
            <div className="p-3 bg-white rounded-2xl flex-shrink-0">
              <QRCodeSVG
                value={`${appUrl}/get-token`}
                size={110}
                level="M"
              />
            </div>
            <div>
              <p className="text-xl font-bold text-white">
                {t('display.scanToJoin')}
              </p>
              <p className="text-sm text-slate-400 mt-1">
                Scan with your smartphone camera to get your token instantly without waiting in line.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Ticker */}
      <div className="border-t border-slate-800 pt-4 flex flex-wrap items-center justify-between text-slate-400 text-lg font-semibold">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-primary-400" />
          <span>{t('display.clinicHours')}</span>
        </div>
        <div>
          KSIT CSE Community Project 25BCP308 • Dr Yogesh
        </div>
      </div>
    </div>
  );
};
