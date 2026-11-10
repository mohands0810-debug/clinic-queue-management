import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { HelpRequest, Token } from '@/types/database';
import { AlertCircle, CheckCircle2, BellRing } from 'lucide-react';

interface HelpRequestsBannerProps {
  onResolve: (requestId: string) => Promise<void>;
}

export const HelpRequestsBanner: React.FC<HelpRequestsBannerProps> = ({ onResolve }) => {
  const [requests, setRequests] = useState<(HelpRequest & { token?: Token })[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    fetchPendingRequests();

    // Subscribe to help_requests changes
    const channel = supabase
      .channel('help-requests-feed')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'help_requests' },
        () => {
          fetchPendingRequests();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchPendingRequests = async () => {
    const { data } = await supabase
      .from('help_requests')
      .select('*, token:tokens(token_number, patient:patients(full_name))')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (data) {
      setRequests(data as (HelpRequest & { token?: Token })[]);
    }
  };

  const handleResolveClick = async (id: string) => {
    setLoading(true);
    await onResolve(id);
    await fetchPendingRequests();
    setLoading(false);
  };

  if (requests.length === 0) return null;

  return (
    <div className="rounded-2xl border-2 border-destructive bg-destructive/10 p-4 shadow-lg animate-pulse">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center flex-shrink-0">
            <BellRing className="w-5 h-5 animate-bounce" />
          </div>

          <div>
            <h4 className="font-extrabold text-destructive text-base flex items-center gap-2">
              <AlertCircle className="w-4 h-4 inline" />
              Patient Assistance Requested! ({requests.length} pending)
            </h4>
            <p className="text-xs font-semibold text-foreground/80 mt-0.5">
              Patients waiting in lobby or outside triggered the "I Need Help" button.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {requests.map((req) => (
            <div
              key={req.id}
              className="flex items-center gap-2 bg-background border border-destructive/40 p-2 rounded-xl text-xs font-bold shadow-sm"
            >
              <span>Token #{req.token?.token_number ?? '--'}</span>
              <span className="text-muted-foreground font-normal">
                ({req.token?.patient?.full_name ?? 'Patient'})
              </span>
              <button
                onClick={() => handleResolveClick(req.id)}
                disabled={loading}
                className="px-2.5 py-1 bg-destructive hover:bg-destructive/90 text-destructive-foreground rounded-lg flex items-center gap-1 font-bold"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Resolve</span>
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
