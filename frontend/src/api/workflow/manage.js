import request from '@/utils/request'

// 获取用户节点列表
export function getUserNodeList(data) {
  return request({
    url: '/api/manage/getUserNodeList',
    method: 'post',
    data
  })
}

// 获取SFTP文件列表
export function getSftpList(data) {
  return request({
    url: '/api/manage/getSftpList',
    method: 'post',
    data
  })
}

// SFTP上传文件
export function sftpUpload(data, formData) {
  return request({
    url: '/api/manage/sftpUpload',
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
    url: '/api/manage/sftpDownload',
    method: 'post',
    data,
    responseType: 'blob'
  })
}

// 查询实例回放列表
export function queryInstanceReplayList(data) {
  return request({
    url: '/api/manage/queryInstanceReplayList',
    method: 'post',
    data
  })
}