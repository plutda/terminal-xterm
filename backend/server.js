const Koa = require('koa')
const Router = require('koa-router')
const bodyParser = require('koa-bodyparser')
const cors = require('koa-cors')
const WebSocket = require('ws')
const dayjs = require('dayjs')
const http = require('http')
const url = require('url')
const config = require('./config')
const terminalService = require('./terminal')

const app = new Koa()
const router = new Router()

// 使用中间件
app.use(cors(config.cors))
app.use(bodyParser())

// 模拟历史记录数据
const mockHistoryData = [
  {
    id: 1,
    ip: '127.0.0.1',
    role: 'admin',
    title: 'Admin Session 1',
    create_time: '2023-12-25 10:00:00'
  },
  {
    id: 2, 
    ip: '127.0.0.1',
    role: 'baseuser',
    title: 'User Session 1',
    create_time: '2023-12-25 11:00:00'
  }
]

// 查询终端历史记录
router.get('/api/workflow/instance/replay/list', async (ctx) => {
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
  const { rows, cols, sys_user } = query
  
  // 创建终端实例
  const terminal = terminalService.createTerminal(cols, rows, sys_user)
  
  // 处理终端连接
  terminalService.handleConnection(ws, terminal)
  
  // 发送初始提示符
  ws.send('$ ')
})

// 模拟命令输出
function mockCommandOutput(command) {
  command = command.trim()
  
  if (command === '') return ''
  
  // 模拟一些基本命令
  if (command === 'ls') {
    return 'Documents  Downloads  Pictures  Videos\r\n'
  }
  
  if (command === 'pwd') {
    return '/home/user\r\n'
  }
  
  if (command === 'date') {
    return dayjs().format('YYYY-MM-DD HH:mm:ss') + '\r\n'
  }
  
  if (command.startsWith('echo ')) {
    return command.substring(5) + '\r\n'
  }
  
  // 默认输出
  return `${command}: command not found\r\n`
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
const PORT = process.env.PORT || 3000
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})