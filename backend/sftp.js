const fs = require('fs')
const path = require('path')
const dayjs = require('dayjs')

// 模拟文件系统数据
const mockFileSystem = {
  '/tmp': {
    'test.txt': {
      content: 'Hello World',
      size: '11B',
      mode: 'rw-r--r--',
      mtime: dayjs().subtract(1, 'hour').format('YYYY-MM-DD HH:mm:ss'),
      is_dir: false
    },
    'docs': {
      content: null,
      size: '4KB',
      mode: 'rwxr-xr-x',
      mtime: dayjs().subtract(2, 'hour').format('YYYY-MM-DD HH:mm:ss'),
      is_dir: true
    },
    'config.json': {
      content: '{"version": "1.0.0", "env": "development"}',
      size: '42B',
      mode: 'rw-r--r--',
      mtime: dayjs().subtract(30, 'minute').format('YYYY-MM-DD HH:mm:ss'),
      is_dir: false
    },
    'logs': {
      content: null,
      size: '8KB',
      mode: 'rwxr-xr-x',
      mtime: dayjs().subtract(1, 'day').format('YYYY-MM-DD HH:mm:ss'),
      is_dir: true
    }
  },
  '/tmp/docs': {
    'readme.md': {
      content: '# Project Documentation\n\nThis is the main documentation for the project.',
      size: '64B',
      mode: 'rw-r--r--',
      mtime: dayjs().subtract(3, 'hour').format('YYYY-MM-DD HH:mm:ss'),
      is_dir: false
    },
    'api-spec.md': {
      content: '# API Specification\n\nDetailed API documentation and endpoints.',
      size: '56B',
      mode: 'rw-r--r--',
      mtime: dayjs().subtract(2, 'day').format('YYYY-MM-DD HH:mm:ss'),
      is_dir: false
    }
  },
  '/tmp/logs': {
    'app.log': {
      content: '2024-01-01 12:00:00 [INFO] Application started\n2024-01-01 12:01:00 [INFO] Server listening on port 8025',
      size: '128B',
      mode: 'rw-r--r--',
      mtime: dayjs().subtract(1, 'hour').format('YYYY-MM-DD HH:mm:ss'),
      is_dir: false
    },
    'error.log': {
      content: '2024-01-01 12:30:00 [ERROR] Database connection failed\n2024-01-01 12:31:00 [INFO] Reconnected to database',
      size: '96B',
      mode: 'rw-r--r--',
      mtime: dayjs().subtract(2, 'hour').format('YYYY-MM-DD HH:mm:ss'),
      is_dir: false
    }
  }
}

// 获取目录内容
function listDirectory(dir) {
  const normalizedDir = dir.replace(/\\/g, '/')
  const dirContent = mockFileSystem[normalizedDir]
  
  if (!dirContent) {
    throw new Error('Directory not found')
  }
  
  return Object.entries(dirContent).map(([name, info]) => ({
    name,
    size: info.size,
    mode: info.mode,
    mod_time: info.mtime,
    is_dir: info.is_dir
  }))
}

// 读取文件内容
function readFile(filePath) {
  const dir = path.dirname(filePath).replace(/\\/g, '/')
  const fileName = path.basename(filePath)
  const dirContent = mockFileSystem[dir]
  
  if (!dirContent || !dirContent[fileName]) {
    throw new Error('File not found')
  }
  
  const file = dirContent[fileName]
  if (file.is_dir) {
    throw new Error('Cannot read directory as file')
  }
  
  return file.content
}

// 写入文件
function writeFile(filePath, content) {
  const dir = path.dirname(filePath).replace(/\\/g, '/')
  const fileName = path.basename(filePath)
  
  if (!mockFileSystem[dir]) {
    throw new Error('Directory not found')
  }
  
  mockFileSystem[dir][fileName] = {
    content,
    size: content.length + 'B',
    mode: 'rw-r--r--',
    mtime: dayjs().format('YYYY-MM-DD HH:mm:ss'),
    is_dir: false
  }
}

module.exports = {
  listDirectory,
  readFile,
  writeFile
}