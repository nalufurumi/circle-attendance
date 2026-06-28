import { useState, useEffect, useRef, useCallback } from 'react'
import { loadData, saveData, getLogs, mkLog } from '../lib/api.js'
import {
  CLIENT_ID, COLORS, getColor, STATUS_ORDER, STATUS, DOT,
  EVENT_TYPES, ACCENT_PRESETS, applyAccent, isValidHex, GR, GRB, GRD,
  todayStr, DEFAULT_DATA, APPS_SCRIPT,
} from '../lib/constants.js'

// CSS variable shortcuts — resolved dynamically via applyAccent()
const AC  = 'var(--accent)'
const ACB = 'var(--accent-bg)'
const ACD = 'var(--accent-dark)'

// ── Helpers ───────────────────────────────────────────────────
function parseJwt(token) {
  // UTF-8 対応デコード（atob は ASCII のみのため TextDecoder を使用）
  const b64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
  const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0))
  return JSON.parse(new TextDecoder('utf-8').decode(bytes))
}
function getStoredUser() {
  try { return JSON.parse(localStorage.getItem('circle_admin')) } catch { return null }
}
function getStoredScript(sub) {
  return localStorage.getItem(`circle_script_${sub}`) || ''
}
/** displayName（任意設定）があればそれを、なければ Google アカウント名を返す */
function getDisplayName(user) {
  return user?.displayName?.trim() || user?.name || user?.email || '管理者'
}

// ── Micro UI ──────────────────────────────────────────────────
const Avatar = ({ name, size = 32, src }) => (
  src
    ? <img src={src} alt={name} style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
    : <div style={{ width: size, height: size, borderRadius: '50%', background: ACB, color: ACD, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 500, fontSize: size * 0.4, flexShrink: 0 }}>{name.slice(0, 1)}</div>
)
const Card = ({ children, style = {} }) => (
  <div style={{ background: 'var(--color-background-primary)', borderRadius: 'var(--border-radius-lg)', boxShadow: 'var(--shadow-card)', ...style }}>{children}</div>
)
const PrimaryBtn = ({ children, onClick, color = AC, style = {} }) => (
  <button onClick={onClick} style={{ padding: '8px', background: color, border: 'none', borderRadius: 'var(--border-radius-md)', color: '#fff', cursor: 'pointer', fontWeight: 500, ...style }}>{children}</button>
)
const GhostBtn = ({ children, onClick, style = {} }) => (
  <button onClick={onClick} style={{ padding: '7px 14px', background: 'transparent', border: '0.5px solid var(--color-border-secondary)', borderRadius: 'var(--border-radius-md)', color: 'var(--color-text-secondary)', cursor: 'pointer', fontSize: 13, ...style }}>{children}</button>
)

// ── Sign-In view ──────────────────────────────────────────────
function SignInView({ onCredential }) {
  const btnRef = useRef(null)
  useEffect(() => {
    const init = () => {
      if (!window.google?.accounts?.id) { setTimeout(init, 150); return }
      window.google.accounts.id.initialize({ client_id: CLIENT_ID, callback: onCredential, auto_select: false })
      if (btnRef.current) {
        window.google.accounts.id.renderButton(btnRef.current, { theme: 'outline', size: 'large', locale: 'ja', text: 'signin_with', shape: 'rectangular' })
      }
    }
    init()
  }, [onCredential])

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', background: 'var(--color-background-tertiary)' }}>
      <Card style={{ padding: '2.5rem 2rem', maxWidth: 340, width: '100%', textAlign: 'center' }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>✧</div>
        <h1 style={{ fontSize: 22, fontWeight: 500, margin: '0 0 6px' }}>出席管理</h1>
        <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 28, lineHeight: 1.6 }}>
          サークル管理者はGoogleアカウントでログインしてください。<br />
          データはあなた自身のGoogleスプレッドシートに保存されます。
        </p>
        <div ref={btnRef} style={{ display: 'flex', justifyContent: 'center' }} />
      </Card>
    </div>
  )
}

// ── Onboarding view ───────────────────────────────────────────
function OnboardingView({ user, onSetScript, onSignOut }) {
  const [url, setUrl]       = useState('')
  const [copied, setCopied] = useState(false)
  const [show, setShow]     = useState(false)
  const [err, setErr]       = useState('')
  const [testing, setTest]  = useState(false)

  const handleSave = async () => {
    if (!url.trim().startsWith('https://script.google.com')) { setErr('正しいApps Script URLを入力してください'); return }
    setTest(true); setErr('')
    try {
      const d = await loadData(url.trim())
      if (d) { onSetScript(url.trim()) }
      else setErr('データの取得に失敗しました。URLを確認してください。')
    } catch { setErr('接続できませんでした。URLを確認してデプロイ設定を見直してください。') }
    finally { setTest(false) }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-background-tertiary)', padding: '1rem', fontFamily: 'var(--font-sans)' }}>
      <div style={{ maxWidth: 480, margin: '0 auto' }}>
        {/* User header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 0', marginBottom: 16 }}>
          <Avatar name={user.name} src={user.picture} size={36} />
          <div>
            <p style={{ fontWeight: 500, margin: 0 }}>{user.name}</p>
            <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', margin: 0 }}>{user.email}</p>
          </div>
          <button onClick={onSignOut} style={{ marginLeft: 'auto', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 12, color: 'var(--color-text-secondary)' }}>
            <i className="ti ti-logout" style={{ fontSize: 14 }}></i>
          </button>
        </div>

        <Card style={{ padding: 20, marginBottom: 12 }}>
          <h2 style={{ fontWeight: 500, fontSize: 16, marginBottom: 6 }}>スプレッドシートを設定</h2>
          <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 20, lineHeight: 1.7 }}>
            このアプリはあなたのGoogleスプレッドシートにデータを保存します。サーバーには何も保存されません。
          </p>

          {/* Step 1 */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
            <div style={{ width: 24, height: 24, borderRadius: '50%', background: GRB, color: GRD, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 500, fontSize: 12, flexShrink: 0 }}>1</div>
            <div style={{ flex: 1 }}>
              <p style={{ fontWeight: 500, marginBottom: 6 }}>Google スプレッドシートに Apps Script を設定</p>
              <div style={{ position: 'relative' }}>
                <pre style={{ background: 'var(--color-background-secondary)', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 'var(--border-radius-md)', padding: '8px 10px', fontSize: 11, overflow: 'auto', whiteSpace: 'pre', maxHeight: 160, margin: 0, color: 'var(--color-text-primary)' }}>
                  {APPS_SCRIPT.slice(0, 200) + '\n...(以下省略)'}
                </pre>
                <button onClick={() => { navigator.clipboard.writeText(APPS_SCRIPT); setCopied(true); setTimeout(() => setCopied(false), 2000) }} style={{ position: 'absolute', top: 5, right: 5, padding: '2px 8px', background: 'var(--color-background-primary)', border: '0.5px solid var(--color-border-secondary)', borderRadius: 'var(--border-radius-md)', cursor: 'pointer', fontSize: 11, color: 'var(--color-text-secondary)' }}>
                  {copied ? '✓ コピー' : 'コピー'}
                </button>
              </div>
              <button onClick={() => setShow(!show)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: 0, fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                <i className={`ti ${show ? 'ti-chevron-up' : 'ti-chevron-down'}`} style={{ fontSize: 12 }}></i>設定手順
              </button>
              {show && (
                <ol style={{ fontSize: 12, color: 'var(--color-text-secondary)', paddingLeft: 18, marginTop: 8, lineHeight: 2 }}>
                  <li>Google スプレッドシートを新規作成</li>
                  <li>「拡張機能」→「Apps Script」を開く</li>
                  <li>上のコードをすべて貼り付けて保存（Ctrl+S）</li>
                  <li>「デプロイ」→「新しいデプロイ」→「ウェブアプリ」</li>
                  <li>「アクセスできるユーザー」を「全員」に設定してデプロイ</li>
                </ol>
              )}
            </div>
          </div>

          {/* Step 2 */}
          <div style={{ display: 'flex', gap: 10 }}>
            <div style={{ width: 24, height: 24, borderRadius: '50%', background: GRB, color: GRD, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 500, fontSize: 12, flexShrink: 0 }}>2</div>
            <div style={{ flex: 1 }}>
              <p style={{ fontWeight: 500, marginBottom: 8 }}>デプロイ後のURL を貼り付けて接続</p>
              <input type="url" placeholder="https://script.google.com/macros/s/..." value={url} onChange={e => setUrl(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSave()} style={{ marginBottom: 8 }} />
              {err && <p style={{ fontSize: 12, color: 'var(--color-text-danger)', marginBottom: 8 }}>{err}</p>}
              <PrimaryBtn onClick={handleSave} color={GR} style={{ width: '100%', opacity: testing ? 0.7 : 1 }}>
                {testing ? '接続確認中...' : '接続して開始'}
              </PrimaryBtn>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}

// ── Dashboard ─────────────────────────────────────────────────
function Dashboard({ user, scriptUrl, onSignOut, onChangeScript, onUpdateUser }) {
  const [data,       setData]       = useState(DEFAULT_DATA)
  const [loading,    setLoading]    = useState(true)
  const [saveStatus, setSaveStatus] = useState('idle')
  const [tab,        setTab]        = useState('events')
  // Events tab
  const [showAddEv,  setShowAddEv]  = useState(false)
  const [expandedEv, setExpandedEv] = useState(null)
  const [newEv,      setNewEv]      = useState({ date: todayStr(), name: '', type: '練習', color: 'pink' })
  // Members tab
  const [showAddMem, setShowAddMem] = useState(false)
  const [newMem,     setNewMem]     = useState('')
  // Log tab
  const [logs,       setLogs]       = useState([])
  const [logsLoading,setLogsLoading]= useState(false)
  // Settings
  const [circleName,   setCircleName]   = useState('')
  const [displayName,  setDisplayName]  = useState(user.displayName || '')
  const [newScript,    setNewScript]    = useState(scriptUrl)
  const [copied,       setCopied]       = useState('')
  const [scriptCopied, setScriptCopied] = useState(false)
  const [showScript,   setShowScript]   = useState(false)
  const [settingsMsg,  setSettingsMsg]  = useState('')
  const [customHex,    setCustomHex]    = useState(() => {
    const ac = data?.accentColor
    return (typeof ac === 'string' && ac.startsWith('#')) ? ac : ''
  })

  const adminLabel = `${getDisplayName(user)} (${user.email})`

  useEffect(() => {
    loadData(scriptUrl)
      .then(d => { const m = { ...DEFAULT_DATA, ...d }; setData(m); setCircleName(m.circleName || ''); if (m.accentColor) applyAccent(m.accentColor) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [scriptUrl])

  const persist = useCallback(async (newData, logEntry = null) => {
    setSaveStatus('saving')
    try { await saveData(scriptUrl, newData, logEntry); setSaveStatus('saved') }
    catch { setSaveStatus('error') }
    setTimeout(() => setSaveStatus('idle'), 2200)
  }, [scriptUrl])

  const update = useCallback((newData, logEntry = null) => { setData(newData); persist(newData, logEntry) }, [persist])

  // ── CRUD ──
  const addMember = () => {
    const n = newMem.trim()
    if (!n || data.members.includes(n)) return
    const nd = { ...data, members: [...data.members, n] }
    update(nd, mkLog({ by: adminLabel, type: 'admin', member: n, before: '（未登録）', after: 'メンバー追加' }))
    setNewMem('')
  }
  const removeMember = name => {
    if (!confirm(`「${name}」を削除しますか？`)) return
    const nd = { ...data, members: data.members.filter(m => m !== name), events: data.events.map(e => { const a = { ...e.attendance }; delete a[name]; return { ...e, attendance: a } }) }
    update(nd, mkLog({ by: adminLabel, type: 'admin', member: name, before: 'メンバー存在', after: 'メンバー削除' }))
  }
  const moveMember = (i, d) => {
    const ms = [...data.members]; const j = i + d
    if (j < 0 || j >= ms.length) return
    ;[ms[i], ms[j]] = [ms[j], ms[i]]; update({ ...data, members: ms })
  }
  const addEvent = () => {
    if (!newEv.date || !newEv.name.trim()) return
    const ev = { id: `e${Date.now()}`, date: newEv.date, name: newEv.name.trim(), type: newEv.type, color: newEv.color, attendance: {} }
    const nd = { ...data, events: [...data.events, ev].sort((a, b) => b.date.localeCompare(a.date)) }
    update(nd, mkLog({ by: adminLabel, type: 'admin', eventDate: ev.date, eventName: ev.name, before: '（未作成）', after: 'イベント追加' }))
    setNewEv({ date: todayStr(), name: '', type: '練習', color: 'pink' }); setShowAddEv(false); setExpandedEv(ev.id)
  }
  const removeEvent = id => {
    const ev = data.events.find(e => e.id === id)
    if (!ev || !confirm('このイベントを削除しますか？')) return
    update({ ...data, events: data.events.filter(e => e.id !== id) },
      mkLog({ by: adminLabel, type: 'admin', eventDate: ev.date, eventName: ev.name, before: 'イベント存在', after: 'イベント削除' }))
    if (expandedEv === id) setExpandedEv(null)
  }

  // Admin attendance cycle (override)
  const cycleAdmin = (evId, member) => {
    const ev = data.events.find(e => e.id === evId)
    if (!ev) return
    const cur = ev.attendance?.[member] || 'unknown'
    const nxt = STATUS_ORDER[(STATUS_ORDER.indexOf(cur) + 1) % STATUS_ORDER.length]
    const nd = { ...data, events: data.events.map(e => e.id !== evId ? e : { ...e, attendance: { ...e.attendance, [member]: nxt } }) }
    update(nd, mkLog({ by: adminLabel, type: 'admin', eventDate: ev.date, eventName: ev.name, member, before: cur, after: nxt }))
  }

  const saveCircleName = () => {
    const nd = { ...data, circleName }
    update(nd, mkLog({ by: adminLabel, type: 'admin', member: '', before: data.circleName || '（未設定）', after: `サークル名: ${circleName}` }))
  }

  const getStats = () => data.members.map(member => {
    let p = 0, l = 0, ab = 0, un = 0
    data.events.forEach(ev => { const s = ev.attendance?.[member] || 'unknown'; if (s === 'present') p++; else if (s === 'late') l++; else if (s === 'absent') ab++; else un++ })
    const rec = data.events.length - un, rate = rec > 0 ? Math.round(((p + l) / rec) * 100) : null
    return { member, present: p, late: l, absent: ab, unknown: un, rec, rate }
  }).sort((a, b) => (b.rate ?? -1) - (a.rate ?? -1))

  const exportCSV = () => {
    const evs = [...data.events].sort((a, b) => a.date.localeCompare(b.date))
    const hd = ['名前', ...evs.map(e => `${e.date}_${e.name}`), '出席率', '出席', '遅刻', '欠席']
    const rows = data.members.map(m => {
      let p = 0, l = 0, ab = 0, tot = 0
      const cells = evs.map(e => { const s = e.attendance?.[m] || 'unknown'; if (s !== 'unknown') tot++; if (s === 'present') { p++; return '○' } if (s === 'late') { l++; return '△' } if (s === 'absent') { ab++; return '×' } return '－' })
      return [m, ...cells, tot > 0 ? `${Math.round(((p + l) / tot) * 100)}%` : '－', p, l, ab]
    })
    const csv = [hd, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n')
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' }))
    a.download = `出席_${todayStr()}.csv`; a.click()
  }

  const loadLogs = async () => {
    setLogsLoading(true)
    const ls = await getLogs(scriptUrl)
    setLogs(ls)
    setLogsLoading(false)
  }
  useEffect(() => { if (tab === 'log') loadLogs() }, [tab])

  const shareUrl = `${window.location.origin}/member?c=${btoa(scriptUrl)}`
  const sortedEvs = [...data.events].sort((a, b) => b.date.localeCompare(a.date))

  if (loading) return <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-secondary)' }}><i className="ti ti-refresh" style={{ fontSize: 28 }}></i><p style={{ marginTop: 8 }}>読み込み中...</p></div>

  const SaveDot = () => (
    <span style={{ fontSize: 11, color: saveStatus === 'saving' ? 'var(--color-text-warning)' : saveStatus === 'saved' ? 'var(--color-text-success)' : saveStatus === 'error' ? 'var(--color-text-danger)' : 'transparent' }}>
      {saveStatus === 'saving' ? '保存中' : saveStatus === 'saved' ? '✓' : saveStatus === 'error' ? '！' : '·'}
    </span>
  )

  return (
    <div style={{ fontFamily: 'var(--font-sans)', fontSize: 14, color: 'var(--color-text-primary)', paddingBottom: '2rem' }}>
      {/* Header */}
      <div style={{ background: 'rgba(255,255,255,0.88)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', boxShadow: 'var(--shadow-header)', padding: '10px 16px', position: 'sticky', top: 0, zIndex: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ color: AC }}>✧</span>
        <span style={{ fontWeight: 500, fontSize: 15, flex: 1 }}>{data.circleName || '出席管理'}</span>
        <SaveDot />
        <Avatar name={getDisplayName(user)} src={user.picture} size={28} />
        <span style={{ fontSize: 13, color: 'var(--color-text-secondary)', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{getDisplayName(user)}</span>
        <button onClick={onSignOut} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--color-text-secondary)', padding: 0 }}>
          <i className="ti ti-logout" style={{ fontSize: 16 }}></i>
        </button>
      </div>

      {/* Tab bar */}
      <div style={{ background: 'rgba(255,255,255,0.88)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', boxShadow: 'var(--shadow-header)', position: 'sticky', top: 48, zIndex: 9 }}>
        <div style={{ display: 'flex' }}>
          {[
            { id: 'events',  icon: 'ti-calendar',   label: 'イベント' },
            { id: 'members', icon: 'ti-users',       label: 'メンバー' },
            { id: 'stats',   icon: 'ti-chart-bar',   label: '統計' },
            { id: 'log',     icon: 'ti-history',     label: 'ログ' },
            { id: 'settings',icon: 'ti-settings',    label: '設定' },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, padding: '6px 0 10px', border: 'none', borderBottom: tab === t.id ? '2px solid var(--accent)' : '2px solid transparent', background: 'transparent', color: tab === t.id ? AC : 'var(--color-text-secondary)', cursor: 'pointer', fontSize: 10, fontWeight: tab === t.id ? 500 : 400 }}>
              <i className={`ti ${t.icon}`} style={{ fontSize: 17 }}></i>{t.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: 16 }}>

        {/* ══ EVENTS ══ */}
        {tab === 'events' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span style={{ fontWeight: 500 }}>イベント管理</span>
              <button onClick={() => setShowAddEv(!showAddEv)} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px', borderRadius: 999, background: ACB, border: 'none', color: ACD, cursor: 'pointer', fontSize: 13, fontWeight: 500 }}>
                <i className="ti ti-plus" style={{ fontSize: 14 }}></i>追加
              </button>
            </div>

            {showAddEv && (
              <Card style={{ padding: 14, marginBottom: 12 }}>
                <p style={{ fontWeight: 500, marginBottom: 10 }}>新しいイベント</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                  <div><p style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginBottom: 4 }}>日付</p><input type="date" value={newEv.date} onChange={e => setNewEv({ ...newEv, date: e.target.value })} /></div>
                  <div><p style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginBottom: 4 }}>種別</p>
                    <select value={newEv.type} onChange={e => setNewEv({ ...newEv, type: e.target.value })}>
                      {EVENT_TYPES.map(t => <option key={t}>{t}</option>)}
                    </select>
                  </div>
                </div>
                <div style={{ marginBottom: 10 }}><p style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginBottom: 4 }}>イベント名</p><input type="text" placeholder="例：6月定期練習" value={newEv.name} onChange={e => setNewEv({ ...newEv, name: e.target.value })} onKeyDown={e => e.key === 'Enter' && addEvent()} /></div>
                <div style={{ marginBottom: 14 }}>
                  <p style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginBottom: 6 }}>ラベルカラー</p>
                  <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', alignItems: 'center' }}>
                    {COLORS.map(c => (
                      <button key={c.id} onClick={() => setNewEv({ ...newEv, color: c.id })} style={{ width: 24, height: 24, borderRadius: '50%', background: c.hex, border: 'none', cursor: 'pointer', outline: newEv.color === c.id ? `3px solid ${c.hex}` : 'none', outlineOffset: newEv.color === c.id ? -5 : 0, boxSizing: 'border-box' }} />
                    ))}
                    <div style={{ width: 8, height: 24, borderRadius: 4, background: getColor(newEv.color), marginLeft: 4 }} />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <PrimaryBtn onClick={addEvent} style={{ flex: 1 }}>追加する</PrimaryBtn>
                  <GhostBtn onClick={() => setShowAddEv(false)}>キャンセル</GhostBtn>
                </div>
              </Card>
            )}

            {sortedEvs.length === 0 && !showAddEv && (
              <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--color-text-secondary)' }}>
                <i className="ti ti-calendar" style={{ fontSize: 36 }}></i><p style={{ marginTop: 8 }}>イベントがまだありません</p>
              </div>
            )}

            {sortedEvs.map(ev => {
              const isOpen = expandedEv === ev.id
              const cnts = {}; data.members.forEach(m => { const s = ev.attendance?.[m]; if (s && s !== 'unknown') cnts[s] = (cnts[s] || 0) + 1 })
              return (
                <Card key={ev.id} style={{ marginBottom: 8, overflow: 'hidden' }}>
                  <div onClick={() => setExpandedEv(isOpen ? null : ev.id)} style={{ padding: '12px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                      <div style={{ width: 4, height: 36, borderRadius: 2, background: getColor(ev.color), flexShrink: 0 }} />
                      <div style={{ minWidth: 0 }}>
                        <p style={{ fontWeight: 500, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ev.name}</p>
                        <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', margin: 0 }}>{ev.date} · {ev.type}</p>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                      <div style={{ display: 'flex', gap: 5, fontSize: 12 }}>
                        {cnts.present > 0 && <span style={{ color: 'var(--color-text-success)' }}>○{cnts.present}</span>}
                        {cnts.late    > 0 && <span style={{ color: 'var(--color-text-warning)' }}>△{cnts.late}</span>}
                        {cnts.absent  > 0 && <span style={{ color: 'var(--color-text-danger)'  }}>×{cnts.absent}</span>}
                      </div>
                      <i className={`ti ${isOpen ? 'ti-chevron-up' : 'ti-chevron-down'}`} style={{ fontSize: 16, color: 'var(--color-text-secondary)' }}></i>
                    </div>
                  </div>
                  {isOpen && (
                    <div style={{ borderTop: '0.5px solid var(--color-border-tertiary)', padding: '12px 14px' }}>
                      {data.members.length === 0 ? <p style={{ color: 'var(--color-text-secondary)', textAlign: 'center', fontSize: 13 }}>メンバーを先に登録してください</p> : (
                        <>
                          <p style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginBottom: 10 }}>
                            <i className="ti ti-shield" style={{ fontSize: 11, marginRight: 4, color: AC }}></i>
                            管理者モード：全メンバーの出席を編集できます（変更ログに記録）
                          </p>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                            {data.members.map(member => {
                              const st = ev.attendance?.[member] || 'unknown'; const s = STATUS[st]
                              return (
                                <button key={member} onClick={() => cycleAdmin(ev.id, member)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', background: s.bg, border: `0.5px solid ${s.border}`, borderRadius: 'var(--border-radius-md)', cursor: 'pointer' }}>
                                  <span style={{ fontSize: 13, color: 'var(--color-text-primary)' }}>{member}</span>
                                  <span style={{ fontSize: 16, fontWeight: 500, color: s.text }}>{s.label}</span>
                                </button>
                              )
                            })}
                          </div>
                        </>
                      )}
                      <div style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>{Object.values(ev.attendance || {}).filter(v => v !== 'unknown').length} / {data.members.length} 記録済み</span>
                        <button onClick={() => removeEvent(ev.id)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 12, color: 'var(--color-text-danger)', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <i className="ti ti-trash" style={{ fontSize: 13 }}></i>削除
                        </button>
                      </div>
                    </div>
                  )}
                </Card>
              )
            })}
          </div>
        )}

        {/* ══ MEMBERS ══ */}
        {tab === 'members' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span style={{ fontWeight: 500 }}>メンバー管理</span>
              <button onClick={() => setShowAddMem(!showAddMem)} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px', borderRadius: 999, background: ACB, border: 'none', color: ACD, cursor: 'pointer', fontSize: 13, fontWeight: 500 }}>
                <i className="ti ti-plus" style={{ fontSize: 14 }}></i>追加
              </button>
            </div>
            {showAddMem && (
              <Card style={{ padding: 14, marginBottom: 12 }}>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input type="text" placeholder="メンバー名" value={newMem} onChange={e => setNewMem(e.target.value)} onKeyDown={e => e.key === 'Enter' && addMember()} autoFocus style={{ flex: 1 }} />
                  <PrimaryBtn onClick={addMember} style={{ padding: '0 16px' }}>追加</PrimaryBtn>
                </div>
              </Card>
            )}
            {data.members.length === 0 && <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--color-text-secondary)' }}><i className="ti ti-users" style={{ fontSize: 36 }}></i><p style={{ marginTop: 8 }}>メンバーがいません</p></div>}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {data.members.map((m, i) => (
                <Card key={m} style={{ padding: '10px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: ACB, color: ACD, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 500, fontSize: 14 }}>{m.slice(0, 1)}</div>
                    <span style={{ fontWeight: 500 }}>{m}</span>
                  </div>
                  <div style={{ display: 'flex' }}>
                    {[[-1, 'ti-arrow-up'], [1, 'ti-arrow-down']].map(([d, ic]) => (
                      <button key={d} onClick={() => moveMember(i, d)} disabled={(d === -1 && i === 0) || (d === 1 && i === data.members.length - 1)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: '4px 6px', opacity: ((d === -1 && i === 0) || (d === 1 && i === data.members.length - 1)) ? 0.2 : 1, color: 'var(--color-text-secondary)' }}>
                        <i className={`ti ${ic}`} style={{ fontSize: 14 }}></i>
                      </button>
                    ))}
                    <button onClick={() => removeMember(m)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: '4px 6px', color: 'var(--color-text-danger)' }}>
                      <i className="ti ti-x" style={{ fontSize: 14 }}></i>
                    </button>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* ══ STATS ══ */}
        {tab === 'stats' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <span style={{ fontWeight: 500 }}>統計</span>
              <button onClick={exportCSV} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px', borderRadius: 999, background: ACB, border: 'none', color: ACD, cursor: 'pointer', fontSize: 12 }}>
                <i className="ti ti-download" style={{ fontSize: 13 }}></i>CSV
              </button>
            </div>
            <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 12 }}>出席率＝（出席＋遅刻）÷ 記録済み回数</p>
            {getStats().length === 0 && <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--color-text-secondary)' }}><i className="ti ti-chart-bar" style={{ fontSize: 36 }}></i><p style={{ marginTop: 8 }}>データがありません</p></div>}
            {getStats().map((s, rank) => {
              const rc = s.rate == null ? 'var(--color-text-tertiary)' : s.rate >= 80 ? 'var(--color-text-success)' : s.rate >= 60 ? 'var(--color-text-warning)' : 'var(--color-text-danger)'
              return (
                <Card key={s.member} style={{ padding: 14, marginBottom: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)', width: 20 }}>#{rank + 1}</span>
                      <div style={{ width: 32, height: 32, borderRadius: '50%', background: ACB, color: ACD, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 500, fontSize: 14 }}>{s.member.slice(0, 1)}</div>
                      <span style={{ fontWeight: 500 }}>{s.member}</span>
                    </div>
                    <span style={{ fontSize: 22, fontWeight: 500, color: rc }}>{s.rate == null ? '－' : `${s.rate}%`}</span>
                  </div>
                  <div style={{ height: 3, background: 'var(--color-background-secondary)', borderRadius: 999, marginBottom: 10, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${s.rate ?? 0}%`, background: rc, borderRadius: 999 }} />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 5 }}>
                    {[{ l: '出席', v: s.present, bg: 'var(--color-background-success)', c: 'var(--color-text-success)' }, { l: '遅刻', v: s.late, bg: 'var(--color-background-warning)', c: 'var(--color-text-warning)' }, { l: '欠席', v: s.absent, bg: 'var(--color-background-danger)', c: 'var(--color-text-danger)' }, { l: '未記入', v: s.unknown, bg: 'var(--color-background-secondary)', c: 'var(--color-text-tertiary)' }].map(it => (
                      <div key={it.l} style={{ background: it.bg, borderRadius: 'var(--border-radius-md)', padding: '5px 4px', textAlign: 'center' }}>
                        <p style={{ fontSize: 15, fontWeight: 500, color: it.c, margin: 0 }}>{it.v}</p>
                        <p style={{ fontSize: 10, color: it.c, margin: 0 }}>{it.l}</p>
                      </div>
                    ))}
                  </div>
                  {data.events.length > 0 && (
                    <div style={{ marginTop: 10, display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'center' }}>
                      {[...data.events].sort((a, b) => a.date.localeCompare(b.date)).map(ev => {
                        const st = ev.attendance?.[s.member] || 'unknown'
                        return <div key={ev.id} title={`${ev.date} ${ev.name}：${STATUS[st].short}`} style={{ width: 8, height: 8, borderRadius: '50%', background: DOT[st], opacity: st === 'unknown' ? 0.2 : 1 }} />
                      })}
                      <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginLeft: 4 }}>{data.events.length}回</span>
                    </div>
                  )}
                </Card>
              )
            })}
          </div>
        )}

        {/* ══ LOG ══ */}
        {tab === 'log' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span style={{ fontWeight: 500 }}>変更ログ</span>
              <button onClick={loadLogs} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px', borderRadius: 999, background: ACB, border: 'none', color: ACD, cursor: 'pointer', fontSize: 12 }}>
                <i className="ti ti-refresh" style={{ fontSize: 13 }}></i>更新
              </button>
            </div>
            <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 12 }}>操作者・種別・変更前後を全記録（最新500件）</p>
            {logsLoading && <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-secondary)' }}><i className="ti ti-refresh" style={{ fontSize: 24 }}></i></div>}
            {!logsLoading && logs.length === 0 && (
              <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--color-text-secondary)' }}>
                <i className="ti ti-history" style={{ fontSize: 36 }}></i>
                <p style={{ marginTop: 8 }}>ログがまだありません</p>
                <p style={{ fontSize: 12, marginTop: 4 }}>出席の入力や管理者の操作でログが記録されます</p>
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {logs.map((log, i) => (
                <Card key={i} style={{ padding: '10px 12px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 11, padding: '1px 7px', borderRadius: 999, background: log.type === 'admin' ? ACB : ACB, color: log.type === 'admin' ? ACD : ACD, fontWeight: 500, flexShrink: 0 }}>
                          {log.type === 'admin' ? '管理者' : 'メンバー'}
                        </span>
                        <span style={{ fontSize: 12, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{log.by}</span>
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        {log.eventName && <span>📅 {log.eventDate} {log.eventName}</span>}
                        {log.member && <span>👤 {log.member}</span>}
                        {(log.before || log.after) && (
                          <span>
                            <span style={{ color: 'var(--color-text-danger)' }}>{log.before}</span>
                            {' → '}
                            <span style={{ color: 'var(--color-text-success)' }}>{log.after}</span>
                          </span>
                        )}
                      </div>
                    </div>
                    <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)', whiteSpace: 'nowrap', flexShrink: 0 }}>{String(log.at).slice(0, 16)}</span>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* ══ SETTINGS ══ */}
        {tab === 'settings' && (
          <div>
            <p style={{ fontWeight: 500, marginBottom: 16 }}>設定</p>

            {/* Display name */}
            <Card style={{ padding: 14, marginBottom: 12 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 12 }}>
                <i className="ti ti-user-circle" style={{ fontSize: 18, color: AC, marginTop: 2 }}></i>
                <div>
                  <p style={{ fontWeight: 500, margin: 0 }}>管理者表示名（任意）</p>
                  <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 4 }}>変更ログやヘッダーに表示される名前。未入力の場合はGoogleアカウント名を使用。</p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <input type="text" placeholder={user.name} value={displayName} onChange={e => setDisplayName(e.target.value)} style={{ flex: 1 }} />
                <button onClick={() => {
                  const newUser = { ...user, displayName: displayName.trim() || null }
                  localStorage.setItem('circle_admin', JSON.stringify(newUser))
                  onUpdateUser(newUser)
                  setSettingsMsg('✓ 表示名を保存しました')
                  setTimeout(() => setSettingsMsg(''), 2500)
                }} style={{ padding: '0 14px', background: AC, border: 'none', borderRadius: 'var(--border-radius-md)', color: '#fff', cursor: 'pointer', fontWeight: 500, whiteSpace: 'nowrap' }}>保存</button>
              </div>
              {settingsMsg && <p style={{ fontSize: 12, color: 'var(--color-text-success)', marginTop: 6 }}>{settingsMsg}</p>}
            </Card>

            {/* Accent color picker */}
            <Card style={{ padding: 14, marginBottom: 12 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 14 }}>
                <i className="ti ti-palette" style={{ fontSize: 18, color: AC, marginTop: 2 }}></i>
                <div>
                  <p style={{ fontWeight: 500, margin: 0 }}>テーマカラー</p>
                  <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 3 }}>選択したカラーはメンバーページにも反映されます</p>
                </div>
              </div>

              {/* Preset swatches */}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
                {ACCENT_PRESETS.map(preset => {
                  const isActive = (data.accentColor || 'rose') === preset.id
                  return (
                    <button
                      key={preset.id}
                      onClick={() => {
                        applyAccent(preset)
                        setCustomHex('')
                        const nd = { ...data, accentColor: preset.id }
                        update(nd, mkLog({ by: adminLabel, type: 'admin', member: '', before: data.accentColor || 'rose', after: `テーマカラー: ${preset.label}` }))
                      }}
                      title={preset.label}
                      style={{
                        width: 38, height: 38, borderRadius: '50%',
                        background: preset.main, border: 'none', cursor: 'pointer',
                        outline: isActive ? `3px solid ${preset.main}` : 'none',
                        outlineOffset: 3, transition: 'transform 0.1s',
                        transform: isActive ? 'scale(1.12)' : 'scale(1)',
                      }}
                    />
                  )
                })}
              </div>

              {/* Divider */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <div style={{ flex: 1, height: '0.5px', background: 'var(--color-border-tertiary)' }} />
                <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>またはカラーコードを入力</span>
                <div style={{ flex: 1, height: '0.5px', background: 'var(--color-border-tertiary)' }} />
              </div>

              {/* Custom hex input */}
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                {/* Color preview circle */}
                <div style={{
                  width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
                  background: isValidHex(customHex) ? customHex : 'var(--color-background-tertiary)',
                  border: '1.5px solid var(--color-border-secondary)',
                  outline: (data.accentColor?.startsWith('#') && data.accentColor === customHex) ? `3px solid ${customHex}` : 'none',
                  outlineOffset: 3, transition: 'background 0.1s',
                }} />

                {/* Native color picker (hidden, triggered by button) */}
                <label title="カラーピッカーを開く" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 36, borderRadius: 'var(--border-radius-md)', border: '1.5px solid var(--color-border-secondary)', background: 'var(--color-background-secondary)', cursor: 'pointer', flexShrink: 0 }}>
                  <i className="ti ti-color-picker" style={{ fontSize: 16, color: 'var(--color-text-secondary)' }}></i>
                  <input
                    type="color"
                    value={isValidHex(customHex) ? customHex : '#E8527A'}
                    onChange={e => {
                      const v = e.target.value
                      setCustomHex(v)
                      applyAccent(v) // live preview
                    }}
                    style={{ position: 'absolute', opacity: 0, width: 0, height: 0, pointerEvents: 'none' }}
                  />
                </label>

                {/* Hex text input */}
                <input
                  type="text"
                  placeholder="#FF1493"
                  value={customHex}
                  maxLength={7}
                  onChange={e => {
                    let v = e.target.value
                    if (v && !v.startsWith('#')) v = '#' + v
                    setCustomHex(v)
                    if (isValidHex(v)) applyAccent(v) // live preview
                  }}
                  style={{ flex: 1, fontFamily: 'ui-monospace, SFMono-Regular, monospace', letterSpacing: 1, borderColor: customHex && !isValidHex(customHex) ? 'var(--color-text-danger)' : undefined }}
                />

                {/* Apply button */}
                <button
                  onClick={() => {
                    if (!isValidHex(customHex)) return
                    applyAccent(customHex)
                    const nd = { ...data, accentColor: customHex }
                    update(nd, mkLog({ by: adminLabel, type: 'admin', member: '', before: data.accentColor || 'rose', after: `テーマカラー: ${customHex}` }))
                  }}
                  disabled={!isValidHex(customHex)}
                  style={{
                    padding: '0 14px', height: 38, background: isValidHex(customHex) ? AC : 'var(--color-background-secondary)',
                    border: 'none', borderRadius: 'var(--border-radius-md)',
                    color: isValidHex(customHex) ? '#fff' : 'var(--color-text-tertiary)',
                    cursor: isValidHex(customHex) ? 'pointer' : 'default',
                    fontWeight: 500, fontSize: 13, whiteSpace: 'nowrap', flexShrink: 0,
                    transition: 'background 0.15s',
                  }}
                >
                  適用
                </button>
              </div>
              {customHex && !isValidHex(customHex) && (
                <p style={{ fontSize: 11, color: 'var(--color-text-danger)', marginTop: 6 }}>
                  正しい形式で入力してください（例：#FF1493）
                </p>
              )}
            </Card>

            {/* Circle name */}
            <Card style={{ padding: 14, marginBottom: 12 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 12 }}>
                <i className="ti ti-sparkles" style={{ fontSize: 18, color: AC, marginTop: 2 }}></i>
                <p style={{ fontWeight: 500, margin: 0 }}>サークル名</p>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <input type="text" placeholder="例：○○コピーダンスサークル" value={circleName} onChange={e => setCircleName(e.target.value)} style={{ flex: 1 }} />
                <PrimaryBtn onClick={saveCircleName} color={GR} style={{ padding: '0 14px', whiteSpace: 'nowrap' }}>保存</PrimaryBtn>
              </div>
              <p style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginTop: 6 }}>メンバー側の画面タイトルに表示されます</p>
            </Card>

            {/* Share URL */}
            <Card style={{ padding: 14, marginBottom: 12 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 12 }}>
                <i className="ti ti-share" style={{ fontSize: 18, color: AC, marginTop: 2 }}></i>
                <div>
                  <p style={{ fontWeight: 500, margin: 0 }}>メンバー用共有URL</p>
                  <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 4 }}>このURLをLINEなどでメンバーに送ってください。ログイン不要で出席入力できます。</p>
                </div>
              </div>
              <div style={{ background: 'var(--color-background-secondary)', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 'var(--border-radius-md)', padding: '8px 10px', fontSize: 12, wordBreak: 'break-all', marginBottom: 8 }}>
                {shareUrl}
              </div>
              <button onClick={() => { navigator.clipboard.writeText(shareUrl); setCopied('url'); setTimeout(() => setCopied(''), 2000) }} style={{ width: '100%', padding: '7px', background: ACB, border: 'none', borderRadius: 'var(--border-radius-md)', color: ACD, cursor: 'pointer', fontWeight: 500, fontSize: 13 }}>
                {copied === 'url' ? '✓ コピーしました' : 'URLをコピー'}
              </button>
            </Card>

            {/* Apps Script code (re-deploy if needed) */}
            <Card style={{ padding: 14, marginBottom: 12 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 10 }}>
                <i className="ti ti-table" style={{ fontSize: 18, color: GR, marginTop: 2 }}></i>
                <div>
                  <p style={{ fontWeight: 500, margin: 0 }}>Apps Script コード</p>
                  <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 4 }}>再デプロイが必要な場合に使用</p>
                </div>
              </div>
              <button onClick={() => setShowScript(!showScript)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: 0, fontSize: 12, color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: 4, marginBottom: showScript ? 10 : 0 }}>
                <i className={`ti ${showScript ? 'ti-chevron-up' : 'ti-chevron-down'}`} style={{ fontSize: 13 }}></i>コードを表示
              </button>
              {showScript && (
                <div style={{ position: 'relative' }}>
                  <pre style={{ background: 'var(--color-background-secondary)', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 'var(--border-radius-md)', padding: 10, fontSize: 10, overflow: 'auto', maxHeight: 200, whiteSpace: 'pre', color: 'var(--color-text-primary)', lineHeight: 1.6, margin: 0 }}>{APPS_SCRIPT}</pre>
                  <button onClick={() => { navigator.clipboard.writeText(APPS_SCRIPT); setScriptCopied(true); setTimeout(() => setScriptCopied(false), 2000) }} style={{ position: 'absolute', top: 6, right: 6, padding: '2px 8px', background: 'var(--color-background-primary)', border: '0.5px solid var(--color-border-secondary)', borderRadius: 'var(--border-radius-md)', cursor: 'pointer', fontSize: 11, color: 'var(--color-text-secondary)' }}>
                    {scriptCopied ? '✓ コピー' : 'コピー'}
                  </button>
                </div>
              )}
            </Card>

            {/* Change script URL */}
            <Card style={{ padding: 14, marginBottom: 12 }}>
              <p style={{ fontWeight: 500, marginBottom: 10 }}>スプレッドシートURL変更</p>
              <input type="url" value={newScript} onChange={e => setNewScript(e.target.value)} style={{ marginBottom: 8 }} />
              <button onClick={() => { if (newScript.trim()) { localStorage.setItem(`circle_script_${user.sub}`, newScript.trim()); onChangeScript(newScript.trim()) } }} style={{ width: '100%', padding: '7px', background: GR, border: 'none', borderRadius: 'var(--border-radius-md)', color: '#fff', cursor: 'pointer', fontWeight: 500, fontSize: 13 }}>
                URLを変更して再接続
              </button>
            </Card>

            <button onClick={onSignOut} style={{ width: '100%', padding: '10px', background: 'transparent', border: '0.5px solid var(--color-border-secondary)', borderRadius: 'var(--border-radius-md)', color: 'var(--color-text-secondary)', cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <i className="ti ti-logout" style={{ fontSize: 15 }}></i>ログアウト
            </button>
            <div style={{ textAlign: 'center', marginTop: 20, paddingTop: 16, borderTop: '0.5px solid var(--color-border-tertiary)' }}>
              <a href="/report" style={{ fontSize: 12, color: 'var(--color-text-tertiary)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <i className="ti ti-bug" style={{ fontSize: 13 }}></i>バグ報告・お問い合わせ
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── AdminPage (root) ──────────────────────────────────────────
export default function AdminPage() {
  const [user,      setUser]      = useState(getStoredUser)
  const [scriptUrl, setScriptUrl] = useState(() => {
    const u = getStoredUser(); return u ? getStoredScript(u.sub) : ''
  })

  const handleCredential = useCallback((response) => {
    const payload = parseJwt(response.credential)
    const u = { sub: payload.sub, email: payload.email, name: payload.name, picture: payload.picture }
    localStorage.setItem('circle_admin', JSON.stringify(u))
    setUser(u)
    setScriptUrl(getStoredScript(u.sub))
  }, [])

  const handleSetScript = useCallback((url) => {
    if (!user) return
    localStorage.setItem(`circle_script_${user.sub}`, url)
    setScriptUrl(url)
  }, [user])

  const handleSignOut = useCallback(() => {
    if (window.google?.accounts?.id) window.google.accounts.id.disableAutoSelect()
    localStorage.removeItem('circle_admin')
    setUser(null)
    setScriptUrl('')
  }, [])

  const handleUpdateUser = useCallback((updatedUser) => {
    localStorage.setItem('circle_admin', JSON.stringify(updatedUser))
    setUser(updatedUser)
  }, [])

  if (!user)       return <SignInView onCredential={handleCredential} />
  if (!scriptUrl)  return <OnboardingView user={user} onSetScript={handleSetScript} onSignOut={handleSignOut} />
  return <Dashboard user={user} scriptUrl={scriptUrl} onSignOut={handleSignOut} onChangeScript={handleSetScript} onUpdateUser={handleUpdateUser} />
}
