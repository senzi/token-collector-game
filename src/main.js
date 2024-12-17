import { createApp } from 'vue'
import { createPinia } from 'pinia'
import {
  create,
  NMessageProvider
} from 'naive-ui'
import './style.css'
import App from './App.vue'

const naive = create({
  components: [NMessageProvider]
})

const app = createApp(App)
app.use(createPinia())
app.use(naive)
app.mount('#app')
