<template>
  <header class="topbar">
    <div class="logo">
      <div class="logo-icon">
        <svg viewBox="0 0 28 28" fill="none" width="26" height="26">
          <rect width="28" height="28" rx="7" :fill="theme === 'dark' ? '#161d27' : '#e6e9ef'" />
          <path d="M7 14L14 7L21 14L14 21Z" :stroke="accentBlue" stroke-width="1.5" fill="none" />
          <circle cx="14" cy="14" r="3" :fill="accentPurple" />
        </svg>
      </div>
      <div class="logo-text">
        <h1>CLAUDE CODE</h1>
        <span class="subtitle">Architecture Explorer</span>
      </div>
    </div>
    <div class="top-right">
      <span class="arch-stats">30 modules &bull; 28 connections &bull; 11 scenarios</span>
      <div class="top-actions">
        <span class="tech-stack">TypeScript + React (Ink) + Bun</span>
        <button class="locale-toggle" @click="$emit('toggle-locale')" :title="locale === 'en' ? '切换到中文' : 'Switch to English'">
          {{ locale === 'en' ? '中' : 'EN' }}
        </button>
        <button class="theme-toggle" @click="$emit('toggle-theme')" :title="theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'">
          <svg v-if="theme === 'dark'" viewBox="0 0 20 20" width="15" height="15" fill="currentColor">
            <path d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z"/>
          </svg>
          <svg v-else viewBox="0 0 20 20" width="15" height="15" fill="currentColor">
            <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z"/>
          </svg>
        </button>
      </div>
    </div>
  </header>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  theme: { type: String, default: 'dark' },
  locale: { type: String, default: 'en' },
})
defineEmits(['toggle-theme', 'toggle-locale'])

const accentBlue = computed(() => props.theme === 'dark' ? '#5b9cf5' : '#3b82f6')
const accentPurple = computed(() => props.theme === 'dark' ? '#9b7ff0' : '#7c5ce0')
</script>

<style scoped>
.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 24px;
  background: var(--bg-panel);
  border-bottom: 1px solid var(--border);
  z-index: 10;
  flex-shrink: 0;
  transition: background 0.3s, border-color 0.3s;
}
.logo {
  display: flex;
  align-items: center;
  gap: 12px;
}
.logo-icon {
  display: flex;
  align-items: center;
  justify-content: center;
}
.logo-text {
  display: flex;
  align-items: baseline;
  gap: 10px;
}
.logo h1 {
  font-family: 'JetBrains Mono', monospace;
  font-size: 15px;
  font-weight: 700;
  color: var(--accent-blue);
  letter-spacing: 1.5px;
}
.subtitle {
  font-size: 11px;
  color: var(--text-muted);
  font-weight: 500;
}
.top-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
}
.top-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}
.arch-stats {
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  color: var(--text-muted);
  letter-spacing: 0.3px;
}
.tech-stack {
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  color: var(--text-dim);
}
.locale-toggle {
  width: 30px;
  height: 30px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--bg-card);
  color: var(--text-muted);
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}
.locale-toggle:hover {
  border-color: var(--accent-purple);
  color: var(--accent-purple);
  background: var(--bg-hover);
}
.theme-toggle {
  width: 30px;
  height: 30px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--bg-card);
  color: var(--text-muted);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}
.theme-toggle:hover {
  border-color: var(--accent-blue);
  color: var(--accent-blue);
  background: var(--bg-hover);
}
</style>
