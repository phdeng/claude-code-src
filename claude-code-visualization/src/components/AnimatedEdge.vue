<template>
  <g>
    <!-- Base path -->
    <path :d="edgePath" :style="baseStyle" fill="none" />

    <!-- Glow (active only) -->
    <path v-if="isActiveEdge" :d="edgePath" :style="glowStyle" fill="none" />

    <!-- Arrow (sequence diagram only) -->
    <polygon
      v-if="isActiveEdge && flowchartMode"
      :points="arrowPoints"
      :fill="edgeColor"
      opacity="0.85"
    />

    <!-- Animated particles (active scenario edges) -->
    <template v-if="isActiveEdge">
      <circle v-for="p in 3" :key="p" :r="2.5" :fill="edgeColor" opacity="0.9">
        <animateMotion
          :dur="`${1.8 + p * 0.4}s`"
          repeatCount="indefinite"
          :path="edgePath"
          :begin="`${p * 0.5}s`"
        />
      </circle>
      <circle v-for="p in 3" :key="'g' + p" :r="6" :fill="edgeColor" opacity="0.1">
        <animateMotion
          :dur="`${1.8 + p * 0.4}s`"
          repeatCount="indefinite"
          :path="edgePath"
          :begin="`${p * 0.5}s`"
        />
      </circle>
    </template>

    <!-- Focus mode: particles + data label on hovered node's edges -->
    <template v-if="isFocusEdge && !isActiveEdge">
      <path :d="edgePath" :style="focusGlowStyle" fill="none" />
      <circle r="2.5" :fill="edgeColor" opacity="0.8">
        <animateMotion dur="2s" repeatCount="indefinite" :path="edgePath" />
      </circle>
      <circle r="5" :fill="edgeColor" opacity="0.12">
        <animateMotion dur="2s" repeatCount="indefinite" :path="edgePath" />
      </circle>
      <!-- Edge data flow label -->
      <text
        v-if="edgeLabel"
        :x="labelPos.x" :y="labelPos.y"
        text-anchor="middle"
        :fill="edgeColor"
        font-size="9"
        font-family="JetBrains Mono, monospace"
        opacity="0.7"
        style="pointer-events: none"
      >{{ edgeLabel }}</text>
    </template>
  </g>
</template>

<script setup>
import { computed } from 'vue'
import { useScenario } from '../composables/useScenario.js'
import { useTheme } from '../composables/useTheme.js'
import { RAW_NODES, LAYER_MAP } from '../data/architecture.js'

const props = defineProps({
  id: { type: String, required: true },
  source: { type: String, required: true },
  target: { type: String, required: true },
  sourceX: { type: Number, required: true },
  sourceY: { type: Number, required: true },
  targetX: { type: Number, required: true },
  targetY: { type: Number, required: true },
  sourcePosition: { type: String, default: 'bottom' },
  targetPosition: { type: String, default: 'top' },
  data: { type: Object, default: () => ({}) },
  markerEnd: { type: String, default: '' },
  style: { type: Object, default: () => ({}) },
})

const { activeEdges, scenarioEdgeSet, currentStep, flowchartMode, previewEdges, focusNeighbors } = useScenario()
const { isDark } = useTheme()

const edgeKey = computed(() => `${props.source}->${props.target}`)
const isActiveEdge = computed(() => activeEdges.value.has(edgeKey.value))
const isInScenario = computed(() => scenarioEdgeSet.value.has(edgeKey.value))
const isPreviewEdge = computed(() => previewEdges.value.has(edgeKey.value))
const isFocusEdge = computed(() => focusNeighbors.value?.edges.has(edgeKey.value) ?? false)
const isFocusDimmed = computed(() => focusNeighbors.value && !isFocusEdge.value)

const sourceNode = computed(() => RAW_NODES.find(n => n.id === props.source))
const edgeColor = computed(() => {
  if (!sourceNode.value) return '#5b9cf5'
  return LAYER_MAP[sourceNode.value.layer]?.color ?? '#5b9cf5'
})

const ARROW_H = 10
const ARROW_W = 7
const GAP = 4
const BEZIER_OFFSET = 50

const edgePath = computed(() => {
  const sx = props.sourceX
  const sy = props.sourceY
  const tx = props.targetX
  const ty = props.targetY

  if (flowchartMode.value) {
    const arrowEnd = ty - GAP - ARROW_H
    const midY = sy + (arrowEnd - sy) * 0.5
    return `M ${sx} ${sy} L ${sx} ${midY} L ${tx} ${midY} L ${tx} ${arrowEnd}`
  }

  // Topology: bezier curve adapting to handle direction
  const sp = props.sourcePosition
  const tp = props.targetPosition
  const off = BEZIER_OFFSET

  let cp1x = sx, cp1y = sy, cp2x = tx, cp2y = ty
  if (sp === 'bottom')      { cp1y = sy + off }
  else if (sp === 'top')    { cp1y = sy - off }
  else if (sp === 'right')  { cp1x = sx + off }
  else if (sp === 'left')   { cp1x = sx - off }

  if (tp === 'top')         { cp2y = ty - off }
  else if (tp === 'bottom') { cp2y = ty + off }
  else if (tp === 'left')   { cp2x = tx - off }
  else if (tp === 'right')  { cp2x = tx + off }

  return `M ${sx} ${sy} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${tx} ${ty}`
})

const arrowPoints = computed(() => {
  const tx = props.targetX
  const tipY = props.targetY - GAP
  const tailY = props.targetY - GAP - ARROW_H
  return `${tx - ARROW_W},${tailY} ${tx + ARROW_W},${tailY} ${tx},${tipY}`
})

const baseStyle = computed(() => {
  if (isActiveEdge.value) {
    return {
      stroke: edgeColor.value,
      strokeWidth: 2.5,
      strokeOpacity: 0.7,
      transition: 'all 0.4s',
    }
  }
  if (currentStep.value >= 0) {
    return {
      stroke: isInScenario.value ? 'var(--border)' : 'var(--border-subtle)',
      strokeWidth: 1,
      strokeOpacity: isInScenario.value ? 0.4 : 0.2,
      transition: 'all 0.4s',
    }
  }
  if (isFocusEdge.value) {
    return {
      stroke: edgeColor.value,
      strokeWidth: 2.5,
      strokeOpacity: 0.7,
      transition: 'all 0.25s',
    }
  }
  if (isPreviewEdge.value) {
    return {
      stroke: edgeColor.value,
      strokeWidth: 2,
      strokeOpacity: 0.5,
      transition: 'all 0.4s',
    }
  }
  if (isFocusDimmed.value) {
    return {
      stroke: isDark.value ? '#161d2a' : '#c0c8d4',
      strokeWidth: 1,
      strokeOpacity: isDark.value ? 0.15 : 0.5,
      transition: 'all 0.25s',
    }
  }
  return {
    stroke: isDark.value ? '#1c2536' : '#a0aec0',
    strokeWidth: isDark.value ? 1 : 1.2,
    strokeOpacity: isDark.value ? 0.5 : 0.6,
    transition: 'all 0.4s',
  }
})

const glowStyle = computed(() => ({
  stroke: edgeColor.value,
  strokeWidth: 8,
  strokeOpacity: 0.1,
  filter: 'blur(4px)',
}))

const EDGE_LABELS = {
  'cli->main': 'Parsed args',
  'main->repl': 'Ink render',
  'repl->query': 'User message',
  'repl->components': 'Props',
  'repl->hooks': 'State',
  'components->ink': 'Virtual DOM',
  'query->queryEngine': 'UserMessage',
  'queryEngine->api': 'Messages + tools',
  'queryEngine->toolOrch': 'ToolUseBlock[]',
  'queryEngine->context': 'Project root',
  'queryEngine->compact': 'History',
  'queryEngine->analytics': 'Events',
  'queryEngine->coordinator': 'Task',
  'toolOrch->tools': 'Validated input',
  'toolOrch->permissions': 'Tool + input',
  'toolReg->tools': 'Tool[]',
  'toolDef->toolReg': 'Type defs',
  'cmdReg->skills': 'Command',
  'api->state': 'Token usage',
  'state->appState': 'Session state',
  'tools->state': 'File changes',
  'tools->lsp': 'File edits',
  'mcpClient->appState': 'MCP tools',
  'appState->permissions': 'Allow/deny rules',
  'sdk_entry->queryEngine': 'SDK call',
  'mcp_entry->mcpClient': 'MCP config',
  'repl->bridge': 'Bridge msgs',
  'repl->remote': 'Remote URL',
}

const edgeLabel = computed(() => EDGE_LABELS[edgeKey.value] ?? null)
const labelPos = computed(() => {
  const mx = (props.sourceX + props.targetX) / 2
  const my = (props.sourceY + props.targetY) / 2 - 8
  return { x: mx, y: my }
})

const focusGlowStyle = computed(() => ({
  stroke: edgeColor.value,
  strokeWidth: 6,
  strokeOpacity: 0.08,
  filter: 'blur(3px)',
}))
</script>
