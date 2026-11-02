import { BrowserRouter } from 'react-router'
import { AppRoutes } from './app/AppRoutes'

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  )
}
