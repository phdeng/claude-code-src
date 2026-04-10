<template>
  <Transition name="modal">
    <div v-if="visible" class="help-overlay" @click.self="$emit('close')">
      <div class="help-modal">
        <button class="help-close" @click="$emit('close')">&times;</button>
        <h2>{{ t('help.title') }}</h2>

        <div class="help-section">
          <h3>{{ t('help.navigation') }}</h3>
          <div class="shortcut"><kbd>&rarr;</kbd> / <kbd>Space</kbd> {{ t('help.nextStep') }}</div>
          <div class="shortcut"><kbd>&larr;</kbd> {{ t('help.prevStep') }}</div>
          <div class="shortcut"><kbd>Esc</kbd> {{ t('help.resetView') }}</div>
        </div>

        <div class="help-section">
          <h3>{{ t('help.playback') }}</h3>
          <div class="shortcut"><kbd>A</kbd> {{ t('help.toggleAuto') }}</div>
          <div class="shortcut"><kbd>T</kbd> {{ t('help.startTour') }}</div>
        </div>

        <div class="help-section">
          <h3>{{ t('help.view') }}</h3>
          <div class="shortcut"><kbd>?</kbd> {{ t('help.toggleLegend') }}</div>
          <div class="shortcut"><kbd>H</kbd> {{ t('help.helpDialog') }}</div>
          <div class="shortcut"><kbd>Ctrl+Scroll</kbd> {{ t('help.zoom') }}</div>
        </div>

        <div class="help-section">
          <h3>{{ t('help.interaction') }}</h3>
          <div class="help-text">{{ t('help.hoverNode') }}</div>
          <div class="help-text">{{ t('help.hoverScenario') }}</div>
          <div class="help-text">{{ t('help.clickNode') }}</div>
          <div class="help-text">{{ t('help.clickLifeline') }}</div>
        </div>

        <div class="help-section">
          <h3>{{ t('help.scenarios') }} ({{ scenarioCount }})</h3>
          <div class="help-diff">
            <span class="diff-dot beginner"></span> {{ t('help.levelBeginner') }}
          </div>
          <div class="help-diff">
            <span class="diff-dot intermediate"></span> {{ t('help.levelIntermediate') }}
          </div>
          <div class="help-diff">
            <span class="diff-dot advanced"></span> {{ t('help.levelAdvanced') }}
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup>
import { SCENARIOS } from '../data/architecture.js'
import { useI18n } from '../i18n/index.js'

defineProps({ visible: Boolean })
defineEmits(['close'])
const { t } = useI18n()
const scenarioCount = Object.keys(SCENARIOS).length
</script>

<style scoped>
.help-overlay {
  position: fixed;
  inset: 0;
  background: var(--overlay);
  backdrop-filter: var(--backdrop-blur);
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
}
.help-modal {
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 28px 32px;
  width: 420px;
  max-height: 80vh;
  overflow-y: auto;
  box-shadow: var(--shadow-xl);
  position: relative;
  transition: background 0.3s, border-color 0.3s;
}
.help-close {
  position: absolute;
  top: 12px;
  right: 14px;
  width: 28px;
  height: 28px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--text-muted);
  font-size: 16px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}
.help-close:hover { border-color: #e85c5c; color: #e85c5c; }

h2 {
  font-family: 'JetBrains Mono', monospace;
  font-size: 15px;
  color: var(--accent-blue);
  margin-bottom: 16px;
  letter-spacing: 0.5px;
}
h3 {
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  color: var(--accent-purple);
  text-transform: uppercase;
  letter-spacing: 1px;
  margin-bottom: 8px;
  padding-bottom: 4px;
  border-bottom: 1px solid var(--border);
}
.help-section {
  margin-bottom: 16px;
}
.shortcut {
  font-size: 12px;
  color: var(--text-secondary);
  padding: 3px 0;
  display: flex;
  align-items: center;
  gap: 8px;
}
kbd {
  display: inline-block;
  min-width: 28px;
  padding: 2px 6px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 4px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  color: var(--text-primary);
  text-align: center;
}
.help-text {
  font-size: 11px;
  color: var(--text-muted);
  padding: 2px 0;
}
.help-diff {
  font-size: 11px;
  color: var(--text-secondary);
  padding: 2px 0;
  display: flex;
  align-items: center;
  gap: 8px;
}
.diff-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}
.diff-dot.beginner { background: var(--accent-green); opacity: 0.7; }
.diff-dot.intermediate { background: var(--accent-blue); opacity: 0.7; }
.diff-dot.advanced { background: var(--accent-purple); opacity: 0.7; }

/* Transition */
.modal-enter-active, .modal-leave-active {
  transition: opacity 0.25s;
}
.modal-enter-active .help-modal, .modal-leave-active .help-modal {
  transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}
.modal-enter-from, .modal-leave-to { opacity: 0; }
.modal-enter-from .help-modal { transform: scale(0.95) translateY(10px); }
</style>
