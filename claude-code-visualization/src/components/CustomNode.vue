<template>
  <div
    class="arch-node"
    :class="{ active: isActive, 'in-path': isInPath && !isActive, dimmed: isDimmed, preview: isPreview, 'focus-dim': isFocusDimmed }"
    :style="nodeStyle"
    @click.stop="$emit('select', data)"
    @mouseenter="setFocusNode(id)"
    @mouseleave="clearFocusNode()"
  >
    <!-- Vue Flow connection handles (4 sides, source + target each) -->
    <Handle id="t-tgt" type="target" :position="Position.Top" class="handle" :style="handleStyle" />
    <Handle id="t-src" type="source" :position="Position.Top" class="handle" :style="handleStyle" />
    <Handle id="b-tgt" type="target" :position="Position.Bottom" class="handle" :style="handleStyle" />
    <Handle id="b-src" type="source" :position="Position.Bottom" class="handle" :style="handleStyle" />
    <Handle id="l-tgt" type="target" :position="Position.Left" class="handle" :style="handleStyle" />
    <Handle id="l-src" type="source" :position="Position.Left" class="handle" :style="handleStyle" />
    <Handle id="r-tgt" type="target" :position="Position.Right" class="handle" :style="handleStyle" />
    <Handle id="r-src" type="source" :position="Position.Right" class="handle" :style="handleStyle" />

    <div class="node-label">{{ data.label }}</div>
    <div class="layer-badge" :style="{ color: data.color }">{{ data.layerLabel }}</div>

    <!-- Hover tooltip -->
    <div class="node-tooltip">
      <div class="tooltip-title" :style="{ color: data.color }">{{ data.label }}</div>
      <div class="tooltip-desc">{{ data.desc }}</div>
      <div class="tooltip-io">
        <span class="io-tag in">IN</span> {{ data.input }}
      </div>
      <div class="tooltip-io">
        <span class="io-tag out">OUT</span> {{ data.output }}
      </div>
    </div>

    <!-- Active heartbeat rings -->
    <div v-if="isActive" class="heartbeat-ring ring-1" :style="{ borderColor: data.color }"></div>
    <div v-if="isActive" class="heartbeat-ring ring-2" :style="{ borderColor: data.color }"></div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { Handle, Position } from '@vue-flow/core'
import { useScenario } from '../composables/useScenario.js'
import { useTheme } from '../composables/useTheme.js'

const props = defineProps({
  data: { type: Object, required: true },
  id: { type: String, required: true },
})

defineEmits(['select'])

const { activeNodes, pathNodes, currentStep, previewNodes, setFocusNode, clearFocusNode, focusNeighbors } = useScenario()
const { isDark } = useTheme()

const isActive = computed(() => activeNodes.value.has(props.id))
const isInPath = computed(() => pathNodes.value.has(props.id))
const isDimmed = computed(() => currentStep.value >= 0 && !isInPath.value && !isActive.value)
const isPreview = computed(() => previewNodes.value.has(props.id))
const isFocusDimmed = computed(() => {
  const f = focusNeighbors.value
  return f && !f.nodes.has(props.id)
})

const nodeStyle = computed(() => {
  const c = props.data.color
  const defaultBar = isDark.value ? `${c}30` : `${c}70`
  if (isActive.value) {
    return {
      borderColor: c,
      borderLeftWidth: '3px',
      borderLeftColor: c,
      background: `${c}18`,
      boxShadow: `0 0 20px ${c}25, inset 0 0 20px ${c}08`,
    }
  }
  if (isInPath.value) {
    return {
      borderColor: `${c}60`,
      borderLeftWidth: '3px',
      borderLeftColor: `${c}80`,
      background: `${c}0c`,
    }
  }
  if (isPreview.value) {
    return {
      borderLeftWidth: '3px',
      borderLeftColor: `${c}90`,
      borderColor: `${c}90`,
      background: `${c}12`,
      boxShadow: `0 0 16px ${c}18`,
    }
  }
  return {
    borderLeftWidth: '3px',
    borderLeftColor: defaultBar,
  }
})

const handleStyle = computed(() => ({
  background: isActive.value ? props.data.color : (isInPath.value ? `${props.data.color}80` : 'var(--border)'),
  border: 'none',
  width: '6px',
  height: '6px',
  transition: 'background 0.3s',
}))
</script>

<style scoped>
.arch-node {
  position: relative;
  width: 150px;
  min-height: 52px;
  padding: 8px 12px 8px 10px;
  background: var(--bg-card);
  border: 1.5px solid var(--border);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all 0.35s cubic-bezier(0.16, 1, 0.3, 1);
  display: flex;
  flex-direction: column;
  justify-content: center;
  font-family: 'JetBrains Mono', monospace;
  box-shadow: var(--node-card-shadow);
}
.arch-node:hover {
  border-color: var(--border-hover);
  background: var(--bg-elevated);
  transform: translateY(-2px);
  box-shadow: var(--shadow-lg);
}
.arch-node.active {
  border-width: 2px;
  z-index: 10;
}
.arch-node.preview {
  z-index: 5;
  transform: translateY(-1px);
}
.arch-node.focus-dim {
  opacity: 0.2;
  filter: grayscale(0.6);
  transition: all 0.25s;
}
.arch-node.dimmed {
  opacity: 0.25;
  filter: grayscale(0.5);
}
.arch-node.dimmed:hover {
  opacity: 0.6;
  filter: none;
}

.node-label {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-primary);
  line-height: 1.3;
  transition: color 0.3s;
}
.arch-node.active .node-label {
  color: #fff;
}
.arch-node.dimmed .node-label {
  color: var(--text-muted);
}

.layer-badge {
  font-size: 9px;
  letter-spacing: 0.5px;
  opacity: var(--node-badge-opacity);
  margin-top: 2px;
  transition: opacity 0.3s;
}
.arch-node.active .layer-badge {
  opacity: 0.9;
}

/* ─── Hover tooltip ─── */
.node-tooltip {
  display: none;
  position: absolute;
  left: 50%;
  bottom: calc(100% + 12px);
  transform: translateX(-50%);
  width: 280px;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 14px 16px;
  z-index: 100;
  pointer-events: none;
  box-shadow: var(--shadow-xl);
  backdrop-filter: var(--backdrop-blur);
}
.arch-node:hover .node-tooltip {
  display: block;
}
.tooltip-title {
  font-size: 12px;
  font-weight: 700;
  margin-bottom: 6px;
}
.tooltip-desc {
  font-size: 10px;
  font-family: 'Inter', sans-serif;
  color: var(--text-secondary);
  line-height: 1.6;
  margin-bottom: 10px;
}
.tooltip-io {
  font-size: 9px;
  color: var(--text-muted);
  line-height: 1.5;
  padding: 2px 0;
}
.io-tag {
  display: inline-block;
  font-size: 8px;
  font-weight: 700;
  letter-spacing: 0.5px;
  padding: 1px 5px;
  border-radius: 3px;
  margin-right: 4px;
}
.io-tag.in {
  background: rgba(54, 201, 151, 0.12);
  color: var(--accent-green);
}
.io-tag.out {
  background: rgba(232, 132, 42, 0.12);
  color: var(--accent-orange);
}

/* ─── Heartbeat rings ─── */
.heartbeat-ring {
  position: absolute;
  inset: 0;
  border: 1.5px solid;
  border-radius: var(--radius-md);
  pointer-events: none;
  opacity: 0;
  animation: heartbeat 1.8s cubic-bezier(0.215, 0.61, 0.355, 1) infinite;
}
.heartbeat-ring.ring-2 {
  animation-delay: 0.4s;
}
@keyframes heartbeat {
  0%   { opacity: 0.6; transform: scale(1); }
  40%  { opacity: 0;   transform: scale(1.25); }
  100% { opacity: 0;   transform: scale(1.25); }
}
</style>
