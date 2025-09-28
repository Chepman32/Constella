import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Import translations
import en from './translations/en.json';
import ru from './translations/ru.json';
import es from './translations/es.json';
import de from './translations/de.json';
import fr from './translations/fr.json';
import pt from './translations/pt.json';
import ja from './translations/ja.json';
import zh from './translations/zh.json';
import ko from './translations/ko.json';
import uk from './translations/uk.json';

const resources = {
  en: { translation: en },
  ru: { translation: ru },
  es: { translation: es },
  de: { translation: de },
  fr: { translation: fr },
  pt: { translation: pt },
  ja: { translation: ja },
  zh: { translation: zh },
  ko: { translation: ko },
  uk: { translation: uk },
};

const getDeviceLanguage = async (): Promise<string> => {
  try {
    // Try to get saved language from storage first
    const savedLanguage = await AsyncStorage.getItem('language');
    if (savedLanguage) {
      return savedLanguage;
    }

    // Try to import RNLocalize dynamically
    try {
      const RNLocalize = await import('react-native-localize');
      const deviceLanguages = RNLocalize.getLocales();
      const deviceLanguage = deviceLanguages[0]?.languageCode || 'en';

      // Check if we support the device language
      return Object.keys(resources).includes(deviceLanguage) ? deviceLanguage : 'en';
    } catch (nativeError) {
      console.warn('RNLocalize not available, falling back to English:', nativeError);
      return 'en';
    }
  } catch (error) {
    console.error('Language detection error:', error);
    return 'en';
  }
};

const LANGUAGE_DETECTOR = {
  type: 'languageDetector' as const,
  async: true,
  detect: async (callback: (lang: string) => void) => {
    const language = await getDeviceLanguage();
    callback(language);
  },
  init: () => {},
  cacheUserLanguage: async (language: string) => {
    try {
      await AsyncStorage.setItem('language', language);
    } catch (error) {
      console.error('Failed to cache language:', error);
    }
  },
};

i18n
  .use(LANGUAGE_DETECTOR)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    debug: __DEV__,

    interpolation: {
      escapeValue: false, // React already does escaping
    },

    react: {
      useSuspense: false,
    },
  });

export default i18n;