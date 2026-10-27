import { createApp } from 'vue'
import { Dark, Quasar } from 'quasar'
import '@quasar/extras/material-icons/material-icons.css'
import 'quasar/src/css/index.sass'
import 'photoswipe/style.css'
import App from './App.vue'
import './app.css'

const app = createApp(App)

// Quasar ya no necesita los plugins Dialog y Notify: las hojas son componentes QDialog y no hay avisos emergentes.
app.use(Quasar, { plugins: {} })

Dark.set(true)
app.mount('#app')
