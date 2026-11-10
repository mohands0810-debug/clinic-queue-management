import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, Link } from 'react-router-dom';
import { createTokenRPC } from '@/lib/queue-api';
import { AccessibilityNeed } from '@/types/database';
import {
  ArrowLeft,
  Check,
  Sparkles,
  Accessibility,
  VolumeX,
  Eye,
  HeartHandshake,
  AlertCircle,
  Loader2,
} from 'lucide-react';

export const GetTokenPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [step, setStep] = useState<number>(1);
  const [fullName, setFullName] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [noPhone, setNoPhone] = useState<boolean>(false);
  const [age, setAge] = useState<string>('');
  const [accessibility, setAccessibility] = useState<AccessibilityNeed[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const parsedAge = parseInt(age, 10);
  const isSenior = !isNaN(parsedAge) && parsedAge >= 60;

  const toggleAccessibility = (need: AccessibilityNeed) => {
    setAccessibility((prev) =>
      prev.includes(need) ? prev.filter((n) => n !== need) : [...prev, need]
    );
  };

  const handleStep1Next = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      setErrorMsg('Please enter the patient full name.');
      return;
    }
    if (!noPhone && (!phone.trim() || phone.replace(/\D/g, '').length < 10)) {
      setErrorMsg('Please enter a valid 10-digit mobile number, or select "No phone".');
      return;
    }
    setErrorMsg(null);
    setStep(2);
  };

  const handleStep2Next = (e: React.FormEvent) => {
    e.preventDefault();
    if (!age || isNaN(parsedAge) || parsedAge < 0 || parsedAge > 125) {
      setErrorMsg('Please enter a valid age between 0 and 125.');
      return;
    }
    setErrorMsg(null);
    setStep(3);
  };

  const handleSubmit = async () => {
    setLoading(true);
    setErrorMsg(null);

    try {
      const result = await createTokenRPC({
        fullName: fullName.trim(),
        phone: noPhone ? null : phone.trim(),
        age: parsedAge,
        accessibility,
        source: 'phone',
      });

      localStorage.setItem('dhanvantri_active_token_id', result.token_id);
      localStorage.setItem('dhanvantri_session_secret', result.session_secret);

      navigate(`/status?id=${result.token_id}`);
    } catch (err: unknown) {
      console.error('Error creating token:', err);
      const msg = err instanceof Error ? err.message : 'Could not complete token registration.';
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  // Step progress dots
  const StepDots = () => (
    <div className="flex items-center justify-center gap-3 mb-6">
      {[1, 2, 3].map((s) => (
        <div
          key={s}
          className={`rounded-full transition-all ${
            s < step
              ? 'w-4 h-4 bg-primary'
              : s === step
              ? 'w-5 h-5 bg-primary animate-pulse ring-4 ring-primary/30'
              : 'w-4 h-4 bg-muted border-2 border-border'
          }`}
        />
      ))}
    </div>
  );

  const accessibilityOptions: { need: AccessibilityNeed; icon: React.ReactNode; label: string }[] =
    [
      {
        need: 'wheelchair',
        icon: <Accessibility className="w-7 h-7 text-primary flex-shrink-0" />,
        label: t('tokenFlow.wheelchair'),
      },
      {
        need: 'hearing',
        icon: <VolumeX className="w-7 h-7 text-primary flex-shrink-0" />,
        label: t('tokenFlow.hearing'),
      },
      {
        need: 'vision',
        icon: <Eye className="w-7 h-7 text-primary flex-shrink-0" />,
        label: t('tokenFlow.vision'),
      },
      {
        need: 'assistance',
        icon: <HeartHandshake className="w-7 h-7 text-primary flex-shrink-0" />,
        label: t('tokenFlow.assistance'),
      },
    ];

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-5 flex items-center justify-between">
        <Link
          to="/"
          className="inline-flex items-center gap-2 font-bold text-primary hover:underline text-lg"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>{t('nav.home')}</span>
        </Link>
        <span className="text-sm font-bold text-muted-foreground uppercase tracking-wider">
          Step {step} of 3
        </span>
      </div>

      <div className="bg-card border rounded-2xl shadow-sm p-6 space-y-6">
        {/* Title */}
        <div>
          <h2 className="text-2xl md:text-3xl font-extrabold text-foreground">
            {t('tokenFlow.title')}
          </h2>
          <p className="text-muted-foreground font-medium mt-1">Dhanvantri Clinic • Dr Yogesh</p>
        </div>

        {/* Step Progress Dots */}
        <StepDots />

        {/* Error Banner */}
        {errorMsg && (
          <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive font-semibold flex items-start gap-2">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* STEP 1: Name + Phone */}
        {step === 1 && (
          <form onSubmit={handleStep1Next} className="space-y-5">
            <div className="space-y-2">
              <label className="block text-xl font-bold text-foreground">
                {t('tokenFlow.fullName')} *
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder={t('tokenFlow.fullNamePlaceholder')}
                className="w-full h-16 px-4 text-xl rounded-xl border border-input bg-background font-medium focus:ring-2 focus:ring-primary focus:outline-none"
              />
            </div>

            {!noPhone && (
              <div className="space-y-2">
                <label className="block text-xl font-bold text-foreground">
                  {t('tokenFlow.phone')} *
                </label>
                <input
                  type="tel"
                  inputMode="numeric"
                  required={!noPhone}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder={t('tokenFlow.phonePlaceholder')}
                  className="w-full h-16 px-4 text-xl rounded-xl border border-input bg-background font-medium focus:ring-2 focus:ring-primary focus:outline-none"
                />
              </div>
            )}

            <div className="pt-1">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={noPhone}
                  onChange={(e) => setNoPhone(e.target.checked)}
                  className="w-7 h-7 rounded border-input text-primary focus:ring-primary"
                />
                <span className="text-base font-semibold text-muted-foreground">
                  {t('tokenFlow.noPhoneToggle')}
                </span>
              </label>
            </div>

            <button
              type="submit"
              className="w-full min-h-button-tall mt-4 bg-primary text-primary-foreground font-bold text-xl rounded-xl hover:bg-primary-700 shadow-md transition-colors flex items-center justify-center"
            >
              {t('tokenFlow.continueStep2', 'Continue to Step 2 →')}
            </button>
          </form>
        )}

        {/* STEP 2: Age + Accessibility */}
        {step === 2 && (
          <form onSubmit={handleStep2Next} className="space-y-5">
            <div className="space-y-2">
              <label className="block text-xl font-bold text-foreground">
                {t('tokenFlow.age')} *
              </label>
              <input
                type="number"
                min="0"
                max="125"
                required
                value={age}
                onChange={(e) => setAge(e.target.value)}
                placeholder={t('tokenFlow.agePlaceholder')}
                className="w-full h-16 px-4 text-3xl text-center rounded-xl border border-input bg-background font-bold focus:ring-2 focus:ring-primary focus:outline-none"
              />
            </div>

            {/* Senior Auto-detect Banner */}
            {isSenior && (
              <div className="w-full p-4 rounded-2xl bg-amber-50 border-2 border-amber-300 text-amber-900 font-bold flex items-center gap-3">
                <Sparkles className="w-7 h-7 text-amber-500 flex-shrink-0" />
                <div>
                  <p className="text-lg font-extrabold">🌟 {t('tokenFlow.seniorAutoBadge')}</p>
                  <p className="text-sm font-semibold mt-0.5 opacity-80">
                    {t('tokenFlow.seniorAutoDesc', 'You will be given priority in the queue.')}
                  </p>
                </div>
              </div>
            )}

            {/* Accessibility Cards */}
            <div className="space-y-3 pt-1">
              <p className="font-bold text-foreground text-xl">
                {t('tokenFlow.accessibilityHeading')}
              </p>

              {accessibilityOptions.map(({ need, icon, label }) => {
                const checked = accessibility.includes(need);
                return (
                  <label
                    key={need}
                    className={`flex items-center gap-4 p-4 rounded-2xl border-2 cursor-pointer transition-colors ${
                      checked
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/40 hover:bg-muted'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleAccessibility(need)}
                      className="w-7 h-7 rounded text-primary focus:ring-primary"
                    />
                    {icon}
                    <span className="font-bold text-lg">{label}</span>
                  </label>
                );
              })}
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="w-1/3 h-14 border-2 rounded-xl font-bold text-lg hover:bg-muted"
              >
                {t('common.back', 'Back')}
              </button>
              <button
                type="submit"
                className="w-2/3 min-h-button-tall bg-primary text-primary-foreground font-bold text-xl rounded-xl hover:bg-primary-700 shadow-md flex items-center justify-center"
              >
                {t('tokenFlow.reviewAndConfirm', 'Review & Confirm')}
              </button>
            </div>
          </form>
        )}

        {/* STEP 3: Review + Confirm */}
        {step === 3 && (
          <div className="space-y-6">
            <div className="rounded-xl border p-5 bg-muted/50 space-y-4">
              <div className="flex justify-between items-center border-b pb-3">
                <span className="text-muted-foreground font-semibold text-base">Patient Name</span>
                <span className="font-bold text-foreground text-lg">{fullName}</span>
              </div>
              <div className="flex justify-between items-center border-b pb-3">
                <span className="text-muted-foreground font-semibold text-base">Contact</span>
                <span className="font-bold text-foreground text-lg">
                  {noPhone ? 'Desk Walk-In' : phone}
                </span>
              </div>
              <div className="flex justify-between items-center border-b pb-3">
                <span className="text-muted-foreground font-semibold text-base">Age</span>
                <span className="font-bold text-foreground text-lg flex items-center gap-2">
                  {age} yrs
                  {isSenior && (
                    <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-sm font-bold border border-amber-300">
                      ⭐ Senior
                    </span>
                  )}
                </span>
              </div>
              {accessibility.length > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground font-semibold text-base">Assistance</span>
                  <span className="font-bold text-foreground text-base">
                    {accessibility.join(', ')}
                  </span>
                </div>
              )}
            </div>

            <p className="text-sm font-medium text-muted-foreground bg-muted p-4 rounded-xl leading-relaxed">
              {t('tokenFlow.consentNotice')}
            </p>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setStep(2)}
                disabled={loading}
                className="w-1/3 h-14 border-2 rounded-xl font-bold text-lg hover:bg-muted disabled:opacity-50"
              >
                {t('common.back', 'Back')}
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading}
                className="w-2/3 min-h-button-tall bg-emerald-600 text-white font-bold text-xl rounded-xl hover:bg-emerald-700 shadow-lg flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-6 h-6 animate-spin" />
                    <span>{t('tokenFlow.joining', 'Joining queue...')}</span>
                  </>
                ) : (
                  <>
                    <Check className="w-6 h-6" />
                    <span>{t('tokenFlow.submit')}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
