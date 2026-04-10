<template>
  <div class="seq-outer">
    <!-- Floating zoom toolbar -->
    <div class="seq-toolbar">
      <button @click="zoomOut" title="Zoom Out">&minus;</button>
      <span class="seq-zoom-val">{{ Math.round(zoom * 100) }}%</span>
      <button @click="zoomIn" title="Zoom In">+</button>
      <button @click="fitToView" class="seq-fit-btn" :title="t('nav.fit')">{{ t('nav.fit') }}</button>
    </div>

    <div class="seq-wrapper" ref="wrapperRef" @wheel="onWheel">
      <!-- Sticky header with lifeline cards -->
      <div class="seq-header-sticky" :style="{ width: svgW * zoom + 'px', height: HH * zoom + 'px' }">
        <svg :width="svgW" :height="HH" :style="svgScale" class="seq-svg">
          <rect x="0" y="0" :width="ML" :height="HH" :fill="leftColBg" />
          <rect :x="ML" y="0" :width="svgW - ML" :height="HH" :fill="headerBg" />
          <line :x1="ML" y1="0" :x2="ML" :y2="HH" :stroke="seqBorder" />
          <line x1="0" :y1="HH - 0.5" :x2="svgW" :y2="HH - 0.5" :stroke="seqBorder" />

          <!-- Scenario title (top-left) -->
          <text :x="ML / 2" :y="HH / 2" text-anchor="middle" class="seq-title">{{ scenario?.title ?? '' }}</text>

          <!-- Lifeline header clip paths -->
          <defs>
            <clipPath v-for="ll in layout" :key="'clip-'+ll.id" :id="'hdr-clip-'+ll.id">
              <rect :x="ll.x - LW/2" y="8" :width="LW" :height="HH - 18" rx="8" />
            </clipPath>
          </defs>

          <!-- Lifeline headers -->
          <g
            v-for="ll in layout" :key="'hd'+ll.id"
            class="seq-hdr-g" @click.stop="select(ll)"
          >
            <rect
              :x="ll.x - LW/2" y="8" :width="LW" :height="HH - 18"
              rx="8" class="seq-hdr-bg" :stroke="ll.color"
            />
            <rect
              :x="ll.x - LW/2" y="8" width="4" :height="HH - 18"
              :fill="ll.color" :clip-path="'url(#hdr-clip-'+ll.id+')'"
            />
            <text :x="ll.x + 2" :y="HH/2 - 5" text-anchor="middle" class="seq-hdr-name">{{ ll.label }}</text>
            <text :x="ll.x + 2" :y="HH/2 + 10" text-anchor="middle" class="seq-hdr-layer" :fill="ll.color + 'aa'">{{ ll.short }}</text>
          </g>
        </svg>
      </div>

      <!-- Scrollable body -->
      <div class="seq-canvas" :style="bodyCanvasStyle">
        <svg :width="svgW" :height="bodySvgH" :style="svgScale" class="seq-svg">

          <!-- Backgrounds -->
          <rect x="0" y="0" :width="ML" :height="bodySvgH" :fill="leftColBg" />
          <line :x1="ML" y1="0" :x2="ML" :y2="bodySvgH" :stroke="seqBorder" />
          <rect
            v-for="(_, i) in steps" :key="'rb'+i"
            :x="ML" :y="bY[i]" :width="svgW - ML" :height="sH[i]"
            :fill="rowBg(i)"
          />
          <line
            v-for="(_, i) in steps" :key="'rl'+i"
            x1="0" :y1="bY[i]" :x2="svgW" :y2="bY[i]"
            :stroke="seqBorderLight" stroke-width="0.5"
          />

          <!-- Current step bar -->
          <rect v-if="currentStep >= 0"
            x="0" :y="bY[currentStep]" width="3" :height="sH[currentStep]"
            :fill="accentBlue" rx="1.5"
          />

          <!-- Lifelines (dashed) -->
          <line
            v-for="ll in layout" :key="'dl'+ll.id"
            :x1="ll.x" y1="0" :x2="ll.x" :y2="bodySvgH - 8"
            :stroke="lifelineColor" stroke-width="1" stroke-dasharray="6 4"
          />

          <!-- Activation boxes -->
          <g v-for="act in activations" :key="act.key">
            <rect
              :x="act.x - AW/2" :y="act.y - HH" :width="AW" :height="act.h"
              rx="3" :fill="act.color + (act.live ? '35' : '15')"
              :stroke="act.color + (act.live ? 'bb' : '40')" stroke-width="1"
            />
            <rect v-if="act.live"
              :x="act.x - AW/2 - 3" :y="act.y - HH - 3"
              :width="AW + 6" :height="act.h + 6"
              rx="5" :stroke="act.color" fill="none" opacity="0"
            >
              <animate attributeName="opacity" values="0.4;0;0.4" dur="2s" repeatCount="indefinite" />
            </rect>
          </g>

          <!-- Trigger arrow (step 0 entry) -->
          <g v-if="trigger">
            <line
              :x1="trigger.x1" :y1="trigger.y - HH" :x2="trigger.x2" :y2="trigger.y - HH"
              :stroke="accentBlue" stroke-width="1.5" stroke-dasharray="6 3"
              :opacity="currentStep >= 0 ? 0.8 : 0.3"
            />
            <polygon :points="triggerBodyHead" :fill="accentBlue" :opacity="currentStep >= 0 ? 0.8 : 0.3" />
            <text :x="trigger.x1 - 6" :y="trigger.y - HH + 4" text-anchor="end" class="seq-trig-text">{{ t('trigger.user') }}</text>
            <circle v-if="currentStep >= 0" r="3" :fill="accentBlue" opacity="0.7">
              <animateMotion dur="1s" repeatCount="indefinite" :path="`M${trigger.x1},${trigger.y - HH} L${trigger.x2},${trigger.y - HH}`" />
            </circle>
          </g>

          <!-- Message arrows -->
          <g v-for="msg in arrows" :key="msg.key">
            <title>{{ msg.srcLabel }} &rarr; {{ msg.tgtLabel }}</title>
            <line
              :x1="msg.x1" :y1="msg.y - HH" :x2="msg.x2" :y2="msg.y - HH"
              :stroke="msg.color"
              :stroke-width="msg.on ? 2 : 1"
              :opacity="msg.on ? (msg.ret ? 0.6 : 0.85) : 0.18"
              :stroke-dasharray="msg.ret ? '6 4' : 'none'"
            />
            <polygon :points="shiftArrowHead(msg.head)" :fill="msg.color" :opacity="msg.on ? (msg.ret ? 0.6 : 0.85) : 0.18" />
            <template v-if="msg.on">
              <circle r="3" :fill="msg.color" opacity="0.8">
                <animateMotion :dur="msg.dur" repeatCount="indefinite" :path="`M${msg.x1},${msg.y - HH} L${msg.x2},${msg.y - HH}`" />
              </circle>
              <circle r="7" :fill="msg.color" opacity="0.1">
                <animateMotion :dur="msg.dur" repeatCount="indefinite" :path="`M${msg.x1},${msg.y - HH} L${msg.x2},${msg.y - HH}`" />
              </circle>
            </template>
          </g>

          <!-- Step labels (left column) -->
          <foreignObject
            v-for="(step, i) in steps" :key="'st'+i"
            x="6" :y="bY[i] + 4"
            :width="ML - 16" :height="sH[i] - 8"
          >
            <div class="seq-step-fo" :class="stepCls(i)" xmlns="http://www.w3.org/1999/xhtml">
              <span class="seq-fo-num">{{ i + 1 }}</span>
              <span class="seq-fo-desc">{{ step.desc }}</span>
              <div v-if="i === currentStep" class="seq-fo-detail">{{ step.detail }}</div>
            </div>
          </foreignObject>

        </svg>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { useScenario } from '../composables/useScenario.js'
import { useTheme } from '../composables/useTheme.js'
import { useI18n } from '../i18n/index.js'

const emit = defineEmits(['select-node'])
const { t } = useI18n()

const { scenario, currentStep, sortedLifelines, stepMessages, pathNodes } = useScenario()
const { isDark } = useTheme()

// Layout constants
const ML  = 280
const HH  = 76
const LG  = 148
const LW  = 124
const AW  = 14
const AH  = 6
const MIN = 90
const MTP = 28
const MSP = 28
const MBP = 15

const wrapperRef = ref(null)
const zoom = ref(0.88)

// Theme-aware colors (reactive)
const accentBlue = computed(() => isDark.value ? '#5b9cf5' : '#3b82f6')
const leftColBg = computed(() => isDark.value ? '#090d15' : '#eef0f4')
const seqBorder = computed(() => isDark.value ? '#1a2536' : '#d4dae3')
const seqBorderLight = computed(() => isDark.value ? '#141c28' : '#e2e7ee')
const lifelineColor = computed(() => isDark.value ? '#182030' : '#d4dae3')

const steps = computed(() => scenario.value?.steps ?? [])

const layout = computed(() =>
  sortedLifelines.value.map((ll, i) => ({
    ...ll,
    x: ML + i * LG + LG / 2,
    short: ll.layerLabel.replace(' LAYER', '').replace('QUERY ', ''),
  }))
)

const xMap = computed(() => {
  const m = {}
  layout.value.forEach(ll => { m[ll.id] = ll.x })
  return m
})

const sH = computed(() =>
  stepMessages.value.map(msgs => Math.max(MIN, MTP + Math.max(msgs.length, 1) * MSP + MBP))
)
const sY = computed(() => {
  const ys = [HH]
  for (let i = 1; i < sH.value.length; i++) ys.push(ys[i - 1] + sH.value[i - 1])
  return ys
})
const svgW = computed(() => ML + sortedLifelines.value.length * LG + 40)
const svgH = computed(() => {
  if (!sY.value.length) return HH + 100
  const last = sY.value.length - 1
  return sY.value[last] + sH.value[last] + 30
})

// Body-only coordinates (shifted up by HH)
const bY = computed(() => sY.value.map(y => y - HH))
const bodySvgH = computed(() => svgH.value - HH)
const bodyCanvasStyle = computed(() => ({
  width: svgW.value * zoom.value + 'px',
  height: bodySvgH.value * zoom.value + 'px',
}))
const headerBg = computed(() => isDark.value ? '#0b0f17' : '#f0f2f6')

// Shift arrow head points by -HH
function shiftArrowHead(points) {
  return points.replace(/(\d+\.?\d*),(\d+\.?\d*)/g, (_, x, y) => `${x},${Number(y) - HH}`)
}
const triggerBodyHead = computed(() => {
  if (!trigger.value) return ''
  return shiftArrowHead(trigger.value.head)
})

const activations = computed(() => {
  const boxes = []

  // 1. Collect step indices from step.nodes
  const map = {}
  steps.value.forEach((step, i) => {
    step.nodes.forEach(n => { if (!map[n]) map[n] = new Set(); map[n].add(i) })
  })

  // 2. Also include steps where the node has outgoing/incoming arrows
  stepMessages.value.forEach((msgs, i) => {
    msgs.forEach(msg => {
      if (map[msg.source]) map[msg.source].add(i)
      if (map[msg.target]) map[msg.target].add(i)
    })
  })

  // 3. Split into contiguous segments
  for (const [id, idxSet] of Object.entries(map)) {
    const x = xMap.value[id]
    if (x == null) continue
    const color = layout.value.find(l => l.id === id)?.color || '#5b9cf5'
    const sorted = [...idxSet].sort((a, b) => a - b)

    let segStart = sorted[0]
    let segEnd = sorted[0]
    for (let k = 1; k <= sorted.length; k++) {
      if (k < sorted.length && sorted[k] === segEnd + 1) {
        segEnd = sorted[k]
      } else {
        // Emit segment [segStart..segEnd]
        const y1 = sY.value[segStart] + 6
        const y2 = sY.value[segEnd] + sH.value[segEnd] - 6
        const live = currentStep.value >= 0 &&
          currentStep.value >= segStart && currentStep.value <= segEnd &&
          idxSet.has(currentStep.value)
        boxes.push({ key: `a-${id}-${segStart}`, x, y: y1, h: Math.max(y2 - y1, 12), color, live })
        if (k < sorted.length) {
          segStart = sorted[k]
          segEnd = sorted[k]
        }
      }
    }
  }
  return boxes
})

const trigger = computed(() => {
  if (!steps.value.length) return null
  if (stepMessages.value[0]?.length > 0) return null
  const first = steps.value[0].nodes[0]
  const x = xMap.value[first]
  if (x == null) return null
  const y = sY.value[0] + MTP
  const x1 = ML + 12
  const x2 = x - AW / 2
  return { x1, y, x2, head: `${x2},${y} ${x2 - AH},${y - 4} ${x2 - AH},${y + 4}` }
})

const arrows = computed(() => {
  const result = []
  stepMessages.value.forEach((msgs, si) => {
    const sorted = [...msgs].sort((a, b) => (xMap.value[a.source] ?? 0) - (xMap.value[b.source] ?? 0))
    sorted.forEach((msg, mi) => {
      const sx = xMap.value[msg.source], tx = xMap.value[msg.target]
      if (sx == null || tx == null) return
      const goesLeft = tx < sx
      const y = sY.value[si] + MTP + mi * MSP
      const x1 = sx + (goesLeft ? -AW / 2 : AW / 2)
      const x2 = tx + (goesLeft ? AW / 2 : -AW / 2)
      const color = layout.value.find(l => l.id === msg.source)?.color || '#5b9cf5'
      const on = si <= currentStep.value
      const head = goesLeft
        ? `${x2},${y} ${x2 + AH},${y - 4} ${x2 + AH},${y + 4}`
        : `${x2},${y} ${x2 - AH},${y - 4} ${x2 - AH},${y + 4}`
      const dur = `${Math.max(0.6, Math.abs(x2 - x1) / 300)}s`
      const srcLabel = layout.value.find(l => l.id === msg.source)?.label ?? msg.source
      const tgtLabel = layout.value.find(l => l.id === msg.target)?.label ?? msg.target
      const ret = msg.isReturn ?? false
      result.push({ key: `m-${msg.source}-${msg.target}-${si}`, x1, y, x2, color, left: goesLeft, on, head, dur, srcLabel, tgtLabel, ret })
    })
  })
  return result
})

function rowBg(i) {
  const dark = isDark.value
  if (i === currentStep.value) return dark ? 'rgba(91,156,245,0.04)' : 'rgba(59,130,246,0.06)'
  if (i < currentStep.value) return dark ? 'rgba(54,201,151,0.015)' : 'rgba(22,168,112,0.04)'
  return i % 2 === 0 ? (dark ? 'rgba(255,255,255,0.007)' : 'rgba(0,0,0,0.015)') : 'transparent'
}
function stepCls(i) {
  if (i === currentStep.value) return 'current'
  if (i < currentStep.value) return 'passed'
  return 'future'
}

// canvasStyle kept for backward compat (unused, bodyCanvasStyle used instead)
const svgScale = computed(() => ({
  transform: `scale(${zoom.value})`,
  transformOrigin: '0 0',
}))
function onWheel(e) {
  if (e.ctrlKey || e.metaKey) {
    e.preventDefault()
    zoom.value = Math.max(0.3, Math.min(3, zoom.value + (e.deltaY > 0 ? -0.05 : 0.05)))
  }
}
function zoomIn() { zoom.value = Math.min(3, zoom.value + 0.1) }
function zoomOut() { zoom.value = Math.max(0.3, zoom.value - 0.1) }
function fitToView() {
  if (!wrapperRef.value) return
  const ww = wrapperRef.value.clientWidth
  const wh = wrapperRef.value.clientHeight
  zoom.value = Math.max(0.3, Math.min(ww / svgW.value, wh / svgH.value, 3))
}

watch(currentStep, (step) => {
  if (step >= 0 && wrapperRef.value && bY.value[step] != null) {
    nextTick(() => {
      const headerH = HH * zoom.value
      wrapperRef.value.scrollTo({
        top: Math.max(0, headerH + bY.value[step] * zoom.value - wrapperRef.value.clientHeight / 3),
        behavior: 'smooth',
      })
    })
  }
})

onMounted(() => { nextTick(() => fitToView()) })

function select(ll) {
  emit('select-node', {
    id: ll.id, label: ll.label, color: ll.color, layerLabel: ll.layerLabel,
    desc: ll.desc, files: ll.files, input: ll.input, output: ll.output,
  })
}
</script>

<style scoped>
.seq-outer {
  position: absolute;
  inset: 0;
}
.seq-wrapper {
  position: absolute;
  inset: 0;
  overflow: auto;
  background: var(--bg-deep);
  transition: background 0.3s;
}
.seq-header-sticky {
  position: sticky;
  top: 0;
  z-index: 10;
  background: var(--bg-deep);
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}
.seq-canvas {
  min-width: 100%;
  min-height: 100%;
}
.seq-svg {
  display: block;
}

/* Toolbar */
.seq-toolbar {
  position: absolute;
  top: 10px;
  right: 16px;
  z-index: 30;
  display: flex;
  align-items: center;
  gap: 4px;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 4px 8px;
  backdrop-filter: var(--backdrop-blur);
  box-shadow: var(--shadow-sm);
  opacity: 0.15;
  transition: opacity 0.3s ease;
}
.seq-toolbar:hover {
  opacity: 1;
}
.seq-toolbar button {
  width: 28px;
  height: 28px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--text-muted);
  font-size: 14px;
  font-family: 'JetBrains Mono', monospace;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}
.seq-toolbar button:hover {
  border-color: var(--border-hover);
  color: var(--accent-blue);
  background: var(--bg-hover);
}
.seq-zoom-val {
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  color: var(--text-muted);
  min-width: 36px;
  text-align: center;
}
.seq-fit-btn {
  font-size: 11px !important;
  width: auto !important;
  padding: 0 8px !important;
}

/* ForeignObject step labels */
.seq-step-fo {
  font-family: 'Inter', -apple-system, sans-serif;
  font-size: 12px;
  line-height: 1.6;
  color: var(--seq-step-future);
  overflow: hidden;
  padding: 4px 6px;
}
.seq-step-fo.current { color: var(--seq-step-current); }
.seq-step-fo.passed { color: var(--seq-step-passed); }
.seq-fo-num {
  font-family: 'JetBrains Mono', monospace;
  font-size: 15px;
  font-weight: 700;
  margin-right: 6px;
  color: var(--seq-step-num);
}
.seq-step-fo.current .seq-fo-num { color: var(--accent-blue); }
.seq-step-fo.passed .seq-fo-num { color: var(--accent-green); }
.seq-fo-desc {
  word-wrap: break-word;
  font-weight: 500;
}
.seq-fo-detail {
  margin-top: 5px;
  font-size: 11px;
  color: var(--text-muted);
  line-height: 1.5;
}

.seq-title {
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  font-weight: 600;
  fill: var(--text-muted);
  letter-spacing: 0.5px;
}

.seq-trig-text {
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  font-weight: 600;
  fill: var(--accent-blue);
  letter-spacing: 1px;
  opacity: 0.7;
}

/* Lifeline headers */
.seq-hdr-g { cursor: pointer; }
.seq-hdr-bg {
  fill: var(--seq-hdr-bg);
  stroke-width: 1.5;
  transition: fill 0.3s;
}
.seq-hdr-g:hover .seq-hdr-bg {
  fill: var(--seq-hdr-hover);
}
.seq-hdr-name {
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  font-weight: 600;
  fill: var(--text-primary);
}
.seq-hdr-layer {
  font-family: 'JetBrains Mono', monospace;
  font-size: 9px;
  letter-spacing: 0.5px;
}
</style>
