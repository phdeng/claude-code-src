<template>
  <div class="layered-diagram">
    <div class="layered-scroll">
      <div
        v-for="layer in layerData" :key="layer.id"
        class="layer-band"
      >
        <div class="layer-sidebar" :style="{ borderLeftColor: layer.color }">
          <span class="layer-name" :style="{ color: layer.color }">{{ layer.label }}</span>
          <span class="layer-count">{{ layer.nodes.length }} modules</span>
        </div>
        <div class="layer-nodes">
          <div
            v-for="node in layer.nodes" :key="node.id"
            class="arch-card"
            @click="$emit('select-node', node)"
          >
            <div class="card-bar" :style="{ background: layer.color }"></div>
            <div class="card-body">
              <div class="card-label">{{ node.label }}</div>
              <div class="card-desc">{{ truncate(node.desc, 72) }}</div>
              <div class="card-meta">
                <span class="card-files">{{ node.files[0] }}</span>
                <span class="card-conns" :style="{ color: layer.color }">{{ connectionCount(node.id) }} links</span>
              </div>
              <div class="card-io">
                <span class="io-in">IN</span> {{ truncate(node.input, 30) }}
              </div>
              <div class="card-io">
                <span class="io-out">OUT</span> {{ truncate(node.output, 30) }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { RAW_NODES, RAW_EDGES, LAYERS, getLocalizedRawNodes, getLocalizedLayers } from '../data/architecture.js'
import { useI18n } from '../i18n/index.js'

defineEmits(['select-node'])

const { locale } = useI18n()

const connCounts = computed(() => {
  const c = {}
  RAW_NODES.forEach(n => { c[n.id] = 0 })
  RAW_EDGES.forEach(([s, t]) => { c[s] = (c[s] || 0) + 1; c[t] = (c[t] || 0) + 1 })
  return c
})
function connectionCount(id) { return connCounts.value[id] || 0 }

const layerData = computed(() => {
  const localNodes = getLocalizedRawNodes(locale.value)
  const localLayers = getLocalizedLayers(locale.value)
  return localLayers.map(layer => {
    const nodes = localNodes
      .filter(n => n.layer === layer.id)
      .map(n => ({
        ...n,
        color: layer.color,
        layerLabel: layer.label,
      }))
    return { ...layer, nodes }
  })
})

function truncate(s, n) {
  return s && s.length > n ? s.slice(0, n) + '...' : s
}
</script>

<style scoped>
.layered-diagram {
  position: absolute;
  inset: 0;
  overflow: auto;
  background: var(--bg-deep);
  transition: background 0.3s;
}
.layered-scroll {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 16px 20px;
  min-height: 100%;
}

/* Layer bands */
.layer-band {
  display: flex;
  align-items: stretch;
  border-radius: var(--radius-md);
  background: var(--bg-card);
  border: 1px solid var(--border-subtle);
  transition: background 0.3s, border-color 0.3s;
}
.layer-sidebar {
  width: 140px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 14px 16px;
  border-left: 3px solid;
  border-radius: var(--radius-md) 0 0 var(--radius-md);
  background: var(--bg-surface);
}
.layer-name {
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 1px;
  line-height: 1.3;
}
.layer-count {
  font-family: 'JetBrains Mono', monospace;
  font-size: 9px;
  color: var(--text-dim);
  margin-top: 3px;
}

/* Node cards */
.layer-nodes {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  overflow-x: auto;
  scrollbar-width: none;
}
.layer-nodes::-webkit-scrollbar { display: none; }

.arch-card {
  flex-shrink: 0;
  width: 172px;
  display: flex;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--bg-elevated);
  cursor: pointer;
  transition: all 0.25s ease;
  box-shadow: var(--node-card-shadow);
}
.arch-card:hover {
  border-color: var(--border-hover);
  transform: translateY(-1px);
  box-shadow: var(--shadow-md);
}
.card-bar {
  width: 3px;
  flex-shrink: 0;
  border-radius: var(--radius-sm) 0 0 var(--radius-sm);
}
.card-body {
  flex: 1;
  padding: 8px 10px;
  min-width: 0;
}
.card-label {
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 3px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.card-desc {
  font-size: 9.5px;
  color: var(--text-muted);
  line-height: 1.45;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.card-meta {
  margin-top: 5px;
  display: flex;
  align-items: center;
  gap: 6px;
}
.card-files {
  font-family: 'JetBrains Mono', monospace;
  font-size: 8px;
  color: var(--text-dim);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.card-conns {
  font-family: 'JetBrains Mono', monospace;
  font-size: 8px;
  font-weight: 600;
}
.card-io {
  font-family: 'JetBrains Mono', monospace;
  font-size: 8px;
  color: var(--text-dim);
  margin-top: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.io-in, .io-out {
  display: inline-block;
  font-size: 7px;
  font-weight: 700;
  padding: 0 3px;
  border-radius: 2px;
  margin-right: 3px;
  letter-spacing: 0.3px;
}
.io-in {
  background: rgba(54, 201, 151, 0.12);
  color: var(--accent-green);
}
.io-out {
  background: rgba(232, 132, 42, 0.12);
  color: var(--accent-orange);
}
</style>
