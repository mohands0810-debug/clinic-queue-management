import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

interface AccessibilityContextType {
  fontScale: number;
  increaseFontSize: () => void;
  decreaseFontSize: () => void;
  resetFontSize: () => void;
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  isHighContrast: boolean;
  toggleHighContrast: () => void;
  speakText: (text: string, overrideLang?: string) => void;
  isSpeaking: boolean;
}

const AccessibilityContext = createContext<AccessibilityContextType | undefined>(undefined);

export const AccessibilityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { i18n } = useTranslation();
  
  const [fontScale, setFontScale] = useState<number>(() => {
    const saved = localStorage.getItem('dhanvantri_font_scale');
    return saved ? parseFloat(saved) : 1.0;
  });

  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('dhanvantri_theme');
    if (saved) return saved === 'dark';
    return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  const [isHighContrast, setIsHighContrast] = useState<boolean>(false);

  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const voicesRef = useRef<SpeechSynthesisVoice[]>([]);

  // Apply dark mode class to root
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('dhanvantri_theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  const toggleDarkMode = () => {
    setIsDarkMode((prev) => !prev);
  };

  // Load and cache voices when browser is ready
  useEffect(() => {
    if (!('speechSynthesis' in window)) return;

    const loadVoices = () => {
      const available = window.speechSynthesis.getVoices();
      if (available && available.length > 0) {
        voicesRef.current = available;
      }
    };

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;

    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.onvoiceschanged = null;
      }
    };
  }, []);

  useEffect(() => {
    document.documentElement.style.setProperty('--font-scale', fontScale.toString());
    localStorage.setItem('dhanvantri_font_scale', fontScale.toString());
  }, [fontScale]);

  useEffect(() => {
    if (isHighContrast) {
      document.documentElement.classList.add('high-contrast');
    } else {
      document.documentElement.classList.remove('high-contrast');
    }
    localStorage.setItem('dhanvantri_high_contrast', isHighContrast.toString());
  }, [isHighContrast]);

  const increaseFontSize = () => {
    setFontScale((prev) => Math.min(1.4, prev + 0.1));
  };

  const decreaseFontSize = () => {
    setFontScale((prev) => Math.max(0.9, prev - 0.1));
  };

  const resetFontSize = () => {
    setFontScale(1.0);
  };

  const toggleHighContrast = () => {
    setIsHighContrast((prev) => !prev);
  };

  /**
   * Intelligently selects the best voice for the chosen language.
   * If native Kannada voice is absent on Windows, falls back to Indic/Hindi voice before English.
   */
  const findBestVoice = (targetLang: string): { voice: SpeechSynthesisVoice | null; bcp47: string } => {
    const voices = voicesRef.current.length > 0 
      ? voicesRef.current 
      : (typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis.getVoices() : []);

    const langLower = targetLang.toLowerCase();

    if (langLower.startsWith('kn')) {
      // 1. Direct Kannada voice
      const knVoice = voices.find(
        (v) => v.lang.toLowerCase().includes('kn') || v.name.toLowerCase().includes('kannada')
      );
      if (knVoice) return { voice: knVoice, bcp47: 'kn-IN' };

      // 2. Fallback to Indian English or Hindi which understands Indian names & numbers
      const hiVoice = voices.find(
        (v) => v.lang.toLowerCase().includes('hi') || v.name.toLowerCase().includes('hindi')
      );
      if (hiVoice) return { voice: hiVoice, bcp47: 'hi-IN' };

      const inVoice = voices.find((v) => v.lang.toLowerCase().includes('en-in') || v.name.toLowerCase().includes('india'));
      if (inVoice) return { voice: inVoice, bcp47: 'en-IN' };

      return { voice: null, bcp47: 'kn-IN' };
    }

    if (langLower.startsWith('hi')) {
      const hiVoice = voices.find(
        (v) => v.lang.toLowerCase().includes('hi') || v.name.toLowerCase().includes('hindi')
      );
      if (hiVoice) return { voice: hiVoice, bcp47: 'hi-IN' };

      const inVoice = voices.find((v) => v.lang.toLowerCase().includes('en-in') || v.name.toLowerCase().includes('india'));
      if (inVoice) return { voice: inVoice, bcp47: 'hi-IN' };

      return { voice: null, bcp47: 'hi-IN' };
    }

    // Default English
    const enInVoice = voices.find((v) => v.lang.toLowerCase().includes('en-in'));
    if (enInVoice) return { voice: enInVoice, bcp47: 'en-IN' };

    const enVoice = voices.find((v) => v.lang.toLowerCase().startsWith('en'));
    return { voice: enVoice || null, bcp47: 'en-IN' };
  };

  const speakText = (text: string, overrideLang?: string) => {
    if (!('speechSynthesis' in window)) {
      console.warn('Speech synthesis not supported in this browser.');
      return;
    }

    window.speechSynthesis.cancel(); // Cancel any ongoing speech

    const targetLang = overrideLang || i18n.language || 'en';
    const { voice, bcp47 } = findBestVoice(targetLang);

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = bcp47;
    if (voice) {
      utterance.voice = voice;
    }

    utterance.rate = 0.85; // Calibrated speed for senior clarity
    utterance.pitch = 1.0;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
  };

  return (
    <AccessibilityContext.Provider
      value={{
        fontScale,
        increaseFontSize,
        decreaseFontSize,
        resetFontSize,
        isDarkMode,
        toggleDarkMode,
        isHighContrast,
        toggleHighContrast,
        speakText,
        isSpeaking,
      }}
    >
      {children}
    </AccessibilityContext.Provider>
  );
};

export const useAccessibility = (): AccessibilityContextType => {
  const context = useContext(AccessibilityContext);
  if (!context) {
    throw new Error('useAccessibility must be used within an AccessibilityProvider');
  }
  return context;
};
