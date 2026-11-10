import React, { useState } from 'react';
import { AccessibilityNeed } from '@/types/database';
import { Plus, Printer, Sparkles, Accessibility, VolumeX, Eye, HeartHandshake } from 'lucide-react';

interface WalkInFormProps {
  onSubmit: (params: {
    fullName: string;
    phone: string | null;
    age: number;
    accessibility: AccessibilityNeed[];
  }) => Promise<void>;
  loading: boolean;
}

export const WalkInForm: React.FC<WalkInFormProps> = ({ onSubmit, loading }) => {
  const [fullName, setFullName] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [age, setAge] = useState<string>('');
  const [isSenior, setIsSenior] = useState<boolean>(false);
  const [accessibility, setAccessibility] = useState<AccessibilityNeed[]>([]);
  const [showAccessibility, setShowAccessibility] = useState<boolean>(false);

  const handleAgeChange = (val: string) => {
    setAge(val);
    const parsed = parseInt(val, 10);
    if (!isNaN(parsed) && parsed >= 60) {
      setIsSenior(true);
    } else {
      setIsSenior(false);
    }
  };

  const toggleAccessibility = (need: AccessibilityNeed) => {
    setAccessibility((prev) =>
      prev.includes(need) ? prev.filter((n) => n !== need) : [...prev, need]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) return;

    const parsedAge = parseInt(age, 10) || 35;
    await onSubmit({
      fullName: fullName.trim(),
      phone: phone.trim() ? phone.trim() : null,
      age: parsedAge,
      accessibility,
    });

    // Reset form after successful submission
    setFullName('');
    setPhone('');
    setAge('');
    setIsSenior(false);
    setAccessibility([]);
    setShowAccessibility(false);
  };

  return (
    <div className="bg-card border rounded-2xl p-6 shadow-sm space-y-4">
      <div className="flex items-center justify-between border-b pb-2">
        <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
          <Plus className="w-5 h-5 text-primary" />
          <span>Quick Walk-In Entry</span>
        </h3>
        <span className="text-xs text-muted-foreground font-semibold">Phone-free check-in</span>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        {/* Patient Name */}
        <div>
          <label className="text-xs font-bold text-muted-foreground uppercase">Patient Name *</label>
          <input
            type="text"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="e.g. Ramesh Gowda"
            className="w-full h-11 px-3 text-base rounded-xl border border-input bg-background font-medium focus:ring-2 focus:ring-primary focus:outline-none"
          />
        </div>

        {/* Age & Phone in grid */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase">Age *</label>
            <input
              type="number"
              min="0"
              max="125"
              required
              value={age}
              onChange={(e) => handleAgeChange(e.target.value)}
              placeholder="e.g. 68"
              className="w-full h-11 px-3 text-base rounded-xl border border-input bg-background font-medium focus:ring-2 focus:ring-primary focus:outline-none"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase">Mobile (Optional)</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="10-digit number"
              className="w-full h-11 px-3 text-base rounded-xl border border-input bg-background font-medium focus:ring-2 focus:ring-primary focus:outline-none"
            />
          </div>
        </div>

        {/* Senior Care Auto Banner */}
        {isSenior && (
          <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200 text-xs font-bold flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <span>Senior Citizen: Auto-prioritized in Fair Interleaving lane (60+).</span>
          </div>
        )}

        {/* Accessibility Toggle */}
        <div>
          <button
            type="button"
            onClick={() => setShowAccessibility(!showAccessibility)}
            className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
          >
            {showAccessibility ? '- Hide Accessibility Options' : '+ Add Accessibility Profile (Wheelchair, Hearing...)'}
          </button>

          {showAccessibility && (
            <div className="grid grid-cols-2 gap-2 mt-2 p-3 bg-muted/60 rounded-xl border">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold">
                <input
                  type="checkbox"
                  checked={accessibility.includes('wheelchair')}
                  onChange={() => toggleAccessibility('wheelchair')}
                  className="rounded text-primary"
                />
                <Accessibility className="w-3.5 h-3.5 text-primary" />
                <span>Wheelchair</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold">
                <input
                  type="checkbox"
                  checked={accessibility.includes('hearing')}
                  onChange={() => toggleAccessibility('hearing')}
                  className="rounded text-primary"
                />
                <VolumeX className="w-3.5 h-3.5 text-primary" />
                <span>Hearing</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold">
                <input
                  type="checkbox"
                  checked={accessibility.includes('vision')}
                  onChange={() => toggleAccessibility('vision')}
                  className="rounded text-primary"
                />
                <Eye className="w-3.5 h-3.5 text-primary" />
                <span>Vision</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold">
                <input
                  type="checkbox"
                  checked={accessibility.includes('assistance')}
                  onChange={() => toggleAccessibility('assistance')}
                  className="rounded text-primary"
                />
                <HeartHandshake className="w-3.5 h-3.5 text-primary" />
                <span>Physical Help</span>
              </label>
            </div>
          )}
        </div>

        {/* Submit & Print Button */}
        <button
          type="submit"
          disabled={loading || !fullName.trim()}
          className="w-full h-14 mt-2 bg-primary hover:bg-primary-700 text-primary-foreground font-extrabold text-base rounded-xl flex items-center justify-center gap-2 shadow-md transition-colors disabled:opacity-50"
        >
          <Printer className="w-5 h-5" />
          <span>{loading ? 'Issuing Token...' : 'Print Slip & Issue Token'}</span>
        </button>
      </form>
    </div>
  );
};

