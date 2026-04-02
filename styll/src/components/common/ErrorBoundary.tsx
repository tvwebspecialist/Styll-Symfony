import React, { Component } from 'react'
import { Button } from '../ui/Button'

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<{ children: React.ReactNode }, State> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6">
          <div className="text-center max-w-md">
            <div className="text-5xl mb-4">😅</div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              Qualcosa non ha funzionato
            </h2>
            <p className="text-gray-500 mb-6">
              Si è verificato un errore imprevisto. Riprova a ricaricare la pagina.
            </p>
            <Button onClick={() => window.location.reload()}>
              Ricarica la pagina
            </Button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
