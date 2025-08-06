import { Terminal } from 'xterm'
import { FitAddon } from 'xterm-addon-fit'
import { SearchAddon } from 'xterm-addon-search'
import { WebLinksAddon } from 'xterm-addon-web-links'

// 终端状态枚举
export const TerminalStatus = {
  Error: -1,
  NoConnected: 0,
  Connected: 1,
  Disconnected: 2
}

// 全局终端实例存储
const terminalInstances = new Map()

class TerminalManager {
  constructor() {
    this.terminals = new Map() // 存储终端连接信息
  }

  /**
   * 创建或获取终端实例
   */
  createTerminal(terminalId, config = {}) {
    if (this.terminals.has(terminalId)) {
      return this.terminals.get(terminalId)
    }

    const terminalData = {
      id: terminalId,
      ip: config.ip,
      role: config.role,
      terminal: null,
      socket: null,
      fitAddon: null,
      timer: null,
      status: TerminalStatus.NoConnected,
      isInitialized: false,
      theme: config.theme || {
        background: '#1e1e1e',
        foreground: '#ffffff',
        cursor: '#ffffff'
      },
      eventHandlers: {
        statusChange: [],
        focus: []
      }
    }

    this.terminals.set(terminalId, terminalData)
    return terminalData
  }

  /**
   * 初始化终端UI和连接
   */
  async initTerminal(terminalId, containerElement, shouldConnect = true) {
    const terminalData = this.terminals.get(terminalId)
    if (!terminalData) return null

    // 如果终端UI还没创建，创建它
    if (!terminalData.terminal && containerElement) {
      terminalData.terminal = new Terminal({
        cursorBlink: true,
        fontFamily: 'JetBrainsMono, monaco, Consolas, Lucida Console, monospace',
        theme: terminalData.theme,
        allowProposedApi: true,
        scrollback: 1000,
        fontSize: 14,
        rendererType: 'canvas',
        convertEol: true,
        disableStdin: false
      })

      // 加载插件
      terminalData.fitAddon = new FitAddon()
      const searchAddon = new SearchAddon()
      const webLinksAddon = new WebLinksAddon()

      terminalData.terminal.loadAddon(terminalData.fitAddon)
      terminalData.terminal.loadAddon(searchAddon)
      terminalData.terminal.loadAddon(webLinksAddon)

      // 打开终端
      terminalData.terminal.open(containerElement)

      // 监听终端焦点事件
      terminalData.terminal.element.addEventListener('focus', () => {
        this.emitEvent(terminalId, 'focus')
      })

      // 监听终端容器点击事件
      containerElement.addEventListener('click', () => {
        this.emitEvent(terminalId, 'focus')
        if (terminalData.terminal) {
          terminalData.terminal.focus()
        }
      })

      // 容器大小变化监听
      const resizeObserver = new ResizeObserver(() => {
        setTimeout(() => {
          this.fitTerminal(terminalId)
        }, 0)
      })
      
      resizeObserver.observe(containerElement)
      terminalData.resizeObserver = resizeObserver
    }

    // 如果需要连接且当前没有有效连接，建立连接
    if (shouldConnect && (!terminalData.socket || terminalData.socket.readyState !== WebSocket.OPEN)) {
      await this.initSocket(terminalId)
    }

    return terminalData.terminal
  }

  /**
   * 初始化WebSocket连接
   */
  async initSocket(terminalId) {
    const terminalData = this.terminals.get(terminalId)
    if (!terminalData || !terminalData.terminal) return

    const terminal = terminalData.terminal
    const cols = terminal.cols || 80
    const rows = terminal.rows || 24
    
    const url = `ws://${terminalData.ip}:3000?rows=${rows}&cols=${cols}&sys_user=${terminalData.role}`

    // 关闭旧连接
    if (terminalData.socket) {
      terminalData.socket.close()
    }

    terminalData.socket = new WebSocket(url)

    terminalData.socket.onopen = () => {
      terminalData.status = TerminalStatus.Connected
      this.emitEvent(terminalId, 'statusChange', TerminalStatus.Connected)
      
      // 注册终端事件
      terminal.onData(data => {
        this.sendData(terminalId, { type: 2, msg: data })
      })

      terminal.onResize(size => {
        this.sendData(terminalId, {
          type: 1,
          cols: size.cols,
          rows: size.rows
        })
      })

      // 发送初始大小
      this.sendData(terminalId, {
        type: 1,
        cols: terminal.cols,
        rows: terminal.rows
      })

      // 心跳检测
      terminalData.timer = setInterval(() => {
        this.sendData(terminalId, { type: 3, msg: 'ping' })
      }, 30000)
    }

    terminalData.socket.onclose = () => {
      terminalData.status = TerminalStatus.Disconnected
      this.emitEvent(terminalId, 'statusChange', TerminalStatus.Disconnected)
      clearInterval(terminalData.timer)
    }

    terminalData.socket.onerror = (e) => {
      terminalData.status = TerminalStatus.Error
      this.emitEvent(terminalId, 'statusChange', TerminalStatus.Error)
      clearInterval(terminalData.timer)
      if (terminal) {
        terminal.writeln(`\r\n\x1b[31m提示: 连接失败...\r\n${JSON.stringify(e)}`)
      }
    }

    terminalData.socket.onmessage = (e) => {
      if (terminal) {
        terminal.write(e.data)
      }
    }

    terminalData.isInitialized = true
  }

  /**
   * 发送数据到服务器
   */
  sendData(terminalId, data) {
    const terminalData = this.terminals.get(terminalId)
    if (terminalData?.socket && terminalData.socket.readyState === WebSocket.OPEN) {
      terminalData.socket.send(JSON.stringify(data))
    }
  }

  /**
   * 调整终端大小
   */
  fitTerminal(terminalId) {
    const terminalData = this.terminals.get(terminalId)
    if (terminalData?.fitAddon) {
      terminalData.fitAddon.fit()
      // 发送新的尺寸到服务器
      if (terminalData.socket?.readyState === WebSocket.OPEN) {
        this.sendData(terminalId, {
          type: 1,
          cols: terminalData.terminal.cols,
          rows: terminalData.terminal.rows
        })
      }
    }
  }

  /**
   * 设置主题
   */
  setTheme(terminalId, theme) {
    const terminalData = this.terminals.get(terminalId)
    if (terminalData?.terminal) {
      terminalData.theme = theme
      terminalData.terminal.options.theme = theme
    }
  }

  /**
   * 重新连接
   */
  async reconnect(terminalId) {
    const terminalData = this.terminals.get(terminalId)
    if (!terminalData) return

    // 关闭现有连接
    if (terminalData.socket) {
      terminalData.socket.close()
      terminalData.socket = null
    }
    
    clearInterval(terminalData.timer)
    terminalData.timer = null
    terminalData.isInitialized = false

    // 重新建立连接
    if (terminalData.terminal) {
      await this.initSocket(terminalId)
    }
  }

  /**
   * 获取终端实例
   */
  getTerminal(terminalId) {
    return this.terminals.get(terminalId)?.terminal
  }

  /**
   * 获取终端状态
   */
  getStatus(terminalId) {
    return this.terminals.get(terminalId)?.status || TerminalStatus.NoConnected
  }

  /**
   * 注册事件监听器
   */
  addEventListener(terminalId, eventType, callback) {
    const terminalData = this.terminals.get(terminalId)
    if (terminalData && terminalData.eventHandlers[eventType]) {
      terminalData.eventHandlers[eventType].push(callback)
    }
  }

  /**
   * 移除事件监听器
   */
  removeEventListener(terminalId, eventType, callback) {
    const terminalData = this.terminals.get(terminalId)
    if (terminalData && terminalData.eventHandlers[eventType]) {
      const index = terminalData.eventHandlers[eventType].indexOf(callback)
      if (index > -1) {
        terminalData.eventHandlers[eventType].splice(index, 1)
      }
    }
  }

  /**
   * 触发事件
   */
  emitEvent(terminalId, eventType, ...args) {
    const terminalData = this.terminals.get(terminalId)
    if (terminalData && terminalData.eventHandlers[eventType]) {
      terminalData.eventHandlers[eventType].forEach(callback => {
        callback(...args)
      })
    }
  }

  /**
   * 销毁终端（仅在确实需要清理时调用）
   */
  destroyTerminal(terminalId) {
    const terminalData = this.terminals.get(terminalId)
    if (terminalData) {
      // 关闭连接
      if (terminalData.socket) {
        terminalData.socket.close()
      }
      
      // 清理定时器
      clearInterval(terminalData.timer)
      
      // 清理观察器
      if (terminalData.resizeObserver) {
        terminalData.resizeObserver.disconnect()
      }
      
      // 销毁终端实例
      if (terminalData.terminal) {
        terminalData.terminal.dispose()
      }
      
      this.terminals.delete(terminalId)
    }
  }

  /**
   * 从一个容器移动到另一个容器（用于分屏等场景）
   */
  moveTerminal(terminalId, newContainer) {
    const terminalData = this.terminals.get(terminalId)
    if (terminalData?.terminal && newContainer) {
      // 重新打开到新容器
      terminalData.terminal.open(newContainer)
      
      // 重新设置事件监听
      newContainer.addEventListener('click', () => {
        this.emitEvent(terminalId, 'focus')
        if (terminalData.terminal) {
          terminalData.terminal.focus()
        }
      })

      // 重新设置大小观察器
      if (terminalData.resizeObserver) {
        terminalData.resizeObserver.disconnect()
      }
      
      const resizeObserver = new ResizeObserver(() => {
        setTimeout(() => {
          this.fitTerminal(terminalId)
        }, 0)
      })
      
      resizeObserver.observe(newContainer)
      terminalData.resizeObserver = resizeObserver
      
      // 调整大小
      this.fitTerminal(terminalId)
      
      // 自动聚焦
      terminalData.terminal.focus()
    }
  }
}

// 导出单例实例
export const terminalManager = new TerminalManager()