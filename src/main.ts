import { createApp } from 'vue'
import { Dark, Dialog, Notify, Quasar } from 'quasar'
import '@quasar/extras/material-icons/material-icons.css'
import 'quasar/src/css/index.sass'
import 'photoswipe/style.css'
import App from './App.vue'
import './app.css'

const app = createApp(App)

app.use(Quasar, {
  plugins: { Dialog, Notify },
})

Dark.set(true)
app.mount('#app')
