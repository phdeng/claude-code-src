<template>
  <div class="app-shell" :data-theme="theme">
    <TopBar :theme="theme" :locale="locale" @toggle-theme="toggleTheme" @toggle-locale="toggleLocale" />
    <ScenarioBar />

    <div class="main-area">
      <ArchitectureGraph
        @select-node="selectedNode = $event"
        @deselect="selectedNode = null"
      />
      <CodeViewer
        v-if="openCodeRef"
        :codeRef="openCodeRef"
        @close="openCodeRef = null"
      />
      <DetailPanel
        :node="selectedNode"
        @close="selectedNode = null"
        @open-code="openCodeRef = $event"
      />
    </div>

    <FlowControls />
    <HelpModal :visible="helpOpen" @close="helpOpen = false" />

    <!-- First-visit welcome toast -->
    <Transition name="toast">
      <div v-if="showWelcome" class="welcome-toast">
        <div class="welcome-content">
          <strong>{{ t('app.welcome') }}</strong>
          <p>{{ t('app.welcomeDesc') }}</p>
        </div>
        <button class="welcome-close" @click="dismissWelcome">{{ t('app.gotIt') }}</button>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'
import TopBar from './components/TopBar.vue'
import ScenarioBar from './components/ScenarioBar.vue'
import ArchitectureGraph from './components/ArchitectureGraph.vue'
import DetailPanel from './components/DetailPanel.vue'
import FlowControls from './components/FlowControls.vue'
import HelpModal from './components/HelpModal.vue'
import CodeViewer from './components/CodeViewer.vue'
import { useTheme, setTheme } from './composables/useTheme.js'
import { useI18n } from './i18n/index.js'

const selectedNode = ref(null)
const helpOpen = ref(false)
const openCodeRef = ref(null)

const { theme } = useTheme()
const { locale, t, setLocale } = useI18n()

function toggleTheme() {
  const next = theme.value === 'dark' ? 'light' : 'dark'
  setTheme(next)
}

function toggleLocale() {
  setLocale(locale.value === 'en' ? 'zh' : 'en')
}

watch(theme, (val) => {
  localStorage.setItem('cc-theme', val)
  document.documentElement.setAttribute('data-theme', val)
})

onMounted(() => {
  document.documentElement.setAttribute('data-theme', theme.value)
})

const showWelcome = ref(!localStorage.getItem('cc-welcomed'))
function dismissWelcome() {
  showWelcome.value = false
  localStorage.setItem('cc-welcomed', '1')
}
// Auto-dismiss after 8 seconds
onMounted(() => {
  if (showWelcome.value) setTimeout(() => { showWelcome.value = false }, 8000)
})

function onKey(e) {
  if (e.key === 'h' || e.key === 'H') helpOpen.value = !helpOpen.value
}
onMounted(() => window.addEventListener('keydown', onKey))
onUnmounted(() => window.removeEventListener('keydown', onKey))
</script>

<style scoped>
.app-shell {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--bg-deep);
  transition: background 0.3s ease;
}
.main-area {
  flex: 1;
  display: flex;
  position: relative;
  overflow: hidden;
}

/* Welcome toast */
.welcome-toast {
  position: fixed;
  bottom: 60px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 50;
  display: flex;
  align-items: center;
  gap: 16px;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 14px 20px;
  box-shadow: var(--shadow-xl);
  backdrop-filter: var(--backdrop-blur);
  max-width: 600px;
}
.welcome-content {
  font-size: 12px;
  color: var(--text-secondary);
  line-height: 1.6;
}
.welcome-content strong {
  color: var(--accent-blue);
  display: block;
  margin-bottom: 4px;
  font-size: 13px;
}
.welcome-content p {
  margin: 0;
}
.welcome-content kbd {
  display: inline-block;
  padding: 1px 5px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 3px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  color: var(--text-primary);
}
.welcome-close {
  padding: 6px 14px;
  border: 1px solid var(--accent-blue);
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--accent-blue);
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s;
}
.welcome-close:hover {
  background: rgba(91, 156, 245, 0.1);
}
.toast-enter-active { transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
.toast-leave-active { transition: all 0.3s ease; }
.toast-enter-from { opacity: 0; transform: translateX(-50%) translateY(20px); }
.toast-leave-to { opacity: 0; transform: translateX(-50%) translateY(10px); }
</style>
