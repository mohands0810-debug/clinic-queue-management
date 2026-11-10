import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { DoctorStatus } from '@/types/database';
import { AlertTriangle, Clock, Coffee, X, Check } from 'lucide-react';

interface DelayBroadcastModalProps {
  currentStatus: DoctorStatus;
  currentReason: string | null;
  onUpdateStatus: (status: DoctorStatus, reason: string | null) => Promise<void>;
  loading: boolean;
}

export const DelayBroadcastModal: React.FC<DelayBroadcastModalProps> = ({
  currentStatus,
  currentReason,
  onUpdateStatus,
  loading,
}) => {
  const [showModal, setShowModal] = useState<boolean>(false);
  const [selectedStatus, setSelectedStatus] = useState<DoctorStatus>(currentStatus);
  const [customReason, setCustomReason] = useState<string>(currentReason || '');

  const applyPreset = async (status: DoctorStatus, reason: string | null) => {
    await onUpdateStatus(status, reason);
    setShowModal(false);
  };

  return (
    <>
      {/* Trigger Button / Live Status Capsule */}
      <button
        onClick={() => setShowModal(true)}
        className="h-11 px-4 border rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-muted transition-colors bg-card shadow-sm"
      >
        <div className="flex items-center gap-1.5">
          <span className={`w-3 h-3 rounded-full ${
            currentStatus === 'available'
              ? 'bg-emerald-500 animate-pulse'
              : currentStatus === 'break'
              ? 'bg-amber-500'
              : 'bg-red-500 animate-ping'
          }`} />
          <span className="capitalize">
            {currentStatus === 'available' && 'Doctor Available'}
            {currentStatus === 'break' && `Break: ${currentReason || 'On Break'}`}
            {currentStatus === 'emergency' && 'Emergency Case'}
            {currentStatus === 'off_duty' && 'Consultations Closed'}
          </span>
        </div>
        <span className="text-xs text-primary font-bold underline ml-1">Change</span>
      </button>

      {/* Modal Dialog — rendered in #modal-root outside React/header stacking contexts */}
      {showModal && createPortal(
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center p-4"
          style={{ zIndex: 99999 }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false); }}
        >
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-5 relative" style={{ zIndex: 100000 }}>
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="font-extrabold text-xl text-foreground flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-500" />
                  <span>Broadcast Doctor Status & Delay</span>
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Instantly updates the TV display and all patient phones via Realtime.
                </p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-muted-foreground hover:text-foreground font-bold p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick 1-Tap Presets */}
            <div className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Quick Presets
              </span>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => applyPreset('available', null)}
                  disabled={loading}
                  className="p-3 rounded-xl border font-bold text-sm text-left hover:bg-emerald-50 dark:hover:bg-emerald-950/30 border-emerald-300 flex items-center justify-between transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600" />
                    <span>Doctor Available</span>
                  </div>
                  <span className="text-[10px] text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">
                    Normal
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => applyPreset('break', 'Tea Break - 15 mins')}
                  disabled={loading}
                  className="p-3 rounded-xl border font-bold text-sm text-left hover:bg-amber-50 dark:hover:bg-amber-950/30 border-amber-300 flex items-center justify-between transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Coffee className="w-4 h-4 text-amber-600" />
                    <span>Tea Break</span>
                  </div>
                  <span className="text-[10px] text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded">
                    +15m
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => applyPreset('break', 'Lunch Break until 2:00 PM')}
                  disabled={loading}
                  className="p-3 rounded-xl border font-bold text-sm text-left hover:bg-amber-50 dark:hover:bg-amber-950/30 border-amber-300 flex items-center justify-between transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-600" />
                    <span>Lunch Break</span>
                  </div>
                  <span className="text-[10px] text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded">
                    Until 2 PM
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => applyPreset('emergency', 'Attending Emergency Consultation')}
                  disabled={loading}
                  className="p-3 rounded-xl border font-bold text-sm text-left hover:bg-red-50 dark:hover:bg-red-950/30 border-red-300 flex items-center justify-between transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-600" />
                    <span>Emergency Case</span>
                  </div>
                  <span className="text-[10px] text-red-800 bg-red-100 px-1.5 py-0.5 rounded">
                    Priority
                  </span>
                </button>
              </div>
            </div>

            {/* Custom Reason Form */}
            <div className="space-y-3 pt-2 border-t">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Or Custom Reason
              </span>

              <div className="space-y-2">
                <input
                  type="text"
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  placeholder="e.g. Running 20 mins late due to hospital round"
                  className="w-full h-11 px-3 text-sm rounded-xl border border-input bg-background font-medium focus:ring-2 focus:ring-primary focus:outline-none"
                />

                <div className="flex gap-2">
                  <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value as DoctorStatus)}
                    className="w-1/2 h-11 px-3 text-sm rounded-xl border bg-background font-semibold"
                  >
                    <option value="available">Available (with note)</option>
                    <option value="break">On Break</option>
                    <option value="emergency">Emergency Delay</option>
                    <option value="off_duty">Off Duty / Closed</option>
                  </select>

                  <button
                    type="button"
                    onClick={() => applyPreset(selectedStatus, customReason.trim() ? customReason.trim() : null)}
                    disabled={loading}
                    className="w-1/2 h-11 bg-primary hover:bg-primary-700 text-primary-foreground font-bold text-sm rounded-xl shadow transition-colors"
                  >
                    Broadcast Update
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>,
        document.getElementById('modal-root') || document.body
      )}
    </>
  );
};
