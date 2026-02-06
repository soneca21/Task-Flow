import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'
import { installPageZoomLock } from '@/lib/zoomLock'

const disposeZoomLock = installPageZoomLock()

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    disposeZoomLock?.()
  })
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
)
