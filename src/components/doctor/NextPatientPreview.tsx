import React from 'react';
import { Token } from '@/types/database';
import { ArrowRight, Sparkles, MapPin, Clock, Accessibility } from 'lucide-react';

interface NextPatientPreviewProps {
  token: Token | null;
  onCallNow: () => void;
  loading: boolean;
}

export const NextPatientPreview: React.FC<NextPatientPreviewProps> = ({
  token,
  onCallNow,
  loading,
}) => {
  if (!token) {
    return (
      <div className="bg-card border rounded-2xl p-4 shadow-sm text-center py-6 text-muted-foreground text-sm font-semibold">
        No next patient waiting in line
      </div>
    );
  }

  return (
    <div className="bg-card border rounded-2xl p-4 shadow-sm space-y-3">
      <div className="flex items-center justify-between border-b pb-2">
        <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5" />
          Next Patient Preview
        </span>

        {token.arrived_at_clinic ? (
          <span className="px-2 py-0.5 rounded text-[11px] font-extrabold bg-emerald-100 text-emerald-800 flex items-center gap-1">
            <MapPin className="w-3 h-3 text-emerald-600" />
            In Lobby
          </span>
        ) : (
          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-muted text-muted-foreground">
            Awaiting Arrival
          </span>
        )}
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-muted text-foreground flex items-center justify-center font-black text-2xl border">
            #{token.token_number}
          </div>

          <div>
            <h4 className="font-extrabold text-foreground text-lg leading-snug">
              {token.patient?.full_name || 'Walk-In Patient'}
            </h4>
            <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
              <span>Age: {token.patient?.age ?? '--'} yrs</span>
              {token.patient?.is_senior && (
                <span className="text-amber-600 flex items-center gap-0.5 font-bold">
                  <Sparkles className="w-3 h-3" /> Senior Care
                </span>
              )}
            </div>
          </div>
        </div>

        <button
          onClick={onCallNow}
          disabled={loading}
          className="h-11 px-4 bg-primary hover:bg-primary-700 text-primary-foreground font-bold text-sm rounded-xl flex items-center gap-1.5 shadow-sm disabled:opacity-50 transition-colors"
        >
          <span>Call Now</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {token.patient?.accessibility_needs && token.patient.accessibility_needs.length > 0 && (
        <div className="pt-1 flex items-center gap-1.5 text-xs text-blue-700 font-bold bg-blue-50 dark:bg-blue-950/30 p-2 rounded-lg">
          <Accessibility className="w-4 h-4 flex-shrink-0" />
          <span>Prepare for: {token.patient.accessibility_needs.join(', ')}</span>
        </div>
      )}
    </div>
  );
};

