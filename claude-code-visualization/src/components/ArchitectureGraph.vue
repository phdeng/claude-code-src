<template>
  <div class="graph-container">
    <!-- Mode switcher (visible when not in sequence diagram) -->
    <div v-if="!flowchartMode" class="mode-switcher">
      <button
        class="mode-btn" :class="{ active: graphMode === 'topology' }"
        @click="setGraphMode('topology')" title="Topology View"
      >
        <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor">
          <circle cx="3" cy="3" r="2"/><circle cx="13" cy="3" r="2"/>
          <circle cx="8" cy="8" r="2"/><circle cx="3" cy="13" r="2"/><circle cx="13" cy="13" r="2"/>
          <line x1="3" y1="3" x2="8" y2="8" stroke="currentColor" stroke-width="1"/>
          <line x1="13" y1="3" x2="8" y2="8" stroke="currentColor" stroke-width="1"/>
          <line x1="8" y1="8" x2="3" y2="13" stroke="currentColor" stroke-width="1"/>
          <line x1="8" y1="8" x2="13" y2="13" stroke="currentColor" stroke-width="1"/>
        </svg>
        Topology
      </button>
      <button
        class="mode-btn" :class="{ active: graphMode === 'architecture' }"
        @click="setGraphMode('architecture')" title="Architecture View"
      >
        <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor">
          <rect x="1" y="1" width="14" height="3" rx="1" opacity="0.5"/>
          <rect x="1" y="6" width="14" height="3" rx="1" opacity="0.7"/>
          <rect x="1" y="11" width="14" height="3" rx="1" opacity="0.9"/>
        </svg>
        Layered
      </button>
    </div>

    <!-- Topology mode: Vue Flow graph -->
    <VueFlow
      v-if="!flowchartMode && graphMode === 'topology'"
      :nodes="allNodes"
      :edges="allEdges"
      :node-types="nodeTypes"
      :edge-types="edgeTypes"
      :default-viewport="{ x: 80, y: 40, zoom: 0.85 }"
      :min-zoom="0.15"
      :max-zoom="3"
      :snap-to-grid="true"
      :snap-grid="[20, 20]"
      :nodes-draggable="true"
      :pan-on-drag="true"
      :zoom-on-scroll="true"
      :zoom-on-pinch="true"
      :zoom-on-double-click="true"
      :prevent-scrolling="true"
      :fit-view-on-init="false"
      @node-click="onNodeClick"
      @pane-click="onPaneClick"
    >
      <Background variant="dots" :gap="24" :size="1" :color="dotColor" />
      <Controls :show-fit-view="true" :show-interactive="false" position="top-left" />
      <MiniMap position="bottom-right" :pannable="true" :zoomable="true" />

      <template #node-arch="nodeProps">
        <CustomNode v-bind="nodeProps" @select="onSelectNode" />
      </template>

      <template #node-layer-label="nodeProps">
        <LayerLabel v-bind="nodeProps" />
      </template>

      <template #edge-animated-edge="edgeProps">
        <AnimatedEdge v-bind="edgeProps" />
      </template>
    </VueFlow>

    <!-- Architecture / Layered mode -->
    <LayeredDiagram
      v-if="!flowchartMode && graphMode === 'architecture'"
      @select-node="onSelectNode"
    />

    <!-- Sequence diagram mode -->
    <SequenceDiagram
      v-if="flowchartMode"
      @select-node="onSelectNode"
    />

    <!-- Layer legend + help hint (topology mode only) -->
    <div v-if="!flowchartMode && graphMode === 'topology'" class="layer-legend" :class="{ open: legendOpen }">
      <div class="legend-btns">
        <button class="legend-toggle" @click="legendOpen = !legendOpen" title="Layer Legend (?)">
          <span v-if="legendOpen">LAYERS &times;</span>
          <span v-else>?</span>
        </button>
        <button class="legend-toggle help-hint" @click="window.dispatchEvent(new KeyboardEvent('keydown', {key:'h'}))" title="Keyboard Shortcuts (H)">H</button>
      </div>
      <div v-if="legendOpen" class="legend-items">
        <div v-for="l in localizedLayers" :key="l.id" class="legend-item">
          <span class="legend-dot" :style="{ background: l.color }"></span>
          {{ l.label }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, markRaw, onMounted, onUnmounted, nextTick } from 'vue'
import { VueFlow, useVueFlow } from '@vue-flow/core'
import { Background } from '@vue-flow/background'
import { Controls } from '@vue-flow/controls'
import { MiniMap } from '@vue-flow/minimap'

import '@vue-flow/core/dist/style.css'
import '@vue-flow/core/dist/theme-default.css'
import '@vue-flow/controls/dist/style.css'
import '@vue-flow/minimap/dist/style.css'

import CustomNode from './CustomNode.vue'
import AnimatedEdge from './AnimatedEdge.vue'
import LayerLabel from './LayerLabel.vue'
import SequenceDiagram from './SequenceDiagram.vue'
import LayeredDiagram from './LayeredDiagram.vue'
import { buildNodes, buildEdges, LAYERS, getLocalizedLayers } from '../data/architecture.js'
import { useScenario } from '../composables/useScenario.js'
import { useTheme } from '../composables/useTheme.js'
import { useI18n } from '../i18n/index.js'

const emit = defineEmits(['select-node', 'deselect'])
const { isDark } = useTheme()
const { locale } = useI18n()

const archNodes = computed(() => buildNodes(locale.value))
const localizedLayers = computed(() => getLocalizedLayers(locale.value))
const edges = buildEdges()

const labelNodes = computed(() => localizedLayers.value.map(layer => ({
  id: `label-${layer.id}`,
  type: 'layer-label',
  position: { x: -120, y: layer.row * 160 + 16 },
  data: { label: layer.label, color: layer.color },
  draggable: false,
  selectable: false,
  connectable: false,
})))

const { flowchartMode, currentScenario, graphMode, setGraphMode } = useScenario()

const allNodes = computed(() => [...labelNodes.value, ...archNodes.value])
const allEdges = computed(() => edges)

const dotColor = computed(() => isDark.value ? '#141a24' : '#d0d6de')

const legendOpen = ref(false)
const onToggleLegend = () => { legendOpen.value = !legendOpen.value }
onMounted(() => window.addEventListener('toggle-legend', onToggleLegend))
onUnmounted(() => window.removeEventListener('toggle-legend', onToggleLegend))

const { fitView } = useVueFlow()

onMounted(() => {
  nextTick(() => {
    setTimeout(() => {
      fitView({ padding: 0.15, nodes: archNodes.value.map(n => n.id) })
    }, 100)
  })
})

watch([flowchartMode, currentScenario, graphMode], () => {
  if (!flowchartMode.value && graphMode.value === 'topology') {
    nextTick(() => {
      setTimeout(() => fitView({ padding: 0.2, duration: 500 }), 100)
    })
  }
})

const nodeTypes = {
  arch: markRaw(CustomNode),
  'layer-label': markRaw(LayerLabel),
}
const edgeTypes = {
  'animated-edge': markRaw(AnimatedEdge),
}

function onSelectNode(data) { emit('select-node', data) }
function onNodeClick({ node }) {
  if (node.type === 'layer-label') return
  emit('select-node', node.data)
}
function onPaneClick() { emit('deselect') }
</script>

<style scoped>
.graph-container {
  flex: 1;
  position: relative;
  overflow: hidden;
}

/* Mode switcher */
.mode-switcher {
  position: absolute;
  top: 10px;
  right: 16px;
  z-index: 20;
  display: flex;
  gap: 2px;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 3px;
  box-shadow: var(--shadow-sm);
  backdrop-filter: var(--backdrop-blur);
}
.mode-btn {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 5px 12px;
  border: none;
  border-radius: calc(var(--radius-md) - 2px);
  background: transparent;
  color: var(--text-muted);
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}
.mode-btn:hover {
  color: var(--text-secondary);
  background: var(--bg-hover);
}
.mode-btn.active {
  color: var(--accent-blue);
  background: rgba(91, 156, 245, 0.1);
}

/* Layer legend */
.layer-legend {
  position: absolute;
  bottom: 16px;
  left: 16px;
  z-index: 20;
}
.legend-btns { display: flex; gap: 4px; }
.help-hint { opacity: 0.5; font-size: 12px !important; }
.help-hint:hover { opacity: 1; }
.legend-toggle {
  width: 32px; height: 32px;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  background: var(--bg-elevated);
  color: var(--text-muted);
  font-family: 'JetBrains Mono', monospace;
  font-size: 13px; font-weight: 700;
  cursor: pointer;
  backdrop-filter: var(--backdrop-blur);
  transition: all 0.2s;
  display: flex; align-items: center; justify-content: center;
  box-shadow: var(--shadow-sm);
}
.layer-legend.open .legend-toggle {
  width: auto; padding: 4px 10px; font-size: 10px;
  letter-spacing: 0.5px;
  color: var(--accent-blue); border-color: var(--accent-blue);
}
.legend-toggle:hover { border-color: var(--border-hover); color: var(--accent-blue); }
.legend-items {
  margin-top: 6px;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 8px 12px;
  backdrop-filter: var(--backdrop-blur);
  box-shadow: var(--shadow-md);
}
.legend-item {
  display: flex; align-items: center; gap: 8px;
  font-size: 10px; color: var(--text-muted); padding: 3px 0;
  font-family: 'JetBrains Mono', monospace; letter-spacing: 0.3px;
}
.legend-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
</style>
