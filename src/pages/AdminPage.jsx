import { useState, useEffect, useRef, useCallback } from 'react'
import { loadData, saveData, getLogs, mkLog } from '../lib/api.js'
import { pingHeartbeat } from '../lib/telemetry.js'
import {
  CLIENT_ID, COLORS, getColor,
  PLAN_ORDER, ACTUAL_ORDER, PLAN_STATUS, ACTUAL_STATUS,
  EVENT_TYPES, ACCENT_PRESETS, applyAccent, isValidHex, GR, GRB, GRD,
  todayStr, DEFAULT_DATA, APPS_SCRIPT, computeStats, isEventStarted,
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
  const [newEv,      setNewEv]      = useState({ date: todayStr(), timeStart: '', timeEnd: '', name: '', type: '練習', color: 'pink', tags: [], memo: '' })
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
  // Events tab extras
  const [tagInput,     setTagInput]     = useState('')
  const [editingEvId,  setEditingEvId]  = useState(null)
  const [memberSort,   setMemberSort]   = useState('registration')  // registration|asc|desc|random
  const [pendingMemberDelete, setPendingMemberDelete] = useState(null)
  const [newTagInput,  setNewTagInput]  = useState('')
  const [evModes,      setEvModes]      = useState({})   // { evId: 'plan' | 'actual' }
  // Stats threshold
  const [threshold,    setThreshold]    = useState(() => data?.alertThreshold ?? '')
  const [notice,       setNotice]       = useState('')
  // Admin confirmation
  const [pendingChange, setPendingChange] = useState(null)  // { evId, ev, member, field, cur, nxt }

  const adminLabel = `${getDisplayName(user)} (${user.email})`
  const availableTags = [...new Set([...(data.globalTags || []), ...data.events.flatMap(e => e.tags || [])])]

  useEffect(() => {
    loadData(scriptUrl)
      .then(d => {
        const m = { ...DEFAULT_DATA, ...d }
        setData(m); setCircleName(m.circleName || ''); setThreshold(m.alertThreshold ?? ''); setNotice(m.notice || '')
        if (m.accentColor) applyAccent(m.accentColor)
        pingHeartbeat({ scriptUrl, role: 'admin', memberCount: m.members?.length ?? 0, eventCount: m.events?.length ?? 0 })
      })
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
    // Merge any newly created tags into globalTags so they persist
    const mergedGlobalTags = [...new Set([...(data.globalTags || []), ...(newEv.tags || [])])]
    if (editingEvId) {
      // Edit existing — preserve attendance
      const nd = {
        ...data,
        globalTags: mergedGlobalTags,
        events: data.events.map(e => e.id !== editingEvId ? e : {
          ...e, date: newEv.date, timeStart: newEv.timeStart || '', timeEnd: newEv.timeEnd || '',
          name: newEv.name.trim(), type: newEv.type, color: newEv.color, tags: newEv.tags || [], memo: newEv.memo || '',
        }).sort((a, b) => b.date.localeCompare(a.date)),
      }
      update(nd, mkLog({ by: adminLabel, type: 'admin', eventDate: newEv.date, eventName: newEv.name.trim(), before: 'イベント編集前', after: 'イベント編集' }))
      setExpandedEv(editingEvId)
    } else {
      const ev = { id: `e${Date.now()}`, date: newEv.date, timeStart: newEv.timeStart || '', timeEnd: newEv.timeEnd || '', name: newEv.name.trim(), type: newEv.type, color: newEv.color, tags: newEv.tags || [], memo: newEv.memo || '', attendance: {} }
      const nd = { ...data, globalTags: mergedGlobalTags, events: [...data.events, ev].sort((a, b) => b.date.localeCompare(a.date)) }
      update(nd, mkLog({ by: adminLabel, type: 'admin', eventDate: ev.date, eventName: ev.name, before: '（未作成）', after: 'イベント追加' }))
      setExpandedEv(ev.id)
    }
    setNewEv({ date: todayStr(), timeStart: '', timeEnd: '', name: '', type: '練習', color: 'pink', tags: [], memo: '' })
    setTagInput(''); setShowAddEv(false); setEditingEvId(null)
  }

  const startEditEvent = (ev) => {
    setNewEv({ date: ev.date, timeStart: ev.timeStart || '', timeEnd: ev.timeEnd || '', name: ev.name, type: ev.type, color: ev.color, tags: ev.tags || [], memo: ev.memo || '' })
    setEditingEvId(ev.id); setShowAddEv(true); setExpandedEv(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  const removeEvent = id => {
    const ev = data.events.find(e => e.id === id)
    if (!ev || !confirm('このイベントを削除しますか？')) return
    update({ ...data, events: data.events.filter(e => e.id !== id) },
      mkLog({ by: adminLabel, type: 'admin', eventDate: ev.date, eventName: ev.name, before: 'イベント存在', after: 'イベント削除' }))
    if (expandedEv === id) setExpandedEv(null)
  }

  // Admin attendance cycle (override)
  const cycleAdmin = (evId, member, field) => {
    const ev = data.events.find(e => e.id === evId); if (!ev) return
    const order = field === 'plan' ? PLAN_ORDER : ACTUAL_ORDER
    const oldAtt = ev.attendance?.[member] || { plan: null, actual: null, reason: null }
    const cur = oldAtt[field] ?? null
    const nxt = order[(order.indexOf(cur) + 1) % order.length]
    setPendingChange({ evId, ev, member, field, cur, nxt, oldAtt })
  }

  const doChange = ({ evId, ev, member, field, nxt, oldAtt, cur }) => {
    const newAtt = { ...oldAtt, [field]: nxt }
    const nd = { ...data, events: data.events.map(e => e.id !== evId ? e : { ...e, attendance: { ...e.attendance, [member]: newAtt } }) }
    update(nd, mkLog({ by: adminLabel, type: 'admin', eventDate: ev.date, eventName: ev.name, member, before: String(cur||'未入力'), after: String(nxt||'未入力') }))
  }

  const saveCircleName = () => {
    const nd = { ...data, circleName }
    update(nd, mkLog({ by: adminLabel, type: 'admin', member: '', before: data.circleName || '（未設定）', after: `団体名: ${circleName}` }))
  }
  const saveNotice = () => {
    update({ ...data, notice }, mkLog({ by: adminLabel, type: 'admin', member: '', before: data.notice||'（未設定）', after: `お知らせ更新` }))
    setSettingsMsg('✓ お知らせを保存しました'); setTimeout(()=>setSettingsMsg(''), 2500)
  }
  const saveThreshold = (val) => {
    const n = val === '' ? null : Number(val)
    update({ ...data, alertThreshold: n }, mkLog({ by: adminLabel, type: 'admin', member: '', before: String(data.alertThreshold??'なし'), after: `アラート閾値: ${n==null?'なし':n+'%'}` }))
  }

  const getStats = () => data.members.map(member => {
    const s = computeStats(data.events, member)
    // keep `rate` as the actual rate for sorting/highlight, plus expose both
    return { ...s, rate: s.actualRate }
  }).sort((a, b) => (b.actualRate ?? -1) - (a.actualRate ?? -1))

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

  // Refresh data when opening requests tab (to catch new member requests)
  useEffect(() => {
    if (tab !== 'requests') return
    loadData(scriptUrl)
      .then(d => setData(prev => ({ ...prev, pendingMembers: d.pendingMembers || [], members: d.members || prev.members })))
      .catch(() => {})
  }, [tab, scriptUrl])

  // Refresh event/attendance data when opening events tab (to reflect member inputs)
  useEffect(() => {
    if (tab !== 'events') return
    loadData(scriptUrl)
      .then(d => setData(prev => {
        // Don't clobber an in-flight save; only merge if no pending change
        return { ...prev, events: d.events || prev.events, members: d.members || prev.members }
      }))
      .catch(() => {})
  }, [tab, scriptUrl])

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
            { id: 'requests',icon: 'ti-user-check',  label: '申請' },
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
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={() => { loadData(scriptUrl).then(d => setData(prev => ({ ...prev, events: d.events || prev.events, members: d.members || prev.members }))).catch(() => {}) }} title="最新の出欠を取得" style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px', borderRadius: 999, background: 'var(--color-background-secondary)', border: 'none', color: 'var(--color-text-secondary)', cursor: 'pointer', fontSize: 13 }}>
                  <i className="ti ti-refresh" style={{ fontSize: 14 }}></i>更新
                </button>
                <button onClick={() => { setEditingEvId(null); setNewEv({ date: todayStr(), timeStart: '', timeEnd: '', name: '', type: '練習', color: 'pink', tags: [], memo: '' }); setShowAddEv(!showAddEv) }} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px', borderRadius: 999, background: ACB, border: 'none', color: ACD, cursor: 'pointer', fontSize: 13, fontWeight: 500 }}>
                  <i className="ti ti-plus" style={{ fontSize: 14 }}></i>追加
                </button>
              </div>
            </div>

            {showAddEv && (
              <Card style={{ padding: 14, marginBottom: 12 }}>
                <p style={{ fontWeight: 500, marginBottom: 10 }}>{editingEvId ? 'イベントを編集' : '新しいイベント'}</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                  <div><p style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginBottom: 4 }}>日付</p><input type="date" value={newEv.date} onChange={e => setNewEv({ ...newEv, date: e.target.value })} /></div>
                  <div><p style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginBottom: 4 }}>種別</p>
                    <select value={newEv.type} onChange={e => setNewEv({ ...newEv, type: e.target.value })}>
                      {EVENT_TYPES.map(t => <option key={t}>{t}</option>)}
                    </select>
                  </div>
                </div>
                {/* Time */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                  <div><p style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginBottom: 4 }}>開始時間（任意）</p><input type="time" value={newEv.timeStart} onChange={e => setNewEv({ ...newEv, timeStart: e.target.value })} /></div>
                  <div><p style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginBottom: 4 }}>終了時間（任意）</p><input type="time" value={newEv.timeEnd} onChange={e => setNewEv({ ...newEv, timeEnd: e.target.value })} /></div>
                </div>
                <div style={{ marginBottom: 10 }}><p style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginBottom: 4 }}>イベント名</p><input type="text" placeholder="例：6月定期練習" value={newEv.name} onChange={e => setNewEv({ ...newEv, name: e.target.value })} /></div>
                {/* Tags */}
                <div style={{ marginBottom: 10 }}>
                  <p style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginBottom: 6 }}>タグ</p>
                  {availableTags.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 6 }}>
                      {availableTags.map(tag => {
                        const sel = (newEv.tags || []).includes(tag)
                        return <button key={tag} onClick={() => setNewEv(p => ({ ...p, tags: sel ? p.tags.filter(t => t !== tag) : [...(p.tags || []), tag] }))} style={{ padding: '3px 10px', borderRadius: 999, fontSize: 12, border: 'none', cursor: 'pointer', background: sel ? AC : 'var(--color-background-secondary)', color: sel ? '#fff' : 'var(--color-text-secondary)' }}>#{tag}</button>
                      })}
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: 6 }}>
                    <input type="text" placeholder="新しいタグを入力して「追加」" value={tagInput} onChange={e => setTagInput(e.target.value)}
                      style={{ flex: 1 }} />
                    <GhostBtn onClick={() => { const t = tagInput.trim().replace(/^#/, ''); if (t) setNewEv(p => ({ ...p, tags: [...(p.tags || []).filter(x => x !== t), t] })); setTagInput('') }}>追加</GhostBtn>
                  </div>
                  <p style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginTop: 4 }}>設定タブでもタグを一括管理できます</p>
                </div>
                {/* Memo */}
                <div style={{ marginBottom: 10 }}>
                  <p style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginBottom: 4 }}>メモ（メンバーに表示）</p>
                  <textarea placeholder="例：衣装持参でお願いします！集合13:45" value={newEv.memo || ''} onChange={e => setNewEv({ ...newEv, memo: e.target.value })} style={{ minHeight: 60 }} />
                </div>
                {/* Color */}
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
                  <PrimaryBtn onClick={addEvent} style={{ flex: 1 }}>{editingEvId ? '更新する' : '追加する'}</PrimaryBtn>
                  <GhostBtn onClick={() => { setShowAddEv(false); setEditingEvId(null); setNewEv({ date: todayStr(), timeStart: '', timeEnd: '', name: '', type: '練習', color: 'pink', tags: [], memo: '' }); setTagInput('') }}>キャンセル</GhostBtn>
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
                        <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', margin: 0 }}>{ev.date}{ev.timeStart ? ` ${ev.timeStart}${ev.timeEnd ? `〜${ev.timeEnd}` : '〜'}` : ''} · {ev.type}</p>
                        {ev.tags?.length>0&&<div style={{ display:'flex', gap:3, flexWrap:'wrap', marginTop:3 }}>{ev.tags.map(t=><span key={t} style={{ fontSize:10, padding:'1px 6px', background:ACB, color:ACD, borderRadius:999 }}>#{t}</span>)}</div>}
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
                          {/* Plan / Actual mode toggle */}
                          {(() => {
                            const mode = evModes[ev.id] || (ev.date > todayStr() ? 'plan' : 'actual')
                            const isUpcoming = ev.date > todayStr()
                            const statusMap = mode==='plan' ? PLAN_STATUS : ACTUAL_STATUS
                            const statusOrder = mode==='plan' ? PLAN_ORDER : ACTUAL_ORDER
                            return (
                              <>
                                <div style={{ display:'flex', gap:6, marginBottom:10, alignItems:'center' }}>
                                  {['plan','actual'].map(m=>(
                                    <button key={m} onClick={()=>setEvModes({...evModes,[ev.id]:m})} style={{ padding:'4px 12px', borderRadius:999, border:'none', cursor:'pointer', fontSize:12, fontWeight:mode===m?500:400, background:mode===m?AC:'var(--color-background-secondary)', color:mode===m?'#fff':'var(--color-text-secondary)' }}>
                                      {m==='plan'?'事前入力':'当日記録'}
                                    </button>
                                  ))}
                                  <span style={{ fontSize:11, color:'var(--color-text-tertiary)', marginLeft:4 }}>{isUpcoming?'（未来のイベント）':'（過去・当日）'}</span>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                                  {data.members.map(member => {
                                    const att = ev.attendance?.[member]||{plan:null,actual:null,reason:null}
                                    const cur = att[mode]??null
                                    const s = statusMap[cur]||statusMap[null]
                                    return (
                                      <div key={member}>
                                        <button onClick={() => cycleAdmin(ev.id, member, mode)} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'8px 10px', background:s.bg, border:`0.5px solid ${s.border}`, borderRadius:'var(--border-radius-md)', cursor:'pointer', width:'100%' }}>
                                          <span style={{ fontSize:13, color:'var(--color-text-primary)' }}>{member}</span>
                                          <span style={{ fontSize:14, fontWeight:500, color:s.text }}>{s.icon} {s.short}</span>
                                        </button>
                                        {att.reason&&<p style={{ fontSize:10, color:'var(--color-text-tertiary)', marginTop:2, paddingLeft:4 }}>理由: {att.reason}</p>}
                                      </div>
                                    )
                                  })}
                                </div>
                              </>
                            )
                          })()}
                        </>
                      )}
                      <div style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>{Object.values(ev.attendance || {}).filter(v => { const a = typeof v === 'string' ? v : (v.actual || v.plan); return a && a !== 'unknown' }).length} / {data.members.length} 入力済み</span>
                        <div style={{ display: 'flex', gap: 12 }}>
                          <button onClick={() => startEditEvent(ev)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 12, color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: 4 }}>
                            <i className="ti ti-edit" style={{ fontSize: 13 }}></i>編集
                          </button>
                          <button onClick={() => removeEvent(ev.id)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 12, color: 'var(--color-text-danger)', display: 'flex', alignItems: 'center', gap: 4 }}>
                            <i className="ti ti-trash" style={{ fontSize: 13 }}></i>削除
                          </button>
                        </div>
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

            {/* Sort controls */}
            {data.members.length > 1 && (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10, alignItems: 'center' }}>
                <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>並び替え:</span>
                {[
                  { id: 'registration', label: '登録順', icon: 'ti-list-numbers' },
                  { id: 'asc',          label: 'あ→ん', icon: 'ti-sort-ascending' },
                  { id: 'desc',         label: 'ん→あ', icon: 'ti-sort-descending' },
                  { id: 'random',       label: 'ランダム', icon: 'ti-arrows-shuffle' },
                ].map(s => (
                  <button key={s.id} onClick={() => {
                    if (s.id === 'random') {
                      const shuffled = [...data.members]
                      for (let i = shuffled.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]] }
                      update({ ...data, members: shuffled }, mkLog({ by: adminLabel, type: 'admin', member: '', before: '', after: 'メンバー並び替え: ランダム' }))
                    } else if (s.id === 'asc') {
                      update({ ...data, members: [...data.members].sort((a, b) => a.localeCompare(b, 'ja')) }, mkLog({ by: adminLabel, type: 'admin', member: '', before: '', after: 'メンバー並び替え: 昇順' }))
                    } else if (s.id === 'desc') {
                      update({ ...data, members: [...data.members].sort((a, b) => b.localeCompare(a, 'ja')) }, mkLog({ by: adminLabel, type: 'admin', member: '', before: '', after: 'メンバー並び替え: 降順' }))
                    }
                    setMemberSort(s.id)
                  }} style={{ display: 'flex', alignItems: 'center', gap: 3, padding: '4px 10px', borderRadius: 999, fontSize: 12, border: 'none', cursor: 'pointer', background: memberSort === s.id ? AC : 'var(--color-background-secondary)', color: memberSort === s.id ? '#fff' : 'var(--color-text-secondary)' }}>
                    <i className={`ti ${s.icon}`} style={{ fontSize: 13 }}></i>{s.label}
                  </button>
                ))}
                <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)', width: '100%' }}>※ 登録順では手動で上下に並び替えできます</span>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {data.members.map((m, i) => (
                <Card key={m} style={{ padding: '10px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: ACB, color: ACD, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 500, fontSize: 14 }}>{m.slice(0, 1)}</div>
                    <span style={{ fontWeight: 500 }}>{m}</span>
                  </div>
                  <div style={{ display: 'flex' }}>
                    {memberSort === 'registration' && [[-1, 'ti-arrow-up'], [1, 'ti-arrow-down']].map(([d, ic]) => (
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
            <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 10 }}>実績出席率＝（開催済の参加＋遅刻）÷（開催済で参加/遅刻予定だった回数）<br />※ 開催前のイベントは実績にカウントされません</p>
            {/* Alert threshold */}
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:14, padding:'8px 12px', background:'var(--color-background-secondary)', borderRadius:'var(--border-radius-md)' }}>
              <i className="ti ti-bell" style={{ fontSize:14, color:'var(--color-text-secondary)' }}></i>
              <span style={{ fontSize:12, color:'var(--color-text-secondary)' }}>実績出席率アラート</span>
              <input type="number" min="0" max="100" placeholder="例：60" value={threshold}
                onChange={e=>setThreshold(e.target.value)}
                onBlur={e=>saveThreshold(e.target.value)}
                style={{ width:60, fontSize:13, padding:'4px 8px', marginLeft:'auto' }} />
              <span style={{ fontSize:12, color:'var(--color-text-secondary)' }}>% 未満を強調</span>
            </div>
            {getStats().length === 0 && <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--color-text-secondary)' }}><i className="ti ti-chart-bar" style={{ fontSize: 36 }}></i><p style={{ marginTop: 8 }}>データがありません</p></div>}
            {getStats().map((s, rank) => {
              const thresh = threshold !== '' ? Number(threshold) : null
              const belowAlert = thresh !== null && s.actualRate !== null && s.actualRate < thresh
              const rc = s.actualRate == null ? 'var(--color-text-tertiary)' : s.actualRate >= 80 ? 'var(--color-text-success)' : s.actualRate >= 60 ? 'var(--color-text-warning)' : 'var(--color-text-danger)'
              return (
                <Card key={s.member} style={{ padding: 14, marginBottom: 10, border: belowAlert ? '1.5px solid var(--color-text-danger)' : undefined }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)', width: 20 }}>#{rank + 1}</span>
                      <div style={{ width: 32, height: 32, borderRadius: '50%', background: ACB, color: ACD, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 500, fontSize: 14 }}>{s.member.slice(0, 1)}</div>
                      <span style={{ fontWeight: 500 }}>{s.member}</span>{belowAlert&&<span style={{ fontSize:11, padding:'1px 7px', background:'var(--color-background-danger)', color:'var(--color-text-danger)', borderRadius:999, fontWeight:500 }}>アラート</span>}
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: 22, fontWeight: 500, color: rc }}>{s.actualRate == null ? '－' : `${s.actualRate}%`}</span>
                      <p style={{ fontSize: 10, color: 'var(--color-text-tertiary)', margin: 0 }}>実績</p>
                    </div>
                  </div>
                  <div style={{ height: 3, background: 'var(--color-background-secondary)', borderRadius: 999, marginBottom: 8, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${s.actualRate ?? 0}%`, background: rc, borderRadius: 999 }} />
                  </div>
                  {/* Predicted rate row */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10, fontSize: 11, color: 'var(--color-text-secondary)' }}>
                    <i className="ti ti-chart-dots" style={{ fontSize: 12 }}></i>
                    予測出席率（予定込み）: <strong style={{ color: 'var(--color-text-primary)' }}>{s.predictedRate == null ? '－' : `${s.predictedRate}%`}</strong>
                    <span style={{ color: 'var(--color-text-tertiary)' }}>（予定総数 {s.planTotal}回）</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 5 }}>
                    {[{ l: '実績参加', v: s.present, bg: 'var(--color-background-success)', c: 'var(--color-text-success)' }, { l: '実績遅刻', v: s.late, bg: 'var(--color-background-warning)', c: 'var(--color-text-warning)' }, { l: '実績欠席', v: s.absent, bg: 'var(--color-background-danger)', c: 'var(--color-text-danger)' }, { l: '実績分母', v: s.heldDenom ?? 0, bg: 'var(--color-background-secondary)', c: 'var(--color-text-tertiary)' }].map(it => (
                      <div key={it.l} style={{ background: it.bg, borderRadius: 'var(--border-radius-md)', padding: '5px 4px', textAlign: 'center' }}>
                        <p style={{ fontSize: 15, fontWeight: 500, color: it.c, margin: 0 }}>{it.v}</p>
                        <p style={{ fontSize: 10, color: it.c, margin: 0 }}>{it.l}</p>
                      </div>
                    ))}
                  </div>
                  {data.events.length > 0 && (
                    <div style={{ marginTop: 10, display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'center' }}>
                      {[...data.events].sort((a, b) => a.date.localeCompare(b.date)).map(ev => {
                        const att = ev.attendance?.[s.member] || {}
                        const actualSt = typeof att === 'string' ? att : (att.actual ?? null)
                        const planSt   = typeof att === 'string' ? null : (att.plan ?? null)
                        const dotColor = actualSt === 'present' ? '#1D9E75' : actualSt === 'late' ? '#BA7517' : actualSt === 'absent' ? '#E24B4A' : null
                        const planColor = !dotColor ? (planSt === 'attending' ? '#1D9E75' : planSt === 'late' ? '#BA7517' : planSt === 'absent' ? '#E24B4A' : null) : null
                        const title = `${ev.date} ${ev.name}：実績=${actualSt || '未'} 予定=${planSt || '未'}`
                        return <div key={ev.id} title={title} style={{ width: 8, height: 8, borderRadius: '50%', background: dotColor || planColor || 'var(--color-border-secondary)', opacity: (dotColor || planColor) ? 1 : 0.2, border: (planColor && !dotColor) ? `1px solid ${planColor}` : 'none', boxSizing: 'border-box' }} />
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

        {/* ══ REQUESTS ══ */}
        {tab === 'requests' && (
          <div>
            <p style={{ fontWeight: 500, marginBottom: 4 }}>メンバー申請</p>
            <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 14 }}>メンバーページから申請されたメンバー候補の一覧です。承認するとメンバーに追加されます。</p>
            {(!data.pendingMembers || data.pendingMembers.length === 0) ? (
              <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--color-text-secondary)' }}>
                <i className="ti ti-user-check" style={{ fontSize: 36 }}></i>
                <p style={{ marginTop: 8 }}>現在申請はありません</p>
                <p style={{ fontSize: 12, marginTop: 4 }}>新しい申請は自動で読み込まれます</p>
              </div>
            ) : data.pendingMembers.map(req => (
              <Card key={req.id} style={{ padding: 14, marginBottom: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontWeight: 500, margin: 0 }}>{req.displayName} <span style={{ fontSize: 12, color: 'var(--color-text-secondary)', fontWeight: 400 }}>（表示名）</span></p>
                    <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', margin: '3px 0' }}>本名: {req.realName}</p>
                    {req.note && <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', margin: '2px 0' }}>備考: {req.note}</p>}
                    <p style={{ fontSize: 11, color: 'var(--color-text-tertiary)', margin: '4px 0 0' }}>{req.at}</p>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    <button onClick={() => {
                      if (data.members.includes(req.displayName)) { alert(`「${req.displayName}」はすでに登録されています`); return }
                      const nd = { ...data, members: [...data.members, req.displayName], pendingMembers: data.pendingMembers.filter(r => r.id !== req.id) }
                      update(nd, mkLog({ by: adminLabel, type: 'admin', member: req.displayName, before: '申請中', after: 'メンバー承認' }))
                    }} style={{ padding: '6px 14px', background: GR, border: 'none', borderRadius: 'var(--border-radius-md)', color: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 500 }}>承認</button>
                    <button onClick={() => {
                      if (!confirm(`「${req.displayName}」の申請を却下しますか？`)) return
                      update({ ...data, pendingMembers: data.pendingMembers.filter(r => r.id !== req.id) }, mkLog({ by: adminLabel, type: 'admin', member: req.displayName, before: '申請中', after: '却下' }))
                    }} style={{ padding: '6px 14px', background: 'transparent', border: '0.5px solid var(--color-border-secondary)', borderRadius: 'var(--border-radius-md)', color: 'var(--color-text-secondary)', cursor: 'pointer', fontSize: 12 }}>却下</button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* ══ SETTINGS ══ */}
        {tab === 'settings' && (
          <div>
            <p style={{ fontWeight: 500, marginBottom: 16 }}>設定</p>

            {/* ★ Group name FIRST ★ */}
            <Card style={{ padding: 14, marginBottom: 12 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 12 }}>
                <i className="ti ti-sparkles" style={{ fontSize: 18, color: AC, marginTop: 2 }}></i>
                <p style={{ fontWeight: 500, margin: 0 }}>団体名</p>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <input type="text" placeholder="例：○○コピーダンスサークル" value={circleName} onChange={e => setCircleName(e.target.value)} style={{ flex: 1 }} />
                <button onClick={saveCircleName} style={{ padding: '0 14px', background: GR, border: 'none', borderRadius: 'var(--border-radius-md)', color: '#fff', cursor: 'pointer', fontWeight: 500, whiteSpace: 'nowrap' }}>保存</button>
              </div>
              <p style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginTop: 6 }}>メンバー側の画面タイトルに表示されます</p>
            </Card>

            {/* ★ Notice ★ */}
            <Card style={{ padding: 14, marginBottom: 12 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 10 }}>
                <i className="ti ti-pin" style={{ fontSize: 18, color: AC, marginTop: 2 }}></i>
                <div>
                  <p style={{ fontWeight: 500, margin: 0 }}>お知らせ（ピン留め）</p>
                  <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 3 }}>メンバーページの上部に常時表示されます</p>
                </div>
              </div>
              <textarea placeholder="例：次回は衣装持参でお願いします！&#10;空欄にすると非表示になります" value={notice} onChange={e=>setNotice(e.target.value)} style={{ minHeight:80, marginBottom:8 }} />
              <button onClick={saveNotice} style={{ width:'100%', padding:'7px', background:AC, border:'none', borderRadius:'var(--border-radius-md)', color:'#fff', cursor:'pointer', fontWeight:500, fontSize:13 }}>保存する</button>
            </Card>

            {/* Tag manager */}
            <Card style={{ padding: 14, marginBottom: 12 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 10 }}>
                <i className="ti ti-tags" style={{ fontSize: 18, color: AC, marginTop: 2 }}></i>
                <div>
                  <p style={{ fontWeight: 500, margin: 0 }}>タグ管理</p>
                  <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 3 }}>ここで作ったタグはイベント作成時に選べます</p>
                </div>
              </div>
              {availableTags.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 10 }}>
                  {availableTags.map(tag => {
                    const inUse = data.events.some(e => (e.tags || []).includes(tag))
                    return (
                      <span key={tag} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 10px', background: ACB, color: ACD, borderRadius: 999, fontSize: 12 }}>
                        #{tag}
                        <button onClick={() => {
                          if (inUse) { if (!confirm(`タグ「${tag}」は使用中のイベントがあります。タグ一覧から削除しますか？（イベント側のタグは残ります）`)) return }
                          update({ ...data, globalTags: (data.globalTags || []).filter(t => t !== tag) })
                        }} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: ACD, fontSize: 12, padding: 0, lineHeight: 1 }}>×</button>
                      </span>
                    )
                  })}
                </div>
              )}
              <div style={{ display: 'flex', gap: 6 }}>
                <input type="text" placeholder="新しいタグを入力して「追加」" value={newTagInput} onChange={e => setNewTagInput(e.target.value)}
                  style={{ flex: 1 }} />
                <button onClick={() => { const t = newTagInput.trim().replace(/^#/, ''); if (t && !availableTags.includes(t)) update({ ...data, globalTags: [...(data.globalTags || []), t] }); setNewTagInput('') }} style={{ padding: '0 16px', background: AC, border: 'none', borderRadius: 'var(--border-radius-md)', color: '#fff', cursor: 'pointer', fontWeight: 500, whiteSpace: 'nowrap' }}>追加</button>
              </div>
            </Card>

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

            {/* Restore URL (cross-device) */}
            <Card style={{ padding: 14, marginBottom: 12 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 12 }}>
                <i className="ti ti-device-laptop" style={{ fontSize: 18, color: AC, marginTop: 2, flexShrink: 0 }}></i>
                <div>
                  <p style={{ fontWeight: 500, margin: 0 }}>別デバイスへの復元URL</p>
                  <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 4, lineHeight: 1.6 }}>別のPCやスマホで管理するときは、このURLを開くとスプレッドシートの設定が自動で復元されます。ブックマーク推奨。</p>
                </div>
              </div>
              <div style={{ background: 'var(--color-background-secondary)', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 'var(--border-radius-md)', padding: '8px 10px', fontSize: 12, wordBreak: 'break-all', marginBottom: 8 }}>
                {`${window.location.origin}/admin?restore=${btoa(scriptUrl)}`}
              </div>
              <button onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/admin?restore=${btoa(scriptUrl)}`); setCopied('restore'); setTimeout(() => setCopied(''), 2000) }} style={{ width: '100%', padding: '7px', background: ACB, border: 'none', borderRadius: 'var(--border-radius-md)', color: ACD, cursor: 'pointer', fontWeight: 500, fontSize: 13 }}>
                {copied === 'restore' ? '✓ コピーしました' : '復元URLをコピー'}
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

      {/* ── Confirmation modal ── */}
      {pendingChange && (
        <div style={{ position:'fixed', top:0, left:0, right:0, bottom:0, background:'rgba(0,0,0,0.35)', zIndex:200, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }} onClick={()=>setPendingChange(null)}>
          <div style={{ background:'var(--color-background-primary)', borderRadius:'var(--border-radius-lg)', padding:24, maxWidth:320, width:'100%', boxShadow:'0 8px 32px rgba(0,0,0,0.18)' }} onClick={e=>e.stopPropagation()}>
            <p style={{ fontWeight:500, fontSize:15, marginBottom:6 }}>本当に変更しますか？</p>
            <p style={{ fontSize:13, color:'var(--color-text-secondary)', marginBottom:4 }}>
              <strong>{pendingChange.member}</strong> の{pendingChange.field==='plan'?'事前入力':'当日記録'}
            </p>
            <div style={{ display:'flex', alignItems:'center', gap:10, background:'var(--color-background-secondary)', borderRadius:'var(--border-radius-md)', padding:'10px 14px', marginBottom:16 }}>
              <span style={{ fontSize:16 }}>{(pendingChange.field==='plan'?PLAN_STATUS:ACTUAL_STATUS)[pendingChange.cur]?.icon||'－'}</span>
              <span style={{ fontSize:13, color:'var(--color-text-secondary)' }}>{(pendingChange.field==='plan'?PLAN_STATUS:ACTUAL_STATUS)[pendingChange.cur]?.label||'未入力'}</span>
              <i className="ti ti-arrow-right" style={{ fontSize:14, color:'var(--color-text-tertiary)', margin:'0 4px' }}></i>
              <span style={{ fontSize:16 }}>{(pendingChange.field==='plan'?PLAN_STATUS:ACTUAL_STATUS)[pendingChange.nxt]?.icon||'－'}</span>
              <span style={{ fontSize:13, fontWeight:500, color:(pendingChange.field==='plan'?PLAN_STATUS:ACTUAL_STATUS)[pendingChange.nxt]?.text||'var(--color-text-primary)' }}>{(pendingChange.field==='plan'?PLAN_STATUS:ACTUAL_STATUS)[pendingChange.nxt]?.label||'未入力'}</span>
            </div>
            <div style={{ display:'flex', gap:8 }}>
              <button onClick={()=>{doChange(pendingChange);setPendingChange(null)}} style={{ flex:1, padding:'10px', background:AC, border:'none', borderRadius:'var(--border-radius-md)', color:'#fff', cursor:'pointer', fontWeight:500, fontSize:14 }}>変更する</button>
              <button onClick={()=>setPendingChange(null)} style={{ flex:1, padding:'10px', background:'transparent', border:'0.5px solid var(--color-border-secondary)', borderRadius:'var(--border-radius-md)', color:'var(--color-text-secondary)', cursor:'pointer', fontSize:14 }}>キャンセル</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Member delete confirmation ── */}
      {pendingMemberDelete && (
        <div style={{ position:'fixed', top:0, left:0, right:0, bottom:0, background:'rgba(0,0,0,0.35)', zIndex:200, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }} onClick={()=>setPendingMemberDelete(null)}>
          <div style={{ background:'var(--color-background-primary)', borderRadius:'var(--border-radius-lg)', padding:24, maxWidth:320, width:'100%', boxShadow:'0 8px 32px rgba(0,0,0,0.18)' }} onClick={e=>e.stopPropagation()}>
            <div style={{ textAlign:'center', marginBottom:14 }}>
              <i className="ti ti-alert-triangle" style={{ fontSize:32, color:'var(--color-text-danger)' }}></i>
            </div>
            <p style={{ fontWeight:500, fontSize:15, marginBottom:6, textAlign:'center' }}>メンバーを削除しますか？</p>
            <p style={{ fontSize:13, color:'var(--color-text-secondary)', marginBottom:16, textAlign:'center', lineHeight:1.7 }}>
              <strong>{pendingMemberDelete}</strong> を削除すると、<br />このメンバーの全イベントの出欠記録も削除されます。<br />この操作は元に戻せません。
            </p>
            <div style={{ display:'flex', gap:8 }}>
              <button onClick={()=>doRemoveMember(pendingMemberDelete)} style={{ flex:1, padding:'10px', background:'var(--color-text-danger)', border:'none', borderRadius:'var(--border-radius-md)', color:'#fff', cursor:'pointer', fontWeight:500, fontSize:14 }}>削除する</button>
              <button onClick={()=>setPendingMemberDelete(null)} style={{ flex:1, padding:'10px', background:'transparent', border:'0.5px solid var(--color-border-secondary)', borderRadius:'var(--border-radius-md)', color:'var(--color-text-secondary)', cursor:'pointer', fontSize:14 }}>キャンセル</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── AdminPage (root) ──────────────────────────────────────────
export default function AdminPage() {
  const [user,      setUser]      = useState(getStoredUser)
  const [scriptUrl, setScriptUrl] = useState(() => {
    const u = getStoredUser(); return u ? getStoredScript(u.sub) : ''
  })

  // Handle ?restore=<base64 script url> for cross-device setup
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const restore = params.get('restore')
    if (!restore) return
    try {
      const url = atob(restore)
      if (url.startsWith('https://script.google.com')) {
        const u = getStoredUser()
        if (u) {
          localStorage.setItem(`circle_script_${u.sub}`, url)
          setScriptUrl(url)
        } else {
          sessionStorage.setItem('pending_restore', url)
        }
        window.history.replaceState({}, '', '/admin')
      }
    } catch {}
  }, [])

  const handleCredential = useCallback((response) => {
    const payload = parseJwt(response.credential)
    const u = { sub: payload.sub, email: payload.email, name: payload.name, picture: payload.picture }
    localStorage.setItem('circle_admin', JSON.stringify(u))
    setUser(u)
    const pending = sessionStorage.getItem('pending_restore')
    if (pending) {
      localStorage.setItem(`circle_script_${u.sub}`, pending)
      sessionStorage.removeItem('pending_restore')
      setScriptUrl(pending)
    } else {
      setScriptUrl(getStoredScript(u.sub))
    }
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
