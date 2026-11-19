import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.tsx'
import { installApiAuthFetch } from './lib/api-auth'
import './index.css'

// Content changes (homepage, professions, therapists) require the admin API token
installApiAuthFetch()

const baseUrl = (import.meta.env.BASE_URL || '/admin/').replace(/\/$/, '') || '/admin';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter basename={baseUrl}>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
)
