<template>
  <div class="terminal-panel" :class="{ 'has-children': panel.children.length > 0 }" :data-panel-id="panel.id">
    <!-- 如果有子面板，则渲染子面板 -->
    <template v-if="panel.children.length > 0">
      <div class="panel-container" :class="{ 'vertical': panel.direction === 'vertical', 'horizontal': panel.direction === 'horizontal' }">
        <div v-for="(child, index) in panel.children" 
          :key="child.id"
          class="panel-wrapper"
          :style="getPanelStyle(index)"
        >
          <terminal-panel 
            :panel="child"
            :theme="theme"
            @split-vertical="childId => $emit('split-vertical', childId, splitConfig)"
            @split-horizontal="childId => $emit('split-horizontal', childId, splitConfig)"
            @close-panel="childId => $emit('close-panel', childId)"
            @focus-terminal="terminalId => $emit('focus-terminal', terminalId)"
          />
          <div 
            v-if="index < panel.children.length - 1"
            :class="['panel-resizer', panel.direction]"
            @mousedown="startResize($event, index)"
          ></div>
        </div>
      </div>
    </template>
    
    <!-- 否则渲染终端标签页 -->
    <template v-else>
      <div class="terminal-content" :class="{ 'active-panel': isPanelActive }"
      @click="handlePanelClick">
        <!-- 终端标签栏 -->
        <div class="terminal-tabs">
          <div class="tabs-container">
            <div class="tabs-with-new-button">
              <el-tabs 
                v-model="activeTerminalId" 
                type="card" 
                closable 
                @tab-remove="closeTerminal"
                @tab-click="switchTerminal"
                v-if="panel.terminals.length > 0"
              >
                <el-tab-pane
                  v-for="term in panel.terminals"
                  :key="term.id"
                  :label="term.title"
                  :name="term.id"
                  :closable="panel.terminals.length > 1"
                >
                </el-tab-pane>
              </el-tabs>
              
              <!-- 新建终端按钮和下拉菜单 -->
              <el-dropdown trigger="click" @command="handleNewTerminal" class="new-terminal-dropdown">
                <div class="new-terminal-button">
                  <img :src="addTerminalIcon" class="icon-img" />
                </div>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item command="direct">快速连接</el-dropdown-item>
                    <el-dropdown-item command="select-ip">选择服务器</el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
            </div>

            <!-- 终端操作按钮 -->
            <div class="operation-buttons">
              <el-tooltip content="垂直分屏" placement="bottom" :show-after="200">
                <div class="operation-icon" 
                   @click="handleSplitVertical" 
                   :class="{ disabled: !currentTerminal }">
                  <img :src="splitVerticalIcon" class="icon-img" />
                </div>
              </el-tooltip>
              <el-tooltip content="水平分屏" placement="bottom" :show-after="200">
                <div class="operation-icon" 
                   @click="handleSplitHorizontal" 
                   :class="{ disabled: !currentTerminal }">
                  <img :src="splitHorizontalIcon" class="icon-img" />
                </div>
              </el-tooltip>
              <el-tooltip content="重新连接" placement="bottom" :show-after="200">
                <el-icon class="operation-icon" @click="reconnect" :class="{ disabled: !currentTerminal }">
                  <img :src="refresh" class="icon-img" />
                </el-icon>
              </el-tooltip>
            </div>
          </div>
        </div>

            <!-- 终端显示区域 -->
        <div class="terminals-container">
          <div 
            v-for="term in panel.terminals" 
            :key="term.id"
            :class="['terminal-item', {'terminal-hide': term.id !== activeTerminalId}]"
          >
            <h-terminal
              :ref="el => terminalRefs[term.id] = el"
              :ip="term.ip"
              :role="term.role"
              :theme="theme"
              :terminal-instance-id="term.id"
              @status-change="status => handleStatusChange(term.id, status)"
              @focus="handleTerminalFocus(term.id)"
            />
          </div>
        </div>
      </div>

      <!-- IP选择对话框 -->
      <ip-selection-dialog
        v-model="ipSelectionVisible"
        @select="handleIpSelect"
      />
    </template>
  </div>
</template>

<script setup>
import { computed, ref, inject, nextTick, watch, onMounted } from 'vue'
import { Refresh } from '@element-plus/icons-vue'
import { ElMessageBox } from 'element-plus'
import HTerminal from './h-terminal.vue'
import IpSelectionDialog from './ip-selection-dialog.vue'
import addTerminalIcon from '@/assets/icons/svg/add-terminal.svg'
import splitVerticalIcon from '@/assets/icons/svg/split-vertical.svg'
import splitHorizontalIcon from '@/assets/icons/svg/split-horizontal.svg'
import refresh from '@/assets/icons/svg/refresh.svg'

const props = defineProps({
  panel: {
    type: Object,
    required: true
  },
  theme: {
    type: Object,
    default: () => ({
      background: '#1e1e1e',
      foreground: '#ffffff',
      cursor: '#ffffff'
    })
  }
})

const emit = defineEmits([
  'split-vertical',
  'split-horizontal',
  'close-panel',
  'focus-terminal'
])

// 注入全局活跃终端ID
const globalActiveTerminalId = inject('activeTerminalId', ref(null))

// 通过注入获取创建终端的方法
const createTerminal = inject('createTerminal')

// 终端引用
const terminalRefs = ref({})

// 当前面板是否被激活
const isPanelActive = ref(false)

// IP选择对话框相关
const ipSelectionVisible = ref(false)

// 使用计算属性来处理活动终端ID
const activeTerminalId = computed({
  get: () => props.panel.activeTerminalId,
  set: (value) => {
    props.panel.activeTerminalId = value
    // 当活动终端ID改变时，设置面板为活跃状态
    if (value) {
      isPanelActive.value = true
      emit('focus-terminal', value)
    }
  }
})

// 当前活动终端
const currentTerminal = computed(() => {
  return props.panel.terminals.find(t => t.id === activeTerminalId.value)
})

// 分屏配置
const splitConfig = computed(() => {
  if (!currentTerminal.value) return {}
  return {
    ip: currentTerminal.value.ip,
    role: currentTerminal.value.role
  }
})

// 添加新的响应式变量
const panelSizes = ref([])
const isResizing = ref(false)
let currentResizer = -1
let startPosition = 0
let startSizes = []

// 初始化面板大小
function initPanelSizes() {
  if (props.panel.children.length > 0) {
    // 平均分配大小
    const size = 100 / props.panel.children.length
    panelSizes.value = props.panel.children.map(() => size)
  }
}

// 获取面板样式
function getPanelStyle(index) {
  if (!panelSizes.value[index]) return {}
  
  return {
    [props.panel.direction === 'vertical' ? 'width' : 'height']: `${panelSizes.value[index]}%`
  }
}

// 开始调整大小
function startResize(event, index) {
  event.preventDefault()
  isResizing.value = true
  currentResizer = index
  startPosition = props.panel.direction === 'vertical' ? event.clientX : event.clientY
  startSizes = [...panelSizes.value]
  
  // 添加事件监听
  document.addEventListener('mousemove', handleResize)
  document.addEventListener('mouseup', stopResize)
  
  // 添加调整时的类
  document.body.style.cursor = props.panel.direction === 'vertical' ? 'col-resize' : 'row-resize'
  document.body.style.userSelect = 'none'
}

// 处理调整大小
function handleResize(event) {
  if (!isResizing.value) return
  
  const currentPosition = props.panel.direction === 'vertical' ? event.clientX : event.clientY
  const difference = currentPosition - startPosition
  
  // 计算容器总大小
  const container = event.target.closest('.panel-container')
  const containerSize = props.panel.direction === 'vertical' ? container.offsetWidth : container.offsetHeight
  
  // 计算百分比变化
  const percentageDiff = (difference / containerSize) * 100
  
  // 更新相邻面板的大小
  const newSizes = [...startSizes]
  newSizes[currentResizer] = startSizes[currentResizer] + percentageDiff
  newSizes[currentResizer + 1] = startSizes[currentResizer + 1] - percentageDiff
  
  // 确保面板大小在合理范围内
  if (newSizes[currentResizer] >= 20 && newSizes[currentResizer + 1] >= 20) {
    panelSizes.value = newSizes
  }
  
  // 调整所有终端大小
  nextTick(() => {
    Object.values(terminalRefs.value).forEach(terminal => {
      if (terminal?.fit) {
        terminal.fit()
      }
    })
  })
}

// 停止调整大小
function stopResize() {
  isResizing.value = false
  document.removeEventListener('mousemove', handleResize)
  document.removeEventListener('mouseup', stopResize)
  document.body.style.cursor = ''
  document.body.style.userSelect = ''
}

// 监听子面板变化
watch(() => props.panel.children.length, () => {
  initPanelSizes()
}, { immediate: true })

// 处理终端获取焦点事件
function handleTerminalFocus(terminalId) {
  // 设置当前面板为活跃状态
  isPanelActive.value = true
  // 通知父组件，以便可以将其他面板设置为非活跃
  emit('focus-terminal', terminalId)
}

// 处理面板点击事件，激活该面板
function handlePanelClick() {
  if (activeTerminalId.value) {
    isPanelActive.value = true
    emit('focus-terminal', activeTerminalId.value)
  }
}

// 处理新建终端的下拉菜单选项
function handleNewTerminal(command) {
  if (command === 'direct') {
    addTerminal()
  } else if (command === 'select-ip') {
    // 从父组件注入的配置
    const terminalConfig = inject('terminalConfig', {})
    // 这里需要先让用户选择IP，然后再创建终端
    // 你需要实现一个方法来显示IP选择对话框
    showIpSelectionDialog(terminalConfig)
  }
}

// 显示IP选择对话框
function showIpSelectionDialog(config) {
  ipSelectionVisible.value = true
}

// 处理IP选择
function handleIpSelect(config) {
  const newTerminal = createTerminal(config, props.panel.id)
  if (newTerminal) {
    focusNewTerminal(newTerminal.id)
  }
}

// 添加新终端
function addTerminal() {
  // 从父组件注入的配置
  const terminalConfig = inject('terminalConfig', {})
  const newTerminal = createTerminal(terminalConfig, props.panel.id)

  if (newTerminal) {
    focusNewTerminal(newTerminal.id)
  }
}

// 聚焦新终端
function focusNewTerminal(terminalId) {
  // 设置当前面板为活跃状态
  isPanelActive.value = true
  
  // 等待DOM更新后设置焦点
  nextTick(() => {
    const terminal = terminalRefs.value[terminalId]
    if (terminal) {
      // h-terminal组件会在自己的onMounted中处理初始化
      // 这里只需要稍等一下然后设置焦点
      setTimeout(() => {
        terminal.fit()
        const term = terminal.getTerminal()
        if (term) {
          term.focus()
        }
      }, 100)
    }
  })
}

// 关闭终端
function closeTerminal(targetId) {
  // 如果关闭的是当前终端，先切换到其他终端
  if (activeTerminalId.value === targetId) {
    const remainingTerminals = props.panel.terminals.filter(t => t.id !== targetId)
    if (remainingTerminals.length > 0) {
      const lastTerminal = remainingTerminals[remainingTerminals.length - 1]
      activeTerminalId.value = lastTerminal.id
    }
  }

  // 等待视图更新后再关闭终端
  nextTick(() => {
    const terminal = terminalRefs.value[targetId]
    if (terminal) {
      try {
        // 先关闭WebSocket连接
        terminal.reconnect()
        // 从数组和引用中移除
        props.panel.terminals = props.panel.terminals.filter(t => t.id !== targetId)
        delete terminalRefs.value[targetId]
        
        // 如果还有其他终端，确保当前活动终端获得焦点
        if (props.panel.terminals.length > 0 && activeTerminalId.value) {
          const currentTerminal = terminalRefs.value[activeTerminalId.value]
          if (currentTerminal) {
            nextTick(() => {
              currentTerminal.fit()
              const term = currentTerminal.getTerminal()
              if (term) {
                term.focus()
              }
            })
          }
        } else {
          // 如果没有终端了，设置面板为非活跃状态
          isPanelActive.value = false
          
          // 如果不是根面板，则通知父组件关闭此面板
          if (props.panel.id !== 'root-panel') {
            emit('close-panel', props.panel.id)
          } else {
            // 如果是根面板，则可以考虑自动创建一个新终端
            addTerminal()
          }
        }
      } catch (e) {
        console.error('关闭终端时出错:', e)
      }
    }
  })
}

// 切换终端
function switchTerminal(tab) {
  activeTerminalId.value = tab.props.name
  isPanelActive.value = true
  emit('focus-terminal', tab.props.name)
  
  nextTick(() => {
    const terminal = terminalRefs.value[tab.props.name]
    if (terminal) {
      terminal.fit?.()
      const term = terminal.getTerminal?.()
      if (term) {
        term.focus()
      }
    }
  })
}

// 处理终端状态变化
function handleStatusChange(id, status) {
  const terminal = props.panel.terminals.find(t => t.id === id)
  if (terminal) {
    terminal.status = status
  }
}

// 重新连接当前终端
function reconnect() {
  if (currentTerminal.value) {
    const terminal = terminalRefs.value[currentTerminal.value.id]
    if (terminal) {
      terminal.reconnect()
      terminal.fit() // 重连后调整大小
    }
  }
}

// 垂直分屏
function handleSplitVertical() {
  if (!currentTerminal.value) return
  emit('split-vertical', props.panel.id, splitConfig.value)
}

// 水平分屏
function handleSplitHorizontal() {
  if (!currentTerminal.value) return
  emit('split-horizontal', props.panel.id, splitConfig.value)
}

// 监听主题变化
watch(() => props.theme, (newTheme) => {
  // 更新所有终端的主题
  Object.values(terminalRefs.value).forEach(terminal => {
    if (terminal?.setTheme) {
      terminal.setTheme(newTheme)
    }
  })
}, { deep: true })

// 监听终端列表变化
watch(() => props.panel.terminals, (newTerminals) => {
  // 如果没有终端但有活动终端ID，清空活动终端ID
  if (newTerminals.length === 0 && activeTerminalId.value) {
    activeTerminalId.value = null
    isPanelActive.value = false
  }
  // 如果有终端但没有活动终端ID，设置第一个终端为活动终端
  else if (newTerminals.length > 0 && !activeTerminalId.value) {
    activeTerminalId.value = newTerminals[0].id
    isPanelActive.value = true
  }
}, { deep: true })

// 在挂载时，初始化终端
onMounted(() => {
  // 如果有终端，则设置面板为活跃状态
  if (props.panel.terminals.length > 0 && props.panel.activeTerminalId) {
    isPanelActive.value = true
  }
  
  // 不在这里初始化终端，让h-terminal组件自己处理初始化
  // 这样可以避免重复初始化导致的连接问题
  
  // 只需要在适当的时候设置焦点和主题
  props.panel.terminals.forEach(term => {
    nextTick(() => {
      const terminal = terminalRefs.value[term.id]
      if (terminal && term.id === activeTerminalId.value) {
        // 应用主题
        terminal.setTheme(props.theme)
        // 稍等一下再设置焦点，确保终端已经初始化完成
        setTimeout(() => {
          const xtermInst = terminal.getTerminal()
          if (xtermInst) {
            xtermInst.focus()
            isPanelActive.value = true
          }
        }, 100)
      }
    })
  })
})

// 监听其他面板获得焦点事件，将自己设置为非活跃
const unsetActivePanel = inject('unsetActivePanel', null)

// 监听activeTerminalId变化
watch(() => props.panel.activeTerminalId, (newTerminalId) => {
  if (newTerminalId) {
    isPanelActive.value = true
    emit('focus-terminal', newTerminalId)
  }
})

// 在父组件中监听全局activeTerminalId变化
watch(() => globalActiveTerminalId.value, (newTerminalId) => {
  if (newTerminalId) {
    // 如果当前面板包含新的活跃终端，则标记为活跃
    if (props.panel.terminals.some(t => t.id === newTerminalId)) {
      isPanelActive.value = true
    } else {
      // 否则标记为非活跃
      isPanelActive.value = false
    }
  }
})
</script>

<style scoped lang="scss">
.terminal-panel {
  display: flex;
  flex-direction: column;
  flex: 1;
  height: 100%;
  overflow: hidden;
  position: relative;

  &.has-children {
    flex: 1;
    display: flex;
    flex-direction: column;
    
    .panel-container {
      flex: 1;
      display: flex;
      overflow: hidden;
      position: relative;
      
      &.vertical {
        flex-direction: row;

        .panel-wrapper {
          height: 100%;
          position: relative;
          
          &:not(:last-child) {
            border-right: 1px solid #2e2e2e;
          }
        }
      }
      
      &.horizontal {
        flex-direction: column;

        .panel-wrapper {
          width: 100%;
          position: relative;
          
          &:not(:last-child) {
            border-bottom: 1px solid #2e2e2e;
          }
        }
      }
    }
  }

  .terminal-content {
    display: flex;
    flex-direction: column;
    flex: 1;
    overflow: hidden;
    position: relative;
    border: 1px solid transparent;
    transition: all 0.2s ease;
    
          // 当面板中有活动终端时，不再给整个面板添加边框
      &.active-panel {
        box-shadow: v-bind('`0 0 3px ${theme.foreground}1a inset`');
        .terminals-container {
          border: v-bind('`1px solid ${theme.foreground}33`');
          border-top-width: 1px;
        }
        :deep(.el-tabs__item) {
          &.is-active {
            border: v-bind('`1px solid ${theme.foreground}33`') !important;
            border-bottom: none !important;
            // margin-bottom: 5px;
            
            // 遮挡terminals-container的上边线
            &::after {
              content: '';
              position: absolute;
              bottom: 0;
              left: 0;
              right: 0;
              height: 1px;
              background-color: v-bind('theme.background');
            }
          }
        }
    }

    .terminal-tabs {
      background: v-bind('`${theme.background === "#ffffff" ? "#f0f0f0" : theme.background === "#1e1e1e" ? "#252526" : theme.background}`');
      position: relative;

      .tabs-container {
        display: flex;
        align-items: center;
        justify-content: space-between;
        // height: 38px; /* 稍微减小高度使整体更协调 */
        padding: 0 8px;

        .tabs-with-new-button {
          flex: 1;
          display: flex;
          align-items: center;
          margin-right: 16px;

          .new-terminal-dropdown {
            margin-left: 4px;
            
            .new-terminal-button {
              cursor: pointer;
              padding: 4px;
              border-radius: 3px;
              display: flex;
              align-items: center;
              justify-content: center;
              width: 24px;
              height: 24px;
              transition: all 0.2s;

              &:hover {
                background: v-bind('`${theme.foreground}0a`');
              }

              .icon-img {
                width: 16px;
                height: 16px;
                filter: v-bind('`${theme.background.toLowerCase().startsWith("#f") ? "brightness(0)" : "invert(1) brightness(0.8)"}`');
                opacity: v-bind('`${theme.background.toLowerCase().startsWith("#f") ? "0.8" : "0.85"}`');
                transition: all 0.2s;
              }

              &:hover .icon-img {
                filter: v-bind('`${theme.background.toLowerCase().startsWith("#f") ? "brightness(0)" : "invert(1)"}`');
                opacity: 1;
              }
            }
          }
        }

        :deep(.el-tabs) {
          .el-tabs__nav-wrap {
            &::after {
              display: none;
            }
          }

          // .el-tabs__nav {
          //   border: none;
          // }

            .el-tabs__item {
              position: relative;
              border: none;
              background: transparent;
              // margin-right: 4px;
              padding: 0 18px;
              line-height: 34px;
              color: v-bind('`${theme.foreground}99`');
              transition: all 0.2s;
              border-radius: 3px 3px 0 0;

              &.is-active {
                color: v-bind('theme.foreground');
                background: v-bind('`${theme.foreground}0d`'); // 降低到约5%的不透明度
                font-weight: 500;
              }

              &:not(.is-active) {
                .is-icon-close {
                  width: 14px;
                  visibility: hidden;
                  display: inline-block;
                }

                &:hover .is-icon-close {
                  visibility: visible;
                }
              }

              &:not(.is-active):hover {
                color: v-bind('theme.foreground');
                background: v-bind('`${theme.foreground}08`'); // 降低到约3%的不透明度
              }
          }
        }
      }

      .operation-buttons {
        display: flex;
        gap: 12px;
        align-items: center;
        padding-left: 12px;
        position: relative;
        
        &::before {
          content: '';
          position: absolute;
          left: 0;
          top: 25%;
          bottom: 25%;
          width: 1px;
          background: v-bind('`${theme.foreground}0a`');
        }

        .operation-icon {
          cursor: pointer;
          color: v-bind('`${theme.foreground}99`');
          transition: all 0.2s;
          padding: 4px;
          border-radius: 3px;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 24px;
          height: 24px;

          &:hover:not(.disabled) {
            color: v-bind('theme.foreground');
            background: v-bind('`${theme.foreground}0a`');
          }

          &.disabled {
            cursor: not-allowed;
            opacity: 0.5;
          }

          .icon-img {
            width: 16px;
            height: 16px;
            filter: v-bind('`${theme.background.toLowerCase().startsWith("#f") ? "brightness(0)" : "invert(1) brightness(0.8)"}`');
            opacity: v-bind('`${theme.background.toLowerCase().startsWith("#f") ? "0.8" : "0.85"}`');
            transition: all 0.2s;
          }

          &:hover:not(.disabled) .icon-img {
            filter: v-bind('`${theme.background.toLowerCase().startsWith("#f") ? "brightness(0)" : "invert(1)"}`');
            opacity: 1;
          }

          &.disabled .icon-img {
            opacity: 0.3;
          }
        }
      }
    }

    .terminals-container {
      flex: 1;
      display: flex;
      overflow: hidden;
      border-top: 1px solid v-bind('`${theme.foreground}0a`');
      border: 1px solid transparent;
      border-top-width: 0;
      background: v-bind('theme.background');
      position: relative;

      .terminal-item {
        flex: 1;
        overflow: hidden;
        position: relative;
        opacity: 1;
        transition: opacity 0.2s ease-in-out;
        height: 100%;
        width: 100%;

        &.terminal-hide {
          display: none;
        }
      }
    }
  }

  .panel-resizer {
    position: absolute;
    z-index: 100;
    background-color: transparent;
    
    &.vertical {
      cursor: col-resize;
      width: 3px;
      top: 0;
      bottom: 0;
      right: -1px;
      
      &:hover, &:active {
        background-color: v-bind('`${theme.foreground}4d`');
      }
    }
    
    &.horizontal {
      cursor: row-resize;
      height: 3px;
      left: 0;
      right: 0;
      bottom: -1px;
      
      &:hover, &:active {
        background-color: v-bind('`${theme.foreground}4d`');
      }
    }
  }

  .panel-wrapper {
    display: flex;
    position: relative;
    transition: width 0.1s ease, height 0.1s ease;
  }
}
</style> 