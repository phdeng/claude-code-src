<template>
  <div class="layer-label-node" :style="labelStyle">
    {{ data.label }}
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useTheme } from '../composables/useTheme.js'

const props = defineProps({
  data: { type: Object, required: true },
})

const { isDark } = useTheme()

const labelStyle = computed(() => ({
  color: props.data.color + (isDark.value ? '60' : '90'),
}))
</script>

<style scoped>
.layer-label-node {
  font-size: 11px;
  font-family: 'JetBrains Mono', monospace;
  letter-spacing: 2px;
  white-space: nowrap;
  user-select: none;
  pointer-events: none;
  font-weight: 600;
}
</style>
