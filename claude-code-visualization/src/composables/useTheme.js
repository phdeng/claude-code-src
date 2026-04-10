import { ref, computed } from 'vue'

const currentTheme = ref(localStorage.getItem('cc-theme') || 'dark')

export function setTheme(theme) {
  currentTheme.value = theme
}

export function useTheme() {
  const isDark = computed(() => currentTheme.value === 'dark')
  return { theme: currentTheme, isDark }
}
