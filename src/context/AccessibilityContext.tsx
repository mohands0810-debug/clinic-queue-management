import React, { createContext, useContext, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

interface AccessibilityContextType {
  fontScale: number;
  increaseFontSize: () => void;
  decreaseFontSize: () => void;
  resetFontSize: () => void;
  isHighContrast: boolean;
  toggleHighContrast: () => void;
  speakText: (text: string) => void;
  isSpeaking: boolean;
}

const AccessibilityContext = createContext<AccessibilityContextType | undefined>(undefined);

export const AccessibilityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { i18n } = useTranslation();
  
  // Font scale: 1.0 (base 20px) up to 1.4 (28px)
  const [fontScale, setFontScale] = useState<number>(() => {
    const saved = localStorage.getItem('dhanvantri_font_scale');
    return saved ? parseFloat(saved) : 1.0;
  });

  const [isHighContrast, setIsHighContrast] = useState<boolean>(() => {
    const saved = localStorage.getItem('dhanvantri_high_contrast');
    return saved === 'true';
  });

  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);

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

  const speakText = (text: string) => {
    if (!('speechSynthesis' in window)) {
      console.warn('Speech synthesis not supported in this browser.');
      return;
    }

    window.speechSynthesis.cancel(); // Stop any ongoing speech
    const utterance = new SpeechSynthesisUtterance(text);
    
    // Set language based on active i18n language
    const currentLang = i18n.language || 'en';
    if (currentLang.startsWith('kn')) {
      utterance.lang = 'kn-IN';
    } else if (currentLang.startsWith('hi')) {
      utterance.lang = 'hi-IN';
    } else {
      utterance.lang = 'en-IN';
    }

    utterance.rate = 0.9; // Slightly slower for elderly comprehension
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

