import { ref, computed } from 'vue'
import { SCENARIOS, RAW_NODES, RAW_EDGES, LAYER_MAP, getLocalizedScenarios, getLocalizedRawNodes, getLocalizedLayers } from '../data/architecture.js'
import { useI18n } from '../i18n/index.js'

const currentScenario = ref('prompt')
const currentStep = ref(-1)
const previewScenarioId = ref(null)
const focusedNodeId = ref(null)
const graphMode = ref('topology') // 'topology' | 'architecture'
let autoTimer = null

export function useScenario() {
  const { locale } = useI18n()

  const localizedScenarios = computed(() => getLocalizedScenarios(locale.value))
  const scenario = computed(() => localizedScenarios.value[currentScenario.value])
  const totalSteps = computed(() => scenario.value?.steps.length ?? 0)
  const flowchartMode = computed(() => currentStep.value >= 0)

  const activeNodes = computed(() => {
    if (currentStep.value < 0 || !scenario.value) return new Set()
    return new Set(scenario.value.steps[currentStep.value]?.nodes ?? [])
  })

  const pathNodes = computed(() => {
    if (currentStep.value < 0 || !scenario.value) return new Set()
    const s = new Set()
    for (let i = 0; i <= currentStep.value; i++) {
      scenario.value.steps[i]?.nodes.forEach(n => s.add(n))
    }
    return s
  })

  // All nodes involved in the entire scenario (across all steps)
  const scenarioNodeIds = computed(() => {
    const s = scenario.value
    if (!s) return new Set()
    const ids = new Set()
    s.steps.forEach(step => step.nodes.forEach(n => ids.add(n)))
    return ids
  })

  const scenarioEdgeSet = computed(() => {
    if (!scenario.value) return new Set()
    return new Set(scenario.value.edges.map(([s, t]) => `${s}->${t}`))
  })

  const activeEdges = computed(() => {
    if (currentStep.value < 0 || !scenario.value) return new Set()
    const s = new Set()
    scenario.value.edges.forEach(([from, to]) => {
      if (pathNodes.value.has(from) && pathNodes.value.has(to)) {
        s.add(`${from}->${to}`)
      }
    })
    return s
  })

  // ─── Topological sort for sequence diagram lifelines ───
  const LAYER_DEPTH = { entry: 0, ui: 1, engine: 2, toolcmd: 3, service: 4, infra: 5, extension: 6 }

  const sortedLifelines = computed(() => {
    const s = scenario.value
    if (!s) return []

    // 1. Collect all unique nodes in the scenario
    const allIds = new Set()
    s.steps.forEach(step => step.nodes.forEach(n => allIds.add(n)))

    // 2. First step appearance
    const firstStep = {}
    s.steps.forEach((step, i) => {
      step.nodes.forEach(n => { if (!(n in firstStep)) firstStep[n] = i })
    })

    // 3. Outgoing edge count within scenario
    const outCount = {}
    allIds.forEach(id => { outCount[id] = 0 })
    s.edges.forEach(([src, tgt]) => {
      if (allIds.has(src) && allIds.has(tgt)) outCount[src]++
    })

    // 4. Initial sort: firstStep ASC → outgoing DESC → layer ASC
    const ordered = [...allIds].sort((a, b) => {
      const sa = firstStep[a] ?? 99, sb = firstStep[b] ?? 99
      if (sa !== sb) return sa - sb
      if (outCount[b] !== outCount[a]) return outCount[b] - outCount[a]
      const la = LAYER_DEPTH[RAW_NODES.find(n => n.id === a)?.layer] ?? 99
      const lb = LAYER_DEPTH[RAW_NODES.find(n => n.id === b)?.layer] ?? 99
      return la - lb
    })

    // 5. Minimize left-going arrows via adjacent swaps
    const edges = s.edges.filter(([src, tgt]) => allIds.has(src) && allIds.has(tgt))
    function leftCount(ord) {
      const pos = new Map()
      ord.forEach((id, i) => pos.set(id, i))
      let c = 0
      edges.forEach(([src, tgt]) => { if ((pos.get(src) ?? 0) > (pos.get(tgt) ?? 0)) c++ })
      return c
    }
    let best = ordered, bestC = leftCount(best)
    for (let pass = 0; pass < 5 && bestC > 0; pass++) {
      let improved = false
      for (let i = 0; i < best.length - 1; i++) {
        const trial = [...best]
        ;[trial[i], trial[i + 1]] = [trial[i + 1], trial[i]]
        const c = leftCount(trial)
        if (c < bestC) { best = trial; bestC = c; improved = true }
      }
      if (!improved) break
    }

    // 6. Build lifeline data (locale-aware)
    const localNodes = getLocalizedRawNodes(locale.value)
    const localLayers = getLocalizedLayers(locale.value)
    const localLayerMap = Object.fromEntries(localLayers.map(l => [l.id, l]))
    return best.map(id => {
      const raw = localNodes.find(n => n.id === id)
      if (!raw) return null
      const layer = localLayerMap[raw.layer] || LAYER_MAP[raw.layer]
      return {
        id, label: raw.label, layer: raw.layer,
        color: layer.color, layerLabel: layer.label,
        desc: raw.desc, files: raw.files, input: raw.input, output: raw.output,
      }
    }).filter(Boolean)
  })

  // ─── Step messages: forward edges + implicit return/connection arrows ───
  const stepMessages = computed(() => {
    const s = scenario.value
    if (!s) return []
    const allIds = new Set()
    s.steps.forEach(step => step.nodes.forEach(n => allIds.add(n)))
    const pathSoFar = new Set()
    const used = new Set()

    // Phase 1: assign scenario edges to earliest step where both endpoints seen
    const result = s.steps.map(step => {
      step.nodes.forEach(n => pathSoFar.add(n))
      const msgs = []
      s.edges.forEach(([src, tgt]) => {
        const key = `${src}->${tgt}`
        if (!used.has(key) && allIds.has(src) && allIds.has(tgt) && pathSoFar.has(src) && pathSoFar.has(tgt)) {
          used.add(key)
          msgs.push({ source: src, target: tgt })
        }
      })
      return msgs
    })

    // Phase 2: add implicit arrows for nodes without incoming connections
    // - Reactivated nodes get return arrows from the previous step's departing node
    // - New isolated nodes get forward arrows from same-step or departing nodes
    // - Chained: multiple reactivated nodes in one step form a chain
    for (let i = 1; i < result.length; i++) {
      const curr = s.steps[i].nodes
      const prev = s.steps[i - 1].nodes
      const targets = new Set(result[i].map(m => m.target))
      const sources = new Set(result[i].map(m => m.source))
      const connected = new Set()
      result[i].forEach(m => { connected.add(m.source); connected.add(m.target) })
      let lastImplicit = null

      for (const node of curr) {
        if (targets.has(node)) continue       // already has incoming arrow
        if (prev.includes(node)) continue     // continues from prev step

        const wasActive = s.steps.slice(0, i).some(st => st.nodes.includes(node))
        let source = null
        const departing = prev.filter(n => !curr.includes(n))

        if (wasActive && lastImplicit && curr.includes(lastImplicit)) {
          source = lastImplicit
        } else if (departing.length > 0) {
          source = departing[departing.length - 1]
        } else {
          const sameConn = curr.filter(n => connected.has(n) && n !== node)
          if (sameConn.length > 0) source = sameConn[0]
          else source = prev.find(n => n !== node) ?? null
        }

        if (source && source !== node) {
          result[i].push({ source, target: node, isReturn: true })
          targets.add(node)
          connected.add(node)
          connected.add(source)
          lastImplicit = node
        }
      }
    }

    return result
  })

  const stepInfo = computed(() => {
    if (currentStep.value < 0 || !scenario.value) return null
    return scenario.value.steps[currentStep.value] ?? null
  })

  function setScenario(id) {
    stopAuto()
    currentScenario.value = id
    currentStep.value = 0 // immediately enter sequence diagram
  }

  function nextStep() {
    if (currentStep.value < totalSteps.value - 1) {
      currentStep.value++
    }
  }

  function prevStep() {
    if (currentStep.value > 0) {
      currentStep.value--
    }
  }

  function reset() {
    stopAuto()
    currentStep.value = -1
  }

  const scenarioIds = Object.keys(SCENARIOS)
  const touring = ref(false)

  function startAuto() {
    stopAuto()
    if (currentStep.value < 0) currentStep.value = 0
    autoTimer = setInterval(() => {
      if (currentStep.value < totalSteps.value - 1) {
        currentStep.value++
      } else if (touring.value) {
        // Tour mode: advance to next scenario
        const idx = scenarioIds.indexOf(currentScenario.value)
        const nextIdx = (idx + 1) % scenarioIds.length
        currentScenario.value = scenarioIds[nextIdx]
        currentStep.value = 0
      } else {
        currentStep.value = 0
      }
    }, 2400)
  }

  function stopAuto() {
    if (autoTimer) {
      clearInterval(autoTimer)
      autoTimer = null
    }
    touring.value = false
  }

  const isAutoPlaying = computed(() => autoTimer !== null)

  function toggleAuto() {
    if (autoTimer) stopAuto()
    else startAuto()
  }

  function startTour() {
    stopAuto()
    touring.value = true
    currentScenario.value = scenarioIds[0]
    currentStep.value = 0
    startAuto()
  }

  const isTourMode = computed(() => touring.value)

  // ─── Node focus: hover a node to highlight its connections ───
  function setFocusNode(id) { focusedNodeId.value = id }
  function clearFocusNode() { focusedNodeId.value = null }

  const focusNeighbors = computed(() => {
    if (!focusedNodeId.value || flowchartMode.value) return null
    const id = focusedNodeId.value
    const neighbors = new Set([id])
    const edges = new Set()
    RAW_EDGES.forEach(([s, t]) => {
      if (s === id) { neighbors.add(t); edges.add(`${s}->${t}`) }
      if (t === id) { neighbors.add(s); edges.add(`${s}->${t}`) }
    })
    return { nodes: neighbors, edges }
  })

  // ─── Preview highlight: hover a scenario button to preview its nodes/edges ───
  function setPreview(id) { previewScenarioId.value = id }
  function clearPreview() { previewScenarioId.value = null }

  const previewNodes = computed(() => {
    if (!previewScenarioId.value || flowchartMode.value) return new Set()
    const s = SCENARIOS[previewScenarioId.value]
    if (!s) return new Set()
    const ids = new Set()
    s.steps.forEach(step => step.nodes.forEach(n => ids.add(n)))
    return ids
  })

  const previewEdges = computed(() => {
    if (!previewScenarioId.value || flowchartMode.value) return new Set()
    const s = SCENARIOS[previewScenarioId.value]
    if (!s) return new Set()
    return new Set(s.edges.map(([a, b]) => `${a}->${b}`))
  })

  function setGraphMode(mode) {
    graphMode.value = mode
  }

  return {
    currentScenario,
    currentStep,
    scenario,
    totalSteps,
    flowchartMode,
    graphMode,
    setGraphMode,
    activeNodes,
    pathNodes,
    scenarioNodeIds,
    scenarioEdgeSet,
    activeEdges,
    sortedLifelines,
    stepMessages,
    stepInfo,
    setScenario,
    nextStep,
    prevStep,
    reset,
    toggleAuto,
    isAutoPlaying,
    startTour,
    isTourMode,
    setPreview,
    clearPreview,
    previewNodes,
    previewEdges,
    setFocusNode,
    clearFocusNode,
    focusNeighbors,
  }
}
