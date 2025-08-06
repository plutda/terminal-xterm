import request from '@/utils/request'

// 查询实例环境
export function queryInstanceEnv(data) {
  return request({
    url: '/api/workflow/job/queryInstanceEnv',
    method: 'post',
    data
  })
}

// 查询实例产品
export function queryInstanceProduct(data) {
  return request({
    url: '/api/workflow/job/queryInstanceProduct',
    method: 'post',
    data
  })
}

// 查询Zeus标签
export function queryZeusTag(data) {
  return request({
    url: '/api/workflow/job/queryZeusTag',
    method: 'post',
    data
  })
}

// 查询实例用户名
export function queryInstanceUsername(data) {
  return request({
    url: '/api/workflow/job/queryInstanceUsername',
    method: 'post',
    data
  })
}