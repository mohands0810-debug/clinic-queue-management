import React, { useEffect, useState } from 'react';
import { Token } from '@/types/database';
import { 
  Play, 
  Check, 
  Pause, 
  UserX, 
  ArrowRight, 
  Phone, 
  Sparkles, 
  Accessibility, 
  VolumeX, 
  Eye, 
  HeartHandshake, 
  Clock, 
  AlertTriangle, 
  MapPin, 
  X 
} from 'lucide-react';

interface CurrentPatientCardProps {
  token: Token | null;
  onCallNext: () => void;
  onStart: (tokenId: string) => void;
  onComplete: (tokenId: string) => void;
  onHold: (tokenId: string, holdMins: number) => void;
  onMissed: (tokenId: string) => void;
  onCancel: (tokenId: string) => void;
  loading: boolean;
  defaultDurationMins?: number;
}

export const CurrentPatientCard: React.FC<CurrentPatientCardProps> = ({
  token,
  onCallNext,
  onStart,
  onComplete,
  onHold,
  onMissed,
  onCancel,
  loading,
  defaultDurationMins = 8,
}) => {
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [showHoldModal, setShowHoldModal] = useState<boolean>(false);
  const [holdDuration, setHoldDuration] = useState<number>(10);

  // Live timer for ongoing consultation
  useEffect(() => {
    if (!token || token.status !== 'in_progress' || !token.started_at) {
      setElapsedSeconds(0);
      return;
    }

    const startTs = new Date(token.started_at).getTime();

    const updateTimer = () => {
      const now = Date.now();
      setElapsedSeconds(Math.max(0, Math.floor((now - startTs) / 1000)));
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [token]);

  const elapsedMins = Math.floor(elapsedSeconds / 60);
  const elapsedSecsRem = elapsedSeconds % 60;
  const isDelayed = elapsedMins >= Math.round(defaultDurationMins * 1.5);

  const formatTimer = () => {
    const mm = String(elapsedMins).padStart(2, '0');
    const ss = String(elapsedSecsRem).padStart(2, '0');
    return `${mm}:${ss}`;
  };

  return (
    <div className="bg-card border-2 border-primary/40 rounded-3xl p-6 shadow-md relative overflow-hidden">
      {/* Top Header Tag */}
      <div className="flex items-center justify-between border-b pb-3 mb-4">
        <span className="text-xs font-bold text-primary uppercase tracking-widest flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse"></span>
          Active Consultation Room
        </span>

        {token && (
          <span className={`px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wide ${
            token.status === 'in_progress'
              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
              : 'bg-amber-100 text-amber-800 border border-amber-300'
          }`}>
            {token.status === 'in_progress' ? '● In Consultation' : '● Called (Entering)'}
          </span>
        )}
      </div>

      {!token ? (
        <div className="py-12 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto text-muted-foreground">
            <Clock className="w-8 h-8" />
          </div>
          <div className="text-2xl font-bold text-foreground">
            No Patient in Consultation
          </div>
          <p className="text-muted-foreground max-w-sm mx-auto text-sm">
            Click "Call Next Patient" to advance the waiting line using Senior Fair Interleaving.
          </p>
          <button
            onClick={onCallNext}
            disabled={loading}
            className="h-16 px-8 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xl rounded-2xl shadow-lg transition-all transform active:scale-95 disabled:opacity-50"
          >
            {loading ? 'Calling...' : 'Call Next Patient'}
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Main Info Hero */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-24 h-24 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center font-black text-5xl shadow-md">
                #{token.token_number}
              </div>

              <div>
                <h3 className="text-2xl md:text-3xl font-extrabold text-foreground leading-tight">
                  {token.patient?.full_name || 'Walk-In Patient'}
                </h3>
                <div className="flex flex-wrap items-center gap-3 text-sm font-semibold text-muted-foreground mt-1">
                  <span>Age: {token.patient?.age ?? '--'} yrs</span>
                  {token.patient?.phone && (
                    <a
                      href={`tel:${token.patient.phone}`}
                      className="text-primary hover:underline flex items-center gap-1 font-bold"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      <span>{token.patient.phone}</span>
                    </a>
                  )}
                  <span className="capitalize">Source: {token.source.replace('_', ' ')}</span>
                </div>
              </div>
            </div>

            {/* Live Consultation Clock */}
            {token.status === 'in_progress' && (
              <div className={`p-4 rounded-2xl border text-center min-w-[130px] ${
                isDelayed 
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-300' 
                  : 'bg-muted/70 text-foreground'
              }`}>
                <span className="text-xs font-bold uppercase tracking-wider block text-muted-foreground">
                  Consultation Time
                </span>
                <span className="text-3xl font-black font-mono">
                  {formatTimer()}
                </span>
                {isDelayed && (
                  <span className="text-[10px] font-bold text-amber-600 block mt-0.5 flex items-center justify-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> Pace delay
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Badges & Accessibility Needs */}
          <div className="flex flex-wrap items-center gap-2 pt-1 border-t">
            {token.patient?.is_senior && (
              <span className="px-3 py-1 rounded-lg text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1">
                <Sparkles className="w-4 h-4 text-amber-600" />
                Senior Citizen (Fair Lane)
              </span>
            )}

            {token.arrived_at_clinic ? (
              <span className="px-3 py-1 rounded-lg text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                <MapPin className="w-4 h-4 text-emerald-600" />
                Present in Clinic Lobby
              </span>
            ) : (
              <span className="px-3 py-1 rounded-lg text-xs font-bold bg-muted text-muted-foreground border flex items-center gap-1">
                <Clock className="w-4 h-4" />
                En Route / Remote Waiting
              </span>
            )}

            {token.patient?.accessibility_needs?.includes('wheelchair') && (
              <span className="px-3 py-1 rounded-lg text-xs font-bold bg-blue-100 text-blue-800 border border-blue-300 flex items-center gap-1">
                <Accessibility className="w-4 h-4" /> Wheelchair / Walker
              </span>
            )}

            {token.patient?.accessibility_needs?.includes('hearing') && (
              <span className="px-3 py-1 rounded-lg text-xs font-bold bg-purple-100 text-purple-800 border border-purple-300 flex items-center gap-1">
                <VolumeX className="w-4 h-4" /> Hearing Impairment
              </span>
            )}

            {token.patient?.accessibility_needs?.includes('vision') && (
              <span className="px-3 py-1 rounded-lg text-xs font-bold bg-indigo-100 text-indigo-800 border border-indigo-300 flex items-center gap-1">
                <Eye className="w-4 h-4" /> Vision Assistance
              </span>
            )}

            {token.patient?.accessibility_needs?.includes('assistance') && (
              <span className="px-3 py-1 rounded-lg text-xs font-bold bg-slate-100 text-slate-800 border border-slate-300 flex items-center gap-1">
                <HeartHandshake className="w-4 h-4" /> Needs Physical Assistance
              </span>
            )}
          </div>

          {/* Atomic Operational Controls */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            {token.status === 'called' && (
              <button
                onClick={() => onStart(token.id)}
                disabled={loading}
                className="h-14 bg-primary hover:bg-primary-700 text-primary-foreground font-bold text-base rounded-xl flex items-center justify-center gap-2 shadow-sm transition-colors"
              >
                <Play className="w-5 h-5 fill-current" />
                <span>Start</span>
              </button>
            )}

            {token.status === 'in_progress' && (
              <button
                onClick={() => onComplete(token.id)}
                disabled={loading}
                className="h-14 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-base rounded-xl flex items-center justify-center gap-2 shadow-md transition-colors"
              >
                <Check className="w-5 h-5 stroke-[3]" />
                <span>Complete</span>
              </button>
            )}

            <button
              onClick={() => setShowHoldModal(true)}
              disabled={loading}
              className="h-14 border rounded-xl font-bold text-base hover:bg-muted text-amber-600 flex items-center justify-center gap-2 transition-colors"
              title="Patient stepped out"
            >
              <Pause className="w-5 h-5" />
              <span>Hold Turn</span>
            </button>

            <button
              onClick={() => onMissed(token.id)}
              disabled={loading}
              className="h-14 border rounded-xl font-bold text-base hover:bg-muted text-destructive flex items-center justify-center gap-2 transition-colors"
              title="Patient didn't show up. Starts 5-min grace countdown."
            >
              <UserX className="w-5 h-5" />
              <span>Mark Missed</span>
            </button>

            <button
              onClick={onCallNext}
              disabled={loading}
              className="h-14 border rounded-xl font-bold text-base hover:bg-muted text-foreground flex items-center justify-center gap-2 transition-colors"
            >
              <ArrowRight className="w-5 h-5" />
              <span>Next Patient</span>
            </button>
          </div>

          {/* Quick Cancel Button at bottom right */}
          <div className="text-right pt-2 border-t">
            <button
              onClick={() => {
                if (window.confirm(`Cancel Token #${token.token_number} for ${token.patient?.full_name}?`)) {
                  onCancel(token.id);
                }
              }}
              className="text-xs font-bold text-muted-foreground hover:text-destructive transition-colors"
            >
              Cancel Token
            </button>
          </div>
        </div>
      )}

      {/* Hold Turn Modal */}
      {showHoldModal && token && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-card border rounded-2xl p-6 max-w-sm w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-2">
              <h4 className="font-bold text-lg text-foreground">Hold Patient Turn</h4>
              <button
                onClick={() => setShowHoldModal(false)}
                className="text-muted-foreground hover:text-foreground font-bold"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-sm text-muted-foreground">
              Patient <strong>#{token.token_number} ({token.patient?.full_name})</strong> stepped out. How long to hold their slot?
            </p>

            <div className="grid grid-cols-3 gap-2">
              {[5, 10, 15].map((mins) => (
                <button
                  key={mins}
                  onClick={() => setHoldDuration(mins)}
                  className={`h-12 rounded-xl font-bold text-sm border transition-colors ${
                    holdDuration === mins ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-muted'
                  }`}
                >
                  {mins} mins
                </button>
              ))}
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setShowHoldModal(false)}
                className="w-1/2 h-12 border rounded-xl font-bold hover:bg-muted"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onHold(token.id, holdDuration);
                  setShowHoldModal(false);
                }}
                className="w-1/2 h-12 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold shadow"
              >
                Confirm Hold
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

