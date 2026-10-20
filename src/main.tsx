import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { hasUserData } from './state/db.ts'
import { requestPersistentStorage } from './state/persistence.ts'
import { ErrorBoundary } from './ui/components/ErrorBoundary.tsx'
import { UpdatePrompt } from './ui/components/UpdatePrompt.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
    <UpdatePrompt />
  </StrictMode>,
)

// Hosted builds keep user data only in this browser: once there is data
// worth protecting, ask that it be exempt from eviction (no-op if granted).
void hasUserData()
  .then((has) => (has ? requestPersistentStorage() : undefined))
  .catch(() => undefined)
