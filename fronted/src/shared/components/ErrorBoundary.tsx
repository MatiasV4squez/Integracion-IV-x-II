import { Component, type ErrorInfo, type ReactNode } from 'react'
import './ErrorBoundary.css'

interface ErrorBoundaryProps {
  children: ReactNode
}

interface ErrorBoundaryState {
  error: unknown
}

interface ErrorRenderFallbackProps {
  onReintentar?: () => void
}

export function ErrorRenderFallback({ onReintentar }: ErrorRenderFallbackProps) {
  return (
    <main className="error-render">
      <section className="error-render__tarjeta" role="alert">
        <h1>Algo falló en esta página</h1>
        <p>No pudimos mostrar el contenido. Puedes reintentar, recargar la página o volver al inicio.</p>
        <div className="error-render__acciones">
          {onReintentar && (
            <button type="button" className="error-render__boton" onClick={onReintentar}>Reintentar</button>
          )}
          <button type="button" className="error-render__boton error-render__boton--secundario"
            onClick={() => window.location.reload()}>Recargar la página</button>
          <a className="error-render__boton error-render__boton--secundario" href="/">Volver al inicio</a>
        </div>
      </section>
    </main>
  )
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary capturó un fallo de renderizado.', error, info.componentStack)
  }

  render() {
    if (this.state.error !== null) {
      return <ErrorRenderFallback onReintentar={() => this.setState({ error: null })} />
    }
    return this.props.children
  }
}
