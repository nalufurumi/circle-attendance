import { useState } from 'react'
import { Card } from '../components/ui.jsx'
import { useSearchParams, useNavigate } from 'react-router-dom'
// accent colors come from CSS variables set by applyAccent()
const AC  = 'var(--accent)'
const ACB = 'var(--accent-bg)'
const ACD = 'var(--accent-dark)'

const APP_VER     = '2.2.0'
const CONTACT     = 'nalufurumi@gmail.com'
const BUG_URL     = import.meta.env.VITE_BUG_REPORT_URL || ''

const TYPES = [
  { id: 'adopt',   label: '✨ 導入相談',   desc: '自分のサークルで使ってみたい' },
  { id: 'bug',     label: '🐛 バグ報告',   desc: '動かない・おかしい挙動' },
  { id: 'feature', label: '💡 機能要望',   desc: 'あったら嬉しい機能' },
  { id: 'other',   label: '💬 その他',     desc: 'ご意見・お問い合わせ' },
]


export default function ReportPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const initialType = TYPES.some(t => t.id === params.get('type')) ? params.get('type') : 'bug'
  const [type,    setType]    = useState(initialType)
  const [message, setMessage] = useState('')
  const [steps,   setSteps]   = useState('')
  const [email,   setEmail]   = useState('')
  const [status,  setStatus]  = useState('idle') // idle|sending|sent|error

  const submit = async () => {
    if (!message.trim()) return
    setStatus('sending')

    const payload = {
      at:      new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' }),
      type,
      message: message.trim(),
      steps:   steps.trim(),
      email:   email.trim(),
      version: APP_VER,
      ua:      navigator.userAgent,
      url:     window.location.href,
    }

    if (BUG_URL) {
      try {
        await fetch(BUG_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain' },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(10000),
        })
        setStatus('sent')
      } catch { setStatus('error') }
    } else {
      // Fallback: mailto
      const body = `【種別】${type}\n【内容】${message}\n\n【再現手順】\n${steps || '（未記入）'}\n\n【連絡先】${email || '（未記入）'}\n\n【バージョン】${APP_VER}\n【環境】${navigator.userAgent}`
      window.location.href = `mailto:${CONTACT}?subject=[出席管理 v${APP_VER}] ${TYPES.find(t=>t.id===type)?.label}&body=${encodeURIComponent(body)}`
      setStatus('sent')
    }
  }

  return (
    <div style={{ fontFamily: 'var(--font-sans)', fontSize: 14, color: 'var(--color-text-primary)', paddingBottom: '2rem', background: 'var(--color-background-tertiary)', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ background: 'rgba(255,255,255,0.88)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', boxShadow: 'var(--shadow-header)', padding: '12px 16px', position: 'sticky', top: 0, zIndex: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
        <button
          onClick={() => {
            // Same-origin referrer (came from within the app, e.g. /demo or /admin) → go back in history.
            // Otherwise (direct link, bookmark, new tab) → don't guess; just stay, no admin shortcut.
            if (document.referrer && new URL(document.referrer).origin === window.location.origin && window.history.length > 1) {
              navigate(-1)
            }
          }}
          style={{ color: 'var(--color-text-secondary)', background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center' }}
        >
          <i className="ti ti-arrow-left" style={{ fontSize: 16 }}></i>
        </button>
        <span style={{ color: AC }}>✧</span>
        <span style={{ fontWeight: 500, fontSize: 15 }}>バグ報告・お問い合わせ</span>
      </div>

      <div style={{ padding: 16, maxWidth: 480, margin: '0 auto' }}>
        {status === 'sent' ? (
          // ── 送信完了 ──
          <Card style={{ padding: '2.5rem', textAlign: 'center', marginTop: 24 }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
            <p style={{ fontWeight: 500, fontSize: 18, marginBottom: 8 }}>送信しました！</p>
            <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', lineHeight: 1.7, marginBottom: 24 }}>
              ご報告ありがとうございます。<br />
              開発者がメールで確認し、対応します。
            </p>
            <button onClick={() => { setStatus('idle'); setMessage(''); setSteps(''); setEmail('') }} style={{ padding: '8px 24px', background: ACB, border: 'none', borderRadius: 999, color: ACD, cursor: 'pointer', fontWeight: 500 }}>
              もう1件送る
            </button>
          </Card>
        ) : (
          <>
            {/* Type selector */}
            <div style={{ marginBottom: 16, marginTop: 16 }}>
              <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 8 }}>種別を選んでください</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {TYPES.map(t => (
                  <button key={t.id} onClick={() => setType(t.id)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: type === t.id ? ACB : 'var(--color-background-primary)', border: `0.5px solid ${type === t.id ? AC : 'var(--color-border-tertiary)'}`, borderRadius: 'var(--border-radius-md)', cursor: 'pointer', textAlign: 'left' }}>
                    <span style={{ fontSize: 18 }}>{t.label.split(' ')[0]}</span>
                    <div>
                      <p style={{ fontWeight: 500, fontSize: 13, color: type === t.id ? ACD : 'var(--color-text-primary)', margin: 0 }}>{t.label.slice(2)}</p>
                      <p style={{ fontSize: 11, color: 'var(--color-text-secondary)', margin: 0 }}>{t.desc}</p>
                    </div>
                    {type === t.id && <i className="ti ti-check" style={{ marginLeft: 'auto', color: AC, fontSize: 16 }}></i>}
                  </button>
                ))}
              </div>
            </div>

            {/* Form */}
            <Card style={{ padding: 16, marginBottom: 12 }}>
              <div style={{ marginBottom: 14 }}>
                <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 6 }}>
                  {type === 'adopt' ? '団体名や人数など、わかる範囲で教えてください *' : type === 'bug' ? '発生した問題を教えてください *' : type === 'feature' ? '要望の内容を教えてください *' : 'お問い合わせ内容 *'}
                </p>
                <textarea
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  placeholder={type === 'adopt' ? '例：○○大学の△△サークルです。メンバー15人くらいで使ってみたいです' : type === 'bug' ? '例：メンバーを追加しようとしたら画面が白くなった' : type === 'feature' ? '例：メンバーごとに色を設定したい' : 'ご自由にどうぞ'}
                  style={{ width: '100%', minHeight: 100, padding: '8px 10px', border: '0.5px solid var(--color-border-secondary)', borderRadius: 'var(--border-radius-md)', background: 'var(--color-background-primary)', color: 'var(--color-text-primary)', fontFamily: 'var(--font-sans)', fontSize: 14, resize: 'vertical', boxSizing: 'border-box' }}
                />
              </div>

              {type === 'bug' && (
                <div style={{ marginBottom: 14 }}>
                  <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 6 }}>再現手順（任意）</p>
                  <textarea
                    value={steps}
                    onChange={e => setSteps(e.target.value)}
                    placeholder={'例：\n1. 管理者ページを開く\n2. メンバーを追加しようとする\n3. ボタンを押したら…'}
                    style={{ width: '100%', minHeight: 80, padding: '8px 10px', border: '0.5px solid var(--color-border-secondary)', borderRadius: 'var(--border-radius-md)', background: 'var(--color-background-primary)', color: 'var(--color-text-primary)', fontFamily: 'var(--font-sans)', fontSize: 13, resize: 'vertical', boxSizing: 'border-box' }}
                  />
                </div>
              )}

              <div style={{ marginBottom: 16 }}>
                <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 6 }}>返信先メールアドレス（任意）</p>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" style={{ width: '100%', boxSizing: 'border-box' }} />
                <p style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginTop: 4 }}>{type === 'adopt' ? '導入のご案内のため、できれば記入をお願いします' : '記入した場合、開発者から返信することがあります'}</p>
              </div>

              {status === 'error' && (
                <div style={{ background: 'var(--color-background-danger)', border: '0.5px solid var(--color-border-danger)', borderRadius: 'var(--border-radius-md)', padding: '8px 12px', marginBottom: 10 }}>
                  <p style={{ color: 'var(--color-text-danger)', fontSize: 12 }}>
                    送信に失敗しました。直接メールでご連絡ください：{CONTACT}
                  </p>
                </div>
              )}

              <button
                onClick={submit}
                disabled={!message.trim() || status === 'sending'}
                style={{ width: '100%', padding: '10px', background: message.trim() ? AC : 'var(--color-background-secondary)', border: 'none', borderRadius: 'var(--border-radius-md)', color: message.trim() ? '#fff' : 'var(--color-text-tertiary)', cursor: message.trim() ? 'pointer' : 'default', fontWeight: 500, fontSize: 14, transition: 'background 0.2s' }}
              >
                {status === 'sending' ? '送信中...' : '送信する'}
              </button>
            </Card>

            {/* Contact info */}
            <Card style={{ padding: 14 }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <i className="ti ti-mail" style={{ fontSize: 18, color: AC, marginTop: 2, flexShrink: 0 }}></i>
                <div>
                  <p style={{ fontWeight: 500, margin: 0, marginBottom: 4 }}>直接お問い合わせ</p>
                  <a href={`mailto:${CONTACT}`} style={{ color: AC, fontSize: 13, textDecoration: 'none' }}>{CONTACT}</a>
                  <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 4, lineHeight: 1.6 }}>
                    フォームが使えない場合はメールで直接ご連絡ください。
                  </p>
                </div>
              </div>
            </Card>

            {/* App version */}
            <p style={{ textAlign: 'center', fontSize: 11, color: 'var(--color-text-tertiary)', marginTop: 16 }}>
              出席管理アプリ v{APP_VER}
            </p>
          </>
        )}
      </div>
    </div>
  )
}
