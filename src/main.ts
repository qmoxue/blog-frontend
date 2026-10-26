import { createApp } from 'vue'
import { MotionPlugin } from '@vueuse/motion'
import App from './App.vue'
import { vReveal } from './directives/reveal'
import './style.css'

const app = createApp(App)

app.use(MotionPlugin)
app.directive('reveal', vReveal)
app.mount('#app')
