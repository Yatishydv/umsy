import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Global Fetch Interceptor to inject app version header
const originalFetch = window.fetch;
window.fetch = function (url, options = {}) {
  if (typeof url === 'string' && (url.includes('/api/') || url.startsWith('/api'))) {
    options.headers = {
      ...options.headers,
      'x-umsy-version': '8' // Bumping to version 8 (v1.7)
    };
  }
  return originalFetch(url, options);
};

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
