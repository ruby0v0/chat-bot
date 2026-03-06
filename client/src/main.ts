import { createApp } from 'vue'
import ElementPlusX from 'vue-element-plus-x'
import App from './App.vue'
import './assets/styles/index.ts'
import 'element-plus/dist/index.css'
import 'virtual:uno.css'

const app = createApp(App)
app.use(ElementPlusX)
app.mount('#app')
