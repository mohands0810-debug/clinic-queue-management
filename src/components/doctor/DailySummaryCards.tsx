import React from 'react';
import { Token } from '@/types/database';
import { Users, CheckCircle2, Clock, Sparkles } from 'lucide-react';

interface DailySummaryCardsProps {
  tokens: Token[];
  defaultConsultMins?: number;
}

export const DailySummaryCards: React.FC<DailySummaryCardsProps> = ({ tokens, defaultConsultMins = 8 }) => {
  const totalTokens = tokens.length;
  const completedTokens = tokens.filter((t) => t.status === 'completed');
  const waitingTokens = tokens.filter((t) => t.status === 'waiting' || t.status === 'hold');
  const seniorTokens = tokens.filter((t) => t.patient?.is_senior || t.is_priority);
  const missedTokens = tokens.filter((t) => t.status === 'missed');

  // Compute average duration of completed consultations
  let avgDuration = defaultConsultMins;
  const completedWithTimes = completedTokens.filter((t) => t.started_at && t.completed_at);
  if (completedWithTimes.length > 0) {
    const totalMinutes = completedWithTimes.reduce((acc, t) => {
      const start = new Date(t.started_at!).getTime();
      const end = new Date(t.completed_at!).getTime();
      return acc + (end - start) / (1000 * 60);
    }, 0);
    avgDuration = Math.round(totalMinutes / completedWithTimes.length);
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3 animate-fade-in-up">
      {/* Total Issued */}
      <div className="bg-card border rounded-2xl p-4 shadow-sm interactive-card">
        <div className="flex items-center justify-between text-muted-foreground mb-1">
          <span className="text-xs font-bold uppercase tracking-wider">Total Tokens</span>
          <Users className="w-4 h-4 text-primary" />
        </div>
        <div className="text-3xl font-black text-foreground">{totalTokens}</div>
        <p className="text-xs text-muted-foreground mt-0.5">Registered today</p>
      </div>

      {/* Waiting */}
      <div className="bg-card border rounded-2xl p-4 shadow-sm interactive-card">
        <div className="flex items-center justify-between text-muted-foreground mb-1">
          <span className="text-xs font-bold uppercase tracking-wider">In Line</span>
          <Clock className="w-4 h-4 text-amber-500" />
        </div>
        <div className="text-3xl font-black text-amber-600">{waitingTokens.length}</div>
        <p className="text-xs text-muted-foreground mt-0.5">Waiting for call</p>
      </div>

      {/* Completed */}
      <div className="bg-card border rounded-2xl p-4 shadow-sm interactive-card">
        <div className="flex items-center justify-between text-muted-foreground mb-1">
          <span className="text-xs font-bold uppercase tracking-wider">Completed</span>
          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
        </div>
        <div className="text-3xl font-black text-emerald-600">{completedTokens.length}</div>
        <p className="text-xs text-muted-foreground mt-0.5">Consultations done</p>
      </div>

      {/* Seniors */}
      <div className="bg-card border rounded-2xl p-4 shadow-sm interactive-card">
        <div className="flex items-center justify-between text-muted-foreground mb-1">
          <span className="text-xs font-bold uppercase tracking-wider">Senior Care</span>
          <Sparkles className="w-4 h-4 text-amber-600" />
        </div>
        <div className="text-3xl font-black text-amber-700">{seniorTokens.length}</div>
        <p className="text-xs text-muted-foreground mt-0.5">Priority lane (60+)</p>
      </div>

      {/* Avg Duration */}
      <div className="bg-card border rounded-2xl p-4 shadow-sm col-span-2 md:col-span-1 interactive-card">
        <div className="flex items-center justify-between text-muted-foreground mb-1">
          <span className="text-xs font-bold uppercase tracking-wider">Avg Pace</span>
          <Clock className="w-4 h-4 text-primary" />
        </div>
        <div className="text-3xl font-black text-primary">~{avgDuration}m</div>
        <p className="text-xs text-muted-foreground mt-0.5">
          {missedTokens.length > 0 ? `${missedTokens.length} missed calls` : 'Per consultation'}
        </p>
      </div>
    </div>
  );
};
