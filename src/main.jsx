import React from 'react'
import ReactDOM from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { router } from './router.jsx'
import { AuthProvider } from './contexts/AuthContext.jsx'
import { FavoritesProvider } from './contexts/FavoritesContext.jsx'
import { ScheduleProvider } from './contexts/ScheduleContext.jsx'
import { SquadsProvider } from './contexts/SquadsContext.jsx'
import { NotificationsProvider } from './contexts/NotificationsContext.jsx'
import { FamilyProvider } from './contexts/FamilyContext.jsx'
import { AchievementsProvider } from './contexts/AchievementsContext.jsx'
import { CampsProvider } from './contexts/CampsContext.jsx'
import { CompareProvider } from './contexts/CompareContext.jsx'
import { ErrorBoundary } from './components/ErrorBoundary.jsx'
import { setupGlobalErrorHandlers } from './lib/errorHandler.js'
import './index.css'

// Setup global error handlers for unhandled rejections and errors
setupGlobalErrorHandlers();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary name="App">
      <AuthProvider>
        <FavoritesProvider>
          <ScheduleProvider>
            <SquadsProvider>
              <NotificationsProvider>
                <AchievementsProvider>
                  <FamilyProvider>
                    <CampsProvider>
                      <CompareProvider>
                        <RouterProvider router={router} />
                      </CompareProvider>
                    </CampsProvider>
                  </FamilyProvider>
                </AchievementsProvider>
              </NotificationsProvider>
            </SquadsProvider>
          </ScheduleProvider>
        </FavoritesProvider>
      </AuthProvider>
    </ErrorBoundary>
  </React.StrictMode>,
)
