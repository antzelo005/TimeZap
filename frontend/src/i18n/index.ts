import en from "./locales/en";
import el from "./locales/el";
import ro from "./locales/ro";
import { useSettings } from "../context/SettingsContext";
import type { LanguageCode } from "../types/settings";

const locales = {
  en,
  el,
  ro
} as const;

type TranslationKey = keyof typeof en;

function normalizeLanguage(language: string | undefined): LanguageCode {
  return language === "el" || language === "ro" ? language : "en";
}

function interpolate(template: string, variables?: Record<string, string | number>): string {
  if (!variables) {
    return template;
  }

  return Object.entries(variables).reduce(
    (result, [key, value]) => result.replaceAll(`{{${key}}}`, String(value)),
    template
  );
}

export function useTranslation() {
  const { settings, updateSettings } = useSettings();
  const language = normalizeLanguage(settings?.language);
  const dictionary = locales[language] ?? locales.en;

  function t(key: TranslationKey, variables?: Record<string, string | number>): string {
    const value = dictionary[key] ?? locales.en[key] ?? key;
    return interpolate(value, variables);
  }

  async function setLanguage(language: LanguageCode): Promise<void> {
    await updateSettings({ language });
  }

  return {
    t,
    language,
    setLanguage
  };
}
