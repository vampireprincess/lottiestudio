import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { seedBuiltinGradients } from './db/index.js'

// Seed built-in data on first run
seedBuiltinGradients().catch(console.warn);

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
