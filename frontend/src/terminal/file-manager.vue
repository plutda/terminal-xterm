<template>
  <div class="filemanager-list">
    <!-- IP选择器 -->
    <div class="ip-selector">
      <el-select v-model="selectedFileManagerIp" placeholder="选择服务器" class="ip-select">
        <el-option
          v-for="terminal in terminals"
          :key="terminal.id"
          :label="`${terminal.role}@${terminal.ip}`"
          :value="terminal.ip"
        />
      </el-select>
      <el-button type="primary" @click="openFileManager" :disabled="!selectedFileManagerIp">
        打开
      </el-button>
    </div>
    
    <!-- 文件列表 -->
    <div class="file-list" v-loading="loading">
      <div v-if="fileList.length > 0" class="file-list-header">
        <el-breadcrumb separator="/">
          <el-breadcrumb-item v-for="(path, index) in currentPath.split('/').filter(Boolean)" 
            :key="index" 
            @click="navigateTo(index)">
            /&nbsp;{{ path }}
          </el-breadcrumb-item>
        </el-breadcrumb>
        <div class="file-operations">
          <el-upload
            :http-request="customUpload"
            :show-file-list="false"
            :multiple="false"
          >
            <el-button type="primary" :loading="uploadLoading">上传文件</el-button>
          </el-upload>
        </div>
      </div>
      <el-table v-if="fileList.length > 0" :data="fileList" style="width: 100%" show-overflow-tooltip>
        <el-table-column prop="name" label="文件名" min-width="150" show-overflow-tooltip>
          <template #default="{ row }">
            <el-icon><Folder v-if="row.type === 'directory'" /><Document v-else /></el-icon>
            <span class="file-name" @click="handleFileClick(row)">{{ row.name }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="mode" label="权限" width="100" show-overflow-tooltip>
          <template #default="{ row }">
            <span class="file-mode">{{ row.mode }}</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="80" align="center">
          <template #default="{ row }">
            <el-button 
              v-if="row.type !== 'directory'" 
              type="primary" 
              link 
              @click="downloadFile(row)"
              :loading="downloadLoadingMap[`${currentPath}/${row.name}`]"
            >
              下载
            </el-button>
          </template>
        </el-table-column>
        <el-table-column prop="size" label="大小" width="60" align="right" />
        <el-table-column prop="mtime" label="修改时间" width="180" show-overflow-tooltip />
      </el-table>
    </div>
  </div>
</template>

<script setup>
import { ref, defineProps, defineEmits, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { getSftpList, sftpUpload, sftpDownload } from '@/api/workflow/manage'
import { Document, Folder } from '@element-plus/icons-vue'

const props = defineProps({
  terminals: {
    type: Array,
    required: true
  },
  theme: {
    type: Object,
    required: true
  }
})

const selectedFileManagerIp = ref('')
const fileList = ref([])
const currentPath = ref('/')
const loading = ref(false)
const uploadLoading = ref(false)
const downloadLoadingMap = ref({})

// 监听terminals变化，自动选择第一个终端
watch(() => props.terminals, (newTerminals) => {
  if (newTerminals && newTerminals.length > 0 && !selectedFileManagerIp.value) {
    selectedFileManagerIp.value = newTerminals[0].ip
  }
}, { immediate: true })

// 获取当前IP对应的用户
function getCurrentUserForIp(ip) {
  const terminal = props.terminals.find(t => t.ip === ip)
  return terminal ? terminal.role : 'baseuser'
}

// 获取文件列表
async function fetchFileList(path = '/tmp') {
  loading.value = true
  try {
    const res = await getSftpList({
      ip: selectedFileManagerIp.value,
      dir: path,
      sys_user: getCurrentUserForIp(selectedFileManagerIp.value)
    })
    fileList.value = res.data.item.map(file => ({
      name: file.name,
      type: file.is_dir ? 'directory' : 'file',
      size: file.size,
      mtime: file.mod_time,
      mode: file.mode
    }))
    currentPath.value = path
  } catch (error) {
    console.error('获取文件列表失败:', error)
    ElMessage.error('获取文件列表失败')
  } finally {
    loading.value = false
  }
}

// 打开文件管理器
async function openFileManager() {
  if (!selectedFileManagerIp.value) return
  await fetchFileList('/tmp')
}

// 暴露方法给父组件
defineExpose({
  openFileManager
})

// 处理文件点击
async function handleFileClick(file) {
  if (file.type === 'directory') {
    const newPath = currentPath.value === '/' 
      ? `/${file.name}` 
      : `${currentPath.value}/${file.name}`
    await fetchFileList(newPath)
  }
}

// 导航到指定路径
async function navigateTo(index) {
  const pathParts = currentPath.value.split('/').filter(Boolean)
  const newPath = '/' + pathParts.slice(0, index + 1).join('/')
  await fetchFileList(newPath)
}

// 下载文件
async function downloadFile(file) {
  const filePath = `${currentPath.value}/${file.name}`
  downloadLoadingMap.value[filePath] = true
  try {
    const res = await sftpDownload({
      ip: selectedFileManagerIp.value,
      path: filePath,
      sys_user: getCurrentUserForIp(selectedFileManagerIp.value)
    })
    
    // 创建下载链接
    const blob = new Blob([res.data])
    const downloadUrl = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = downloadUrl
    link.download = file.name
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(downloadUrl)
    
    ElMessage.success('文件下载成功')
  } catch (error) {
    console.error('文件下载失败:', error)
    ElMessage.error('文件下载失败')
  } finally {
    downloadLoadingMap.value[filePath] = false
  }
}

// 自定义上传方法
async function customUpload(options) {
  const { file } = options
  const formData = new FormData()
  formData.append('file', file)
  
  uploadLoading.value = true
  try {
    await sftpUpload(
      {
        ip: selectedFileManagerIp.value,
        sys_user: getCurrentUserForIp(selectedFileManagerIp.value),
        dir: currentPath.value
      },
      formData
    )
    
    ElMessage.success('文件上传成功')
    await fetchFileList(currentPath.value)
  } catch (error) {
    console.error('文件上传失败:', error)
    ElMessage.error(error.message || '文件上传失败')
  } finally {
    uploadLoading.value = false
  }
}
</script>

<style scoped lang="scss">
.filemanager-list {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;

  .ip-selector {
    padding: 12px;
    display: flex;
    gap: 8px;
    border-bottom: 1px solid v-bind('`${theme.foreground}0a`');
    background: v-bind('`${theme.foreground}03`');

    .ip-select {
      flex: 1;
      
      :deep(.el-select__wrapper) {
        background: v-bind('`${theme.background}`');
        box-shadow: none !important;
        border: none;
        padding: 0 12px;
        height: 32px;
        border-radius: 6px;
        transition: all 0.2s ease;
        
        .el-select__inner {
          height: 30px;
          font-size: 13px;
          color: v-bind('theme.foreground');
          font-weight: 500;

          &::placeholder {
            color: v-bind('`${theme.foreground}66`');
            font-weight: normal;
          }
        }
        
        &:hover {
          background: v-bind('`${theme.foreground}08`');
        }
        
        &.is-focus {
          background: v-bind('`${theme.foreground}0a`');
        }
      }

      :deep(.el-select-dropdown) {
        background: v-bind('theme.background');
        border: 1px solid v-bind('`${theme.foreground}14`');
        box-shadow: 0 4px 12px v-bind('`${theme.foreground}14`');
        border-radius: 6px;
        padding: 4px;

        .el-scrollbar__view {
          padding: 4px;
        }

        .el-select-dropdown__item {
          height: 32px;
          line-height: 32px;
          padding: 0 12px;
          border-radius: 4px;
          color: v-bind('`${theme.foreground}cc`');
          font-size: 13px;
          
          &:hover {
            background: v-bind('`${theme.foreground}08`');
          }
          
          &.selected {
            background: v-bind('`${theme.foreground}14`');
            color: v-bind('theme.foreground');
            font-weight: 500;
          }
        }

        .el-popper__arrow {
          display: none;
        }
      }
    }

    .el-button {
      padding: 0 12px;
      height: 32px;
      border: 1px solid v-bind('`${theme.foreground}14`');
      background: v-bind('theme.background');
      font-size: 13px;
      
      &:hover {
        background: v-bind('`${theme.foreground}0a`');
        border-color: v-bind('`${theme.foreground}33`');
      }
      
      &:active {
        background: v-bind('`${theme.foreground}14`');
      }
      
      &[disabled] {
        background: v-bind('`${theme.foreground}05`');
        border-color: v-bind('`${theme.foreground}0a`');
        opacity: 0.7;
      }
    }
  }

  .file-list {
    flex: 1;
    overflow: auto;
    padding: 12px;
    min-height: 200px;

    // 自定义loading样式
    :deep(.el-loading-mask) {
      background-color: v-bind('`${theme.background}cc`');
      backdrop-filter: blur(2px);
      
      .el-loading-spinner {
        .circular {
          .path {
            stroke: v-bind('theme.foreground');
          }
        }
        .el-loading-text {
          color: v-bind('theme.foreground');
        }
      }
    }

    .file-list-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
      padding: 8px;
      background: v-bind('`${theme.foreground}03`');
      border-radius: 3px;

      .el-breadcrumb {
        :deep(.el-breadcrumb__item) {
          .el-breadcrumb__inner {
            color: v-bind('`${theme.foreground}99`');
            cursor: pointer;
            transition: all 0.2s ease;
            padding: 4px 8px;
            border-radius: 4px;

            &:hover {
              color: v-bind('theme.foreground');
              background: v-bind('`${theme.foreground}0a`');
            }
          }

          &:last-child {
            .el-breadcrumb__inner {
              color: v-bind('theme.foreground');
              background: v-bind('`${theme.foreground}0a`');
              font-weight: 500;
            }
          }
        }
      }

      .file-operations {
        :deep(.el-upload) {
          .el-button {
            border: 1px solid v-bind('`${theme.foreground}14`');
            background: v-bind('theme.background');
            
            &:hover {
              background: v-bind('`${theme.foreground}0a`');
              border-color: v-bind('`${theme.foreground}33`');
            }
            
            &:active {
              background: v-bind('`${theme.foreground}14`');
            }
          }
        }
      }
    }

    :deep(.el-table) {
      background: transparent;
      font-size: 13px;
      tr {
        background-color: unset;
      }
      
      .el-table__header {
        background: v-bind('`${theme.foreground}03`');
        
        th.el-table__cell {
          background: transparent;
          border-bottom: 1px solid v-bind('`${theme.foreground}0a`');
          color: v-bind('`${theme.foreground}cc`');
          font-weight: normal;
          padding: 6px 0;
          font-size: 12px;
          
          &.is-leaf {
            border-bottom: 1px solid v-bind('`${theme.foreground}0a`');
          }
        }
      }

      .el-table__row {
        background: transparent;
        transition: all 0.2s ease;
        height: 36px;
        
        &:hover {
          background: v-bind('`${theme.foreground}05`');
          
          .file-name {
            color: v-bind('theme.foreground');
          }
        }

        td.el-table__cell {
          transition: all 0.2s ease;
        }
      }

      .el-table__cell {
        background: transparent;
        border-bottom: 1px solid v-bind('`${theme.foreground}05`');
        color: v-bind('`${theme.foreground}cc`');
        padding: 0;
        height: 36px;
        
        .cell {
          display: flex;
          align-items: center;
          padding: 0 8px;
        }

        .el-icon {
          font-size: 16px;
          color: v-bind('`${theme.foreground}99`');
        }
      }

      .file-name {
        margin-left: 6px;
        cursor: pointer;
        color: v-bind('`${theme.foreground}cc`');
        transition: all 0.2s ease;
        font-size: 13px;
        
        &:hover {
          color: v-bind('theme.foreground');
        }
      }

      .file-mode {
        font-family: monospace;
        font-size: 12px;
        padding: 2px 4px;
        border-radius: 2px;
        background: v-bind('`${theme.foreground}05`');
        color: v-bind('`${theme.foreground}cc`');
        letter-spacing: 0.5px;
      }
      
      .el-button {
        padding: 4px 8px;
        height: 24px;
        font-size: 12px;
        
        &:hover {
          background: v-bind('`${theme.foreground}0a`');
        }
      }
    }
  }
}
</style>
