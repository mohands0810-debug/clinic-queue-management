import React from 'react';
import { BarChart3, Download } from 'lucide-react';
import { Token, ClinicSettings, TokenStatus, TokenSource } from '@/types/database';

interface ReportsTabProps {
  tokens: Token[];
  settings: ClinicSettings | null;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function getHourLabel(hour: number): string {
  if (hour < 12) return `${hour}AM`;
  if (hour === 12) return '12PM';
  return `${hour - 12}PM`;
}

function avgConsultMins(tokens: Token[]): number | null {
  const completed = tokens.filter(
    (t) => t.status === 'completed' && t.started_at && t.completed_at
  );
  if (completed.length === 0) return null;
  const total = completed.reduce((sum, t) => {
    const start = new Date(t.started_at!).getTime();
    const end = new Date(t.completed_at!).getTime();
    return sum + (end - start) / 60000;
  }, 0);
  return Math.round(total / completed.length);
}

// ─── Status Bar Colors ───────────────────────────────────────────────────────

const STATUS_COLORS: Record<TokenStatus, string> = {
  waiting: 'bg-blue-500',
  called: 'bg-emerald-400 animate-pulse',
  in_progress: 'bg-emerald-500',
  completed: 'bg-gray-400',
  missed: 'bg-red-500',
  cancelled: 'bg-slate-400',
  hold: 'bg-amber-400',
};

const STATUS_ORDER: TokenStatus[] = [
  'in_progress',
  'called',
  'waiting',
  'hold',
  'completed',
  'missed',
  'cancelled',
];

// ─── CSV Export ──────────────────────────────────────────────────────────────

function exportCSV(tokens: Token[]) {
  const today = new Date().toISOString().split('T')[0];
  const header = 'Token#,Patient,Status,Source,Senior,Created,Called,Started,Completed';
  const rows = tokens.map((t) => {
    const name = t.patient?.full_name ?? 'Unknown';
    return [
      t.token_number,
      `"${name}"`,
      t.status,
      t.source,
      t.is_priority ? 'Yes' : 'No',
      t.created_at,
      t.called_at ?? '',
      t.started_at ?? '',
      t.completed_at ?? '',
    ].join(',');
  });
  const csv = [header, ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `dhanvantri-queue-${today}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Component ───────────────────────────────────────────────────────────────

export const ReportsTab: React.FC<ReportsTabProps> = ({ tokens, settings }) => {
  // ── KPI
  const totalRegistered = tokens.length;
  const completed = tokens.filter((t) => t.status === 'completed').length;
  const missedOrCancelled = tokens.filter(
    (t) => t.status === 'missed' || t.status === 'cancelled'
  ).length;
  const seniorsServed = tokens.filter(
    (t) => t.is_priority && t.status === 'completed'
  ).length;
  const avgMins = avgConsultMins(tokens);
  const avgLabel =
    avgMins !== null ? `~${avgMins}m` : `~${settings?.default_consultation_mins ?? 8}m`;

  // ── Hourly chart (9–21)
  const HOURS = Array.from({ length: 13 }, (_, i) => i + 9); // 9..21
  const hourlyCounts: Record<number, number> = {};
  HOURS.forEach((h) => (hourlyCounts[h] = 0));
  tokens.forEach((t) => {
    const h = new Date(t.created_at).getHours();
    if (h >= 9 && h <= 21) hourlyCounts[h] = (hourlyCounts[h] ?? 0) + 1;
  });
  const maxHourlyCount = Math.max(1, ...Object.values(hourlyCounts));

  // ── Status breakdown
  const statusCounts: Partial<Record<TokenStatus, number>> = {};
  tokens.forEach((t) => {
    statusCounts[t.status] = (statusCounts[t.status] ?? 0) + 1;
  });
  const presentStatuses = STATUS_ORDER.filter((s) => (statusCounts[s] ?? 0) > 0);

  // ── Source breakdown
  const SOURCE_LABELS: Record<TokenSource, string> = {
    qr: 'QR Scan',
    phone: 'Phone / Web',
    doctor_desk: 'Doctor Desk',
  };
  const SOURCE_ORDER: TokenSource[] = ['qr', 'phone', 'doctor_desk'];
  const sourceCounts: Partial<Record<TokenSource, number>> = {};
  tokens.forEach((t) => {
    sourceCounts[t.source] = (sourceCounts[t.source] ?? 0) + 1;
  });

  return (
    <div className="space-y-6">
      {/* ── A. KPI Summary Row ──────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {[
          { label: 'Total Registered', value: totalRegistered },
          { label: 'Completed', value: completed },
          { label: 'Missed / No-Show', value: missedOrCancelled },
          { label: 'Seniors Served', value: seniorsServed },
          { label: 'Avg Consultation', value: avgLabel },
        ].map(({ label, value }) => (
          <div
            key={label}
            className="bg-card border rounded-2xl p-4 shadow-sm flex flex-col gap-1"
          >
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              {label}
            </span>
            <span className="text-2xl font-black text-foreground">{value}</span>
          </div>
        ))}
      </div>

      {/* ── B. Hourly Throughput Bar Chart ──────────────────────────────── */}
      <div className="bg-card border rounded-2xl p-5 shadow-sm space-y-3">
        <div className="flex items-center gap-2 font-bold text-sm text-muted-foreground uppercase tracking-wide">
          <BarChart3 className="w-4 h-4" />
          Hourly Token Flow
        </div>
        <div className="overflow-x-auto pb-2">
          <div className="flex items-end gap-1 min-w-max">
            {HOURS.map((h) => {
              const count = hourlyCounts[h] ?? 0;
              const barHeight = Math.max(4, Math.round((count / maxHourlyCount) * 120));
              return (
                <div key={h} className="flex flex-col items-center gap-0.5">
                  <span className="text-xs font-bold text-foreground">{count}</span>
                  <div
                    className="bg-primary/70 rounded-t-sm w-8"
                    style={{ height: `${barHeight}px` }}
                  />
                  <span className="text-xs text-muted-foreground">{getHourLabel(h)}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── C. Status Breakdown ─────────────────────────────────────────── */}
      <div className="bg-card border rounded-2xl p-5 shadow-sm space-y-3">
        <div className="font-bold text-sm text-muted-foreground uppercase tracking-wide">
          Today's Patient Status Breakdown
        </div>
        {tokens.length === 0 ? (
          <p className="text-sm text-muted-foreground">No tokens today.</p>
        ) : (
          <div className="space-y-2">
            {presentStatuses.map((status) => {
              const count = statusCounts[status] ?? 0;
              const pct = Math.round((count / tokens.length) * 100);
              return (
                <div key={status} className="flex items-center gap-3">
                  <span
                    className="font-semibold text-sm capitalize flex-shrink-0"
                    style={{ width: 80 }}
                  >
                    {status.replace('_', ' ')}
                  </span>
                  <div className="flex-1 bg-muted rounded-full h-5 overflow-hidden">
                    <div
                      className={`h-5 rounded-full ${STATUS_COLORS[status]}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-sm font-bold text-muted-foreground w-14 text-right">
                    {count} / {tokens.length}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── D. Source Breakdown ─────────────────────────────────────────── */}
      <div className="bg-card border rounded-2xl p-5 shadow-sm space-y-3">
        <div className="font-bold text-sm text-muted-foreground uppercase tracking-wide">
          Registration Source
        </div>
        {tokens.length === 0 ? (
          <p className="text-sm text-muted-foreground">No tokens today.</p>
        ) : (
          <div className="space-y-2">
            {SOURCE_ORDER.map((src) => {
              const count = sourceCounts[src] ?? 0;
              const pct = tokens.length > 0 ? Math.round((count / tokens.length) * 100) : 0;
              const colorMap: Record<TokenSource, string> = {
                qr: 'bg-violet-500',
                phone: 'bg-sky-500',
                doctor_desk: 'bg-orange-400',
              };
              return (
                <div key={src} className="flex items-center gap-3">
                  <span
                    className="font-semibold text-sm flex-shrink-0"
                    style={{ width: 100 }}
                  >
                    {SOURCE_LABELS[src]}
                  </span>
                  <div className="flex-1 bg-muted rounded-full h-5 overflow-hidden">
                    <div
                      className={`h-5 rounded-full ${colorMap[src]}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-sm font-bold text-muted-foreground w-14 text-right">
                    {count} / {tokens.length}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── E. CSV Export ───────────────────────────────────────────────── */}
      <div className="flex justify-end">
        <button
          onClick={() => exportCSV(tokens)}
          className="flex items-center gap-2 border rounded-xl px-4 py-2 font-bold text-sm hover:bg-muted transition-colors"
        >
          <Download className="w-4 h-4" />
          Download CSV
        </button>
      </div>
    </div>
  );
};
