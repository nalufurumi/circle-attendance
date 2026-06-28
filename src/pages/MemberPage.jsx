import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { loadData, saveData, mkLog } from '../lib/api.js'
import { STATUS_ORDER, STATUS, getColor, applyAccent, DEFAULT_DATA } from '../lib/constants.js'

const AC  = 'var(--accent)'
const ACB = 'var(--accent-bg)'
const ACD = 'var(--accent-dark)'

const Avatar = ({ name, size = 32 }) => (
  <div style={{ width: size, height: size, borderRadius: '50%', background: ACB, color: ACD, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 500, fontSize: size * 0.4, flexShrink: 0 }}>
    {name.slice(0, 1)}
  </div>
)

const Card = ({ children, style = {} }) => (
  <div style={{ background: 'var(--color-background-primary)', borderRadius: 'var(--border-radius-lg)', boxShadow: 'var(--shadow-card)', ...style }}>
    {children}
  </div>
)

export default function MemberPage() {
  const [params] = useSearchParams()
  const [scriptUrl, setScriptUrl] = useState('')
  const [data, setData]           = useState(DEFAULT_DATA)
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState('')
  const [selMember, setSelMember] = useState(null)
  const [saving, setSaving]       = useState(false)

  useEffect(() => {
    const c = params.get('c')
    if (!c) { setError('URLが正しくありません。管理者に共有URLを確認してください。'); setLoading(false); return }
    let url
    try { url = atob(c) } catch { setError('URLが破損しています。'); setLoading(false); return }
    if (!url.startsWith('http')) { setError('URLが無効です。'); setLoading(false); return }
    setScriptUrl(url)
    loadData(url)
      .then(d => { const m = { ...DEFAULT_DATA, ...d }; setData(m); if (m.accentColor) applyAccent(m.accentColor) })
      .catch(() => setError('データの取得に失敗しました。URLを確認してください。'))
      .finally(() => setLoading(false))
  }, [params])

  const cycle = async (evId, member) => {
    const ev = data.events.find(e => e.id === evId)
    if (!ev || saving) return
    const cur = ev.attendance?.[member] || 'unknown'
    const nxt = STATUS_ORDER[(STATUS_ORDER.indexOf(cur) + 1) % STATUS_ORDER.length]

    // Optimistic update
    const newData = {
      ...data,
      events: data.events.map(e => e.id !== evId ? e : {
        ...e, attendance: { ...e.attendance, [member]: nxt }
      }),
    }
    setData(newData)

    // Save + log
    setSaving(true)
    try {
      const log = mkLog({ by: member, type: 'member', eventDate: ev.date, eventName: ev.name, member, before: cur, after: nxt })
      await saveData(scriptUrl, newData, log)
    } catch {
      // revert on failure
      setData(data)
    } finally {
      setSaving(false)
    }
  }

  const getStats = (member) => {
    let p = 0, l = 0, ab = 0, un = 0
    data.events.forEach(ev => {
      const s = ev.attendance?.[member] || 'unknown'
      if (s === 'present') p++; else if (s === 'late') l++; else if (s === 'absent') ab++; else un++
    })
    const rec = data.events.length - un
    return { present: p, late: l, absent: ab, rate: rec > 0 ? Math.round(((p + l) / rec) * 100) : null }
  }

  const sortedEvs = [...(data.events || [])].sort((a, b) => b.date.localeCompare(a.date))

  if (loading) return (
    <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-secondary)', fontFamily: 'var(--font-sans)' }}>
      <i className="ti ti-refresh" style={{ fontSize: 28 }}></i>
      <p style={{ marginTop: 8 }}>読み込み中...</p>
    </div>
  )

  if (error) return (
    <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--color-text-secondary)', fontFamily: 'var(--font-sans)' }}>
      <i className="ti ti-alert-circle" style={{ fontSize: 36, color: 'var(--color-text-danger)' }}></i>
      <p style={{ marginTop: 12, fontWeight: 500 }}>{error}</p>
    </div>
  )

  return (
    <div style={{ fontFamily: 'var(--font-sans)', fontSize: 14, color: 'var(--color-text-primary)', paddingBottom: '2rem' }}>
      {/* Header */}
      <div style={{ background: 'rgba(255,255,255,0.88)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', boxShadow: 'var(--shadow-header)', padding: '12px 16px', position: 'sticky', top: 0, zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <span style={{ color: AC, marginRight: 6 }}>✧</span>
          <span style={{ fontWeight: 500, fontSize: 15 }}>{data.circleName || '出席管理'}</span>
        </div>
        {selMember && (
          <button onClick={() => setSelMember(null)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--color-text-secondary)', fontSize: 12 }}>
            <i className="ti ti-arrow-left" style={{ fontSize: 14, marginRight: 4 }}></i>メンバー選択に戻る
          </button>
        )}
      </div>

      <div style={{ padding: 16 }}>
        {!selMember ? (
          // ── Name selector
          <>
            <p style={{ fontWeight: 500, marginBottom: 4 }}>名前を選んでください</p>
            <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 14 }}>タップして出席状況を確認・入力できます</p>
            {data.members.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--color-text-secondary)' }}>
                <i className="ti ti-users" style={{ fontSize: 36 }}></i>
                <p style={{ marginTop: 8 }}>メンバーがまだいません</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {data.members.map(m => (
                  <button key={m} onClick={() => setSelMember(m)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px', background: 'var(--color-background-primary)', borderRadius: 'var(--border-radius-lg)', boxShadow: 'var(--shadow-card)', cursor: 'pointer', textAlign: 'left' }}>
                    <Avatar name={m} size={36} />
                    <span style={{ fontWeight: 500, fontSize: 13 }}>{m}</span>
                  </button>
                ))}
              </div>
            )}
          </>
        ) : (
          // ── Member dashboard
          <>
            {/* Member header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <Avatar name={selMember} size={42} />
              <div>
                <p style={{ fontWeight: 500, fontSize: 15, margin: 0 }}>{selMember}</p>
                {(() => {
                  const st = getStats(selMember)
                  const rc = st.rate == null ? 'var(--color-text-tertiary)' : st.rate >= 80 ? 'var(--color-text-success)' : st.rate >= 60 ? 'var(--color-text-warning)' : 'var(--color-text-danger)'
                  return <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', margin: 0 }}>
                    出席率 <strong style={{ color: rc }}>{st.rate == null ? '－' : `${st.rate}%`}</strong>　欠席 {st.absent}回
                  </p>
                })()}
              </div>
              {saving && <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--color-text-warning)' }}>保存中...</span>}
            </div>

            {sortedEvs.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--color-text-secondary)' }}>
                <i className="ti ti-calendar" style={{ fontSize: 36 }}></i>
                <p style={{ marginTop: 8 }}>イベントがまだありません</p>
              </div>
            ) : sortedEvs.map(ev => {
              const status = ev.attendance?.[selMember] || 'unknown'
              const s = STATUS[status]
              return (
                <Card key={ev.id} style={{ marginBottom: 8, padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                    <div style={{ width: 4, height: 36, borderRadius: 2, background: getColor(ev.color), flexShrink: 0 }} />
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontWeight: 500, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ev.name}</p>
                      <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', margin: 0 }}>{ev.date} · {ev.type}</p>
                    </div>
                  </div>
                  <button onClick={() => cycle(ev.id, selMember)} style={{ flexShrink: 0, padding: '7px 16px', background: s.bg, border: `0.5px solid ${s.border}`, borderRadius: 'var(--border-radius-md)', cursor: 'pointer', color: s.text, fontSize: 18, fontWeight: 500 }}>
                    {s.label}
                  </button>
                </Card>
              )
            })}
            <p style={{ fontSize: 11, color: 'var(--color-text-tertiary)', textAlign: 'center', marginTop: 12 }}>
              タップで切り替え：○ 出席 → △ 遅刻 → × 欠席 → － 未記入
            </p>
            <div style={{ textAlign: 'center', marginTop: 24, paddingTop: 16, borderTop: '0.5px solid var(--color-border-tertiary)' }}>
              <a href="/report" style={{ fontSize: 12, color: 'var(--color-text-tertiary)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <i className="ti ti-bug" style={{ fontSize: 13 }}></i>バグ報告・お問い合わせ
              </a>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
