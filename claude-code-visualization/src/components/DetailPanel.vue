<template>
  <Transition name="slide">
    <aside v-if="node" class="detail-panel">
      <button class="close-btn" @click="$emit('close')">&times;</button>

      <h2 :style="{ color: node.color }">{{ node.label }}</h2>
      <div class="node-type" :style="{ color: node.color }">{{ node.layerLabel }}</div>
      <p class="desc">{{ node.desc }}</p>

      <!-- I/O -->
      <div class="section-title">{{ t('detail.dataFlow') }}</div>
      <div class="io-block">
        <div class="io-label input">{{ t('detail.input') }}</div>
        <code>{{ node.input }}</code>
      </div>
      <div class="io-block">
        <div class="io-label output">{{ t('detail.output') }}</div>
        <code>{{ node.output }}</code>
      </div>

      <!-- Files -->
      <div class="section-title">{{ t('detail.sourceFiles') }}</div>
      <ul class="file-list">
        <li v-for="f in node.files" :key="f">{{ f }}</li>
      </ul>

      <!-- Connections -->
      <template v-if="incoming.length">
        <div class="section-title">{{ t('detail.receivesFrom') }}</div>
        <ul class="file-list">
          <li v-for="n in incoming" :key="n.id">
            {{ n.label }} <span class="dim">({{ n.layerLabel }})</span>
          </li>
        </ul>
      </template>
      <template v-if="outgoing.length">
        <div class="section-title">{{ t('detail.sendsTo') }}</div>
        <ul class="file-list">
          <li v-for="n in outgoing" :key="n.id">
            {{ n.label }} <span class="dim">({{ n.layerLabel }})</span>
          </li>
        </ul>
      </template>

      <!-- Scenarios (clickable) -->
      <template v-if="appearsIn.length">
        <div class="section-title">{{ t('detail.activeIn') }}</div>
        <ul class="file-list">
          <li v-for="s in appearsIn" :key="s.id" class="scenario-link" @click="jumpToScenario(s)">
            {{ s.title }} <span class="step-hint">{{ t('nav.step') }} {{ s.firstStep + 1 }}</span>
          </li>
        </ul>
      </template>

      <!-- Code references -->
      <template v-if="codeRefs.length">
        <div class="section-title">CODE REFERENCES</div>
        <div
          v-for="ref in codeRefs" :key="ref.scenario + ref.step"
          class="code-ref-block clickable"
          @click="$emit('open-code', ref.code)"
        >
          <div class="code-ref-scenario">{{ ref.scenarioTitle }} · {{ t('nav.step') }} {{ ref.step + 1 }}</div>
          <code class="code-ref-line">{{ ref.code }}</code>
          <span class="code-ref-open">View Source</span>
        </div>
      </template>
    </aside>
  </Transition>
</template>

<script setup>
import { computed } from 'vue'
import { RAW_NODES, RAW_EDGES, LAYER_MAP, SCENARIOS, getLocalizedScenarios } from '../data/architecture.js'
import { useScenario } from '../composables/useScenario.js'
import { useI18n } from '../i18n/index.js'

const { t, locale } = useI18n()

const props = defineProps({
  node: { type: Object, default: null },
})
defineEmits(['close', 'open-code'])

const { setScenario, currentStep } = useScenario()

function findNodeData(id) {
  const n = RAW_NODES.find(r => r.id === id)
  if (!n) return null
  return { ...n, layerLabel: LAYER_MAP[n.layer]?.label, color: LAYER_MAP[n.layer]?.color }
}

const incoming = computed(() => {
  if (!props.node) return []
  const nodeId = props.node.id || RAW_NODES.find(n => n.label === props.node.label)?.id
  if (!nodeId) return []
  return RAW_EDGES
    .filter(([, t]) => t === nodeId)
    .map(([s]) => findNodeData(s))
    .filter(Boolean)
})

const outgoing = computed(() => {
  if (!props.node) return []
  const nodeId = props.node.id || RAW_NODES.find(n => n.label === props.node.label)?.id
  if (!nodeId) return []
  return RAW_EDGES
    .filter(([s]) => s === nodeId)
    .map(([, t]) => findNodeData(t))
    .filter(Boolean)
})

const appearsIn = computed(() => {
  if (!props.node) return []
  const nodeId = props.node.id || RAW_NODES.find(n => n.label === props.node.label)?.id
  if (!nodeId) return []
  const localized = getLocalizedScenarios(locale.value)
  return Object.entries(localized)
    .filter(([, s]) => s.steps.some(st => st.nodes.includes(nodeId)))
    .map(([id, s]) => {
      const firstStep = s.steps.findIndex(st => st.nodes.includes(nodeId))
      return { id, title: s.title, firstStep }
    })
})

const codeRefs = computed(() => {
  if (!props.node) return []
  const nodeId = props.node.id || RAW_NODES.find(n => n.label === props.node.label)?.id
  if (!nodeId) return []
  const localized = getLocalizedScenarios(locale.value)
  const refs = []
  for (const [id, s] of Object.entries(localized)) {
    s.steps.forEach((step, i) => {
      if (step.code && step.nodes.includes(nodeId)) {
        refs.push({ scenario: id, scenarioTitle: s.title, step: i, code: step.code })
      }
    })
  }
  return refs
})

function jumpToScenario(s) {
  setScenario(s.id)
  currentStep.value = s.firstStep
}
</script>

<style scoped>
.detail-panel {
  position: absolute;
  right: 0;
  top: 0;
  bottom: 0;
  width: 380px;
  background: var(--bg-panel);
  border-left: 1px solid var(--border);
  padding: 24px 20px;
  z-index: 30;
  overflow-y: auto;
  box-shadow: var(--shadow-xl);
  transition: background 0.3s, border-color 0.3s;
}
.close-btn {
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
.close-btn:hover {
  border-color: #e85c5c;
  color: #e85c5c;
}

h2 {
  font-family: 'JetBrains Mono', monospace;
  font-size: 15px;
  margin-bottom: 4px;
  padding-right: 36px;
}
.node-type {
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 1px;
  margin-bottom: 16px;
  opacity: 0.6;
}
.desc {
  font-size: 12px;
  line-height: 1.7;
  color: var(--text-secondary);
}
.section-title {
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  color: var(--accent-purple);
  text-transform: uppercase;
  letter-spacing: 1px;
  margin: 18px 0 8px;
  padding-bottom: 4px;
  border-bottom: 1px solid var(--border);
}
.io-block {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 10px 12px;
  margin: 6px 0;
  font-size: 11px;
}
.io-label {
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 1px;
  margin-bottom: 4px;
  font-weight: 600;
}
.io-label.input { color: var(--accent-green); }
.io-label.output { color: var(--accent-orange); }
.io-block code {
  font-family: 'JetBrains Mono', monospace;
  color: var(--text-primary);
  font-size: 11px;
  white-space: pre-wrap;
  word-break: break-all;
}
.file-list {
  list-style: none;
  margin: 4px 0;
}
.file-list li {
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  color: var(--text-secondary);
  padding: 3px 0;
}
.file-list li::before {
  content: '\2192 ';
  color: var(--border-hover);
}
.dim {
  color: var(--text-dim);
}
.scenario-link {
  cursor: pointer;
  transition: color 0.2s;
}
.scenario-link:hover {
  color: var(--accent-blue) !important;
}
.scenario-link::before {
  content: '\25B6 ' !important;
  color: var(--accent-blue) !important;
}
.step-hint {
  font-size: 9px;
  color: var(--text-dim);
  margin-left: 4px;
}
.code-ref-block {
  margin: 6px 0;
  padding: 8px 10px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
}
.code-ref-scenario {
  font-family: 'JetBrains Mono', monospace;
  font-size: 9px;
  color: var(--text-dim);
  margin-bottom: 4px;
}
.code-ref-line {
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  color: var(--accent-green);
  word-break: break-all;
  line-height: 1.5;
}
.code-ref-block.clickable {
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
}
.code-ref-block.clickable:hover {
  border-color: var(--accent-green);
  background: rgba(54, 201, 151, 0.06);
}
.code-ref-open {
  position: absolute;
  top: 8px;
  right: 10px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 9px;
  color: var(--accent-blue);
  opacity: 0;
  transition: opacity 0.2s;
}
.code-ref-block.clickable:hover .code-ref-open {
  opacity: 1;
}

/* ─── Transition ─── */
.slide-enter-active,
.slide-leave-active {
  transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.3s;
}
.slide-enter-from,
.slide-leave-to {
  transform: translateX(100%);
  opacity: 0;
}
</style>
