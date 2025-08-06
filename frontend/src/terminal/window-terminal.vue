<template>
  <div class="window-terminal">
    <cloud-terminal
      ref="terminalRef"
      :terminal-config="{
        ip: ip || '127.0.0.1',
        role: role || 'baseuser'
      }"
    />
    <ip-selection-dialog
      v-model="showIpDialog"
      @select="handleIpSelect"
    />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import CloudTerminal from './cloud-terminal.vue'
import IpSelectionDialog from './ip-selection-dialog.vue'

const role = ref('baseuser')
const ip = ref('127.0.0.1')
const terminalRef = ref()
const showIpDialog = ref(false)

// 创建默认终端
onMounted(() => {
  console.log('Window Terminal Component Mounted', { role: role.value, ip: ip.value })
  if (terminalRef.value) {
    terminalRef.value.addTerminal({
      ip: ip.value,
      role: role.value
    })
  }
})

const handleIpSelect = (config) => {
  ip.value = config.ip
  role.value = config.role
  if (terminalRef.value) {
    terminalRef.value.addTerminal({
      ip: ip.value,
      role: role.value
    })
  }
}
</script>

<style lang="scss" scoped>
.window-terminal {
  height: 100vh;
  width: 100%;
  background: #1e1e1e;
}
</style>