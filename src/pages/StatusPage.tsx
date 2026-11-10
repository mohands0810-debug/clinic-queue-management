import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams, Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { computeWaitEstimateRPC, WaitEstimateResult } from '@/lib/queue-api';
import { Token } from '@/types/database';
import { useAccessibility } from '@/context/AccessibilityContext';
import { 
  ArrowLeft, 
  Clock, 
  MapPin, 
  Share2, 
  Volume2
} from 'lucide-react';

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

  useEffect(() => {
    if (tokenId) {
      fetchTokenDetails(tokenId);

      // Listen for real-time status updates on this specific token
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
            // Recompute wait estimate on status update
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

        // Fetch dynamic wait estimate via RPC
        try {
          const est = await computeWaitEstimateRPC(id);
          setWaitEstimate(est);
          setPatientsAhead(est.patients_ahead);
          setEstimatedWaitMins(est.estimated_mins);
        } catch {
          setEstimatedWaitMins(15);
        }
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
    const statusMsg = `Your token number is ${token.token_number}. Current status: ${token.status}. There are ${patientsAhead} patients ahead of you. Estimated wait is about ${estimatedWaitMins} minutes.`;
    speakText(statusMsg);
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
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
        <div className="bg-card border rounded-2xl p-8 text-center text-xl font-bold text-muted-foreground animate-pulse">
          {t('common.loading')}
        </div>
      ) : !tokenId || !token ? (
        <div className="bg-card border rounded-2xl p-6 shadow-sm space-y-5 text-center">
          <h2 className="text-2xl font-bold">{t('home.checkMyToken')}</h2>
          <p className="text-muted-foreground">
            Enter your token number to view your live queue position:
          </p>
          <form onSubmit={handleManualSearch} className="flex gap-2 max-w-sm mx-auto">
            <input
              type="number"
              placeholder="e.g. 14"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 h-14 px-4 text-xl border rounded-xl"
            />
            <button
              type="submit"
              className="px-6 h-14 bg-primary text-primary-foreground font-bold rounded-xl"
            >
              Check
            </button>
          </form>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Main Status Hero Card */}
          <div className="bg-card border-2 border-primary/20 rounded-2xl p-6 text-center shadow-lg space-y-4">
            <span className="text-sm font-bold text-muted-foreground uppercase tracking-widest">
              {t('status.myToken')}
            </span>

            <div className="text-7xl md:text-9xl font-black text-primary tracking-tight">
              #{token.token_number}
            </div>

            {/* Status Badge */}
            <div className="inline-block px-4 py-1.5 rounded-full text-lg font-bold bg-primary/10 text-primary">
              {token.status === 'waiting' && t('status.stateWaiting')}
              {token.status === 'called' && (
                <span className="text-emerald-600 animate-pulse">
                  {t('status.stateCalled')}
                </span>
              )}
              {token.status === 'in_progress' && t('status.stateInProgress')}
              {token.status === 'hold' && t('status.stateHold')}
              {token.status === 'missed' && (
                <span className="text-destructive font-bold">
                  {t('status.stateMissed')}
                </span>
              )}
              {token.status === 'completed' && t('status.stateCompleted')}
            </div>

            {/* Queue Metrics */}
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border max-w-md mx-auto">
              <div>
                <p className="text-sm font-semibold text-muted-foreground">
                  {t('status.patientsAhead')}
                </p>
                <p className="text-3xl font-extrabold text-foreground">
                  {patientsAhead}
                </p>
              </div>
              <div>
                <p className="text-sm font-semibold text-muted-foreground">
                  {t('status.estimatedWait')}
                </p>
                <p className="text-3xl font-extrabold text-foreground">
                  ~{estimatedWaitMins} mins
                </p>
                {waitEstimate && (
                  <p className="text-xs text-muted-foreground font-medium">
                    (could be {waitEstimate.range_min}–{waitEstimate.range_max} mins)
                  </p>
                )}
              </div>
            </div>

            {/* Delay Transparency Note */}
            {waitEstimate?.delay_note && (
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 rounded-xl text-sm font-bold flex items-center justify-center gap-2">
                <span>⚠️ {waitEstimate.delay_note}</span>
              </div>
            )}

            {/* Arrival Guidance */}
            <div className="p-3 bg-muted rounded-xl text-foreground font-semibold flex items-center justify-center gap-2">
              <Clock className="w-5 h-5 text-primary" />
              <span>
                {t('status.suggestedArrival')}: {waitEstimate?.come_by_time ? new Date(waitEstimate.come_by_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '15 mins before call'}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            {/* Reached Clinic Button */}
            <button
              onClick={handleMarkReached}
              disabled={hasReached}
              className={`w-full h-16 rounded-2xl font-bold text-xl flex items-center justify-center gap-2 shadow-md transition-colors ${
                hasReached
                  ? 'bg-emerald-100 text-emerald-800 border-2 border-emerald-500 cursor-default'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white'
              }`}
            >
              <MapPin className="w-6 h-6" />
              <span>
                {hasReached
                  ? t('status.reachedConfirmed')
                  : t('status.reachedButton')}
              </span>
            </button>

            {/* Read to Me Button */}
            <button
              onClick={handleReadStatus}
              className="w-full h-14 border-2 rounded-xl font-bold text-lg flex items-center justify-center gap-2 hover:bg-muted"
            >
              <Volume2 className="w-5 h-5 text-primary" />
              <span>{t('common.readToMe')}</span>
            </button>

            {/* WhatsApp Family Share */}
            <button
              onClick={handleShareWhatsApp}
              className="w-full h-14 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold text-lg flex items-center justify-center gap-2 shadow-sm"
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
