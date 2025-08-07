module.exports = {
  port: 8025,
  host: '127.0.0.1',
  cors: {
    origin: '*',  // 在生产环境中应该设置为具体的域名
    credentials: true
  }
}