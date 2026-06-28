import { Component } from 'react'

export default class ErrorBoundary extends Component {
  state = { error: null }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('ErrorBoundary capturó un error:', error, info)
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 32, maxWidth: 720, margin: '40px auto', fontFamily: 'monospace' }}>
          <h2 style={{ color: '#b91c1c', marginBottom: 12 }}>Ocurrió un error al mostrar esta página</h2>
          <p style={{ marginBottom: 12 }}>{this.state.error.message || String(this.state.error)}</p>
          <button
            className="btn btn-primary btn-sm"
            onClick={() => { this.setState({ error: null }); window.location.assign('/') }}
          >
            Volver al inicio
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
