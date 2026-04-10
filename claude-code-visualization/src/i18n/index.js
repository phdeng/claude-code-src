import { ref, computed } from 'vue'
import en from './en.js'
import zh from './zh.js'

const LOCALES = { en, zh }
const locale = ref(localStorage.getItem('cc-locale') || 'en')

export function useI18n() {
  const messages = computed(() => LOCALES[locale.value] || en)

  function t(key, fallback) {
    const val = key.split('.').reduce((o, k) => o?.[k], messages.value)
    return val ?? fallback ?? key
  }

  function setLocale(loc) {
    locale.value = loc
    localStorage.setItem('cc-locale', loc)
  }

  return { locale, t, setLocale }
}
