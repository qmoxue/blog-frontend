import { createApp } from 'vue'
import { MotionPlugin } from '@vueuse/motion'
import App from './App.vue'
import { router } from './router'
import { vReveal } from './directives/reveal'
import './style.css'

const app = createApp(App)

app.use(MotionPlugin)
// 路由要在 mount 之前装好，否则首屏渲染时 RouterView 是空的
app.use(router)
app.directive('reveal', vReveal)
app.mount('#app')
