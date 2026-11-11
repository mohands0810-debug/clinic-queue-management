import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { createTokenRPC } from '@/lib/queue-api';
import { useAccessibility } from '@/context/AccessibilityContext';
import { Sparkles, CheckCircle2, AlertCircle, ArrowLeft, RefreshCw } from 'lucide-react';

export const InstantTokenPage: React.FC = () => {
  const navigate = useNavigate();
  const { speakText } = useAccessibility();
  const [loading, setLoading] = useState<boolean>(true);
  const [tokenResult, setTokenResult] = useState<{ tokenNumber: number; tokenId: string } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const hasTriggeredRef = useRef<boolean>(false);

  useEffect(() => {
    if (hasTriggeredRef.current) return;
    hasTriggeredRef.current = true;

    issueInstantToken();
  }, []);

  const issueInstantToken = async () => {
    setLoading(true);
    setErrorMsg(null);

    try {
      // Create an instant walk-in token without requiring any user input
      const result = await createTokenRPC({
        fullName: 'Walk-In Patient',
        phone: null,
        age: 35,
        accessibility: [],
        source: 'qr',
      });

      // Store in localStorage for status persistence
      localStorage.setItem('dhanvantri_active_token_id', result.token_id);
      localStorage.setItem('dhanvantri_session_secret', result.session_secret);

      setTokenResult({
        tokenNumber: result.token_number,
        tokenId: result.token_id,
      });

      // Announce token number
      speakText(`Your queue token number is ${result.token_number}. Please wait for your turn.`);

      // Smoothly redirect to the live status screen after brief celebration
      setTimeout(() => {
        navigate(`/status?id=${result.token_id}`, { replace: true });
      }, 1500);
    } catch (err: unknown) {
      console.error('Instant token creation failed:', err);
      const msg = err instanceof Error ? err.message : 'Could not generate instant token. Please try again or ask reception.';
      setErrorMsg(msg);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-8">
      <div className="bg-card border rounded-3xl p-8 max-w-md w-full shadow-2xl text-center space-y-6">
        {loading && !tokenResult && (
          <div className="space-y-6 py-8">
            <div className="relative w-24 h-24 mx-auto flex items-center justify-center">
              <div className="w-24 h-24 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
              <Sparkles className="w-10 h-10 text-primary absolute animate-pulse" />
            </div>

            <div>
              <h2 className="text-2xl md:text-3xl font-black text-foreground tracking-tight">
                Issuing Your Token...
              </h2>
              <p className="text-sm font-semibold text-muted-foreground mt-2">
                Dhanvantri Clinic • Dr Yogesh
              </p>
            </div>

            <p className="text-xs text-muted-foreground bg-muted p-3.5 rounded-2xl">
              ⚡ Instant QR check-in active. No typing or personal details required.
            </p>
          </div>
        )}

        {tokenResult && (
          <div className="space-y-6 py-6 animate-in fade-in zoom-in-95 duration-300">
            <div className="w-20 h-20 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-md">
              <CheckCircle2 className="w-12 h-12" />
            </div>

            <div>
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Successfully Generated
              </span>
              <div className="text-7xl font-black text-primary tracking-tight my-2">
                #{tokenResult.tokenNumber}
              </div>
              <p className="text-sm font-bold text-foreground">
                Redirecting to your live tracker...
              </p>
            </div>
          </div>
        )}

        {errorMsg && (
          <div className="space-y-6 py-4">
            <div className="w-16 h-16 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mx-auto">
              <AlertCircle className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-bold text-destructive">
                Token Creation Error
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {errorMsg}
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <Link
                to="/"
                className="w-1/2 h-12 rounded-xl border font-bold text-sm flex items-center justify-center gap-1.5 hover:bg-muted"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Home</span>
              </Link>
              <button
                type="button"
                onClick={issueInstantToken}
                className="w-1/2 h-12 rounded-xl bg-primary text-primary-foreground font-bold text-sm flex items-center justify-center gap-1.5 hover:bg-primary-700 shadow"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Try Again</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

