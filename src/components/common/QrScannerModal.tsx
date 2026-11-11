import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Html5Qrcode } from 'html5-qrcode';
import { X, Camera, AlertCircle, RefreshCw, Zap } from 'lucide-react';

interface QrScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const QrScannerModal: React.FC<QrScannerModalProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [cameras, setCameras] = useState<{ id: string; label: string }[]>([]);
  const [currentCameraIndex, setCurrentCameraIndex] = useState<number>(0);

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setErrorMsg(null);
    setIsScanning(false);

    const startScanner = async () => {
      try {
        const scannerId = 'dhanvantri-qr-reader';
        // Wait for DOM element
        await new Promise((r) => setTimeout(r, 100));

        const qrScanner = new Html5Qrcode(scannerId);
        scannerRef.current = qrScanner;

        const availableCameras = await Html5Qrcode.getCameras();
        if (!isMounted) return;

        if (availableCameras && availableCameras.length > 0) {
          setCameras(availableCameras);
          
          // Prefer environment/back camera on phones
          const rearCam = availableCameras.find((c) =>
            /back|rear|environment/i.test(c.label)
          );
          const selectedCamId = rearCam ? rearCam.id : availableCameras[0].id;

          await qrScanner.start(
            selectedCamId,
            {
              fps: 15,
              qrbox: { width: 260, height: 260 },
              aspectRatio: 1.0,
            },
            (decodedText) => {
              handleDecodedQr(decodedText);
            },
            () => {
              // Ignore standard frame scan errors
            }
          );

          if (isMounted) setIsScanning(true);
        } else {
          setErrorMsg('No camera device detected on your device.');
        }
      } catch (err: unknown) {
        console.error('Camera QR start error:', err);
        const msg = err instanceof Error ? err.message : 'Could not access camera. Please check camera permissions.';
        if (isMounted) setErrorMsg(msg);
      }
    };

    startScanner();

    return () => {
      isMounted = false;
      stopScanner();
    };
  }, [isOpen]);

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
        await scannerRef.current.clear();
      } catch (e) {
        console.warn('Error stopping scanner:', e);
      }
      scannerRef.current = null;
    }
  };

  const handleClose = async () => {
    await stopScanner();
    onClose();
  };

  const playSuccessChime = () => {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
      osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.1); // E5
      osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.2); // G5
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } catch {
      // AudioContext not allowed or unsupported
    }
  };

  const handleDecodedQr = async (decodedText: string) => {
    playSuccessChime();
    await stopScanner();
    onClose();

    // Check if scanned link is within the app (e.g. /instant-token, /status?id=..., /get-token)
    try {
      if (decodedText.startsWith('http://') || decodedText.startsWith('https://')) {
        const parsed = new URL(decodedText);
        // If it's a path on the same app or domain, navigate locally
        if (parsed.pathname === '/instant-token' || parsed.pathname.includes('/status') || parsed.pathname === '/get-token') {
          navigate(parsed.pathname + parsed.search);
          return;
        }
        // External link
        window.location.href = decodedText;
        return;
      }

      // If it's a relative path
      if (decodedText.startsWith('/')) {
        navigate(decodedText);
        return;
      }

      // Fallback: If it's the raw word "instant" or UUID token ID
      if (decodedText.includes('instant-token') || decodedText === 'instant') {
        navigate('/instant-token');
      } else {
        // Treat as token lookup or general destination
        navigate(`/status?id=${encodeURIComponent(decodedText)}`);
      }
    } catch {
      navigate('/instant-token');
    }
  };

  const switchCamera = async () => {
    if (cameras.length <= 1 || !scannerRef.current) return;
    const nextIndex = (currentCameraIndex + 1) % cameras.length;
    setCurrentCameraIndex(nextIndex);

    try {
      if (scannerRef.current.isScanning) {
        await scannerRef.current.stop();
      }
      await scannerRef.current.start(
        cameras[nextIndex].id,
        { fps: 15, qrbox: { width: 260, height: 260 } },
        handleDecodedQr,
        () => {}
      );
    } catch (err) {
      console.warn('Switch camera error:', err);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 animate-fade-in transition-opacity duration-200"
      style={{ zIndex: 99999 }}
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full shadow-2xl overflow-hidden relative animate-scale-in transition-all duration-300"
        style={{ zIndex: 100000 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-slate-50 dark:bg-slate-950">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-foreground">
                Scan Clinic QR Code
              </h3>
              <p className="text-xs text-muted-foreground font-medium">
                Point camera at reception QR code
              </p>
            </div>
          </div>

          <button
            onClick={handleClose}
            className="p-2 text-muted-foreground hover:text-foreground rounded-full hover:bg-muted transition-colors"
            aria-label="Close Scanner"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Viewfinder Container */}
        <div className="p-4 space-y-4">
          <div className="relative rounded-2xl overflow-hidden bg-black aspect-square flex items-center justify-center shadow-inner">
            <div id="dhanvantri-qr-reader" className="w-full h-full" />

            {!isScanning && !errorMsg && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/75 text-white gap-2 p-4 text-center">
                <RefreshCw className="w-8 h-8 animate-spin text-primary-400" />
                <span className="text-sm font-semibold">Starting camera...</span>
              </div>
            )}

            {errorMsg && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 text-white gap-3 p-6 text-center">
                <AlertCircle className="w-10 h-10 text-destructive" />
                <p className="text-sm font-semibold">{errorMsg}</p>
                <p className="text-xs text-slate-400">
                  Please allow camera permission in your browser address bar and reload.
                </p>
              </div>
            )}
          </div>

          {/* Quick Tip Pill */}
          <div className="flex items-center justify-between gap-2 p-3 bg-primary/5 dark:bg-primary/10 border border-primary/20 rounded-2xl">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-primary shrink-0" />
              <span className="text-xs font-semibold text-foreground">
                Instant Token: Scans desk QR without typing
              </span>
            </div>

            {cameras.length > 1 && (
              <button
                type="button"
                onClick={switchCamera}
                className="text-xs font-bold px-2.5 py-1 rounded-lg bg-background border hover:bg-muted shrink-0 text-primary"
              >
                Flip Cam
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={handleClose}
            className="w-full h-12 rounded-xl border font-bold text-sm hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            Cancel / Close
          </button>
        </div>
      </div>
    </div>,
    document.getElementById('modal-root') || document.body
  );
};

