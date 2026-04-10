<template>
  <aside class="code-panel">
    <!-- Header -->
    <div class="code-header">
      <div class="code-file-info">
        <span class="code-filepath">{{ filePath }}</span>
        <span v-if="targetLine" class="code-line-badge">:{{ targetLine }}</span>
      </div>
      <div class="code-actions">
        <span v-if="sliceInfo" class="code-slice">{{ sliceInfo.startLine }}-{{ sliceInfo.endLine }} / {{ sliceInfo.totalLines }}</span>
        <span class="code-lang">{{ lang }}</span>
        <button class="code-close" @click="$emit('close')">&times;</button>
      </div>
    </div>

    <!-- Code body -->
    <div class="code-body" ref="bodyRef">
      <div v-if="loading" class="code-status">Loading...</div>
      <div v-else-if="error" class="code-status error">{{ error }}</div>
      <div v-else class="code-content" v-html="renderedHtml"></div>
    </div>
  </aside>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue'
import { createHighlighter } from 'shiki'

const props = defineProps({
  codeRef: { type: String, default: '' },
})
defineEmits(['close'])

const loading = ref(false)
const error = ref(null)
const source = ref('')
const renderedHtml = ref('')
const bodyRef = ref(null)
const sliceInfo = ref(null)

let highlighter = null

async function ensureHighlighter() {
  if (highlighter) return
  highlighter = await createHighlighter({
    themes: ['github-dark-default', 'github-light-default'],
    langs: ['typescript', 'tsx', 'javascript'],
  })
}

// Parse code ref: "method() — src/file.tsx:123"
const parsed = computed(() => {
  if (!props.codeRef) return null
  const match = props.codeRef.match(/(src\/[\w/.:-]+\.(?:tsx|ts|js))(?::(\d+))?/)
  if (!match) return null
  return { file: match[1], line: match[2] ? parseInt(match[2]) : null }
})

const filePath = computed(() => parsed.value?.file ?? '')
const targetLine = computed(() => parsed.value?.line ?? 0)
const lang = computed(() => {
  if (filePath.value.endsWith('.tsx')) return 'TSX'
  if (filePath.value.endsWith('.ts')) return 'TS'
  return 'JS'
})
const shikiLang = computed(() => {
  if (filePath.value.endsWith('.tsx')) return 'tsx'
  if (filePath.value.endsWith('.ts')) return 'typescript'
  return 'javascript'
})

const WINDOW = 150
const MAX_LINES = 800

watch(() => props.codeRef, async (val) => {
  if (!val || !parsed.value) return
  loading.value = true
  error.value = null
  renderedHtml.value = ''
  sliceInfo.value = null

  try {
    const res = await fetch(`/__source__/${parsed.value.file}`)
    if (!res.ok) throw new Error(`${res.status} — ${parsed.value.file}`)
    const text = await res.text()
    if (text.trimStart().startsWith('<!DOCTYPE') || text.trimStart().startsWith('<html')) {
      throw new Error('File not served. Restart dev server.')
    }

    const allLines = text.split('\n')
    let codeToHighlight = text
    let lineOffset = 0

    if (allLines.length > MAX_LINES && targetLine.value > 0) {
      const start = Math.max(0, targetLine.value - WINDOW - 1)
      const end = Math.min(allLines.length, targetLine.value + WINDOW)
      codeToHighlight = allLines.slice(start, end).join('\n')
      lineOffset = start
      sliceInfo.value = { startLine: start + 1, endLine: end, totalLines: allLines.length }
    } else if (allLines.length > MAX_LINES) {
      codeToHighlight = allLines.slice(0, MAX_LINES).join('\n')
      sliceInfo.value = { startLine: 1, endLine: MAX_LINES, totalLines: allLines.length }
    }

    source.value = codeToHighlight

    await ensureHighlighter()
    const isDark = document.documentElement.getAttribute('data-theme') !== 'light'
    const theme = isDark ? 'github-dark-default' : 'github-light-default'

    renderedHtml.value = highlighter.codeToHtml(source.value, {
      lang: shikiLang.value,
      theme,
      transformers: [{
        line(node, line) {
          const actualLine = line + lineOffset
          if (actualLine === targetLine.value) {
            node.properties.class = (node.properties.class || '') + ' highlighted-line'
          }
          node.properties['data-line'] = actualLine
        },
      }],
    })

    await nextTick()
    setTimeout(() => {
      bodyRef.value?.querySelector('.highlighted-line')?.scrollIntoView({ block: 'center', behavior: 'smooth' })
    }, 150)
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}, { immediate: true })
</script>

<style scoped>
.code-panel {
  position: absolute;
  top: 0;
  bottom: 0;
  right: var(--aside-width, 380px);
  width: 50%;
  max-width: calc(100% - var(--aside-width, 380px));
  display: flex;
  flex-direction: column;
  background: var(--bg-panel);
  border-left: 1px solid var(--border);
  border-right: 1px solid var(--border);
  z-index: 25;
  box-shadow: var(--shadow-lg);
  animation: slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}
@keyframes slideIn {
  from { opacity: 0; transform: translateX(40px); }
  to { opacity: 1; transform: translateX(0); }
}

/* Header */
.code-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background: var(--bg-surface);
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
  gap: 8px;
}
.code-file-info {
  display: flex;
  align-items: baseline;
  gap: 1px;
  min-width: 0;
  overflow: hidden;
}
.code-filepath {
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  color: var(--text-primary);
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.code-line-badge {
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  color: var(--accent-blue);
  font-weight: 700;
  flex-shrink: 0;
}
.code-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}
.code-slice {
  font-family: 'JetBrains Mono', monospace;
  font-size: 9px;
  color: var(--accent-orange);
  background: rgba(232, 132, 42, 0.08);
  padding: 1px 6px;
  border-radius: 3px;
  white-space: nowrap;
}
.code-lang {
  font-family: 'JetBrains Mono', monospace;
  font-size: 9px;
  color: var(--text-dim);
  letter-spacing: 0.5px;
}
.code-close {
  width: 24px;
  height: 24px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--text-muted);
  font-size: 14px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}
.code-close:hover { border-color: #e85c5c; color: #e85c5c; }

/* Body */
.code-body {
  flex: 1;
  overflow: auto;
}
.code-status {
  padding: 40px 20px;
  text-align: center;
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
  color: var(--text-muted);
}
.code-status.error { color: #e85c5c; white-space: pre-wrap; }

/* Shiki output */
.code-content :deep(pre) {
  margin: 0;
  padding: 8px 0;
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
  line-height: 1.6;
  overflow-x: auto;
  min-height: 100%;
}
.code-content :deep(code) {
  font-family: inherit;
}
.code-content :deep(.line) {
  display: inline-block;
  width: 100%;
  padding: 0 12px 0 0;
  transition: background 0.15s;
}
.code-content :deep(.line)::before {
  content: attr(data-line);
  display: inline-block;
  width: 45px;
  padding-right: 12px;
  text-align: right;
  color: var(--text-dim);
  user-select: none;
  font-size: 11px;
  border-right: 1px solid var(--border-subtle);
  margin-right: 12px;
}
.code-content :deep(.line:hover) {
  background: var(--bg-hover);
}
.code-content :deep(.highlighted-line) {
  background: rgba(91, 156, 245, 0.12) !important;
  border-left: 3px solid var(--accent-blue);
}
.code-content :deep(.highlighted-line)::before {
  color: var(--accent-blue);
  font-weight: 700;
}
</style>
