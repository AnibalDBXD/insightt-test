import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./en.json";
import es from "./es.json";

if (!i18n.isInitialized) {
  i18n.use(initReactI18next).init({
    resources: {
      en: { translation: en },
      es: { translation: es },
    },
    lng: "en",
    fallbackLng: "en",
    interpolation: { escapeValue: false },
  });
}

// Hydration-safe: the stored language is applied only after hydration, from
// the LocaleGate component in _app — never at module load, or SSR/SSG
// (English) and client HTML would diverge.
export function applyStoredLanguage() {
  if (typeof window === "undefined") return;
  const stored = localStorage.getItem("lang");
  if (stored === "es" || stored === "en") {
    void i18n.changeLanguage(stored);
  }
}

export default i18n;
