const Koa = require('koa')
const Router = require('koa-router')

const cors = require('@koa/cors')
const WebSocket = require('ws')
const dayjs = require('dayjs')
const fs = require('fs')
const http = require('http')
const url = require('url')
const path = require('path')
const { v4: uuidv4 } = require('uuid')
const config = require('./config')
const terminalService = require('./terminal')
const sftpService = require('./sftp')
const { koaBody } = require('koa-body')

const app = new Koa()
const router = new Router()

// 使用中间件
app.use(cors(config.cors))
app.use(koaBody({
  multipart: true,
  formidable: {
    maxFileSize: 200 * 1024 * 1024 // 设置上传文件大小限制为200MB
  }
}))

// 模拟历史记录数据
const mockHistoryData = [
  {
    id: uuidv4(),
    ip: '127.0.0.1',
    role: 'admin',
    title: '系统维护会话',
    create_time: dayjs().subtract(1, 'hour').format('YYYY-MM-DD HH:mm:ss'),
    duration: '01:30:00',
    status: 'completed',
    commands: ['systemctl status', 'top', 'df -h']
  },
  {
    id: uuidv4(),
    ip: '127.0.0.1',
    role: 'baseuser',
    title: '开发环境配置',
    create_time: dayjs().subtract(2, 'hour').format('YYYY-MM-DD HH:mm:ss'),
    duration: '00:45:00',
    status: 'completed',
    commands: ['npm install', 'git pull', 'npm run dev']
  },
  {
    id: uuidv4(),
    ip: '192.168.1.100',
    role: 'admin',
    title: '数据库备份',
    create_time: dayjs().subtract(1, 'day').format('YYYY-MM-DD HH:mm:ss'),
    duration: '02:15:00',
    status: 'completed',
    commands: ['pg_dump', 'tar -czf backup.tar.gz', 'scp backup.tar.gz']
  },
  {
    id: uuidv4(),
    ip: '192.168.1.100',
    role: 'admin',
    title: '安全更新',
    create_time: dayjs().subtract(2, 'day').format('YYYY-MM-DD HH:mm:ss'),
    duration: '01:45:00',
    status: 'completed',
    commands: ['apt update', 'apt upgrade', 'ufw status']
  },
  {
    id: uuidv4(),
    ip: '192.168.1.101',
    role: 'baseuser',
    title: '代码部署',
    create_time: dayjs().subtract(3, 'day').format('YYYY-MM-DD HH:mm:ss'),
    duration: '01:00:00',
    status: 'completed',
    commands: ['git pull', 'npm run build', 'pm2 restart all']
  },
  {
    id: uuidv4(),
    ip: '192.168.1.101',
    role: 'baseuser',
    title: '日志分析',
    create_time: dayjs().subtract(4, 'day').format('YYYY-MM-DD HH:mm:ss'),
    duration: '00:30:00',
    status: 'completed',
    commands: ['tail -f app.log', 'grep ERROR logs/', 'journalctl -xe']
  }
]

// 查询终端历史记录
router.get('/api/instance/replay/list', async (ctx) => {
  const { ip, page = 1, page_size = 10 } = ctx.query
  
  // 过滤IP匹配的记录
  let filteredData = ip ? mockHistoryData.filter(item => item.ip === ip) : mockHistoryData
  
  // 分页
  const start = (page - 1) * page_size
  const end = start + parseInt(page_size)
  const paginatedData = filteredData.slice(start, end)
  
  ctx.body = {
    code: 200,
    message: 'success',
    data: {
      list: paginatedData,
      total: filteredData.length,
      page: parseInt(page),
      page_size: parseInt(page_size)
    }
  }
})

// 工作流相关接口
// 查询实例环境
router.get('/api/instance/env', async (ctx) => {
  try {
    ctx.body = {
      code: 200,
      message: 'success',
      data: ['dev', 'test', 'prod']
    }
  } catch (error) {
    ctx.status = 500
    ctx.body = {
      code: 500,
      message: error.message
    }
  }
})

// 查询实例产品
router.get('/api/instance/product', async (ctx) => {
  try {
    ctx.body = {
      code: 200,
      message: 'success',
      data: ['product-a', 'product-b', 'product-c']
    }
  } catch (error) {
    ctx.status = 500
    ctx.body = {
      code: 500,
      message: error.message
    }
  }
})

// 查询Zeus标签
router.get('/api/zeus/tag', async (ctx) => {
  try {
    ctx.body = {
      code: 200,
      message: 'success',
      data: ['tag1', 'tag2', 'tag3']
    }
  } catch (error) {
    ctx.status = 500
    ctx.body = {
      code: 500,
      message: error.message
    }
  }
})

// 查询实例用户名
router.get('/api/instance/username', async (ctx) => {
  try {
    ctx.body = {
      code: 200,
      message: 'success',
      data: ['admin', 'user1', 'user2']
    }
  } catch (error) {
    ctx.status = 500
    ctx.body = {
      code: 500,
      message: error.message
    }
  }
})

// 获取节点列表
router.get('/api/node/list', async (ctx) => {
  try {
    ctx.body = {
      code: 200,
      message: 'success',
      data: ['node1', 'node2', 'node3']
    }
  } catch (error) {
    ctx.status = 500
    ctx.body = {
      code: 500,
      message: error.message
    }
  }
})

// SFTP相关接口
// 获取文件列表
router.get('/api/sftp/list', async (ctx) => {
  try {
    const { ip, dir, sys_user } = ctx.query
    const files = sftpService.listDirectory(dir || '/tmp')
    
    ctx.body = {
      code: 200,
      message: 'success',
      data: {
        item: files
      }
    }
  } catch (error) {
    ctx.status = 500
    ctx.body = {
      code: 500,
      message: error.message
    }
  }
})

// 下载文件
router.get('/api/sftp/download', async (ctx) => {
  try {
    const { ip, path: filePath, sys_user } = ctx.query
    const content = sftpService.readFile(filePath)
    
    ctx.set('Content-Type', 'application/octet-stream')
    ctx.set('Content-Disposition', `attachment; filename=${encodeURIComponent(path.basename(filePath))}`)
    ctx.body = content
  } catch (error) {
    ctx.status = 500
    ctx.body = {
      code: 500,
      message: error.message
    }
  }
})

// 上传文件
router.post('/api/sftp/upload', async (ctx) => {
  try {
    const { ip, sys_user, dir } = ctx.request.body
    const file = ctx.request.files.file
    
    if (!file) {
      throw new Error('No file uploaded')
    }
    
    // 读取上传的文件内容
    const content = fs.readFileSync(file.filepath)
    const filePath = path.join(dir, file.originalFilename)
    sftpService.writeFile(filePath, content.toString())
    
    ctx.body = {
      code: 200,
      message: 'success'
    }
  } catch (error) {
    ctx.status = 500
    ctx.body = {
      code: 500,
      message: error.message
    }
  }
})

// 注册路由
app.use(router.routes())
app.use(router.allowedMethods())

// 创建HTTP服务器
const server = http.createServer(app.callback())

// 创建WebSocket服务器
const wss = new WebSocket.Server({ server })

// 存储终端会话
const sessions = new Map()

// WebSocket连接处理
wss.on('connection', (ws, req) => {
  // 解析查询参数
  const { query } = url.parse(req.url, true)
  const { ip, role, rows, cols } = query
  
  // 生成会话ID
  const sessionId = uuidv4()
  
  // 创建终端实例
  const terminal = terminalService.createTerminal(cols, rows, role)
  terminal.id = sessionId // 使用会话ID作为终端ID
  
  // 存储会话信息
  sessions.set(sessionId, {
    ws,
    terminal,
    ip,
    role,
    lastActive: Date.now()
  })
  
  // 发送终端ID给客户端
  ws.send(JSON.stringify({
    type: 'init',
    terminalId: sessionId
  }))
  
  // 处理终端连接
  terminalService.handleConnection(ws, terminal)
  
  // 发送初始提示符
  ws.send(JSON.stringify({
    type: 'output',
    content: '$ ',
    terminalId: sessionId
  }))
})

// 模拟命令输出
function mockCommandOutput(command) {
  command = command.trim()
  
  if (command === '') return ''
  
  // 模拟文件系统命令
  if (command === 'ls') {
    return 'app.log  config.json  docs/  error.log  node_modules/  package.json  src/  test.txt'
  }
  
  if (command === 'ls -l') {
    return `total 68
drwxr-xr-x 2 user user 4096 Jan 1 12:00 docs
drwxr-xr-x 8 user user 4096 Jan 1 12:00 node_modules
-rw-r--r-- 1 user user  128 Jan 1 12:00 app.log
-rw-r--r-- 1 user user   42 Jan 1 12:00 config.json
-rw-r--r-- 1 user user   96 Jan 1 12:00 error.log
-rw-r--r-- 1 user user  525 Jan 1 12:00 package.json
drwxr-xr-x 4 user user 4096 Jan 1 12:00 src
-rw-r--r-- 1 user user   11 Jan 1 12:00 test.txt`
  }
  
  if (command === 'pwd') {
    return '/home/user/project'
  }
  
  if (command === 'date') {
    return dayjs().format('YYYY-MM-DD HH:mm:ss')
  }
  
  if (command.startsWith('echo ')) {
    return command.substring(5)
  }
  
  if (command === 'whoami') {
    return 'baseuser'
  }
  
  if (command === 'hostname') {
    return 'dev-server'
  }
  
  if (command === 'uname -a') {
    return 'Linux dev-server 5.15.0-generic #1 SMP x86_64 GNU/Linux'
  }
  
  if (command === 'df -h') {
    return `Filesystem      Size  Used Avail Use% Mounted on
/dev/sda1       100G   25G   75G  25% /
tmpfs            16G     0   16G   0% /dev/shm
/dev/sda2       500G  200G  300G  40% /data`
  }
  
  if (command === 'free -h') {
    return `              total        used        free      shared  buff/cache   available
Mem:            31Gi       8.0Gi      15Gi       1.0Gi       8.0Gi      21Gi
Swap:          2.0Gi          0B      2.0Gi`
  }
  
  if (command === 'top -n 1') {
    return `top - ${dayjs().format('HH:mm:ss')} up 7 days, 2:15, 1 user, load average: 0.52, 0.58, 0.59
Tasks: 180 total,   1 running, 179 sleeping,   0 stopped,   0 zombie
%Cpu(s):  5.1 us,  2.3 sy,  0.0 ni, 92.3 id,  0.0 wa,  0.0 hi,  0.3 si,  0.0 st
MiB Mem:  32046.0 total,  15360.0 free,   8192.0 used,   8494.0 buff/cache
MiB Swap:  2048.0 total,   2048.0 free,      0.0 used.  21854.0 avail Mem`
  }
  
  if (command === 'ps aux') {
    return `USER         PID %CPU %MEM    VSZ   RSS TTY      STAT START   TIME COMMAND
root           1  0.0  0.0 168004 12416 ?        Ss   Dec25   0:23 /sbin/init
root         557  0.0  0.0  31432  7264 ?        Ss   Dec25   0:00 /usr/sbin/cron
user        1001  0.0  0.1 718776 65536 ?        Sl   10:00   0:02 node server.js
user        1234  0.0  0.0  12000  3600 pts/0    Ss   11:00   0:00 -bash`
  }
  
  if (command === 'netstat -tuln') {
    return `Active Internet connections (only servers)
Proto Recv-Q Send-Q Local Address           Foreign Address         State
tcp        0      0 0.0.0.0:22             0.0.0.0:*               LISTEN
tcp        0      0 0.0.0.0:8025           0.0.0.0:*               LISTEN
tcp6       0      0 :::80                  :::*                    LISTEN`
  }
  
  if (command === 'git status') {
    return `On branch main
Your branch is up to date with 'origin/main'.

Changes not staged for commit:
  (use "git add <file>..." to update what will be committed)
  (use "git restore <file>..." to discard changes in working directory)
        modified:   src/components/Terminal.vue

Untracked files:
  (use "git add <file>..." to include in what will be committed)
        docs/new-feature.md

no changes added to commit (use "git add" and/or "git commit -a")`
  }
  
  if (command === 'npm list --depth=0') {
    return `project@1.0.0 /home/user/project
├── koa@2.14.0
├── vue@3.4.0
├── element-plus@2.4.0
└── xterm@5.3.0`
  }
  
  // 默认输出
  return `${command}: command not found`
}

// 清理过期会话
setInterval(() => {
  const now = Date.now()
  for (const [sessionId, session] of sessions.entries()) {
    // 如果会话超过5分钟没有活动，关闭连接
    if (now - session.lastActive > 5 * 60 * 1000) {
      session.ws.close()
      sessions.delete(sessionId)
    }
  }
}, 60000)

// 启动服务器
const PORT = process.env.PORT || 8025
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})