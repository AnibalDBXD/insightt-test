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

// Hydration-safe: first client render matches the server (English), then the
// stored preference is applied post-mount.
if (typeof window !== "undefined") {
  const stored = localStorage.getItem("lang");
  if (stored === "es" || stored === "en") {
    void i18n.changeLanguage(stored);
  }
}

export default i18n;
