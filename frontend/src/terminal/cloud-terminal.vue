<template>
  <div class="cloud-terminal">
    <!-- 左侧工具栏 -->
    <div class="terminal-toolbar" :class="{ 'toolbar-collapsed': isToolbarCollapsed }">
      <div class="toolbar-header">
        <el-tooltip content="收起/展开侧栏" placement="right" :show-after="200">
          <el-icon class="toolbar-icon" @click="toggleToolbar">
            <ArrowLeft v-if="!isToolbarCollapsed"/>
            <ArrowRight v-else/>
          </el-icon>
        </el-tooltip>
      </div>
      <!-- 收起时的图标菜单 -->
      <div class="toolbar-icons" v-if="isToolbarCollapsed">
        <el-tooltip content="历史记录" placement="right" :show-after="200">
          <el-icon class="toolbar-icon" @click="handleIconClick('history')">
            <Timer />
          </el-icon>
        </el-tooltip>
        <el-tooltip content="收藏列表" placement="right" :show-after="200">
          <el-icon class="toolbar-icon" @click="handleIconClick('favorite')">
            <Star />
          </el-icon>
        </el-tooltip>
        <el-tooltip content="文件管理器" placement="right" :show-after="200">
          <el-icon class="toolbar-icon" @click="handleIconClick('filemanager')">
            <Folder />
          </el-icon>
        </el-tooltip>
        <el-tooltip content="主题设置" placement="right" :show-after="200">
          <el-icon class="toolbar-icon" @click="handleIconClick('theme')">
            <Brush />
          </el-icon>
        </el-tooltip>
      </div>
      <!-- 展开时的内容 -->
      <div class="toolbar-content" v-show="!isToolbarCollapsed">
        <!-- 历史记录 -->
        <div v-show="activeTab === 'history'" class="content-section">
          <div class="section-title">历史记录</div>
          <div class="history-list">
            <div v-for="(item, index) in historyList" :key="index" class="history-item" @click="loadHistory(item)">
              <span>{{ item.title || `${item.role}@${item.ip}` }}</span>
              <span class="history-time">{{ item.create_time }}</span>
            </div>
            <div v-if="hasMore" class="load-more" @click="loadMoreHistory">
              <el-button text>加载更多</el-button>
            </div>
          </div>
        </div>

        <!-- 收藏列表 -->
        <div v-show="activeTab === 'favorite'" class="content-section">
          <div class="section-title">收藏列表</div>
          <div class="favorite-list">
            <div v-for="(item, index) in favoriteList" :key="index" class="favorite-item" @click="loadFavorite(item)">
              <span>{{ item.title }}</span>
              <el-button text type="danger" @click.stop="removeFavorite(index)">
                <el-icon><Delete /></el-icon>
              </el-button>
            </div>
          </div>
        </div>

        <!-- 文件管理器 -->
        <div v-show="activeTab === 'filemanager'" class="content-section">
          <div class="section-title">文件管理器</div>
          <file-manager ref="fileManagerRef" :terminals="allTerminals" :theme="currentTheme" />
        </div>

        <!-- 主题设置 -->
        <div v-show="activeTab === 'theme'" class="content-section">
          <div class="section-title">主题设置</div>
          <div class="theme-list">
            <div v-for="theme in terminalThemes" 
                 :key="theme.id" 
                 class="theme-item" 
                 :class="{ active: currentThemeId === theme.id }"
                 @click="selectTheme(theme)">
              <div class="theme-preview" :style="{ background: theme.background }">
                <div class="theme-text" :style="{ color: theme.foreground }">abc</div>
              </div>
              <div class="theme-info">
                <span class="theme-name">{{ theme.name }}</span>
                <span class="theme-desc">{{ theme.description }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 终端主区域容器 -->
    <div class="terminal-container">
      <!-- 终端区域 -->
      <div class="terminal-main">
        <div class="terminal-content">
          <!-- 终端分屏容器 -->
          <terminal-panel
            :panel="rootPanel"
            :theme="currentTheme"
            @split-vertical="handleSplitVertical"
            @split-horizontal="handleSplitHorizontal"
            @close-panel="handleClosePanel"
            @focus-terminal="handleFocusTerminal"
          />

          <!-- 底部工具栏 -->
          <div class="terminal-toolbar-bottom" :style="{ background: currentTheme.background }">
            <div class="toolbar-button" @click="showCommandDialog">
              <el-icon><Monitor /></el-icon>
              <span class="button-text">多窗口命令</span>
              <el-icon class="arrow-icon" :class="{ 'is-expanded': !isCommandDialogVisible }">
                <ArrowDown />
              </el-icon>
            </div>
          </div>
        </div>

        <!-- 底部命令输入区域 -->
        <div class="command-drawer" :class="{ 'drawer-visible': isCommandDialogVisible }">
          <div class="drawer-header">
            <div class="drawer-toolbar">
              <div class="toolbar-left">
                <el-button type="primary" text @click="openScriptLibrary">
                  <el-icon><Document /></el-icon>
                  脚本库
                </el-button>
                <el-button type="primary" text @click="clearCommand">
                  <el-icon><Delete /></el-icon>
                  清空
                </el-button>
                <span class="send-to-label">发送给：</span>
                <el-select v-model="commandForm.sendType" class="send-to-select">
                  <el-option label="当前会话" value="current" />
                  <el-option :label="`所有会话 (${connectedTerminalsCount})`" value="all" />
                  <!-- <el-option label="选择会话" value="selected" /> -->
                </el-select>
              </div>
              <div class="toolbar-right">
              </div>
            </div>
              <el-tooltip content="收起" placement="left" :show-after="200">
                <el-icon class="collapse-icon" :class="{ 'is-expanded': isCommandDialogVisible }" @click="isCommandDialogVisible = false">
                  <ArrowDown />
                </el-icon>
              </el-tooltip>
          </div>
          <div class="drawer-content">
            <div class="command-input-container">
              <el-input
                v-model="commandForm.command"
                type="textarea"
                :rows="8"
                placeholder="请输入要执行的命令，Enter 换行，Ctrl + Enter 执行命令"
                @keydown.enter="handleCommandEnter"
                resize="none"
              />
            </div>
            <!-- 选择终端对话框 -->
            <el-dialog
              v-model="isSelectTerminalDialogVisible"
              title="选择执行会话"
              width="500px"
              append-to-body
            >
              <el-checkbox-group v-model="commandForm.selectedTerminals">
                <div class="terminal-select-list">
                  <el-checkbox 
                    v-for="terminal in allTerminals" 
                    :key="terminal.id" 
                    :label="terminal.id"
                  >
                    {{ terminal.title }}
                  </el-checkbox>
                </div>
              </el-checkbox-group>
              <template #footer>
                <div class="dialog-footer">
                  <el-button @click="isSelectTerminalDialogVisible = false">取消</el-button>
                  <el-button type="primary" @click="confirmSelectedTerminals">确定</el-button>
                </div>
              </template>
            </el-dialog>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, nextTick, onMounted, provide, defineProps } from 'vue'
import { ElMessage } from 'element-plus'
import { SplitHorizontal, SplitVertical } from '@/components/icons'
import HTerminal from './h-terminal.vue'
import TerminalPanel from './terminal-panel.vue'
import { Timer, Star, Brush, Fold, Expand, Delete, Monitor, Close, Document, ArrowDown, Folder } from '@element-plus/icons-vue'
import FileManager from './file-manager.vue'
import { queryInstanceReplayList } from '@/api/workflow/manage'
import { terminalThemes, getThemeById } from './terminal-themes'
import { terminalManager } from './terminal-manager'

const props = defineProps({
  terminalConfig: {
    type: Object,
    default: () => ({
      ip: '127.0.0.1',
      role: 'baseuser'
    })
  }
})

const fileManagerRef = ref()
const isToolbarCollapsed = ref(true)
const historyList = ref([])
const favoriteList = ref([])
const activeTab = ref('history')
const currentThemeId = ref(localStorage.getItem('terminal-theme-id') || 'solarized-light')
const currentPage = ref(1)
const pageSize = ref(10)
const hasMore = ref(true)
const currentIp = ref('')

// 命令弹窗相关
const isCommandDialogVisible = ref(false)
const isSelectTerminalDialogVisible = ref(false)
const commandForm = ref({
  command: '',
  sendType: 'current',
  selectedTerminals: []
})

// 获取所有终端列表
const allTerminals = computed(() => {
  const terminals = []
  function collectTerminals(panel) {
    if (panel.terminals && panel.terminals.length > 0) {
      terminals.push(...panel.terminals)
    }
    if (panel.children && panel.children.length > 0) {
      panel.children.forEach(child => collectTerminals(child))
    }
  }
  collectTerminals(rootPanel.value)
  return terminals
})

// 获取所有会话数量
const connectedTerminalsCount = computed(() => {
  return allTerminals.value.length
})

// 全局终端计数器
let terminalCounter = 0

// 主题设置
const currentTheme = computed(() => getThemeById(currentThemeId.value))

// 面板数据结构
const rootPanel = ref({
  id: 'root-panel',
  direction: null, // null, 'horizontal', 'vertical'
  children: [], // 子面板
  terminals: [], // 终端列表
  activeTerminalId: null, // 当前活动终端ID
})

// 记录当前活跃的终端ID
const activeTerminalId = ref(null)

// 提供给子组件的方法和状态
provide('createTerminal', createTerminal)
provide('activeTerminalId', activeTerminalId)
provide('terminalConfig', props.terminalConfig)

// 切换工具栏
function toggleToolbar() {
  isToolbarCollapsed.value = !isToolbarCollapsed.value
}

// 图标点击处理
function handleIconClick(tab) {
  activeTab.value = tab
  isToolbarCollapsed.value = false
  
  // 如果是文件管理器，自动执行打开操作
  if (tab === 'filemanager') {
    nextTick(() => {
      fileManagerRef.value.openFileManager()
    })
  }
}

// 创建新终端
function createTerminal(config = {}, panelId = 'root-panel') {
  const id = `terminal-${++terminalCounter}`
  // 确保配置有效，使用传入的配置或默认配置
  const finalConfig = {
    ip: (config && config.ip) || props.terminalConfig.ip,
    role: (config && config.role) || props.terminalConfig.role
  }
  const newTerminal = {
    id,
    ip: finalConfig.ip,
    role: finalConfig.role,
    title: `${finalConfig.role}@${finalConfig.ip}`,
    status: 0
  }
  
  // 找到对应的面板并添加终端
  const panel = findPanel(rootPanel.value, panelId)
  if (panel) {
    panel.terminals.push(newTerminal)
    panel.activeTerminalId = id

    // 刷新历史记录列表
    loadHistoryList(config.ip, true)
    
    return newTerminal
  }
  
  return null
}

// 查找面板
function findPanel(panel, panelId) {
  if (panel.id === panelId) {
    return panel
  }
  
  if (panel.children && panel.children.length > 0) {
    for (const child of panel.children) {
      const found = findPanel(child, panelId)
      if (found) {
        return found
        }
    }
    }
  
  return null
}

// 查找包含指定终端的面板
function findPanelByTerminalId(root, terminalId) {
  // 检查当前面板是否包含该终端
  if (root.terminals && root.terminals.some(t => t.id === terminalId)) {
    return root
  }
  
  // 递归检查子面板
  if (root.children && root.children.length > 0) {
    for (const child of root.children) {
      const found = findPanelByTerminalId(child, terminalId)
      if (found) {
        return found
      }
    }
  }
  
  return null
}

// 垂直分屏处理
function handleSplitVertical(panelId, config) {
  const panel = findPanel(rootPanel.value, panelId)
  if (!panel) return
  
  // 如果面板已经有子面板，不能再分屏
  if (panel.children.length > 0) return

  // 检查是否达到最大分屏数量限制(4个)
  const currentPanelCount = countPanels(rootPanel.value)
  if (currentPanelCount >= 4) {
    ElMessage.warning('最多只能创建4个分屏')
    return
  }
  
  // 保存原始终端
  const originalTerminals = [...panel.terminals]
  const activeTerminalId = panel.activeTerminalId
  
  // 创建左右两个子面板
  panel.direction = 'vertical'
  panel.children = [
    {
      id: `${panelId}-left`,
      direction: null,
      children: [],
      terminals: originalTerminals,
      activeTerminalId: activeTerminalId
    },
    {
      id: `${panelId}-right`,
      direction: null,
      children: [],
      terminals: [],
      activeTerminalId: null
    }
  ]
  
  // 清空当前面板的终端
  panel.terminals = []
  panel.activeTerminalId = null
  
  // 在右侧面板创建新终端
  if (config) {
    // 使用setTimeout确保DOM已更新
    setTimeout(() => {
      createTerminal(config, `${panelId}-right`)
    }, 0)
  }
}

// 水平分屏处理
function handleSplitHorizontal(panelId, config) {
  const panel = findPanel(rootPanel.value, panelId)
  if (!panel) return
  
  // 如果面板已经有子面板，不能再分屏
  if (panel.children.length > 0) return

  // 检查是否达到最大分屏数量限制(4个)
  const currentPanelCount = countPanels(rootPanel.value)
  if (currentPanelCount >= 4) {
    ElMessage.warning('最多只能创建4个分屏')
    return
  }
  
  // 保存原始终端
  const originalTerminals = [...panel.terminals]
  const activeTerminalId = panel.activeTerminalId
  
  // 创建上下两个子面板
  panel.direction = 'horizontal'
  panel.children = [
    {
      id: `${panelId}-top`,
      direction: null,
      children: [],
      terminals: originalTerminals,
      activeTerminalId: activeTerminalId
    },
    {
      id: `${panelId}-bottom`,
      direction: null,
      children: [],
      terminals: [],
      activeTerminalId: null
    }
  ]
  
  // 清空当前面板的终端
  panel.terminals = []
  panel.activeTerminalId = null
  
  // 在底部面板创建新终端
  if (config) {
    // 使用setTimeout确保DOM已更新
    setTimeout(() => {
      createTerminal(config, `${panelId}-bottom`)
    }, 0)
  }
}

// 关闭面板处理
function handleClosePanel(panelId) {
  const parentPanel = findParentPanel(rootPanel.value, panelId)
  if (!parentPanel) return
  
  // 找到兄弟面板
  const siblingPanel = parentPanel.children.find(c => c.id !== panelId)
  const closingPanel = parentPanel.children.find(c => c.id === panelId)
  
  if (!siblingPanel || !closingPanel) {
    // 如果没有找到兄弟面板或要关闭的面板，则可能是直接子面板，直接移除
    parentPanel.children = parentPanel.children.filter(c => c.id !== panelId)
    
    // 如果是根面板且没有子面板了，可以考虑创建一个新终端
    if (parentPanel.id === 'root-panel' && parentPanel.children.length === 0) {
      nextTick(() => {
        createTerminal()
      })
    }
    return
  }
  
  // 将要关闭的面板的终端转移到父面板
  if (siblingPanel) {
    // 转移终端
    if (closingPanel.terminals.length > 0) {
      siblingPanel.terminals = [...siblingPanel.terminals, ...closingPanel.terminals]
      if (!siblingPanel.activeTerminalId && closingPanel.activeTerminalId) {
        siblingPanel.activeTerminalId = closingPanel.activeTerminalId
      }
    }
    
    // 如果兄弟面板有子面板，则保持其结构
    if (siblingPanel.children.length > 0) {
      parentPanel.direction = siblingPanel.direction
      parentPanel.children = siblingPanel.children
    } else {
      // 否则将兄弟面板的终端提升到父面板
      parentPanel.direction = null
      parentPanel.children = []
      parentPanel.terminals = siblingPanel.terminals
      parentPanel.activeTerminalId = siblingPanel.activeTerminalId
    }
  }
}

// 计算当前分屏数量
function countPanels(panel) {
  // 如果没有子面板，说明这是一个终端面板，计数为1
  if (!panel.children || panel.children.length === 0) {
    return 1
  }
  
  // 如果有子面板，只计算子面板的数量
  let count = 0
  panel.children.forEach(child => {
    count += countPanels(child)
  })
  return count
}

// 查找父面板
function findParentPanel(root, childId) {
  if (!root.children || root.children.length === 0) {
    return null
  }
  
  for (const child of root.children) {
    if (child.id === childId) {
      return root
    }
    
    const parent = findParentPanel(child, childId)
    if (parent) {
      return parent
    }
  }
  
  return null
}

// 处理终端聚焦
function handleFocusTerminal(terminalId) {
  // 保存当前聚焦的终端ID，以便在窗口调整等操作后恢复焦点
  activeTerminalId.value = terminalId
  
  // 递归设置所有面板为非活跃状态
  function deactivateAllPanels(panel) {
    if (panel.terminals.find(t => t.id === terminalId)) {
      // 找到包含当前终端的面板，不做任何操作，因为面板已经在子组件中被设置为活跃
    } else {
      // 确保此面板没有被标记为活跃
      panel.isActive = false
    }
    
    // 递归处理子面板
    if (panel.children && panel.children.length > 0) {
      panel.children.forEach(deactivateAllPanels)
    }
  }
  
  deactivateAllPanels(rootPanel.value)
}

// 加载历史记录
async function loadHistoryList(ip, isRefresh = false) {
  if (isRefresh) {
    currentPage.value = 1
    hasMore.value = true
  }
  
  try {
    const res = await queryInstanceReplayList({
      ip: ip,
      page: currentPage.value,
      page_size: pageSize.value
    })
    
    if (isRefresh) {
      historyList.value = res.data.list || []
    } else {
      historyList.value = [...historyList.value, ...(res.data.list || [])]
    }
    
    // 检查是否还有更多数据
    hasMore.value = res.data.total > currentPage.value * pageSize.value
    
    // 更新当前IP
    currentIp.value = ip
  } catch (error) {
    console.error('加载历史记录失败:', error)
  }
}

// 加载更多历史记录
async function loadMoreHistory() {
  if (!hasMore.value) return
  currentPage.value++
  await loadHistoryList(currentIp.value)
}

// 加载历史记录
function loadHistory(item) {
  createTerminal({
    ip: item.ip,
    role: item.role
  })
}

// 加载收藏
function loadFavorite(item) {
  // 在根面板创建新终端
  createTerminal({
    ip: item.ip,
    role: item.role
  })
}

// 移除收藏
function removeFavorite(index) {
  favoriteList.value.splice(index, 1)
}

// 选择主题
function selectTheme(theme) {
  currentThemeId.value = theme.id
  // 保存主题到 localStorage
  localStorage.setItem('terminal-theme-id', theme.id)
}

// 初始化，创建第一个终端
onMounted(() => {
  // 不自动创建初始终端，改为等待外部调用addTerminal
})

// 切换命令弹窗显示状态
function showCommandDialog() {
  isCommandDialogVisible.value = !isCommandDialogVisible.value
  if (isCommandDialogVisible.value) {
    // 只在打开时重置表单
    commandForm.value = {
      command: '',
      sendType: 'current',
      selectedTerminals: []
    }
  }
}

// 打开脚本库
function openScriptLibrary() {
  // TODO: 实现脚本库功能
  ElMessage.info('脚本库功能开发中')
}

// 清空命令
function clearCommand() {
  commandForm.value.command = ''
}

// 确认选择的终端
function confirmSelectedTerminals() {
  isSelectTerminalDialogVisible.value = false
  // 保持选中的终端不变，关闭对话框即可
}

// 处理命令回车事件
function handleCommandEnter(e) {
  if (e.ctrlKey || e.metaKey) {
    sendCommand()
  }
}

// 发送命令到终端
function sendCommand() {
  if (!commandForm.value.command.trim()) {
    ElMessage.warning('请输入要执行的命令')
    return
  }

  const command = commandForm.value.command.trim() + '\n'
  const targetTerminals = []

  // 根据发送类型确定目标终端
  switch (commandForm.value.sendType) {
    case 'current':
      // 获取当前活动终端
      function findActiveTerminal(panel) {
        if (panel.terminals && panel.terminals.length > 0 && panel.activeTerminalId) {
          const activeTerminal = panel.terminals.find(t => t.id === panel.activeTerminalId)
          if (activeTerminal) {
            targetTerminals.push(activeTerminal)
            return true
          }
        }
        if (panel.children && panel.children.length > 0) {
          for (const child of panel.children) {
            if (findActiveTerminal(child)) {
              return true
            }
          }
        }
        return false
      }
      findActiveTerminal(rootPanel.value)
      break

    case 'all':
      // 直接使用所有终端
      targetTerminals.push(...allTerminals.value)
      break

    case 'selected':
      // 打开选择终端对话框
      if (commandForm.value.selectedTerminals.length === 0) {
        isSelectTerminalDialogVisible.value = true
        return
      }
      // 使用选中的终端
      targetTerminals.push(...allTerminals.value.filter(t => 
        commandForm.value.selectedTerminals.includes(t.id)
      ))
      break
  }

  // 发送命令到每个目标终端
  let sentCount = 0
  targetTerminals.forEach(terminal => {
    try {
      const data = { type: 2, msg: command }
      terminalManager.sendData(terminal.id, data)
      sentCount++
    } catch (error) {
      console.error('发送命令失败:', error)
    }
  })

  if (sentCount > 0) {
    ElMessage.success(`命令已发送到 ${sentCount} 个终端`)
  } else {
    ElMessage.warning('没有找到可用的终端')
  }

  // 如果不是选择终端模式，发送后清空命令
  if (commandForm.value.sendType !== 'selected') {
    commandForm.value.command = ''
  }
}

// 查找终端引用
function findTerminalRef(terminalId) {
  let foundRef = null
  function searchInPanel(panel) {
    console.log('在面板中搜索终端:', panel.id, terminalId)
    if (panel.terminals && panel.terminals.length > 0) {
      const terminal = panel.terminals.find(t => t.id === terminalId)
      if (terminal) {
        console.log('找到匹配的终端:', terminal.id)
        // 从 h-terminal 组件中获取终端实例
        const terminalEl = document.querySelector(`[data-terminal-id="${terminalId}"]`)
        console.log('找到终端元素:', terminalEl)
        if (terminalEl) {
          // 获取 Vue 组件实例
          let instance = null
          for (let key in terminalEl) {
            if (key.startsWith('__vueParentComponent') || key.startsWith('__vue')) {
              const comp = terminalEl[key]
              if (comp?.ctx?.getTerminal) {
                instance = comp.ctx
                break
              }
            }
          }
          console.log('找到终端实例:', instance)
          foundRef = instance
        }
      }
    }
    if (!foundRef && panel.children && panel.children.length > 0) {
      panel.children.forEach(child => searchInPanel(child))
    }
  }
  searchInPanel(rootPanel.value)
  console.log('最终找到的终端引用:', foundRef)
  return foundRef
}

// 清理所有终端实例
function cleanupTerminals() {
  function destroyAllTerminals(panel) {
    if (panel.terminals && panel.terminals.length > 0) {
      panel.terminals.forEach(terminal => {
        terminalManager.destroyTerminal(terminal.id)
      })
    }
    if (panel.children && panel.children.length > 0) {
      panel.children.forEach(child => destroyAllTerminals(child))
    }
  }
  
  // 递归销毁所有终端
  destroyAllTerminals(rootPanel.value)
  
  // 重置面板结构
  rootPanel.value = {
    id: 'root-panel',
    direction: null,
    children: [],
    terminals: [],
    activeTerminalId: null
  }
  
  // 重置计数器
  terminalCounter = 0
}

// 暴露方法给父组件
defineExpose({
  addTerminal: (config) => createTerminal(config),
  cleanup: cleanupTerminals
})
</script>

<style scoped lang="scss">
.cloud-terminal {
  display: flex;
  width: 100%;
  height: 100%;
  background: v-bind('currentTheme.background');
  color: v-bind('currentTheme.foreground');

  // 定义自定义边框颜色变量
  --border-primary: v-bind('`${currentTheme.foreground}0a`');
  --border-secondary: v-bind('`${currentTheme.foreground}08`');
  --border-subtle: v-bind('`${currentTheme.foreground}05`');

  .terminal-toolbar {
    width: v-bind('`${activeTab === "filemanager" ? "420px" : "240px"}`');  // 调整为更合适的宽度
    background: v-bind('`${currentTheme.background === "#ffffff" ? "#f5f5f5" : currentTheme.background === "#1e1e1e" ? "#252526" : currentTheme.background}`');
    transition: all 0.3s ease;
    display: flex;
    flex-direction: column;
    position: relative;
    border-right: 1px solid var(--border-primary);
    
    &.toolbar-collapsed {
      width: 44px;

      .toolbar-header .toolbar-icon,
      .toolbar-icons .toolbar-icon {
        font-size: 22px;
      }

      .toolbar-icons {
        padding: 16px 0;  // 增加垂直间距
        gap: 20px;       // 增加图标间距
      }
    }

    .toolbar-header {
      // height: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-bottom: 1px solid var(--border-secondary);
      padding: 8px 0;

      .toolbar-icon {
        font-size: 22px;
        cursor: pointer;
        color: v-bind('`${currentTheme.foreground}99`');
        transition: all 0.3s ease;

        &:hover {
          color: v-bind('currentTheme.foreground');
          background: v-bind('`${currentTheme.foreground}0a`');
          border-radius: 4px;
        }
      }
    }

    .toolbar-icons {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 12px 0;  // 减小内边距
      gap: 16px;  // 减小间距

      .toolbar-icon {
        font-size: 16px;
        cursor: pointer;
        color: v-bind('`${currentTheme.foreground}99`');
        transition: all 0.3s ease;
        border-radius: 4px;

        &:hover {
          color: v-bind('currentTheme.foreground');
          background: v-bind('`${currentTheme.foreground}0a`');
        }
      }
    }

    .toolbar-content {
      height: calc(100% - 40px);
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      padding: 12px;

      .content-section {
        .section-title {
          font-size: 14px;
          font-weight: 500;
          color: v-bind('currentTheme.foreground');
          margin-bottom: 12px;
          padding-bottom: 8px;
          border-bottom: 1px solid v-bind('`${currentTheme.foreground}14`');
        }
      }
    }

    .theme-toggle {
      margin-top: auto;
      padding: 12px;  // 减小内边距
      border-top: 1px solid var(--border-secondary);

      .el-button {
        height: 36px;  // 减小按钮高度
        width: 100%;
        justify-content: flex-start;
        padding: 0 10px;
        border-radius: 4px;
        background: rgba(255, 255, 255, 0.05);
        transition: all 0.3s ease;

        &:hover {
          background: rgba(255, 255, 255, 0.08);
        }

        .el-icon {
          font-size: 14px;  // 减小图标大小
        }

        span {
          margin-left: 8px;
          font-size: 13px;  // 减小字体大小
        }
      }
    }

    .history-list,
    .favorite-list {
      .history-item,
      .favorite-item {
        padding: 8px 10px;  // 减小内边距
        margin-bottom: 8px;  // 减小间距
        background: v-bind('`${currentTheme.foreground}0a`');
        border-radius: 4px;
        cursor: pointer;
        display: flex;
        justify-content: space-between;
        align-items: center;
        transition: all 0.3s ease;

        &:hover {
          background: v-bind('`${currentTheme.foreground}0f`');
        }

        &:last-child {
          margin-bottom: 0;
        }

        span {
          font-size: 12px;  // 减小字体大小
          color: v-bind('currentTheme.foreground');
          
          &.history-time {
            font-size: 11px;  // 减小字体大小
            color: v-bind('`${currentTheme.foreground}99`');
            margin-left: 6px;
          }
        }

        .el-button {
          padding: 3px;
          border-radius: 3px;

          &:hover {
            background: v-bind('`${currentTheme.foreground}0a`');
          }

          .el-icon {
            font-size: 12px;  // 减小图标大小
          }
        }
      }
    }

    .load-more {
      text-align: center;
      padding: 8px 0;
      
      .el-button {
        color: v-bind('`${currentTheme.foreground}99`');
        font-size: 12px;
        
        &:hover {
          color: v-bind('currentTheme.foreground');
        }
      }
    }
  }

      .terminal-container {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      position: relative;

      .terminal-main {
        flex: 1;
        display: flex;
        flex-direction: column;
        min-height: 0; // 确保flex子元素可以正确缩小
        overflow: hidden;
        position: relative;
        isolation: isolate; // 创建新的层叠上下文
      }

      .terminal-content {
        flex: 1;
        display: flex;
        flex-direction: column;
        min-height: 0;
        overflow: hidden;
      }

      .terminal-toolbar-bottom {
          .toolbar-button {
            height: 30px;
            width: 140px;
            display: flex;
            align-items: center;
            gap: 6px;
            cursor: pointer;
            border-radius: 4px;
            padding: 0 10px;
            color: v-bind('`${currentTheme.foreground}99`');
            transition: all 0.2s ease;
            font-size: 13px;
            background: v-bind('`${currentTheme.foreground}08`');

            .el-icon {
              font-size: 14px;

              &.arrow-icon {
                font-size: 12px;
                transition: transform 0.3s ease;
                margin-left: 2px;
                
                &.is-expanded {
                  transform: rotate(180deg);
                }
              }
            }

            &:hover {
              background: v-bind('`${currentTheme.foreground}14`');
              color: v-bind('currentTheme.foreground');
              transform: translateY(-1px);
            }

            &:active {
              transform: translateY(0);
            }
          }
      }
    }

    .command-drawer {
      height: 0;
      min-height: 0;
      overflow: hidden;
      background: v-bind('currentTheme.background');
      border-top: 1px solid v-bind('`${currentTheme.foreground}0a`');
      transition: height 0.3s ease;
      display: flex;
      flex-direction: column;
      box-shadow: 0 -2px 8px v-bind('`${currentTheme.foreground}0a`');

      &.drawer-visible {
        height: 200px;
        min-height: 200px;
      }

    .drawer-header {
      padding: 8px 12px;
      border-bottom: 1px solid v-bind('`${currentTheme.foreground}0a`');
      display: flex;
      justify-content: space-between;
      align-items: center;
      height: 40px;
      min-height: 40px;
      backdrop-filter: blur(8px);
      background: v-bind('`${currentTheme.background}cc`');

      .drawer-toolbar {
        flex: 1;
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-right: 12px;

        .toolbar-left {
          display: flex;
          gap: 8px;
          align-items: center;

          .el-button {
            display: flex;
            align-items: center;
            gap: 4px;
            color: v-bind('currentTheme.foreground');
            height: 28px;
            border-radius: 4px;
            transition: all 0.2s ease;
            
            .el-icon {
              font-size: 14px;
            }

            &:hover {
              background: v-bind('`${currentTheme.foreground}14`');
              transform: translateY(-1px);
            }

            &:active {
              transform: translateY(0);
            }
          }

          .send-to-label {
            margin-left: 18px;
            color: v-bind('`${currentTheme.foreground}cc`');
          }

          .send-to-select {
            width: 85px;
            :deep(.el-select__wrapper) {
              background: none;
              box-shadow: none !important;
              padding: 0;
              margin: 0;

              .el-select__inner {
                height: 24px;
                color: v-bind('currentTheme.foreground');
                font-size: 12px;
                padding: 0 12px 0 0;
              }

              .el-select__suffix {
                right: 0;
              }
            }

            :deep(.el-select-dropdown.el-popper) {
              border: none;
              padding: 0;
              margin-top: 4px;
              background: none;
              box-shadow: none;

              .el-select-dropdown__wrap {
                margin: 0;
                padding: 0;

                .el-select-dropdown__list {
                  padding: 0;
                  margin: 0;
                }
              }

              .el-popper__arrow {
                display: none;
              }
            }
          }
        }

        .toolbar-right {
          display: flex;
          align-items: center;
          gap: 6px;
          // background: v-bind('`${currentTheme.foreground}08`');
          padding: 2px 8px;
          border-radius: 4px;
          height: 28px;
        }
      }

      .collapse-icon {
        cursor: pointer;
        font-size: 16px;
        color: v-bind('`${currentTheme.foreground}99`');
        transition: all 0.3s ease;
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 4px;
        transform: rotate(180deg);

        &.is-expanded {
          transform: rotate(0deg);
        }

        &:hover {
          color: v-bind('currentTheme.foreground');
          background: v-bind('`${currentTheme.foreground}14`');
        }
      }
    }

    .drawer-content {
      flex: 1;
      padding: 12px;
      overflow: hidden;
      position: relative;

      &::before {
        content: '';
        position: absolute;
        top: 0;
        left: 12px;
        right: 12px;
        height: 1px;
        background: linear-gradient(
          90deg,
          v-bind('`${currentTheme.foreground}00`') 0%,
          v-bind('`${currentTheme.foreground}14`') 50%,
          v-bind('`${currentTheme.foreground}00`') 100%
        );
      }

      .command-input-container {
        height: 100%;
        position: relative;
        overflow: hidden;

        :deep(.el-textarea) {
          height: 100%;

          .el-textarea__inner {
            height: 100%;
            background: v-bind('`${currentTheme.foreground}05`');
            border: none;
            border-radius: 4px;
            color: v-bind('currentTheme.foreground');
            font-size: 13px;
            line-height: 1.6;
            padding: 8px 12px;
            resize: none;
            transition: background 0.2s ease;

            &:focus {
              background: v-bind('`${currentTheme.foreground}08`');
            }

            &::placeholder {
              color: v-bind('`${currentTheme.foreground}66`');
              font-style: italic;
            }
          }
        }
      }
    }
  }

  // 终端选择对话框样式
  :deep(.el-dialog) {
    background: v-bind('currentTheme.background');
    border: 1px solid v-bind('`${currentTheme.foreground}1a`');

    .el-dialog__header {
      border-bottom: 1px solid v-bind('`${currentTheme.foreground}0a`');
      margin: 0;
      padding: 16px;

      .el-dialog__title {
        color: v-bind('currentTheme.foreground');
      }
    }

    .el-dialog__body {
      padding: 16px;
      color: v-bind('currentTheme.foreground');

      .terminal-select-list {
        display: flex;
        flex-direction: column;
        gap: 12px;

        .el-checkbox {
          margin-right: 0;
          color: v-bind('currentTheme.foreground');
        }
      }
    }

    .el-dialog__footer {
      border-top: 1px solid v-bind('`${currentTheme.foreground}0a`');
      padding: 16px;
    }
  }
}

:deep(.el-tabs__header) {
  margin-bottom: 0;
  border-bottom: none;
}

:deep(.el-tabs--card > .el-tabs__header) {
  border-bottom: none;
}

:deep(.el-tabs__item) {
  color: v-bind('`${currentTheme.foreground}99`') !important;
  
  &.is-active {
    color: v-bind('currentTheme.foreground') !important;
  }

  &:hover:not(.is-active) {
    color: v-bind('currentTheme.foreground') !important;
  }
}

:deep(.el-button) {
  color: v-bind('currentTheme.foreground');
  
  &:hover {
    color: v-bind('currentTheme.foreground');
    opacity: 0.8;
  }
}

.theme-list {
  .theme-item {
    padding: 8px;
    margin-bottom: 8px;
    background: v-bind('`${currentTheme.foreground}0a`');
    border-radius: 4px;
    cursor: pointer;
    display: flex;
    gap: 8px;
    transition: all 0.3s ease;

    &:hover {
      background: v-bind('`${currentTheme.foreground}0f`');
    }

    &.active {
      background: v-bind('`${currentTheme.foreground}14`');
      border: 1px solid v-bind('`${currentTheme.foreground}33`');
    }

    .theme-preview {
      width: 40px;
      height: 40px;
      border-radius: 3px;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 1px solid v-bind('`${currentTheme.foreground}1a`');

      .theme-text {
        font-family: monospace;
        font-size: 12px;
      }
    }

    .theme-info {
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: center;

      .theme-name {
        font-size: 13px;
        color: v-bind('currentTheme.foreground');
        margin-bottom: 2px;
      }

      .theme-desc {
        font-size: 11px;
        color: v-bind('`${currentTheme.foreground}99`');
      }
    }
  }
}
</style> 