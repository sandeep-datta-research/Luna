import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

async function clearLegacyPwaCaches() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return

  try {
    const registrations = await navigator.serviceWorker.getRegistrations()
    await Promise.all(registrations.map((registration) => registration.unregister()))

    if ('caches' in window) {
      const cacheKeys = await caches.keys()
      await Promise.all(
        cacheKeys
          .filter((key) => /workbox|vite-plugin-pwa|precache|runtime/i.test(key))
          .map((key) => caches.delete(key)),
      )
    }
  } catch (error) {
    console.warn('Failed clearing legacy PWA caches:', error)
  }
}

clearLegacyPwaCaches().finally(() => {
  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
})
