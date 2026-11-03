import { BrowserRouter } from 'react-router'
import { AppRoutes } from './app/AppRoutes'
import { ErrorBoundary } from './shared/components/ErrorBoundary'

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </ErrorBoundary>
  )
}
