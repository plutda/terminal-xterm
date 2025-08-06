import { defineStore } from 'pinia'

const useUserStore = defineStore('user', {
  state: () => ({
    ssoUserName: 'admin'
  }),
  actions: {
    // 设置用户名
    setSsoUserName(username) {
      this.ssoUserName = username
    }
  }
})

export default useUserStore