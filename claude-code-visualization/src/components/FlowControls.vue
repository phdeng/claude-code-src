<template>
  <footer class="flow-bar">
    <!-- Progress bar + step dots -->
    <div class="step-indicator">
      <div class="progress-track" v-if="totalSteps > 0">
        <div class="progress-fill" :style="{ width: progressPct + '%' }"></div>
      </div>
      <div class="step-dots">
        <div
          v-for="(_, i) in totalSteps"
          :key="i"
          class="step-dot"
          :class="{
            active: i === currentStep,
            passed: i < currentStep,
          }"
          @click="goToStep(i)"
        ></div>
      </div>
    </div>

    <!-- Description -->
    <div class="flow-desc">
      <template v-if="stepInfo">
        <div class="step-head">
          <strong>{{ t('nav.step') }} {{ currentStep + 1 }}/{{ totalSteps }}</strong>
          <span class="step-main">{{ stepInfo.desc }}</span>
        </div>
        <div class="step-detail">
          {{ stepInfo.detail }}
          <template v-if="stepInfo.code"> &bull; <code class="code-ref">{{ stepInfo.code }}</code></template>
          <template v-if="isLastStep && relatedScenarios.length"> &bull; {{ t('nav.nextUp') }}: <span
            v-for="(r, i) in relatedScenarios" :key="r.id"
            class="related-link" @click="setScenario(r.id)"
          >{{ r.title }}<span v-if="i < relatedScenarios.length - 1">, </span></span></template>
        </div>
      </template>
      <template v-else>
        <div class="step-head">
          <strong>{{ scenario?.title }}</strong>
          <span class="step-main">{{ totalSteps }} {{ t('nav.steps') }} &bull; {{ t('nav.clickNext') }}</span>
        </div>
        <div class="step-detail">
          {{ scenarioPreviewText }}
          <template v-if="relatedScenarios.length"> &bull; {{ t('nav.seeAlso') }}: <span
            v-for="(r, i) in relatedScenarios" :key="r.id"
            class="related-link" @click="setScenario(r.id)"
          >{{ r.title }}<span v-if="i < relatedScenarios.length - 1">, </span></span></template>
        </div>
      </template>
    </div>

    <!-- CC-style shortcut hints -->
    <div class="key-hints">
      <Transition name="hint-fade">
        <span v-if="ctrlCHint" class="ctrl-c-hint">{{ ctrlCHint }}</span>
      </Transition>
      <span class="key-hint"><kbd>^C</kbd> stop</span>
      <span class="key-hint-sep"></span>
      <span class="key-hint"><kbd>&larr;</kbd><kbd>&rarr;</kbd> step</span>
      <span class="key-hint"><kbd>a</kbd> auto</span>
      <span class="key-hint"><kbd>t</kbd> tour</span>
      <span class="key-hint"><kbd>[</kbd><kbd>]</kbd> scenario</span>
      <span class="key-hint"><kbd>1</kbd>-<kbd>9</kbd> jump</span>
      <span class="key-hint"><kbd>g</kbd> graph</span>
      <span class="key-hint"><kbd>h</kbd> help</span>
    </div>
  </footer>
</template>

<script setup>
import { computed, onMounted, onUnmounted } from 'vue'
import { useScenario } from '../composables/useScenario.js'

const {
  currentStep, scenario, totalSteps, stepInfo,
  nextStep, prevStep, reset, toggleAuto, isAutoPlaying,
  startTour, isTourMode, scenarioNodeIds, setScenario,
} = useScenario()

import { RAW_NODES, SCENARIOS } from '../data/architecture.js'
import { useI18n } from '../i18n/index.js'

const { t } = useI18n()

const isLastStep = computed(() => currentStep.value >= 0 && currentStep.value >= totalSteps.value - 1)

const relatedScenarios = computed(() => {
  const rel = scenario.value?.related ?? []
  return rel.map(id => ({ id, title: SCENARIOS[id]?.title })).filter(r => r.title)
})

const scenarioPreviewText = computed(() => {
  const ids = scenarioNodeIds.value
  if (!ids.size) return ''
  const names = [...ids].map(id => RAW_NODES.find(n => n.id === id)?.label).filter(Boolean)
  return names.join(' \u2192 ')
})

const progressPct = computed(() => {
  if (totalSteps.value <= 0 || currentStep.value < 0) return 0
  return ((currentStep.value + 1) / totalSteps.value) * 100
})

function goToStep(i) {
  currentStep.value = i
}

const scenarioIds = Object.keys(SCENARIOS)
let lastCtrlCTime = 0
const ctrlCHint = ref('')
let ctrlCHintTimer = null

function onKey(e) {
  // Ctrl+C: stop task or double-press to exit
  if (e.key === 'c' && (e.ctrlKey || e.metaKey)) {
    e.preventDefault()
    if (isAutoPlaying.value || isTourMode.value) {
      // Running task → stop it
      reset()
      showCtrlCHint('Stopped.')
    } else if (currentStep.value >= 0) {
      // In sequence view, no task → first Ctrl+C resets
      const now = Date.now()
      if (now - lastCtrlCTime < 1500) {
        // Double Ctrl+C within 1.5s → full exit to architecture
        reset()
        showCtrlCHint('')
      } else {
        showCtrlCHint('Press Ctrl+C again to exit')
        lastCtrlCTime = now
      }
    } else {
      // Already in architecture view → hint
      const now = Date.now()
      if (now - lastCtrlCTime < 1500) {
        showCtrlCHint('Already at top level')
      } else {
        showCtrlCHint('Press Ctrl+C again to confirm')
        lastCtrlCTime = now
      }
    }
    return
  }
  // Any other key clears the Ctrl+C state
  lastCtrlCTime = 0

  // Navigation
  if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'l') { e.preventDefault(); nextStep() }
  else if (e.key === 'ArrowLeft' || e.key === 'k') { e.preventDefault(); prevStep() }
  // Jump to first/last step
  else if (e.key === 'Home' || e.key === '^') { e.preventDefault(); currentStep.value = 0 }
  else if (e.key === 'End' || e.key === '$') { e.preventDefault(); if (totalSteps.value > 0) currentStep.value = totalSteps.value - 1 }
  // Playback
  else if (e.key === 'a' || e.key === 'A') { toggleAuto() }
  else if (e.key === 't' || e.key === 'T') { isTourMode.value ? reset() : startTour() }
  // Scenario switching: [ prev, ] next
  else if (e.key === '[') { switchScenario(-1) }
  else if (e.key === ']') { switchScenario(1) }
  // Number keys: jump to scenario 1-9
  else if (e.key >= '1' && e.key <= '9' && !e.ctrlKey && !e.metaKey) {
    const idx = parseInt(e.key) - 1
    if (idx < scenarioIds.length) setScenario(scenarioIds[idx])
  }
  // View
  else if (e.key === 'g' || e.key === 'G') { reset() }
  else if (e.key === 'Escape') { reset() }
  else if (e.key === '?') { window.dispatchEvent(new CustomEvent('toggle-legend')) }
}

function showCtrlCHint(msg) {
  ctrlCHint.value = msg
  if (ctrlCHintTimer) clearTimeout(ctrlCHintTimer)
  if (msg) ctrlCHintTimer = setTimeout(() => { ctrlCHint.value = ''; lastCtrlCTime = 0 }, 2000)
}

function switchScenario(dir) {
  const idx = scenarioIds.indexOf(scenario.value ? Object.keys(SCENARIOS).find(k => SCENARIOS[k] === scenario.value) : scenarioIds[0])
  const next = (idx + dir + scenarioIds.length) % scenarioIds.length
  setScenario(scenarioIds[next])
}

onMounted(() => window.addEventListener('keydown', onKey))
onUnmounted(() => window.removeEventListener('keydown', onKey))
</script>

<style scoped>
.flow-bar {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 8px 24px;
  background: var(--bg-panel);
  border-top: 1px solid var(--border);
  flex-shrink: 0;
  min-height: 42px;
  transition: background 0.3s, border-color 0.3s;
}
.step-indicator {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex-shrink: 0;
}
.progress-track {
  width: 100%;
  height: 3px;
  background: var(--border);
  border-radius: 2px;
  overflow: hidden;
}
.progress-fill {
  height: 100%;
  background: var(--accent-blue);
  border-radius: 2px;
  transition: width 0.4s ease;
}
.step-dots {
  display: flex;
  gap: 4px;
  align-items: center;
}
.step-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--border);
  transition: all 0.3s;
  cursor: pointer;
}
.step-dot:hover { background: var(--text-dim); }
.step-dot.active {
  background: var(--accent-blue);
  box-shadow: 0 0 8px rgba(91, 156, 245, 0.4);
}
.step-dot.passed { background: var(--accent-green); }

.flow-desc {
  flex: 1;
  min-width: 0;
  overflow: hidden;
}
.step-head {
  font-size: 11px;
  color: var(--text-muted);
  display: flex;
  gap: 8px;
  align-items: baseline;
}
.step-head strong { color: var(--accent-blue); white-space: nowrap; }
.step-main { color: var(--text-secondary); }
.step-main strong { color: var(--accent-blue); }
.step-detail {
  font-size: 10px;
  color: var(--text-dim);
  margin-top: 2px;
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.controls {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}
.controls button {
  padding: 4px 14px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--text-muted);
  font-size: 11px;
  font-family: 'JetBrains Mono', monospace;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}
.controls button:hover:not(:disabled) {
  border-color: var(--border-hover);
  color: var(--text-secondary);
  background: var(--bg-hover);
}
.controls button:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}
/* CC-style shortcut hints bar */
.key-hints {
  display: flex;
  gap: 10px;
  align-items: center;
  flex-shrink: 0;
}
.key-hint {
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  color: var(--text-dim);
  display: flex;
  align-items: center;
  gap: 3px;
  white-space: nowrap;
}
.key-hint kbd {
  display: inline-block;
  min-width: 16px;
  padding: 1px 4px;
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: 3px;
  font-family: inherit;
  font-size: 9px;
  color: var(--text-muted);
  text-align: center;
  line-height: 1.4;
}

.key-hint-sep {
  width: 1px;
  height: 14px;
  background: var(--border);
  flex-shrink: 0;
}
.ctrl-c-hint {
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  color: var(--accent-orange);
  background: rgba(232, 132, 42, 0.1);
  padding: 2px 8px;
  border-radius: 3px;
  white-space: nowrap;
  flex-shrink: 0;
}
.hint-fade-enter-active { transition: opacity 0.2s; }
.hint-fade-leave-active { transition: opacity 0.3s; }
.hint-fade-enter-from, .hint-fade-leave-to { opacity: 0; }

.code-ref {
  font-family: 'JetBrains Mono', monospace;
  font-size: 9px;
  color: var(--accent-green);
  background: rgba(54, 201, 151, 0.08);
  padding: 1px 5px;
  border-radius: 3px;
  border: 1px solid rgba(54, 201, 151, 0.15);
}
.related-link {
  color: var(--accent-purple);
  cursor: pointer;
  transition: color 0.2s;
}
.related-link:hover {
  color: var(--accent-blue);
  text-decoration: underline;
}
.auto-btn.playing {
  border-color: var(--accent-blue);
  color: var(--accent-blue);
}
.tour-btn.playing {
  border-color: var(--accent-purple);
  color: var(--accent-purple);
  background: rgba(155, 127, 240, 0.06);
}
</style>
