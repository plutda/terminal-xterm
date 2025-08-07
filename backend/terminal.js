const os = require('os')

class TerminalService {
  constructor() {
    this.terminals = new Map()
  }

  createTerminal(cols, rows, sys_user) {
    // 创建模拟终端
    const terminal = {
      currentCommand: '', // 存储当前正在输入的命令
      ws: null, // 每个终端实例独立的 WebSocket 连接
      write: (data) => {
        // 模拟终端输出
        if (terminal.ws && terminal.ws.readyState === terminal.ws.OPEN) {
          terminal.ws.send(JSON.stringify({
            type: 'output',
            content: data,
            terminalId: terminal.id
          }))
        }
      },
      resize: (cols, rows) => {
        // 模拟终端大小调整
        console.log(`Terminal resized to ${cols}x${rows}`)
      },
      kill: () => {
        // 清理资源
        console.log('Terminal killed')
      }
    }

    return terminal
  }

  handleConnection(ws, terminal) {
    // 为终端设置 WebSocket 连接
    terminal.ws = ws
    terminal.id = terminal.id || Math.random().toString(36).substr(2, 9)

    // 客户端数据处理
    ws.on('message', message => {
      try {
        const data = JSON.parse(message)
        // 检查消息是否属于此终端
        if (data.terminalId && data.terminalId !== terminal.id) {
          return // 忽略不属于此终端的消息
        }
        
        switch (data.type) {
          case 1: // 调整终端大小
            terminal.resize(data.cols, data.rows)
            break
          case 2: // 命令输入
            this.handleInput(terminal, data.msg)
            break
          case 3: // 心跳检测
            ws.send(JSON.stringify({
              type: 'pong',
              terminalId: terminal.id
            }))
            break
        }
      } catch (err) {
        console.error('Error handling message:', err)
      }
    })

    // 连接关闭时清理
    ws.on('close', () => {
      terminal.kill()
    })

    // 确保光标可见
    ws.send('\x1b[?25h')
  }

  // 处理输入
  handleInput(terminal, input) {
    // 回显输入的字符
    terminal.write(input)

    // 处理特殊按键
    if (input === '\r') { // 回车键
      terminal.write('\n') // 换行
      const command = terminal.currentCommand.trim()
      if (command) {
        const output = this.mockCommandOutput(command)
        terminal.write(output)
      }
      terminal.currentCommand = '' // 清空当前命令
      terminal.write(this.getPrompt()) // 显示新的提示符
    } else if (input === '\u007f') { // 退格键
      if (terminal.currentCommand.length > 0) {
        terminal.currentCommand = terminal.currentCommand.slice(0, -1)
        terminal.write('\b \b') // 删除一个字符
      }
    } else if (input === '\u0003') { // Ctrl+C
      terminal.write('^C\r\n')
      terminal.currentCommand = ''
      terminal.write(this.getPrompt())
    } else if (input.length === 1 && !input.match(/[\x00-\x1F]/)) { // 普通字符
      terminal.currentCommand += input
    }
  }

  // 获取命令提示符
  getPrompt() {
    return '$ '
  }

  // 模拟命令输出
  mockCommandOutput(command) {
    if (command === '') return ''
    
    // 模拟一些基本命令
    if (command === 'ls') {
      return '\x1b[34mDocuments\x1b[0m  \x1b[34mDownloads\x1b[0m  \x1b[34mPictures\x1b[0m  \x1b[34mVideos\x1b[0m\r\n'
    }
    
    if (command === 'pwd') {
      return `\x1b[32m${os.homedir()}\x1b[0m\r\n`
    }
    
    if (command === 'date') {
      return `\x1b[33m${new Date().toString()}\x1b[0m\r\n`
    }
    
    if (command === 'clear' || command === 'cls') {
      return '\x1b[2J\x1b[H' // 清屏并将光标移到顶部
    }
    
    if (command.startsWith('echo ')) {
      return `\x1b[36m${command.substring(5)}\x1b[0m\r\n`
    }

    if (command === 'help') {
      return `\x1b[1;33mAvailable commands:\x1b[0m
  \x1b[32mls\x1b[0m          List files and directories
  \x1b[32mpwd\x1b[0m         Print working directory
  \x1b[32mdate\x1b[0m        Show current date and time
  \x1b[32mclear/cls\x1b[0m   Clear the screen
  \x1b[32mecho [text]\x1b[0m Display text
  \x1b[32mhelp\x1b[0m        Show this help message
\r\n`
    }
    
    // 默认输出
    return `\x1b[31m${command}: command not found\x1b[0m\r\n\x1b[33mType 'help' for available commands\x1b[0m\r\n`
  }
}

module.exports = new TerminalService()