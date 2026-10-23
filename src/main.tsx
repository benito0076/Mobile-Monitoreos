import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import { App } from './App'
import './estilos.css'

// Con registerType 'autoUpdate', una versión nueva se instala y la página se recarga sola;
// así las comisiones no se quedan con una versión vieja guardada en caché.
registerSW({ immediate: true })

createRoot(document.getElementById('root')!).render(<App />)
