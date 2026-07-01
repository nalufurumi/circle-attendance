// 共通UIコンポーネント — 各ページで重複していた Card / Avatar を集約

export const Card = ({ children, style = {} }) => (
  <div style={{
    background: 'var(--color-background-primary)',
    borderRadius: 'var(--border-radius-lg)',
    boxShadow: 'var(--shadow-card)',
    ...style,
  }}>{children}</div>
)

export const Avatar = ({ name, size = 32, src }) => (
  src ? (
    <img src={src} alt={name} style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
  ) : (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: 'var(--accent-bg)', color: 'var(--accent-dark)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontWeight: 500, fontSize: size * 0.4, flexShrink: 0,
    }}>{(name || '?').slice(0, 1)}</div>
  )
)
