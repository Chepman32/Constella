import React, { createContext, useContext, useState, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Import i18n with error handling
let i18nReady = false;
try {
  require('../localization/i18n');
  i18nReady = true;
} catch (error) {
  console.warn('i18n initialization failed, using fallback:', error);
}

interface LocalizationContextType {
  language: string;
  setLanguage: (language: string) => Promise<void>;
  t: (key: string, options?: any) => string;
  availableLanguages: { code: string; name: string; nativeName: string }[];
}

const availableLanguages = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский' },
  { code: 'es', name: 'Spanish', nativeName: 'Español' },
  { code: 'de', name: 'German', nativeName: 'Deutsch' },
  { code: 'fr', name: 'French', nativeName: 'Français' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語' },
  { code: 'zh', name: 'Chinese', nativeName: '中文' },
  { code: 'ko', name: 'Korean', nativeName: '한국어' },
  { code: 'uk', name: 'Ukrainian', nativeName: 'Українська' },
];

const LocalizationContext = createContext<LocalizationContextType | undefined>(undefined);

export const useLocalization = () => {
  const context = useContext(LocalizationContext);
  if (!context) {
    throw new Error('useLocalization must be used within a LocalizationProvider');
  }
  return context;
};

interface LocalizationProviderProps {
  children: ReactNode;
}

// Fallback translation function
const fallbackT = (key: string): string => {
  // Return the key itself as fallback
  const parts = key.split('.');
  return parts[parts.length - 1] || key;
};

export const LocalizationProvider: React.FC<LocalizationProviderProps> = ({ children }) => {
  // Always call useTranslation but handle errors gracefully
  const [translationState, setTranslationState] = useState<{
    i18n: any;
    t: (key: string, options?: any) => string;
  }>({
    i18n: null,
    t: fallbackT
  });

  const [language, setLanguageState] = useState('en');

  // Try to use i18n translation
  React.useEffect(() => {
    if (!i18nReady) {
      return;
    }

    try {
      // Import i18n instance directly
      const i18nInstance = require('../localization/i18n').default;

      // Wait for i18n to be ready
      if (i18nInstance.isInitialized) {
        setTranslationState({
          i18n: i18nInstance,
          t: i18nInstance.t.bind(i18nInstance)
        });
        setLanguageState(i18nInstance.language);
      } else {
        i18nInstance.on('initialized', () => {
          setTranslationState({
            i18n: i18nInstance,
            t: i18nInstance.t.bind(i18nInstance)
          });
          setLanguageState(i18nInstance.language);
        });
      }

      const handleLanguageChange = (lng: string) => {
        setLanguageState(lng);
      };

      i18nInstance.on('languageChanged', handleLanguageChange);

      return () => {
        i18nInstance.off('languageChanged', handleLanguageChange);
        i18nInstance.off('initialized');
      };
    } catch (error) {
      console.warn('Failed to initialize i18n, using fallback:', error);
    }
  }, []);

  const setLanguage = async (newLanguage: string) => {
    try {
      if (translationState.i18n) {
        await translationState.i18n.changeLanguage(newLanguage);
      }
      await AsyncStorage.setItem('language', newLanguage);
      setLanguageState(newLanguage);
    } catch (error) {
      console.error('Failed to change language:', error);
    }
  };

  const value: LocalizationContextType = {
    language,
    setLanguage,
    t: translationState.t,
    availableLanguages,
  };

  return (
    <LocalizationContext.Provider value={value}>
      {children}
    </LocalizationContext.Provider>
  );
};