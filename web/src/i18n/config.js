import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

/**
 * Item 36-42: Full i18n Configuration
 */
i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: 'en',
    debug: false,
    interpolation: {
      escapeValue: false,
    },
    resources: {
      en: {
        translation: {
          nav: {
            dashboard: 'Dashboard',
            groceries: 'Groceries',
            finance: 'Finance',
            people: 'People',
            settings: 'Settings',
          },
          common: {
            save: 'Save',
            cancel: 'Cancel',
            loading: 'Loading...',
            error: 'An error occurred',
          }
        }
      },
      fr: {
        translation: {
          nav: {
            dashboard: 'Tableau de bord',
            groceries: 'Courses',
            finance: 'Finances',
            people: 'Membres',
            settings: 'Paramètres',
          },
          common: {
            save: 'Enregistrer',
            cancel: 'Annuler',
            loading: 'Chargement...',
            error: 'Une erreur est survenue',
          }
        }
      }
    }
  });

export default i18n;
