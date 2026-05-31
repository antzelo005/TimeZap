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

  function t(key: TranslationKey, variables?: Record<string, string | number>): string {
    const language = settings.language as LanguageCode;
    const value = locales[language][key] ?? locales.en[key] ?? key;
    return interpolate(value, variables);
  }

  async function setLanguage(language: LanguageCode): Promise<void> {
    await updateSettings({ language });
  }

  return {
    t,
    language: settings.language,
    setLanguage
  };
}
