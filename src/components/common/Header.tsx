import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useAccessibility } from '@/context/AccessibilityContext';
import { Phone, AlertCircle, Volume2, Type, Sun, Moon, Camera } from 'lucide-react';
import { QrScannerModal } from '@/components/common/QrScannerModal';

export const Header: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [showScanner, setShowScanner] = useState<boolean>(false);
  const { 
    increaseFontSize, 
    decreaseFontSize, 
    isDarkMode, 
    toggleDarkMode, 
    speakText,
    isSpeaking 
  } = useAccessibility();

  const handleLanguageChange = (lang: string) => {
    i18n.changeLanguage(lang);
  };

  const handleEmergencyHelp = () => {
    const message = t('common.needHelp') + ' - ' + t('clinic.name');
    speakText(message);
    alert(t('tokenFlow.consentNotice') + '\n\n' + t('doctor.helpBanner') + ': Staff notified at desk.');
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background text-foreground shadow-sm px-4 py-3 mb-4">
      <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-3">
        {/* Clinic Identity */}
        <Link to="/" className="flex items-center gap-2 group">
          <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-xl">
            ಧ
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold leading-tight tracking-tight">
              {t('clinic.name')}
            </h1>
            <p className="text-sm font-medium text-muted-foreground">
              {t('clinic.doctor')} • BTM Layout
            </p>
          </div>
        </Link>

        {/* Accessibility & Language Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Language Selector */}
          <div className="flex rounded-md border p-1 bg-muted">
            <button
              onClick={() => handleLanguageChange('en')}
              className={`px-3 py-1.5 rounded text-sm md:text-base font-semibold transition-colors ${
                i18n.language === 'en' ? 'bg-primary text-primary-foreground' : 'text-foreground'
              }`}
            >
              English
            </button>
            <button
              onClick={() => handleLanguageChange('kn')}
              className={`px-3 py-1.5 rounded text-sm md:text-base font-semibold transition-colors ${
                i18n.language.startsWith('kn') ? 'bg-primary text-primary-foreground' : 'text-foreground'
              }`}
            >
              ಕನ್ನಡ
            </button>
            <button
              onClick={() => handleLanguageChange('hi')}
              className={`px-3 py-1.5 rounded text-sm md:text-base font-semibold transition-colors ${
                i18n.language.startsWith('hi') ? 'bg-primary text-primary-foreground' : 'text-foreground'
              }`}
            >
              हिन्दी
            </button>
          </div>

          {/* Font Size A- / A+ */}
          <div className="flex items-center border rounded-md bg-muted px-1">
            <button
              onClick={decreaseFontSize}
              aria-label="Decrease text size"
              className="px-2.5 py-1.5 font-bold hover:bg-background rounded flex items-center gap-1 text-sm md:text-base"
              title="Decrease text size"
            >
              <Type className="w-3.5 h-3.5" />-
            </button>
            <button
              onClick={increaseFontSize}
              aria-label="Increase text size"
              className="px-2.5 py-1.5 font-bold hover:bg-background rounded flex items-center gap-1 text-sm md:text-base"
              title="Increase text size"
            >
              <Type className="w-4 h-4" />+
            </button>
          </div>

          {/* Clean Light / Dark Mode Toggle */}
          <button
            onClick={toggleDarkMode}
            aria-label={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            className="px-3 py-1.5 rounded-md border font-semibold flex items-center gap-1.5 transition-colors bg-muted text-foreground hover:bg-background"
            title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {isDarkMode ? (
              <>
                <Sun className="w-5 h-5 text-amber-400" />
                <span className="hidden sm:inline text-sm font-bold">Light</span>
              </>
            ) : (
              <>
                <Moon className="w-5 h-5 text-slate-700" />
                <span className="hidden sm:inline text-sm font-bold">Dark</span>
              </>
            )}
          </button>

          {/* Speech Readout Quick Action */}
          <button
            onClick={() => speakText(`${t('clinic.name')}, ${t('clinic.doctor')}.`)}
            aria-label={t('common.readToMe')}
            className={`p-2 rounded-md border font-semibold flex items-center gap-1 transition-colors ${
              isSpeaking ? 'bg-primary text-primary-foreground animate-pulse' : 'bg-muted text-foreground'
            }`}
            title={t('common.readToMe')}
          >
            <Volume2 className="w-5 h-5" />
          </button>

          {/* Quick QR Camera Scanner */}
          <button
            onClick={() => setShowScanner(true)}
            aria-label="Scan Clinic QR Code"
            className="p-2 sm:px-3 sm:py-1.5 rounded-md border font-semibold flex items-center gap-1.5 transition-colors bg-muted text-foreground hover:bg-background"
            title="Scan Clinic QR Code"
          >
            <Camera className="w-5 h-5 text-primary" />
            <span className="hidden lg:inline text-sm font-bold">Scan QR</span>
          </button>

          {/* Call Clinic Direct */}
          <a
            href="tel:+919876543210"
            className="p-2 sm:px-3 sm:py-1.5 rounded-md bg-emerald-600 text-white font-semibold flex items-center gap-1.5 hover:bg-emerald-700 transition-colors"
            title={t('common.callClinic')}
          >
            <Phone className="w-5 h-5" />
            <span className="hidden md:inline text-sm">{t('common.callClinic')}</span>
          </a>

          {/* Emergency Distress Alert */}
          <button
            onClick={handleEmergencyHelp}
            className="px-3 py-1.5 rounded-md bg-destructive text-destructive-foreground font-bold flex items-center gap-1.5 hover:opacity-90 shadow-sm"
          >
            <AlertCircle className="w-5 h-5" />
            <span className="text-sm font-bold">{t('common.needHelp')}</span>
          </button>
        </div>
      </div>
    </header>
  );
};

