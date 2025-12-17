import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import { installResponsiveTables } from '@/plugins/responsiveTables'

// Global CSS (optional: keep existing styles during migration)
import '../css/styles.css'
import '../css/style.css'
// Font Awesome (npm) for icons used across the app
import '@fortawesome/fontawesome-free/css/all.min.css'

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.mount('#app')

// Enhance table responsiveness globally after router is ready
installResponsiveTables(router)
