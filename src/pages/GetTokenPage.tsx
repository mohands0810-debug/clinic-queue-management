import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { AccessibilityNeed } from '@/types/database';
import { 
  ArrowLeft, 
  Check, 
  Sparkles, 
  Accessibility, 
  VolumeX, 
  Eye, 
  HeartHandshake, 
  AlertCircle 
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
      // 1. Insert patient record
      const { data: patientData, error: patientError } = await supabase
        .from('patients')
        .insert({
          full_name: fullName.trim(),
          phone: noPhone ? null : phone.trim(),
          age: parsedAge,
          accessibility_needs: accessibility,
        })
        .select()
        .single();

      if (patientError) throw patientError;

      // 2. Fetch today's current highest token number
      const today = new Date().toISOString().split('T')[0];
      const { data: lastToken } = await supabase
        .from('tokens')
        .select('token_number')
        .eq('queue_date', today)
        .order('token_number', { ascending: false })
        .limit(1)
        .maybeSingle();

      const nextTokenNum = (lastToken?.token_number || 0) + 1;

      // 3. Insert token
      const { data: tokenData, error: tokenError } = await supabase
        .from('tokens')
        .insert({
          token_number: nextTokenNum,
          queue_date: today,
          patient_id: patientData.id,
          status: 'waiting',
          is_priority: isSenior,
          source: 'phone',
          arrived_at_clinic: false,
        })
        .select()
        .single();

      if (tokenError) throw tokenError;

      // Store personal session secret in localStorage for tracking
      localStorage.setItem('dhanvantri_active_token_id', tokenData.id);
      localStorage.setItem('dhanvantri_session_secret', tokenData.session_secret);

      // Navigate to status screen
      navigate(`/status?id=${tokenData.id}`);
    } catch (err: unknown) {
      console.error('Error creating token:', err);
      // Fallback redirect with error message
      setErrorMsg(
        'Could not complete token registration directly. Ensure Supabase credentials are configured.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {/* Header Back link */}
      <div className="mb-6 flex items-center justify-between">
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
        <div>
          <h2 className="text-2xl md:text-3xl font-extrabold text-foreground">
            {t('tokenFlow.title')}
          </h2>
          <p className="text-muted-foreground font-medium mt-1">
            Dhanvantri Clinic • Dr Yogesh
          </p>
        </div>

        {errorMsg && (
          <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive font-semibold flex items-center gap-2">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* STEP 1: Name and Phone */}
        {step === 1 && (
          <form onSubmit={handleStep1Next} className="space-y-5">
            <div className="space-y-2">
              <label className="block text-lg font-bold text-foreground">
                {t('tokenFlow.fullName')} *
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder={t('tokenFlow.fullNamePlaceholder')}
                className="w-full h-14 px-4 text-xl rounded-xl border border-input bg-background font-medium focus:ring-2 focus:ring-primary focus:outline-none"
              />
            </div>

            {!noPhone && (
              <div className="space-y-2">
                <label className="block text-lg font-bold text-foreground">
                  {t('tokenFlow.phone')} *
                </label>
                <input
                  type="tel"
                  required={!noPhone}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder={t('tokenFlow.phonePlaceholder')}
                  className="w-full h-14 px-4 text-xl rounded-xl border border-input bg-background font-medium focus:ring-2 focus:ring-primary focus:outline-none"
                />
              </div>
            )}

            <div className="pt-2">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={noPhone}
                  onChange={(e) => setNoPhone(e.target.checked)}
                  className="w-6 h-6 rounded border-input text-primary focus:ring-primary"
                />
                <span className="text-base font-semibold text-muted-foreground">
                  {t('tokenFlow.noPhoneToggle')}
                </span>
              </label>
            </div>

            <button
              type="submit"
              className="w-full h-14 mt-4 bg-primary text-primary-foreground font-bold text-xl rounded-xl hover:bg-primary-700 shadow-md transition-colors"
            >
              Continue to Step 2
            </button>
          </form>
        )}

        {/* STEP 2: Age & Accessibility Profile */}
        {step === 2 && (
          <form onSubmit={handleStep2Next} className="space-y-5">
            <div className="space-y-2">
              <label className="block text-lg font-bold text-foreground">
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
                className="w-full h-14 px-4 text-xl rounded-xl border border-input bg-background font-medium focus:ring-2 focus:ring-primary focus:outline-none"
              />
            </div>

            {/* Senior Care Auto Banner */}
            {isSenior && (
              <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200 font-bold flex items-center gap-2">
                <Sparkles className="w-6 h-6 text-amber-600 flex-shrink-0" />
                <span>{t('tokenFlow.seniorAutoBadge')}</span>
              </div>
            )}

            {/* Accessibility Checklist */}
            <div className="pt-2 space-y-3">
              <p className="font-bold text-foreground text-lg">
                {t('tokenFlow.accessibilityHeading')}
              </p>

              <label className="flex items-center gap-3 p-3.5 rounded-xl border cursor-pointer hover:bg-muted">
                <input
                  type="checkbox"
                  checked={accessibility.includes('wheelchair')}
                  onChange={() => toggleAccessibility('wheelchair')}
                  className="w-6 h-6 rounded text-primary focus:ring-primary"
                />
                <Accessibility className="w-6 h-6 text-primary flex-shrink-0" />
                <span className="font-semibold text-base">{t('tokenFlow.wheelchair')}</span>
              </label>

              <label className="flex items-center gap-3 p-3.5 rounded-xl border cursor-pointer hover:bg-muted">
                <input
                  type="checkbox"
                  checked={accessibility.includes('hearing')}
                  onChange={() => toggleAccessibility('hearing')}
                  className="w-6 h-6 rounded text-primary focus:ring-primary"
                />
                <VolumeX className="w-6 h-6 text-primary flex-shrink-0" />
                <span className="font-semibold text-base">{t('tokenFlow.hearing')}</span>
              </label>

              <label className="flex items-center gap-3 p-3.5 rounded-xl border cursor-pointer hover:bg-muted">
                <input
                  type="checkbox"
                  checked={accessibility.includes('vision')}
                  onChange={() => toggleAccessibility('vision')}
                  className="w-6 h-6 rounded text-primary focus:ring-primary"
                />
                <Eye className="w-6 h-6 text-primary flex-shrink-0" />
                <span className="font-semibold text-base">{t('tokenFlow.vision')}</span>
              </label>

              <label className="flex items-center gap-3 p-3.5 rounded-xl border cursor-pointer hover:bg-muted">
                <input
                  type="checkbox"
                  checked={accessibility.includes('assistance')}
                  onChange={() => toggleAccessibility('assistance')}
                  className="w-6 h-6 rounded text-primary focus:ring-primary"
                />
                <HeartHandshake className="w-6 h-6 text-primary flex-shrink-0" />
                <span className="font-semibold text-base">{t('tokenFlow.assistance')}</span>
              </label>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="w-1/3 h-14 border rounded-xl font-bold text-lg hover:bg-muted"
              >
                Back
              </button>
              <button
                type="submit"
                className="w-2/3 h-14 bg-primary text-primary-foreground font-bold text-xl rounded-xl hover:bg-primary-700 shadow-md"
              >
                Review & Confirm
              </button>
            </div>
          </form>
        )}

        {/* STEP 3: Review & Confirm */}
        {step === 3 && (
          <div className="space-y-6">
            <div className="rounded-xl border p-4 bg-muted/50 space-y-3">
              <div className="flex justify-between items-center border-b pb-2">
                <span className="text-muted-foreground font-semibold">Patient Name</span>
                <span className="font-bold text-foreground text-lg">{fullName}</span>
              </div>
              <div className="flex justify-between items-center border-b pb-2">
                <span className="text-muted-foreground font-semibold">Contact</span>
                <span className="font-bold text-foreground text-lg">
                  {noPhone ? 'Desk Walk-In' : phone}
                </span>
              </div>
              <div className="flex justify-between items-center border-b pb-2">
                <span className="text-muted-foreground font-semibold">Age</span>
                <span className="font-bold text-foreground text-lg">
                  {age} yrs {isSenior && '• Senior Care'}
                </span>
              </div>
              {accessibility.length > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground font-semibold">Assistance</span>
                  <span className="font-bold text-foreground">
                    {accessibility.join(', ')}
                  </span>
                </div>
              )}
            </div>

            <p className="text-sm font-medium text-muted-foreground bg-muted p-3 rounded-lg">
              {t('tokenFlow.consentNotice')}
            </p>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setStep(2)}
                disabled={loading}
                className="w-1/3 h-14 border rounded-xl font-bold text-lg hover:bg-muted"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading}
                className="w-2/3 h-14 bg-emerald-600 text-white font-bold text-xl rounded-xl hover:bg-emerald-700 shadow-lg flex items-center justify-center gap-2"
              >
                {loading ? (
                  <span>{t('common.loading')}</span>
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
