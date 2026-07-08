import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Global Fetch Interceptor to inject app version header
const originalFetch = window.fetch;
window.fetch = async function (url, options = {}) {
  if (typeof url === 'string' && (url.includes('/api/') || url.startsWith('/api'))) {
    options.headers = {
      ...options.headers,
      'x-umsy-version': '9' // Bumping to version 9 (v2.0)
    };
  }
  try {
    const res = await originalFetch(url, options);
    if (res.status === 426) {
      window.dispatchEvent(new Event('umsy-force-update'));
    }
    return res;
  } catch (err) {
    return originalFetch(url, options);
  }
};

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
