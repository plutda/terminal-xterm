import { createRouter, createWebHistory } from 'vue-router'
import WindowTerminal from '../terminal/window-terminal.vue'

const routes = [
  {
    path: '/',
    component: WindowTerminal
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router