import SplitHorizontal from './SplitHorizontal.vue'
import SplitVertical from './SplitVertical.vue'

export {
  SplitHorizontal,
  SplitVertical
}

export default {
  install(app) {
    app.component('SplitHorizontal', SplitHorizontal)
    app.component('SplitVertical', SplitVertical)
  }
} 