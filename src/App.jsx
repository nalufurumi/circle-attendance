import { useState, useEffect, useCallback } from 'react'

// ── Constants ─────────────────────────────────────────────────
const APP_KEY = 'circle-att-v2'
const COLORS = [
  { id: 'pink',   hex: '#D4537E' },
  { id: 'red',    hex: '#E24B4A' },
  { id: 'orange', hex: '#EF9F27' },
  { id: 'green',  hex: '#1D9E75' },
  { id: 'blue',   hex: '#378ADD' },
  { id: 'purple', hex: '#7F77DD' },
  { id: 'teal',   hex: '#0F6E56' },
  { id: 'gray',   hex: '#888780' },
]
const STATUS_ORDER = ['unknown', 'present', 'late', 'absent']
const STATUS = {
  present: { label: '○', short: '出席', bg: 'var(--color-background-success)', text: 'var(--color-text-success)', border: 'var(--color-border-success)' },
  late:    { label: '△', short: '遅刻', bg: 'var(--color-background-warning)', text: 'var(--color-text-warning)', border: 'var(--color-border-warning)' },
  absent:  { label: '×', short: '欠席', bg: 'var(--color-background-danger)',  text: 'var(--color-text-danger)',  border: 'var(--color-border-danger)'  },
  unknown: { label: '－', short: '未記入', bg: 'var(--color-background-secondary)', text: 'var(--color-text-tertiary)', border: 'var(--color-border-tertiary)' },
}
const DOT = { present: '#1D9E75', late: '#BA7517', absent: '#E24B4A', unknown: 'var(--color-border-secondary)' }
const EVENT_TYPES = ['練習', '本番', 'イベント', 'MTG', 'その他']
const PK = '#D4537E', PKB = '#FBEAF0', PKD = '#993556'
const PU = '#7F77DD', PUB = '#EEEDFE', PUD = '#3C3489'
const today = new Date().toISOString().slice(0, 10)

const DEFAULT = { members: [], events: [], config: { adminHash: '', scriptUrl: '' } }

// ── Apps Script code (shown in settings) ─────────────────────
const APPS_SCRIPT = `function doGet(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName("_data") || ss.insertSheet("_data");
  var v = sh.getRange(1,1).getValue();
  return ContentService
    .createTextOutput(v || '{"members":[],"events":[]}')
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName("_data") || ss.insertSheet("_data");
  var payload = JSON.parse(e.postData.contents);
  sh.getRange(1,1).setValue(JSON.stringify(payload.data));
  buildView(ss, payload.data);
  return ContentService
    .createTextOutput('{"ok":true}')
    .setMimeType(ContentService.MimeType.JSON);
}

function buildView(ss, data) {
  var vs = ss.getSheetByName("出席一覧") || ss.insertSheet("出席一覧");
  vs.clearContents();
  if (!data.members.length || !data.events.length) return;
  var evs = data.events.slice().sort(function(a,b){ return a.date.localeCompare(b.date); });
  var hd = ["名前"].concat(evs.map(function(e){ return e.date+" "+e.name; })).concat(["出席率","欠席回数"]);
  vs.getRange(1,1,1,hd.length).setValues([hd]);
  data.members.forEach(function(m,i) {
    var p=0, l=0, ab=0, tot=0;
    var cells = evs.map(function(e) {
      var s = e.attendance[m] || "";
      if (s) tot++;
      if (s==="present"){ p++; return "○"; }
      if (s==="late")   { l++; return "△"; }
      if (s==="absent") { ab++; return "×"; }
      return "－";
    });
    var rate = tot>0 ? Math.round((p+l)/tot*100)+"%" : "－";
    vs.getRange(i+2,1,1,cells.length+3).setValues([[m].concat(cells).concat([rate,ab])]);
  });
}`

// ── Storage ───────────────────────────────────────────────────
function saveLocal(d) {
  try { localStorage.setItem(APP_KEY, JSON.stringify(d)); return true }
  catch { return false }
}
function loadLocal() {
  try { const r = localStorage.getItem(APP_KEY); return r ? JSON.parse(r) : null }
  catch { return null }
}
async function syncToSheets(d, url) {
  if (!url) return
  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ action: 'save', data: d }),
      signal: AbortSignal.timeout(8000),
    })
  } catch {}
}
async function loadFromSheets(url) {
  if (!url) return null
  try {
    const r = await fetch(url + '?action=get', { signal: AbortSignal.timeout(6000) })
    if (r.ok) return await r.json()
  } catch {}
  return null
}

// ── Auth ──────────────────────────────────────────────────────
async function hashPw(pw) {
  if (!pw) return ''
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('idol-salt:' + pw))
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
}

// ── Micro components ──────────────────────────────────────────
const getColor = id => COLORS.find(c => c.id === id)?.hex || PK

const Avatar = ({ name, size = 32 }) => (
  <div style={{ width: size, height: size, borderRadius: '50%', background: PKB, color: PKD, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 500, fontSize: size * 0.4, flexShrink: 0 }}>
    {name.slice(0, 1)}
  </div>
)

const Card = ({ children, style = {} }) => (
  <div style={{ background: 'var(--color-background-primary)', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 'var(--border-radius-lg)', ...style }}>
    {children}
  </div>
)

const SecBtn = ({ children, onClick, style = {} }) => (
  <button onClick={onClick} style={{ padding: '8px 14px', background: 'transparent', border: '0.5px solid var(--color-border-secondary)', borderRadius: 'var(--border-radius-md)', color: 'var(--color-text-secondary)', cursor: 'pointer', fontSize: 13, ...style }}>
    {children}
  </button>
)

// ════════════════════════════════════════════════════════════════
// App
// ════════════════════════════════════════════════════════════════
export default function App() {
  const [data,       setData]       = useState(DEFAULT)
  const [loading,    setLoading]    = useState(true)
  const [saveStatus, setSaveStatus] = useState('idle')
  const [view,       setView]       = useState('member')
  const [adminTab,   setAdminTab]   = useState('events')
  const [authed,     setAuthed]     = useState(false)
  const [selMember,  setSelMember]  = useState(null)
  const [showAddEv,  setShowAddEv]  = useState(false)
  const [showAddMem, setShowAddMem] = useState(false)
  const [expandedEv, setExpandedEv] = useState(null)
  const [newMem,  setNewMem]  = useState('')
  const [newEv,   setNewEv]   = useState({ date: today, name: '', type: '練習', color: 'pink' })
  const [pwInput,     setPwInput]     = useState('')
  const [pwError,     setPwError]     = useState('')
  const [isSettingPw, setIsSettingPw] = useState(false)
  const [chPw,        setChPw]        = useState({ a: '', b: '' })
  const [scriptInput, setScriptInput] = useState('')
  const [scriptMsg,   setScriptMsg]   = useState('')
  const [showScript,  setShowScript]  = useState(false)
  const [copied,      setCopied]      = useState(false)

  // Load: localStorage → Google Sheets (if configured)
  useEffect(() => {
    const init = async () => {
      let d = loadLocal()
      if (d?.config?.scriptUrl) {
        const sd = await loadFromSheets(d.config.scriptUrl)
        if (sd) d = { ...d, ...sd, config: { ...DEFAULT.config, ...(sd.config || {}), scriptUrl: d.config.scriptUrl, adminHash: d.config.adminHash } }
      }
      if (d) {
        const merged = { ...DEFAULT, ...d, config: { ...DEFAULT.config, ...(d.config || {}) } }
        setData(merged)
        setScriptInput(merged.config.scriptUrl || '')
      }
      setLoading(false)
    }
    init()
  }, [])

  const persist = useCallback(async (d) => {
    setSaveStatus('saving')
    const ok = saveLocal(d)
    syncToSheets(d, d.config.scriptUrl) // fire-and-forget
    setSaveStatus(ok ? 'saved' : 'error')
    setTimeout(() => setSaveStatus('idle'), 2200)
  }, [])

  const update = useCallback((d) => { setData(d); persist(d) }, [persist])

  // Auth
  const handleLogin = async () => {
    if (!data.config.adminHash) { setIsSettingPw(true); return }
    const h = await hashPw(pwInput)
    if (h === data.config.adminHash) { setAuthed(true); setPwInput(''); setPwError('') }
    else setPwError('パスワードが違います')
  }
  const handleSetPw = async () => {
    if (!pwInput.trim()) { setPwError('パスワードを入力してください'); return }
    const h = await hashPw(pwInput)
    update({ ...data, config: { ...data.config, adminHash: h } })
    setAuthed(true); setPwInput(''); setIsSettingPw(false)
  }
  const handleChangePw = async () => {
    if (!chPw.a || chPw.a !== chPw.b) return
    const h = await hashPw(chPw.a)
    update({ ...data, config: { ...data.config, adminHash: h } })
    setChPw({ a: '', b: '' })
    setScriptMsg('✓ パスワードを変更しました')
    setTimeout(() => setScriptMsg(''), 2500)
  }

  // CRUD
  const addMember = () => {
    const n = newMem.trim()
    if (!n || data.members.includes(n)) return
    update({ ...data, members: [...data.members, n] })
    setNewMem('')
  }
  const removeMember = name => {
    if (!confirm(`「${name}」を削除しますか？`)) return
    update({ ...data, members: data.members.filter(m => m !== name), events: data.events.map(e => { const a = { ...e.attendance }; delete a[name]; return { ...e, attendance: a } }) })
    if (selMember === name) setSelMember(null)
  }
  const moveMember = (i, d) => {
    const ms = [...data.members]; const j = i + d
    if (j < 0 || j >= ms.length) return
    ;[ms[i], ms[j]] = [ms[j], ms[i]]; update({ ...data, members: ms })
  }
  const addEvent = () => {
    if (!newEv.date || !newEv.name.trim()) return
    const ev = { id: `e${Date.now()}`, date: newEv.date, name: newEv.name.trim(), type: newEv.type, color: newEv.color, attendance: {} }
    update({ ...data, events: [...data.events, ev].sort((a, b) => b.date.localeCompare(a.date)) })
    setNewEv({ date: today, name: '', type: '練習', color: 'pink' })
    setShowAddEv(false); setExpandedEv(ev.id)
  }
  const removeEvent = id => {
    if (!confirm('このイベントを削除しますか？')) return
    update({ ...data, events: data.events.filter(e => e.id !== id) })
    if (expandedEv === id) setExpandedEv(null)
  }
  const cycle = (evId, member) => {
    const upd = { ...data, events: data.events.map(ev => { if (ev.id !== evId) return ev; const cur = ev.attendance[member] || 'unknown'; const nxt = STATUS_ORDER[(STATUS_ORDER.indexOf(cur) + 1) % STATUS_ORDER.length]; return { ...ev, attendance: { ...ev.attendance, [member]: nxt } } }) }
    setData(upd); persist(upd)
  }

  const getStats = () => data.members.map(member => {
    let p = 0, l = 0, ab = 0, un = 0
    data.events.forEach(ev => { const s = ev.attendance[member] || 'unknown'; if (s === 'present') p++; else if (s === 'late') l++; else if (s === 'absent') ab++; else un++ })
    const rec = data.events.length - un, rate = rec > 0 ? Math.round(((p + l) / rec) * 100) : null
    return { member, present: p, late: l, absent: ab, unknown: un, rec, rate }
  }).sort((a, b) => (b.rate ?? -1) - (a.rate ?? -1))

  const exportCSV = () => {
    const evs = [...data.events].sort((a, b) => a.date.localeCompare(b.date))
    const hd = ['名前', ...evs.map(e => `${e.date}_${e.name}`), '出席率', '出席', '遅刻', '欠席']
    const rows = data.members.map(m => {
      let p = 0, l = 0, ab = 0, tot = 0
      const cells = evs.map(e => { const s = e.attendance[m] || 'unknown'; if (s !== 'unknown') tot++; if (s === 'present') { p++; return '○' } if (s === 'late') { l++; return '△' } if (s === 'absent') { ab++; return '×' } return '－' })
      return [m, ...cells, tot > 0 ? `${Math.round(((p + l) / tot) * 100)}%` : '－', p, l, ab]
    })
    const csv = [hd, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n')
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' }))
    a.download = `出席_${today}.csv`; a.click()
  }

  const sortedEvs = [...data.events].sort((a, b) => b.date.localeCompare(a.date))

  if (loading) return (
    <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
      <i className="ti ti-refresh" style={{ fontSize: 28 }}></i>
      <p style={{ marginTop: 8, fontSize: 14 }}>読み込み中...</p>
    </div>
  )

  const SaveDot = () => (
    <span style={{ fontSize: 11, color: saveStatus === 'saving' ? 'var(--color-text-warning)' : saveStatus === 'saved' ? 'var(--color-text-success)' : saveStatus === 'error' ? 'var(--color-text-danger)' : 'transparent' }}>
      {saveStatus === 'saving' ? '保存中' : saveStatus === 'saved' ? '✓' : saveStatus === 'error' ? '!' : '·'}
    </span>
  )

  return (
    <div style={{ fontFamily: 'var(--font-sans)', fontSize: 14, color: 'var(--color-text-primary)', paddingBottom: '2rem' }}>

      {/* ── Header ── */}
      <div style={{ background: 'var(--color-background-primary)', borderBottom: '0.5px solid var(--color-border-tertiary)', padding: '11px 16px', position: 'sticky', top: 0, zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontWeight: 500, fontSize: 15 }}><span style={{ color: PK }}>✧ </span>出席管理</span>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {[{ id: 'member', icon: 'ti-user', label: 'メンバー', ac: PK, ab: PKB, ad: PKD }, { id: 'admin', icon: 'ti-shield', label: '管理者', ac: PU, ab: PUB, ad: PUD }].map(v => (
            <button key={v.id} onClick={() => setView(v.id)} style={{ padding: '5px 11px', borderRadius: 999, fontSize: 12, cursor: 'pointer', background: view === v.id ? v.ab : 'transparent', border: `0.5px solid ${view === v.id ? v.ac : 'var(--color-border-tertiary)'}`, color: view === v.id ? v.ad : 'var(--color-text-secondary)', fontWeight: view === v.id ? 500 : 400 }}>
              <i className={`ti ${v.icon}`} style={{ fontSize: 12, marginRight: 3 }}></i>{v.label}
            </button>
          ))}
          <SaveDot />
        </div>
      </div>

      {/* ════ MEMBER VIEW ════ */}
      {view === 'member' && (
        <div style={{ padding: 16 }}>
          {!selMember ? (
            <>
              <p style={{ fontWeight: 500, marginBottom: 4 }}>名前を選んでください</p>
              <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 12 }}>自分の名前をタップして出席状況を確認・入力できます</p>
              {data.members.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--color-text-secondary)' }}>
                  <i className="ti ti-users" style={{ fontSize: 36 }}></i>
                  <p style={{ marginTop: 8 }}>メンバーがまだいません</p>
                  <p style={{ fontSize: 12, marginTop: 4 }}>管理者に登録を依頼してください</p>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {data.members.map(m => (
                    <button key={m} onClick={() => setSelMember(m)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px', background: 'var(--color-background-primary)', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 'var(--border-radius-lg)', cursor: 'pointer', textAlign: 'left' }}>
                      <Avatar name={m} size={36} /><span style={{ fontWeight: 500, fontSize: 13 }}>{m}</span>
                    </button>
                  ))}
                </div>
              )}
            </>
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <button onClick={() => setSelMember(null)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--color-text-secondary)', padding: 0 }}>
                  <i className="ti ti-arrow-left" style={{ fontSize: 20 }}></i>
                </button>
                <Avatar name={selMember} size={40} />
                <div>
                  <p style={{ fontWeight: 500, fontSize: 15, margin: 0 }}>{selMember}</p>
                  {(() => {
                    const st = getStats().find(s => s.member === selMember)
                    return <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', margin: 0 }}>出席率 <strong style={{ color: st?.rate == null ? 'var(--color-text-tertiary)' : st.rate >= 80 ? 'var(--color-text-success)' : st.rate >= 60 ? 'var(--color-text-warning)' : 'var(--color-text-danger)' }}>{st?.rate == null ? '－' : `${st.rate}%`}</strong>　欠席 {st?.absent ?? 0}回</p>
                  })()}
                </div>
              </div>
              {sortedEvs.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--color-text-secondary)' }}>
                  <i className="ti ti-calendar" style={{ fontSize: 36 }}></i>
                  <p style={{ marginTop: 8 }}>イベントがまだありません</p>
                </div>
              ) : sortedEvs.map(ev => {
                const status = ev.attendance[selMember] || 'unknown'
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
              <p style={{ fontSize: 11, color: 'var(--color-text-tertiary)', textAlign: 'center', marginTop: 12 }}>タップで切り替え：○ 出席 → △ 遅刻 → × 欠席 → － 未記入</p>
            </>
          )}
        </div>
      )}

      {/* ════ ADMIN — Auth gate ════ */}
      {view === 'admin' && !authed && (
        <div style={{ padding: 16 }}>
          <Card style={{ padding: 24, marginTop: 16, maxWidth: 300, marginLeft: 'auto', marginRight: 'auto' }}>
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <i className="ti ti-shield" style={{ fontSize: 36, color: PU }}></i>
              <p style={{ fontWeight: 500, fontSize: 15, marginTop: 8 }}>{isSettingPw ? 'パスワードを設定' : '管理者ログイン'}</p>
              {!isSettingPw && !data.config.adminHash && <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 6 }}>初回：パスワードを設定します</p>}
            </div>
            <input type="password" placeholder={isSettingPw ? '新しいパスワード' : 'パスワード'} value={pwInput}
              onChange={e => setPwInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && (isSettingPw ? handleSetPw() : handleLogin())}
              autoFocus style={{ marginBottom: 8 }} />
            {pwError && <p style={{ color: 'var(--color-text-danger)', fontSize: 12, marginBottom: 8 }}>{pwError}</p>}
            <button onClick={isSettingPw ? handleSetPw : handleLogin} style={{ width: '100%', padding: '9px', background: PU, border: 'none', borderRadius: 'var(--border-radius-md)', color: '#fff', cursor: 'pointer', fontWeight: 500, fontSize: 14 }}>
              {isSettingPw ? '設定する' : 'ログイン'}
            </button>
            {isSettingPw && <button onClick={() => { setIsSettingPw(false); setPwInput(''); setPwError('') }} style={{ width: '100%', padding: '7px', background: 'transparent', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 'var(--border-radius-md)', color: 'var(--color-text-secondary)', cursor: 'pointer', marginTop: 8, fontSize: 13 }}>キャンセル</button>}
          </Card>
        </div>
      )}

      {/* ════ ADMIN — Authed ════ */}
      {view === 'admin' && authed && (
        <>
          <div style={{ background: 'var(--color-background-primary)', borderBottom: '0.5px solid var(--color-border-tertiary)', position: 'sticky', top: 48, zIndex: 9 }}>
            <div style={{ display: 'flex' }}>
              {[{ id: 'events', icon: 'ti-calendar', label: 'イベント' }, { id: 'members', icon: 'ti-users', label: 'メンバー' }, { id: 'stats', icon: 'ti-chart-bar', label: '統計' }, { id: 'settings', icon: 'ti-settings', label: '設定' }].map(t => (
                <button key={t.id} onClick={() => setAdminTab(t.id)} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, padding: '6px 0 10px', border: 'none', borderBottom: adminTab === t.id ? `2px solid ${PU}` : '2px solid transparent', background: 'transparent', color: adminTab === t.id ? PU : 'var(--color-text-secondary)', cursor: 'pointer', fontSize: 11, fontWeight: adminTab === t.id ? 500 : 400 }}>
                  <i className={`ti ${t.icon}`} style={{ fontSize: 18 }}></i>{t.label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ padding: 16 }}>

            {/* EVENTS */}
            {adminTab === 'events' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <span style={{ fontWeight: 500 }}>イベント管理</span>
                  <button onClick={() => setShowAddEv(!showAddEv)} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px', borderRadius: 999, background: PKB, border: 'none', color: PKD, cursor: 'pointer', fontSize: 13, fontWeight: 500 }}>
                    <i className="ti ti-plus" style={{ fontSize: 14 }}></i>追加
                  </button>
                </div>

                {showAddEv && (
                  <Card style={{ padding: 14, marginBottom: 12 }}>
                    <p style={{ fontWeight: 500, marginBottom: 10 }}>新しいイベント</p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                      <div>
                        <p style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginBottom: 4 }}>日付</p>
                        <input type="date" value={newEv.date} onChange={e => setNewEv({ ...newEv, date: e.target.value })} />
                      </div>
                      <div>
                        <p style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginBottom: 4 }}>種別</p>
                        <select value={newEv.type} onChange={e => setNewEv({ ...newEv, type: e.target.value })}>
                          {EVENT_TYPES.map(t => <option key={t}>{t}</option>)}
                        </select>
                      </div>
                    </div>
                    <div style={{ marginBottom: 10 }}>
                      <p style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginBottom: 4 }}>イベント名</p>
                      <input type="text" placeholder="例：6月定期練習" value={newEv.name} onChange={e => setNewEv({ ...newEv, name: e.target.value })} onKeyDown={e => e.key === 'Enter' && addEvent()} />
                    </div>
                    <div style={{ marginBottom: 14 }}>
                      <p style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginBottom: 6 }}>ラベルカラー</p>
                      <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', alignItems: 'center' }}>
                        {COLORS.map(c => (
                          <button key={c.id} onClick={() => setNewEv({ ...newEv, color: c.id })} title={c.id} style={{ width: 24, height: 24, borderRadius: '50%', background: c.hex, border: 'none', cursor: 'pointer', outline: newEv.color === c.id ? `3px solid ${c.hex}` : 'none', outlineOffset: newEv.color === c.id ? -5 : 0, boxSizing: 'border-box' }} />
                        ))}
                        <div style={{ width: 8, height: 24, borderRadius: 4, background: getColor(newEv.color), marginLeft: 4 }} />
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={addEvent} style={{ flex: 1, padding: '8px', background: PK, border: 'none', borderRadius: 'var(--border-radius-md)', color: '#fff', cursor: 'pointer', fontWeight: 500 }}>追加する</button>
                      <SecBtn onClick={() => setShowAddEv(false)}>キャンセル</SecBtn>
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
                  const colorHex = getColor(ev.color)
                  const cnts = {}
                  data.members.forEach(m => { const s = ev.attendance[m]; if (s && s !== 'unknown') cnts[s] = (cnts[s] || 0) + 1 })
                  return (
                    <Card key={ev.id} style={{ marginBottom: 8, overflow: 'hidden' }}>
                      <div onClick={() => setExpandedEv(isOpen ? null : ev.id)} style={{ padding: '12px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                          <div style={{ width: 4, height: 36, borderRadius: 2, background: colorHex, flexShrink: 0 }} />
                          <div style={{ minWidth: 0 }}>
                            <p style={{ fontWeight: 500, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ev.name}</p>
                            <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', margin: 0 }}>{ev.date} · {ev.type}</p>
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                          <div style={{ display: 'flex', gap: 5, fontSize: 12 }}>
                            {cnts.present > 0 && <span style={{ color: 'var(--color-text-success)' }}>○{cnts.present}</span>}
                            {cnts.late > 0 && <span style={{ color: 'var(--color-text-warning)' }}>△{cnts.late}</span>}
                            {cnts.absent > 0 && <span style={{ color: 'var(--color-text-danger)' }}>×{cnts.absent}</span>}
                          </div>
                          <i className={`ti ${isOpen ? 'ti-chevron-up' : 'ti-chevron-down'}`} style={{ fontSize: 16, color: 'var(--color-text-secondary)' }}></i>
                        </div>
                      </div>
                      {isOpen && (
                        <div style={{ borderTop: '0.5px solid var(--color-border-tertiary)', padding: '12px 14px' }}>
                          {data.members.length === 0 ? <p style={{ color: 'var(--color-text-secondary)', textAlign: 'center', fontSize: 13 }}>メンバーを先に登録してください</p> : (
                            <>
                              <p style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginBottom: 10 }}>タップで切り替え：○ 出席 → △ 遅刻 → × 欠席 → － 未記入</p>
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                                {data.members.map(member => {
                                  const st = ev.attendance[member] || 'unknown'; const s = STATUS[st]
                                  return (
                                    <button key={member} onClick={() => cycle(ev.id, member)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', background: s.bg, border: `0.5px solid ${s.border}`, borderRadius: 'var(--border-radius-md)', cursor: 'pointer' }}>
                                      <span style={{ fontSize: 13, color: 'var(--color-text-primary)' }}>{member}</span>
                                      <span style={{ fontSize: 16, fontWeight: 500, color: s.text }}>{s.label}</span>
                                    </button>
                                  )
                                })}
                              </div>
                            </>
                          )}
                          <div style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>{Object.values(ev.attendance).filter(v => v !== 'unknown').length} / {data.members.length} 記録済み</span>
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

            {/* MEMBERS */}
            {adminTab === 'members' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <span style={{ fontWeight: 500 }}>メンバー管理</span>
                  <button onClick={() => setShowAddMem(!showAddMem)} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px', borderRadius: 999, background: PKB, border: 'none', color: PKD, cursor: 'pointer', fontSize: 13, fontWeight: 500 }}>
                    <i className="ti ti-plus" style={{ fontSize: 14 }}></i>追加
                  </button>
                </div>
                {showAddMem && (
                  <Card style={{ padding: 14, marginBottom: 12 }}>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input type="text" placeholder="メンバー名" value={newMem} onChange={e => setNewMem(e.target.value)} onKeyDown={e => e.key === 'Enter' && addMember()} autoFocus />
                      <button onClick={addMember} style={{ padding: '0 16px', background: PK, border: 'none', borderRadius: 'var(--border-radius-md)', color: '#fff', cursor: 'pointer', fontWeight: 500, whiteSpace: 'nowrap' }}>追加</button>
                    </div>
                  </Card>
                )}
                {data.members.length === 0 && <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--color-text-secondary)' }}><i className="ti ti-users" style={{ fontSize: 36 }}></i><p style={{ marginTop: 8 }}>メンバーがいません</p></div>}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {data.members.map((m, i) => (
                    <Card key={m} style={{ padding: '10px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Avatar name={m} /><span style={{ fontWeight: 500 }}>{m}</span>
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

            {/* STATS */}
            {adminTab === 'stats' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <span style={{ fontWeight: 500 }}>統計</span>
                  <button onClick={exportCSV} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px', borderRadius: 999, background: PUB, border: 'none', color: PUD, cursor: 'pointer', fontSize: 12 }}>
                    <i className="ti ti-download" style={{ fontSize: 13 }}></i>CSV書き出し
                  </button>
                </div>
                <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 12 }}>出席率＝（出席＋遅刻）÷ 記録済み回数</p>
                {getStats().length === 0 && <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--color-text-secondary)' }}><i className="ti ti-chart-bar" style={{ fontSize: 36 }}></i><p style={{ marginTop: 8 }}>データがありません</p></div>}
                {getStats().map((s, rank) => {
                  const rc = s.rate === null ? 'var(--color-text-tertiary)' : s.rate >= 80 ? 'var(--color-text-success)' : s.rate >= 60 ? 'var(--color-text-warning)' : 'var(--color-text-danger)'
                  return (
                    <Card key={s.member} style={{ padding: 14, marginBottom: 10 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)', width: 20 }}>#{rank + 1}</span>
                          <Avatar name={s.member} /><span style={{ fontWeight: 500 }}>{s.member}</span>
                        </div>
                        <span style={{ fontSize: 22, fontWeight: 500, color: rc }}>{s.rate === null ? '－' : `${s.rate}%`}</span>
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
                            const st = ev.attendance[s.member] || 'unknown'
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

            {/* SETTINGS */}
            {adminTab === 'settings' && (
              <div>
                <p style={{ fontWeight: 500, marginBottom: 16 }}>設定</p>

                {/* Google Sheets */}
                <Card style={{ padding: 14, marginBottom: 12 }}>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 12 }}>
                    <i className="ti ti-table" style={{ fontSize: 20, color: '#1D9E75', marginTop: 2, flexShrink: 0 }}></i>
                    <div>
                      <p style={{ fontWeight: 500, margin: 0 }}>Google スプレッドシート連携</p>
                      <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 4, lineHeight: 1.6 }}>Apps Script を使って保存のたびにシートを自動更新。無料・設定5分。</p>
                    </div>
                  </div>
                  <p style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginBottom: 4 }}>Web アプリ URL</p>
                  <input type="url" placeholder="https://script.google.com/macros/s/..." value={scriptInput} onChange={e => setScriptInput(e.target.value)} style={{ marginBottom: 8, fontSize: 12 }} />
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => { const d = { ...data, config: { ...data.config, scriptUrl: scriptInput } }; update(d); setScriptMsg('✓ URLを保存しました'); setTimeout(() => setScriptMsg(''), 2500) }} style={{ flex: 1, padding: '7px', background: '#1D9E75', border: 'none', borderRadius: 'var(--border-radius-md)', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 500 }}>
                      保存する
                    </button>
                    {scriptInput && (
                      <button onClick={async () => { const d = await loadFromSheets(scriptInput); if (d) { const m = { ...data, ...d, config: { ...DEFAULT.config, ...(d.config || {}), ...data.config } }; setData(m); setScriptMsg('✓ シートから取得しました') } else setScriptMsg('⚠ 取得できませんでした'); setTimeout(() => setScriptMsg(''), 3000) }} style={{ padding: '7px 12px', background: 'transparent', border: '0.5px solid #1D9E75', borderRadius: 'var(--border-radius-md)', color: '#1D9E75', cursor: 'pointer', fontSize: 12 }}>
                        シートから取得
                      </button>
                    )}
                  </div>
                  {scriptMsg && <p style={{ fontSize: 12, color: scriptMsg.startsWith('⚠') ? 'var(--color-text-warning)' : 'var(--color-text-success)', marginTop: 6 }}>{scriptMsg}</p>}

                  <div style={{ marginTop: 14, borderTop: '0.5px solid var(--color-border-tertiary)', paddingTop: 12 }}>
                    <button onClick={() => setShowScript(!showScript)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: 0, fontSize: 12, color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <i className={`ti ${showScript ? 'ti-chevron-up' : 'ti-chevron-down'}`} style={{ fontSize: 13 }}></i>Apps Script の設定手順を見る
                    </button>
                    {showScript && (
                      <div style={{ marginTop: 10, fontSize: 12, color: 'var(--color-text-secondary)', lineHeight: 1.8 }}>
                        <ol style={{ paddingLeft: 18, margin: '0 0 12px' }}>
                          <li>Google スプレッドシートを新規作成</li>
                          <li>「拡張機能」→「Apps Script」を開く</li>
                          <li>下のコードをすべて貼り付けて保存</li>
                          <li>「デプロイ」→「新しいデプロイ」→「ウェブアプリ」</li>
                          <li>「アクセスできるユーザー」を「全員」に設定してデプロイ</li>
                          <li>表示された URL をコピーして上の欄に貼り付け</li>
                        </ol>
                        <div style={{ position: 'relative' }}>
                          <pre style={{ background: 'var(--color-background-secondary)', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 'var(--border-radius-md)', padding: 10, fontSize: 11, overflow: 'auto', whiteSpace: 'pre', color: 'var(--color-text-primary)', lineHeight: 1.6 }}>{APPS_SCRIPT}</pre>
                          <button onClick={() => { navigator.clipboard.writeText(APPS_SCRIPT); setCopied(true); setTimeout(() => setCopied(false), 2000) }} style={{ position: 'absolute', top: 6, right: 6, padding: '3px 8px', background: 'var(--color-background-primary)', border: '0.5px solid var(--color-border-secondary)', borderRadius: 'var(--border-radius-md)', cursor: 'pointer', fontSize: 11, color: 'var(--color-text-secondary)' }}>
                            {copied ? '✓ コピー済み' : 'コピー'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </Card>

                {/* Change password */}
                <Card style={{ padding: 14, marginBottom: 12 }}>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 12 }}>
                    <i className="ti ti-lock" style={{ fontSize: 20, color: PU }}></i>
                    <p style={{ fontWeight: 500, margin: 0 }}>パスワード変更</p>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <input type="password" placeholder="新しいパスワード" value={chPw.a} onChange={e => setChPw({ ...chPw, a: e.target.value })} />
                    <input type="password" placeholder="確認（もう一度）" value={chPw.b} onChange={e => setChPw({ ...chPw, b: e.target.value })} />
                    {chPw.a && chPw.b && chPw.a !== chPw.b && <p style={{ fontSize: 12, color: 'var(--color-text-danger)' }}>パスワードが一致しません</p>}
                    <button onClick={handleChangePw} disabled={!chPw.a || chPw.a !== chPw.b} style={{ padding: '8px', background: chPw.a && chPw.a === chPw.b ? PU : 'var(--color-background-secondary)', border: 'none', borderRadius: 'var(--border-radius-md)', color: chPw.a && chPw.a === chPw.b ? '#fff' : 'var(--color-text-tertiary)', cursor: chPw.a && chPw.a === chPw.b ? 'pointer' : 'default', fontWeight: 500 }}>変更する</button>
                  </div>
                </Card>

                {scriptMsg && adminTab === 'settings' && <p style={{ fontSize: 12, color: 'var(--color-text-success)', marginBottom: 8 }}>{scriptMsg}</p>}

                <button onClick={() => { setAuthed(false); setPwInput('') }} style={{ width: '100%', padding: '10px', background: 'transparent', border: '0.5px solid var(--color-border-secondary)', borderRadius: 'var(--border-radius-md)', color: 'var(--color-text-secondary)', cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  <i className="ti ti-logout" style={{ fontSize: 15 }}></i>管理者ログアウト
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
