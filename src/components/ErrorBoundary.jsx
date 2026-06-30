import { Component } from 'react'

// Catches render-time errors so the user sees a recoverable message
// instead of a blank white screen. Also logs to the same error store
// the dev tools "エラー" tab reads from.
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, message: '' }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, message: error?.message || String(error) }
  }

  componentDidCatch(error, info) {
    try {
      const KEY = 'circle_errors'
      const list = JSON.parse(localStorage.getItem(KEY) || '[]')
      list.unshift({
        at: new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' }),
        type: 'render',
        message: error?.message || String(error),
        source: '',
        stack: (error?.stack || '') + '\n' + (info?.componentStack || ''),
        url: window.location.pathname,
      })
      localStorage.setItem(KEY, JSON.stringify(list.slice(0, 50)))
    } catch {}
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          fontFamily: '-apple-system, BlinkMacSystemFont, "Hiragino Sans", sans-serif',
          minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: '#ECE8E1', color: '#18182A', padding: 24, textAlign: 'center',
        }}>
          <div style={{ maxWidth: 360 }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
            <p style={{ fontWeight: 500, fontSize: 16, marginBottom: 8 }}>
              一時的な問題が発生しました
            </p>
            <p style={{ fontSize: 13, color: '#6A6880', lineHeight: 1.7, marginBottom: 20 }}>
              ページを再読み込みすると解決することがあります。
              解決しない場合はバグ報告ページからお知らせください。
            </p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
              <button onClick={() => window.location.reload()} style={{ padding: '10px 20px', background: '#E8527A', border: 'none', borderRadius: 10, color: '#fff', cursor: 'pointer', fontWeight: 500 }}>
                再読み込み
              </button>
              <a href="/report" style={{ padding: '10px 20px', background: 'transparent', border: '0.5px solid rgba(24,24,42,0.2)', borderRadius: 10, color: '#6A6880', textDecoration: 'none', fontWeight: 500 }}>
                バグ報告
              </a>
            </div>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
