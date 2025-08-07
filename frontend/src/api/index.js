import request from '@/utils/request'

// 查询实例环境
export function queryInstanceEnv(data) {
  return request({
    url: '/api/instance/env',
    method: 'get',
    params: data
  })
}

// 查询实例产品
export function queryInstanceProduct(data) {
  return request({
    url: '/api/instance/product',
    method: 'get',
    params: data
  })
}

// 查询Zeus标签
export function queryZeusTag(data) {
  return request({
    url: '/api/zeus/tag',
    method: 'get',
    params: data
  })
}

// 查询实例用户名
export function queryInstanceUsername(data) {
  return request({
    url: '/api/instance/username',
    method: 'get',
    params: data
  })
}

export function getUserNodeList(data) {
  return request({
    url: '/api/node/list',
    method: 'get',
    params: data
  })
}

// 获取SFTP文件列表
export function getSftpList(data) {
  return request({
    url: '/api/sftp/list',
    method: 'get',
    params: data
  })
}

// SFTP上传文件
export function sftpUpload(data, formData) {
  return request({
    url: '/api/sftp/upload',
    method: 'post',
    data: formData,
    params: data,
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  })
}

// SFTP下载文件
export function sftpDownload(data) {
  return request({
    url: '/api/sftp/download',
    method: 'get',
    params: data,
    responseType: 'blob'
  })
}

// 查询实例回放列表
export function queryInstanceReplayList(data) {
  return request({
    url: '/api/instance/replay/list',
    method: 'get',
    params: data
  })
}