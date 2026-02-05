import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { AuthProvider } from './contexts/AuthContext.jsx'
import { FamilyProvider } from './contexts/FamilyContext.jsx'
import { AchievementsProvider } from './contexts/AchievementsContext.jsx'
import { ErrorBoundary } from './components/ErrorBoundary.jsx'
import { setupGlobalErrorHandlers } from './lib/errorHandler.js'
import './index.css'

// Setup global error handlers for unhandled rejections and errors
setupGlobalErrorHandlers();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary name="App">
      <AuthProvider>
        <AchievementsProvider>
          <FamilyProvider>
            <App />
          </FamilyProvider>
        </AchievementsProvider>
      </AuthProvider>
    </ErrorBoundary>
  </React.StrictMode>,
)
