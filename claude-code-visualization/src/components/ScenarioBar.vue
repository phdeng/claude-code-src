<template>
  <nav class="scenario-bar">
    <label>{{ t('nav.flow') }}</label>

    <!-- Current scenario display + dropdown trigger -->
    <div class="scenario-select" ref="selectRef">
      <button class="select-trigger" @click="open = !open">
        <span class="scenario-diff" :class="currentDiff">{{ currentDiffLabel }}</span>
        <span class="select-title">{{ currentTitle }}</span>
        <svg class="select-arrow" :class="{ rotated: open }" viewBox="0 0 12 12" width="10" height="10" fill="currentColor">
          <path d="M2 4l4 4 4-4" stroke="currentColor" stroke-width="1.5" fill="none"/>
        </svg>
      </button>

      <!-- Dropdown -->
      <Transition name="dropdown">
        <div v-if="open" class="select-dropdown">
          <div v-for="group in groupedScenarios" :key="group.level" class="select-group">
            <div class="group-label">
              <span class="scenario-diff" :class="group.diff">{{ group.levelLabel }}</span>
              {{ group.levelName }}
            </div>
            <button
              v-for="s in group.items" :key="s.id"
              class="select-item"
              :class="{ active: currentScenario === s.id }"
              @click="pickScenario(s.id)"
              @mouseenter="setPreview(s.id)"
              @mouseleave="clearPreview()"
            >
              <span class="item-title">{{ s.title }}</span>
              <span class="item-steps">{{ s.stepCount }}{{ t('nav.steps') }}</span>
            </button>
          </div>
        </div>
      </Transition>
    </div>

    <!-- Quick nav: prev/next scenario arrows -->
    <button class="nav-arrow" @click="prevScenario" title="Previous scenario">&lsaquo;</button>
    <button class="nav-arrow" @click="nextScenario" title="Next scenario">&rsaquo;</button>

    <!-- Scenario hint -->
    <span class="scenario-hint">{{ currentHint }}</span>
  </nav>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { SCENARIOS, getLocalizedScenarios } from '../data/architecture.js'
import { useScenario } from '../composables/useScenario.js'
import { useI18n } from '../i18n/index.js'

const { currentScenario, setScenario, setPreview, clearPreview } = useScenario()
const { locale, t } = useI18n()

const open = ref(false)
const selectRef = ref(null)

const DIFFICULTY = {
  prompt:          { diff: 'beginner',     diffLabel: '1', level: 1 },
  startup:         { diff: 'beginner',     diffLabel: '1', level: 1 },
  command:         { diff: 'intermediate', diffLabel: '2', level: 2 },
  tool:            { diff: 'intermediate', diffLabel: '2', level: 2 },
  agentLoop:       { diff: 'intermediate', diffLabel: '2', level: 2 },
  compact:         { diff: 'intermediate', diffLabel: '2', level: 2 },
  subagent:        { diff: 'advanced',     diffLabel: '3', level: 3 },
  mcp:             { diff: 'advanced',     diffLabel: '3', level: 3 },
  permission:      { diff: 'advanced',     diffLabel: '3', level: 3 },
  queryEngineFlow: { diff: 'advanced',     diffLabel: '3', level: 3 },
  agentTeam:       { diff: 'advanced',     diffLabel: '3', level: 3 },
}

const LEVEL_NAMES = {
  1: { en: 'Beginner', zh: '入门' },
  2: { en: 'Intermediate', zh: '进阶' },
  3: { en: 'Advanced', zh: '高级' },
}

const scenarioIds = Object.keys(SCENARIOS)

const scenarioList = computed(() => {
  const localized = getLocalizedScenarios(locale.value)
  return Object.entries(localized).map(([id, s]) => ({
    id,
    title: s.title,
    hint: t(`difficulty.${id}`),
    stepCount: s.steps.length,
    ...DIFFICULTY[id],
  }))
})

const groupedScenarios = computed(() => {
  const groups = {}
  for (const s of scenarioList.value) {
    if (!groups[s.level]) {
      const ln = LEVEL_NAMES[s.level]
      groups[s.level] = {
        level: s.level,
        diff: s.diff,
        levelLabel: s.diffLabel,
        levelName: locale.value === 'zh' ? ln.zh : ln.en,
        items: [],
      }
    }
    groups[s.level].items.push(s)
  }
  return Object.values(groups).sort((a, b) => a.level - b.level)
})

const currentItem = computed(() => scenarioList.value.find(s => s.id === currentScenario.value))
const currentTitle = computed(() => currentItem.value?.title ?? '')
const currentHint = computed(() => currentItem.value?.hint ?? '')
const currentDiff = computed(() => currentItem.value?.diff ?? 'beginner')
const currentDiffLabel = computed(() => currentItem.value?.diffLabel ?? '1')

function pickScenario(id) {
  setScenario(id)
  open.value = false
}

function prevScenario() {
  const idx = scenarioIds.indexOf(currentScenario.value)
  const prev = (idx - 1 + scenarioIds.length) % scenarioIds.length
  setScenario(scenarioIds[prev])
}

function nextScenario() {
  const idx = scenarioIds.indexOf(currentScenario.value)
  const next = (idx + 1) % scenarioIds.length
  setScenario(scenarioIds[next])
}

// Close on click outside
function onClickOutside(e) {
  if (selectRef.value && !selectRef.value.contains(e.target)) open.value = false
}
onMounted(() => document.addEventListener('click', onClickOutside))
onUnmounted(() => document.removeEventListener('click', onClickOutside))
</script>

<style scoped>
.scenario-bar {
  display: flex;
  gap: 8px;
  align-items: center;
  padding: 8px 24px;
  background: var(--bg-panel);
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
  transition: background 0.3s, border-color 0.3s;
}
.scenario-bar label {
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  color: var(--text-muted);
  white-space: nowrap;
  letter-spacing: 1px;
  flex-shrink: 0;
}

/* Select trigger */
.scenario-select {
  position: relative;
}
.select-trigger {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 5px 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  background: var(--bg-card);
  color: var(--accent-blue);
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}
.select-trigger:hover {
  border-color: var(--border-hover);
  background: var(--bg-hover);
}
.select-title { flex: 1; }
.select-arrow {
  color: var(--text-dim);
  transition: transform 0.2s;
}
.select-arrow.rotated { transform: rotate(180deg); }

/* Dropdown */
.select-dropdown {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  min-width: 320px;
  max-height: 420px;
  overflow-y: auto;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-xl);
  z-index: 50;
  padding: 6px;
  scrollbar-width: thin;
}
.select-group {
  margin-bottom: 4px;
}
.group-label {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px 4px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 9px;
  color: var(--text-dim);
  letter-spacing: 1px;
  text-transform: uppercase;
}
.select-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 7px 12px;
  border: none;
  border-radius: calc(var(--radius-md) - 3px);
  background: transparent;
  color: var(--text-secondary);
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  cursor: pointer;
  transition: all 0.15s;
  text-align: left;
}
.select-item:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}
.select-item.active {
  background: rgba(91, 156, 245, 0.1);
  color: var(--accent-blue);
}
.item-steps {
  font-size: 9px;
  color: var(--text-dim);
  flex-shrink: 0;
  margin-left: 12px;
}

/* Nav arrows */
.nav-arrow {
  width: 26px;
  height: 26px;
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
  flex-shrink: 0;
}
.nav-arrow:hover {
  border-color: var(--border-hover);
  color: var(--text-secondary);
  background: var(--bg-hover);
}

/* Hint */
.scenario-hint {
  font-size: 10px;
  color: var(--text-dim);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
  flex: 1;
}

/* Difficulty badge (reused) */
.scenario-diff {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  font-size: 10px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.scenario-diff.beginner {
  background: rgba(54, 201, 151, 0.12);
  color: var(--accent-green);
}
.scenario-diff.intermediate {
  background: rgba(91, 156, 245, 0.12);
  color: var(--accent-blue);
}
.scenario-diff.advanced {
  background: rgba(155, 127, 240, 0.12);
  color: var(--accent-purple);
}

/* Dropdown transition */
.dropdown-enter-active { transition: all 0.2s ease; }
.dropdown-leave-active { transition: all 0.15s ease; }
.dropdown-enter-from, .dropdown-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}
</style>
