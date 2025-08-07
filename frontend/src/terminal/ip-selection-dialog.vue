<template>
  <el-drawer
    v-model="dialogVisible"
    title="选择服务器"
    size="50%"
    :show-close="true"
    :close-on-click-modal="false"
    :close-on-press-escape="false"
    @close="handleClose"
    append-to-body
  >
    <el-form
      :model="searchModel"
      ref="modelRef"
      class="search-form"
    >
      <el-row :gutter="8">
        <el-col :span="21">
          <el-row :gutter="8">
            <el-col :span="8">
              <el-form-item label="IP" prop="ips">
                <el-input
                  v-model="searchModel.ips"
                  clearable
                  placeholder="ip"
                />
              </el-form-item>
            </el-col>
            <el-col :span="7">
              <el-form-item label="标签" prop="tag">
                <el-select
                  v-model="searchModel.tag"
                  placeholder="标签"
                  clearable
                  filterable
                >
                  <el-option
                    v-for="k in tagOptions"
                    :key="k"
                    :value="k"
                    :label="k"
                  />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="7">
              <el-form-item label="产品" prop="product">
                <el-select
                  v-model="searchModel.product"
                  placeholder="产品"
                  clearable
                >
                  <el-option
                    v-for="k in productOptions"
                    :key="k"
                    :label="k"
                    :value="k"
                  />
                </el-select>
              </el-form-item>
            </el-col>
          </el-row>
        </el-col>
        <el-col :span="3">
          <div class="search-buttons">
            <el-button
              type="default"
              :icon="Refresh"
              @click="handleReset"
            />
            <el-button
              type="primary"
              :icon="Search"
              @click="search"
            />
          </div>
        </el-col>
      </el-row>
    </el-form>

    <el-table
      v-loading="loading"
      :data="tableData"
      style="width: 100%"
      height="450px"
    >
      <el-table-column
        fixed="left"
        label="IP"
        prop="ip"
        min-width="120"
      />
      <el-table-column
        label="agent状态"
        prop="job_agent_online"
        min-width="100"
      >
        <template #default="{ row }">
          <el-tag
            :type="row.job_agent_online ? 'success' : 'info'"
            effect="light"
          >
            {{ row.job_agent_online ? '在线' : '下线' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column
        label="环境"
        prop="env_name"
        min-width="100"
      />
      <el-table-column
        label="产品"
        prop="product"
        min-width="100"
      />
      <el-table-column
        label="标签"
        prop="tags"
        min-width="150"
      >
        <template #default="{ row }">
          {{ row.tags && row.tags.join(',') }}
        </template>
      </el-table-column>
      <el-table-column
        fixed="right"
        label="操作"
        width="120"
      >
        <template #default="{ row }">
          <el-popover
            v-model:visible="row.showUserSelect"
            :width="200"
            trigger="click"
            placement="left"
            popper-class="user-select-popover"
          >
            <template #reference>
              <el-button
                type="primary"
                link
                class="connect-button"
              >
                <el-icon class="connect-icon"><Connection /></el-icon>
                连接
              </el-button>
            </template>
            <div class="user-select-content">
              <div class="title">
                <el-icon><User /></el-icon>
                <span>选择登录用户</span>
              </div>
              <div v-loading="row.loading" class="user-list">
                <el-radio-group v-model="row.selectedUser" class="radio-group">
                  <el-radio
                    v-for="user in row.userList"
                    :key="user.username"
                    :label="user.username"
                    :disabled="!user.can_click"
                    class="user-radio"
                  >
                    <div class="user-radio-content">
                      <el-icon :class="{ 'is-active': row.selectedUser === user.username }">
                        <component :is="user.can_click ? 'UserFilled' : 'CircleCloseFilled'" />
                      </el-icon>
                      <span>{{ user.username }}</span>
                    </div>
                  </el-radio>
                </el-radio-group>
              </div>
              <div class="footer">
                <el-button
                  type="primary"
                  size="small"
                  :disabled="!row.selectedUser"
                  @click="handleUserConfirm(row)"
                >
                  <el-icon><Connection /></el-icon>
                  <span>连接</span>
                </el-button>
              </div>
            </div>
          </el-popover>
        </template>
      </el-table-column>
    </el-table>

    <el-pagination
      v-model:current-page="currentPage"
      v-model:page-size="pageSize"
      :total="total"
      :page-sizes="[10, 20, 50, 100]"
      layout="total, sizes, prev, pager, next"
      @size-change="handleSizeChange"
      @current-change="handleCurrentChange"
    />

  </el-drawer>
</template>

<script setup>
import { ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { Connection, User, UserFilled, CircleCloseFilled, Search, Refresh } from '@element-plus/icons-vue'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue', 'select'])

const loading = ref(false)
const tableData = ref([])
const currentPage = ref(1)
const pageSize = ref(10)
const total = ref(0)
const modelRef = ref(null)

const searchModel = ref({
  ips: '',
  product: '',
  env: '',
  tag: ''
})

const envOptions = ref([])
const productOptions = ref([])
const tagOptions = ref([])

const dialogVisible = ref(false)

// 监听modelValue变化
watch(() => props.modelValue, (val) => {
  dialogVisible.value = val
})

// 监听dialogVisible变化
watch(() => dialogVisible.value, (val) => {
  emit('update:modelValue', val)
  if (val) {
    // 打开对话框时初始化数据
    init()
  }
})

// 监听每行的 showUserSelect 变化
watch(() => tableData.value, (rows) => {
  if (!rows) return
  rows.forEach(row => {
    watch(() => row.showUserSelect, (val) => {
      if (val && !row.userList.length) {
        loadUserList(row)
      }
    })
  })
}, { deep: true })

const init = () => {
  // 模拟数据
  envOptions.value = ['dev', 'test', 'prod']
  productOptions.value = ['product1', 'product2']
  tagOptions.value = ['tag1', 'tag2']
  fetchData()
}

const fetchData = () => {
  loading.value = true
  // 模拟数据
  setTimeout(() => {
    tableData.value = processTableData([
      {
        ip: '192.168.1.1',
        job_agent_online: true,
        env_name: 'dev',
        product: 'product1',
        tags: ['tag1', 'tag2']
      }
    ])
    total.value = 1
    loading.value = false
  }, 500)
}

const handleReset = () => {
  modelRef.value?.resetFields()
}

const search = () => {
  currentPage.value = 1
  fetchData()
}

const handleSizeChange = (val) => {
  pageSize.value = val
  fetchData()
}

const handleCurrentChange = (val) => {
  currentPage.value = val
  fetchData()
}

// 加载用户列表
const loadUserList = async (row) => {
  row.loading = true
  try {
    // 模拟数据
    await new Promise(resolve => setTimeout(resolve, 500))
    row.userList = [
      { username: 'root', can_click: true },
      { username: 'admin', can_click: true },
      { username: 'guest', can_click: false }
    ]
  } catch (error) {
    console.error('加载用户列表失败:', error)
    ElMessage.error('加载用户列表失败')
  } finally {
    row.loading = false
  }
}

// 处理用户确认
const handleUserConfirm = (row) => {
  if (!row.selectedUser) return
  
  const config = {
    ip: row.ip,
    role: row.selectedUser
  }
  emit('select', config)
  row.showUserSelect = false
  dialogVisible.value = false
}

// 处理表格数据转换
const processTableData = (data) => {
  if (!Array.isArray(data)) return []
  
  return data.map(item => ({
    ...item,
    showUserSelect: false,
    selectedUser: '',
    userList: [],
    loading: false
  }))
}

const handleClose = () => {
  searchModel.value = {
    ips: '',
    product: '',
    env: '',
    tag: ''
  }
  currentPage.value = 1
  pageSize.value = 10
}
</script>

<style scoped lang="scss">
.search-form {
  margin: 0 0 24px;
  padding: 24px;
  background: var(--el-fill-color-blank);
  border-radius: 8px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.05);
}

.search-buttons {
  display: flex;
  flex-direction: row-reverse;
  margin-right: 10px;
  gap: 10px;
}

.connect-button {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  transition: all 0.3s ease;

  .connect-icon {
    font-size: 14px;
  }

  &:hover {
    background: var(--el-color-primary-light-9);
    border-radius: 4px;
  }
}

:deep(.user-select-popover) {
  padding: 0;
  
  .user-select-content {
    .title {
      padding: 12px 16px;
      font-size: 14px;
      font-weight: 500;
      color: var(--el-text-color-primary);
      border-bottom: 1px solid var(--el-border-color-lighter);
      display: flex;
      align-items: center;
      gap: 8px;

      .el-icon {
        font-size: 16px;
        color: var(--el-color-primary);
      }
    }

    .user-list {
      padding: 16px;
      min-height: 120px;

      .radio-group {
        display: flex;
        flex-direction: column;
        gap: 12px;

        .user-radio {
          margin-right: 0;
          padding: 8px 12px;
          border-radius: 4px;
          transition: all 0.3s ease;
          
          &:not(.is-disabled):hover {
            background-color: var(--el-fill-color-light);
          }
          
          &.is-disabled {
            opacity: 0.5;
            cursor: not-allowed;
          }

          .user-radio-content {
            display: flex;
            align-items: center;
            gap: 8px;

            .el-icon {
              font-size: 16px;
              color: var(--el-text-color-secondary);
              transition: all 0.3s ease;

              &.is-active {
                color: var(--el-color-primary);
              }
            }
          }

          :deep(.el-radio__input) {
            display: none;
          }
        }
      }
    }

    .footer {
      padding: 12px 16px;
      text-align: right;
      border-top: 1px solid var(--el-border-color-lighter);
      background: var(--el-fill-color-light);

      .el-button {
        padding: 8px 16px;
        display: inline-flex;
        align-items: center;
        gap: 4px;

        .el-icon {
          font-size: 14px;
        }
      }
    }
  }
}
</style>