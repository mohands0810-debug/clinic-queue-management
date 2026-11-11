import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams, Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { computeWaitEstimateRPC, WaitEstimateResult } from '@/lib/queue-api';
import { Token } from '@/types/database';
import { useAccessibility } from '@/context/AccessibilityContext';
import { ArrowLeft, Clock, MapPin, Share2, Volume2 } from 'lucide-react';

export const StatusPage: React.FC = () => {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const { speakText } = useAccessibility();

  const tokenIdParam = searchParams.get('id');
  const [tokenId, setTokenId] = useState<string | null>(
    tokenIdParam || localStorage.getItem('dhanvantri_active_token_id')
  );

  const [token, setToken] = useState<Token | null>(null);
  const [patientsAhead, setPatientsAhead] = useState<number>(0);
  const [estimatedWaitMins, setEstimatedWaitMins] = useState<number>(15);
  const [waitEstimate, setWaitEstimate] = useState<WaitEstimateResult | null>(null);
  const [hasReached, setHasReached] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Track whether we've already spoken the "called" alert to avoid repeating
  const hasSpokenCalled = useRef<boolean>(false);

  useEffect(() => {
    if (tokenId) {
      fetchTokenDetails(tokenId);

      const channel = supabase
        .channel(`token-${tokenId}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'tokens',
            filter: `id=eq.${tokenId}`,
          },
          (payload) => {
            const updated = payload.new as Token;
            setToken(updated);
            setHasReached(updated.arrived_at_clinic);
            computeWaitEstimateRPC(tokenId)
              .then((est) => {
                setWaitEstimate(est);
                setPatientsAhead(est.patients_ahead);
                setEstimatedWaitMins(est.estimated_mins);
              })
              .catch(console.warn);
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    } else {
      setLoading(false);
    }
  }, [tokenId]);

  // Auto-speak when status becomes 'called' for the first time
  useEffect(() => {
    if (token?.status === 'called' && !hasSpokenCalled.current) {
      hasSpokenCalled.current = true;
      speakText(t('status.calledSpoken', { num: token.token_number }));
    }
  }, [token?.status, token?.token_number, speakText, t]);

  const fetchTokenDetails = async (id: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('tokens')
        .select('*, patient:patients(*)')
        .eq('id', id)
        .maybeSingle();

      if (!error && data) {
        setToken(data as Token);
        setHasReached(data.arrived_at_clinic);

        try {
          const est = await computeWaitEstimateRPC(id);
          setWaitEstimate(est);
          setPatientsAhead(est.patients_ahead);
          setEstimatedWaitMins(est.estimated_mins);
        } catch {
          setEstimatedWaitMins(15);
        }
      } else {
        setToken(null);
        localStorage.removeItem('dhanvantri_active_token_id');
      }
    } catch (err) {
      console.error('Failed to fetch token status:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleManualSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    const num = parseInt(searchQuery, 10);
    const today = new Date().toISOString().split('T')[0];

    const { data } = await supabase
      .from('tokens')
      .select('id')
      .eq('queue_date', today)
      .eq('token_number', num)
      .maybeSingle();

    if (data) {
      setTokenId(data.id);
      localStorage.setItem('dhanvantri_active_token_id', data.id);
    } else {
      alert(`Token #${searchQuery} not found for today.`);
    }
  };

  const handleMarkReached = async () => {
    if (!tokenId) return;
    setHasReached(true);
    await supabase
      .from('tokens')
      .update({ arrived_at_clinic: true, arrived_at: new Date().toISOString() })
      .eq('id', tokenId);
  };

  const handleShareWhatsApp = () => {
    if (!token) return;
    const shareUrl = window.location.href;
    const text = encodeURIComponent(
      `Tracking token #${token.token_number} with Dr Yogesh at Dhanvantri Clinic. Status: ${token.status}. Ahead: ${patientsAhead}. Live tracker: ${shareUrl}`
    );
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  const handleReadStatus = () => {
    if (!token) return;
    const statusLabel = t(
      `status.state${token.status.charAt(0).toUpperCase() + token.status.slice(1)}`
    );
    const statusMsg = t('status.statusSpoken', {
      num: token.token_number,
      status: statusLabel,
      ahead: patientsAhead,
      wait: estimatedWaitMins,
    });
    speakText(statusMsg);
  };

  // Derive status badge config
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'waiting':
        return {
          text: t('status.stateWaiting'),
          className: 'bg-blue-100 text-blue-800 border-blue-300',
          pulse: false,
        };
      case 'called':
        return {
          text: `🔔 ${t('status.stateCalled')}`,
          className: 'bg-emerald-100 text-emerald-800 border-emerald-400 animate-pulse',
          pulse: true,
        };
      case 'in_progress':
        return {
          text: t('status.stateInProgress'),
          className: 'bg-emerald-100 text-emerald-800 border-emerald-300',
          pulse: false,
        };
      case 'hold':
        return {
          text: t('status.stateHold'),
          className: 'bg-amber-100 text-amber-800 border-amber-300',
          pulse: false,
        };
      case 'missed':
        return {
          text: t('status.stateMissed'),
          className: 'bg-red-100 text-red-800 border-red-300',
          pulse: false,
        };
      case 'completed':
        return {
          text: t('status.stateCompleted'),
          className: 'bg-gray-100 text-gray-700 border-gray-300',
          pulse: false,
        };
      default:
        return {
          text: status,
          className: 'bg-muted text-foreground border-border',
          pulse: false,
        };
    }
  };

  const isCalled = token?.status === 'called';

  return (
    <div className={`max-w-2xl mx-auto px-4 py-6 space-y-6 ${isCalled ? 'pt-24' : ''}`}>

      {/* Called Flash Banner — fixed top of page */}
      {isCalled && token && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-emerald-500 text-white text-center py-4 px-6 font-black text-xl animate-bounce shadow-2xl">
          🔔 Token #{token.token_number} — YOUR TURN! Please go in.
        </div>
      )}

      {/* Back Navigation */}
      <div className="flex items-center justify-between">
        <Link
          to="/"
          className="inline-flex items-center gap-2 font-bold text-primary hover:underline text-lg"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>{t('nav.home')}</span>
        </Link>
      </div>

      {loading ? (
        <div className="bg-card border rounded-2xl p-10 text-center text-2xl font-bold text-muted-foreground animate-pulse">
          {t('common.loading')}
        </div>
      ) : !tokenId || !token ? (
        /* Manual Token Search */
        <div className="bg-card border rounded-2xl p-6 shadow-sm space-y-5 text-center">
          <h2 className="text-2xl font-extrabold">{t('home.checkMyToken')}</h2>
          <p className="text-muted-foreground text-lg font-medium">
            Enter your token number to view your live queue position:
          </p>
          <form onSubmit={handleManualSearch} className="flex gap-3 max-w-sm mx-auto">
            <input
              type="number"
              placeholder="e.g. 14"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 h-16 px-4 text-2xl border-2 rounded-xl font-bold text-center focus:ring-2 focus:ring-primary focus:outline-none"
            />
            <button
              type="submit"
              className="px-6 h-16 bg-primary text-primary-foreground font-bold text-xl rounded-xl hover:bg-primary-700 shadow-md"
            >
              Check
            </button>
          </form>
        </div>
      ) : (
        <div className="space-y-5">
          {/* Token Hero Card */}
          <div className="bg-card border-2 border-primary/20 rounded-2xl p-6 text-center shadow-lg space-y-4">
            <span className="text-sm font-bold text-muted-foreground uppercase tracking-widest">
              {t('status.myToken')}
            </span>

            <div className="text-8xl md:text-9xl font-black text-primary tracking-tight leading-none py-2">
              #{token.token_number}
            </div>

            {/* Status Badge */}
            {(() => {
              const badge = getStatusBadge(token.status);
              return (
                <div
                  className={`inline-block px-5 py-2 rounded-full text-lg font-extrabold border-2 ${badge.className}`}
                >
                  {badge.text}
                </div>
              );
            })()}

            {/* Queue Metrics */}
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border max-w-sm mx-auto">
              <div className="text-center">
                <p className="text-sm font-semibold text-muted-foreground">
                  {t('status.patientsAhead')}
                </p>
                <p className="text-3xl font-extrabold text-foreground">{patientsAhead}</p>
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-muted-foreground">
                  {t('status.estimatedWait')}
                </p>
                <p className="text-3xl font-extrabold text-foreground">~{estimatedWaitMins} mins</p>
                {waitEstimate && (
                  <p className="text-xs text-muted-foreground font-medium mt-0.5">
                    ({waitEstimate.range_min}–{waitEstimate.range_max} mins)
                  </p>
                )}
              </div>
            </div>

            {/* Delay Note */}
            {waitEstimate?.delay_note && (
              <div className="p-3 bg-amber-50 border border-amber-300 text-amber-800 rounded-xl text-sm font-bold flex items-center justify-center gap-2">
                <span>⚠️ {waitEstimate.delay_note}</span>
              </div>
            )}

            {/* Arrival Time Guidance */}
            <div className="p-3 bg-muted rounded-xl text-foreground font-semibold flex items-center justify-center gap-2 text-base">
              <Clock className="w-5 h-5 text-primary" />
              <span>
                {t('status.suggestedArrival')}:{' '}
                {waitEstimate?.come_by_time
                  ? new Date(waitEstimate.come_by_time).toLocaleTimeString('en-IN', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : '15 mins before call'}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            {/* I Have Reached Clinic */}
            <button
              onClick={handleMarkReached}
              disabled={hasReached}
              className={`w-full h-16 rounded-2xl font-bold text-xl flex items-center justify-center gap-2 shadow-md transition-all duration-200 active:scale-95 interactive-card ${
                hasReached
                  ? 'bg-emerald-100 text-emerald-800 border-2 border-emerald-500 cursor-default'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white'
              }`}
            >
              <MapPin className="w-6 h-6" />
              <span>
                {hasReached ? t('status.reachedConfirmed') : t('status.reachedButton')}
              </span>
            </button>

            {/* Read to Me */}
            <button
              onClick={handleReadStatus}
              className="w-full h-14 border-2 rounded-xl font-bold text-lg flex items-center justify-center gap-2 hover:bg-muted transition-colors"
            >
              <Volume2 className="w-5 h-5 text-primary" />
              <span>{t('common.readToMe')}</span>
            </button>

            {/* WhatsApp Share */}
            <button
              onClick={handleShareWhatsApp}
              className="w-full h-14 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold text-lg flex items-center justify-center gap-2 shadow-sm transition-colors"
            >
              <Share2 className="w-5 h-5" />
              <span>{t('status.shareWhatsApp')}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
