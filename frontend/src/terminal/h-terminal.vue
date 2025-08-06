<template>
  <div class="h-terminal" :style="{ background: theme.background }" :data-terminal-id="terminalId">
    <div class="terminal-container" ref="terminalRef"></div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, watch, computed } from 'vue'
import { terminalManager, TerminalStatus } from './terminal-manager'
import 'xterm/css/xterm.css'

const props = defineProps({
  ip: {
    type: String,
    required: true
  },
  role: {
    type: String,
    default: 'baseuser'
  },
  theme: {
    type: Object,
    default: () => ({
      background: '#fdf6e3',
      foreground: '#000000',
      cursor: '#586e75'
    })
  },
  terminalInstanceId: {
    type: String,
    default: null
  }
})

const emit = defineEmits(['status-change', 'focus'])

const terminalRef = ref(null)

// 生成唯一的终端ID - 优先使用传入的terminalInstanceId，确保每个终端实例都有唯一ID  
const terminalId = computed(() => {
  if (props.terminalInstanceId) {
    return props.terminalInstanceId
  }
  // 如果没有传入terminalInstanceId，使用IP和role组合
  return `${props.ip}-${props.role}`
})

// 获取终端实例
function getTerminal() {
  return terminalManager.getTerminal(terminalId.value)
}


// 初始化终端
async function initTerminal(shouldConnect = true) {
  if (!terminalRef.value) return null

  // 创建或获取终端实例
  const terminalData = terminalManager.createTerminal(terminalId.value, {
    ip: props.ip,
    role: props.role,
    theme: props.theme
  })

  // 初始化终端UI和连接
  const terminal = await terminalManager.initTerminal(
    terminalId.value, 
    terminalRef.value, 
    shouldConnect
  )

  return terminal
}

// 发送数据到服务器
function sendData(data) {
  terminalManager.sendData(terminalId.value, data)
}

// 监听主题变化
watch(() => props.theme, (newTheme) => {
  setTheme(newTheme)
}, { deep: true })

// 重新连接
async function reconnect() {
  await terminalManager.reconnect(terminalId.value)
}

// 设置主题
function setTheme(theme) {
  terminalManager.setTheme(terminalId.value, theme)
}

// 调整大小
function fit() {
  terminalManager.fitTerminal(terminalId.value)
}

// 状态变化回调
function handleStatusChange(status) {
  emit('status-change', status)
}

// 焦点回调
function handleFocus() {
  emit('focus')
}

// 生命周期钩子
onMounted(async () => {
  // 注册事件监听器
  terminalManager.addEventListener(terminalId.value, 'statusChange', handleStatusChange)
  terminalManager.addEventListener(terminalId.value, 'focus', handleFocus)
  
  // 检查终端是否已存在
  const existingTerminal = terminalManager.getTerminal(terminalId.value)
  if (existingTerminal && terminalRef.value) {
    // 终端已存在，将其移动到新容器
    terminalManager.moveTerminal(terminalId.value, terminalRef.value)
    
    // 同步当前状态
    const currentStatus = terminalManager.getStatus(terminalId.value)
    emit('status-change', currentStatus)
    
    // 自动聚焦终端
    existingTerminal.focus()
  } else {
    // 初始化新终端
    const terminal = await initTerminal()
    if (terminal) {
      // 自动聚焦终端
      terminal.focus()
    }
  }
  
  window.addEventListener('resize', fit)
})

onBeforeUnmount(() => {
  // 移除事件监听器
  terminalManager.removeEventListener(terminalId.value, 'statusChange', handleStatusChange)
  terminalManager.removeEventListener(terminalId.value, 'focus', handleFocus)
  
  window.removeEventListener('resize', fit)
  
  // 注意：这里不销毁终端，因为它可能被其他组件实例使用
  // terminalManager.destroyTerminal(terminalId.value)
})

// 暴露方法给父组件
defineExpose({
  reconnect,
  setTheme,
  fit,
  sendData,
  initTerminal,
  getTerminal
})
</script>

<style scoped lang="scss">
.h-terminal {
  height: 100%;
  display: flex;
  overflow: hidden;

  .terminal-container {
    height: 100%;
    flex: 1;
    overflow: hidden;
    background-color: v-bind('theme.background');
  }
}

:deep(.xterm-viewport) {
  width: 100% !important;
  background-color: v-bind('theme.background') !important;
}

:deep(.xterm-screen) {
  width: 100% !important;
}

:deep(.xterm-decoration-overview-ruler) {
  background-color: v-bind('theme.background') !important;
}

:deep(.xterm-viewport > div) {
  background-color: v-bind('theme.background') !important;
}

:deep(.xterm-dom-renderer-owner-1) {
  background-color: v-bind('theme.background') !important;
}

:deep(.xterm-rows) {
  background-color: v-bind('theme.background') !important;
}
</style>