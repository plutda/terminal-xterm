# Vue Terminal

一个基于Vue 3和xterm.js的终端组件，支持多种主题和WebSocket连接。

## 功能特点

- 基于xterm.js的终端模拟器
- 支持多种终端主题
- 实时WebSocket连接
- 自适应终端大小
- 支持终端分屏
- 支持搜索和网页链接

## 安装

1. 克隆仓库：
```bash
git clone <repository-url>
cd vue-terminal
```

2. 安装前端依赖：
```bash
pnpm install
```

3. 安装后端依赖：
```bash
cd backend
pnpm install
cd ..
```

## 运行

1. 启动后端服务：
```bash
cd backend
pnpm start
```

2. 启动前端开发服务器：
```bash
# 在另一个终端中
pnpm dev
```

3. 访问 http://localhost:3000 查看运行效果

## 组件使用

```vue
<template>
  <h-terminal
    :ip="'localhost:8080'"
    :theme="theme"
    @status-change="handleStatusChange"
  />
</template>

<script setup>
import { HTerminal } from './terminal/h-terminal.vue'

const theme = {
  background: '#1e1e1e',
  foreground: '#ffffff',
  cursor: '#ffffff'
}

function handleStatusChange(status) {
  console.log('Terminal status:', status)
}
</script>
```

## 组件属性

- `ip`: WebSocket服务器地址（必需）
- `role`: 用户角色（可选，默认为'baseuser'）
- `theme`: 终端主题（可选）
- `terminalInstanceId`: 终端实例ID（可选）

## 事件

- `status-change`: 终端状态变化时触发
- `focus`: 终端获得焦点时触发

## 主题配置

可以通过`theme`属性自定义终端外观：

```javascript
const theme = {
  background: '#1e1e1e',  // 背景色
  foreground: '#ffffff',  // 前景色
  cursor: '#ffffff'       // 光标颜色
}
```

## 许可证

MIT