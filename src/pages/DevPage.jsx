import { useState, useEffect } from 'react'
import { loadData, saveData, getLogs, migrate, CURRENT_DATA_VERSION } from '../lib/api.js'
import { APPS_SCRIPT } from '../lib/constants.js'
import { getErrors, clearErrors } from '../lib/errorLog.js'

const DEV_PW       = import.meta.env.VITE_DEV_PASSWORD || '0000'
const BUG_URL       = import.meta.env.VITE_BUG_REPORT_URL || ''
const ANALYTICS_URL = import.meta.env.VITE_ANALYTICS_URL || ''
const APP_VER      = '2.2.0'
const CONTACT      = 'nalufurumi@gmail.com'
const REPO_URL     = 'https://github.com/nalufurumi/circle-attendance'
const PROD_URL     = 'https://circle-attendance-chi.vercel.app'

const BUG_REPORT_SCRIPT = `const NOTIFY_EMAIL = 'nalufurumi@gmail.com';

function doGet(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName('bugs');
  if (!sh || sh.getLastRow() <= 1) return out('[]');
  var rows = sh.getRange(2, 1, sh.getLastRow()-1, 7).getValues();
  return out(JSON.stringify(rows.map(function(r) {
    return {at:r[0],type:r[1],message:r[2],steps:r[3],email:r[4],version:r[5],ua:r[6]};
  }).reverse()));
}

function doPost(e) {
  var payload = JSON.parse(e.postData.contents);
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName('bugs') || ss.insertSheet('bugs');
  if (sh.getLastRow() === 0) {
    sh.getRange(1,1,1,7).setValues([['日時','種別','内容','再現手順','連絡先','バージョン','UA']]);
  }
  sh.appendRow([payload.at||'',payload.type||'bug',payload.message||'',
    payload.steps||'',payload.email||'',payload.version||'',payload.ua||'']);
  MailApp.sendEmail({
    to: NOTIFY_EMAIL,
    subject: '[出席管理] '+(payload.type==='feature'?'機能要望':'バグ報告')+': '+(payload.message||'').slice(0,50),
    body: '【種別】'+payload.type+'\n【内容】'+payload.message+
          '\n【再現手順】'+(payload.steps||'未記入')+
          '\n【連絡先】'+(payload.email||'未記入')+
          '\n【バージョン】'+payload.version+'\n【UA】'+payload.ua,
  });
  return out('{"ok":true}');
}

function out(t) {
  return ContentService.createTextOutput(t).setMimeType(ContentService.MimeType.JSON);
}\``

const ANALYTICS_SCRIPT = `// 出席管理アプリ — 匿名テレメトリ収集スクリプト
// 個人情報（メンバー名・出欠内容・理由・団体名・メール）は一切受け取りません。
// 受け取るのは「ハッシュ化された団体ID」「役割(admin/member)」「件数」「エラー内容」のみです。

function doGet(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var action = (e.parameter.action || 'summary');

  if (action === 'summary') {
    var hb = ss.getSheetByName('heartbeats');
    var er = ss.getSheetByName('errors');
    var orgs = {}, adminPings = 0, memberPings = 0, maxMembers = {}, maxEvents = {};
    if (hb && hb.getLastRow() > 1) {
      var rows = hb.getRange(2, 1, hb.getLastRow() - 1, 6).getValues();
      rows.forEach(function(r) {
        var orgId = r[1], role = r[2], mc = r[3], ec = r[4];
        orgs[orgId] = true;
        if (role === 'admin') adminPings++; else memberPings++;
        if (!maxMembers[orgId] || mc > maxMembers[orgId]) maxMembers[orgId] = mc;
        if (!maxEvents[orgId] || ec > maxEvents[orgId]) maxEvents[orgId] = ec;
      });
    }
    var totalMembers = 0, totalEvents = 0;
    Object.keys(maxMembers).forEach(function(k) { totalMembers += (maxMembers[k] || 0); });
    Object.keys(maxEvents).forEach(function(k) { totalEvents += (maxEvents[k] || 0); });
    var errorCount = (er && er.getLastRow() > 1) ? er.getLastRow() - 1 : 0;
    return out(JSON.stringify({
      activeOrgs: Object.keys(orgs).length,
      adminPings: adminPings,
      memberPings: memberPings,
      estimatedMembers: totalMembers,
      estimatedEvents: totalEvents,
      errorCount: errorCount,
    }));
  }

  if (action === 'errors') {
    var er2 = ss.getSheetByName('errors');
    if (!er2 || er2.getLastRow() <= 1) return out('[]');
    var n = Math.min(er2.getLastRow() - 1, 100);
    var startRow = er2.getLastRow() - n + 1;
    var rows2 = er2.getRange(startRow, 1, n, 6).getValues();
    return out(JSON.stringify(rows2.map(function(r) {
      return {at:r[0],orgId:r[1],type:r[2],message:r[3],url:r[4],appVersion:r[5]};
    }).reverse()));
  }

  return out('{}');
}

function doPost(e) {
  var payload = JSON.parse(e.postData.contents);
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  if (payload.kind === 'heartbeat') {
    var hb = ss.getSheetByName('heartbeats') || ss.insertSheet('heartbeats');
    if (hb.getLastRow() === 0) {
      hb.getRange(1,1,1,6).setValues([['日時','orgId','role','memberCount','eventCount','appVersion']]);
    }
    hb.appendRow([payload.at||'', payload.orgId||'', payload.role||'',
      payload.memberCount||0, payload.eventCount||0, payload.appVersion||'']);
  } else if (payload.kind === 'error') {
    var er = ss.getSheetByName('errors') || ss.insertSheet('errors');
    if (er.getLastRow() === 0) {
      er.getRange(1,1,1,6).setValues([['日時','orgId','種別','内容','URL','バージョン']]);
    }
    er.appendRow([payload.at||'', payload.orgId||'', payload.type||'',
      String(payload.message||'').slice(0,500), payload.url||'', payload.appVersion||'']);
  }
  return out('{"ok":true}');
}

function out(t) {
  return ContentService.createTextOutput(t).setMimeType(ContentService.MimeType.JSON);
}\``

// ── Dark terminal theme vars ──────────────────────────────────
const T = {
  bg:        '#0a0a12',
  surface:   '#111827',
  border:    '#1e293b',
  border2:   '#334155',
  text:      '#c0c0d0',
  textDim:   '#4b5563',
  textMuted: '#94a3b8',
  purple:    '#7F77DD',
  green:     '#86efac',
  greenBg:   '#0a1a0a',
  greenBord: '#166534',
  red:       '#fca5a5',
  redBg:     '#1a0a0a',
  redBord:   '#7f1d1d',
  blue:      '#93c5fd',
  amber:     '#fbbf24',
}

const mono = { fontFamily: 'ui-monospace, SFMono-Regular, monospace' }

const Label = ({ children }) => (
  <p style={{ color: T.purple, fontSize: 10, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 10, ...mono }}>{children}</p>
)

const Row = ({ k, v, vStyle = {} }) => (
  <div style={{ display: 'flex', gap: 16, padding: '5px 0', borderBottom: `1px solid ${T.border}` }}>
    <span style={{ color: T.textDim, width: 160, flexShrink: 0, ...mono, fontSize: 12 }}>{k}</span>
    <span style={{ color: T.textMuted, fontSize: 12, wordBreak: 'break-all', ...vStyle }}>{v}</span>
  </div>
)

const CodeBlock = ({ children, maxHeight = 300 }) => (
  <pre style={{ background: '#060608', border: `1px solid ${T.border}`, borderRadius: 6, padding: 12, fontSize: 11, overflow: 'auto', maxHeight, color: T.textMuted, whiteSpace: 'pre-wrap', wordBreak: 'break-word', ...mono, margin: 0 }}>
    {children}
  </pre>
)

const StatusBadge = ({ ok, ms }) => (
  <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 11, background: ok ? T.greenBg : T.redBg, color: ok ? T.green : T.red, border: `1px solid ${ok ? T.greenBord : T.redBord}`, ...mono }}>
    {ok ? `✓ OK ${ms}ms` : `✗ FAIL ${ms}ms`}
  </span>
)

// ── DevPage ───────────────────────────────────────────────────
export default function DevPage() {
  const [authed, setAuthed] = useState(false)
  const [pw,     setPw]     = useState('')
  const [pwErr,  setPwErr]  = useState('')
  const [tab,    setTab]    = useState('diag')

  // Shared script URL state
  const [scriptUrl, setScriptUrl] = useState(
    () => {
      // Try to pre-fill from any stored admin
      try {
        const admin = JSON.parse(localStorage.getItem('circle_admin') || 'null')
        if (admin?.sub) return localStorage.getItem(`circle_script_${admin.sub}`) || ''
      } catch {}
      return ''
    }
  )

  // ── Diagnostics ──
  const [diagResult, setDiagResult] = useState(null)
  const [diagLoading, setDiagLoading] = useState(false)
  const [envInfo] = useState(() => ({
    origin: window.location.origin,
    ua: navigator.userAgent,
    lang: navigator.language,
    lsKeys: localStorage.length,
    loggedIn: !!localStorage.getItem('circle_admin'),
    admin: (() => { try { return JSON.parse(localStorage.getItem('circle_admin') || 'null') } catch { return null } })(),
  }))

  // ── Data ──
  const [rawData,     setRawData]     = useState(null)
  const [dataLoading, setDataLoading] = useState(false)
  const [importJson,  setImportJson]  = useState('')
  const [importMsg,   setImportMsg]   = useState('')
  const [logsData,    setLogsData]    = useState(null)
  const [logsLoading, setLogsLoading] = useState(false)
  const [migrateMsg,  setMigrateMsg]  = useState('')

  // ── Errors ──
  const [errors, setErrors] = useState([])

  // ── Cache ──
  const [lsItems, setLsItems] = useState([])

  // ── Bug reports ──
  const [bugs,        setBugs]        = useState(null)
  const [bugsLoading, setBugsLoading] = useState(false)
  const [bugScriptCopied, setBugScriptCopied] = useState(false)

  // ── Auth ──
  const handleAuth = () => {
    if (pw === DEV_PW) { setAuthed(true); setPwErr(''); loadLS() }
    else setPwErr('Wrong password')
  }

  const loadLS = () => {
    const items = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      const val = localStorage.getItem(key) || ''
      items.push({ key, size: val.length, preview: val.slice(0, 120) })
    }
    setLsItems(items.sort((a, b) => b.size - a.size))
  }

  useEffect(() => { if (authed) loadLS() }, [authed])
  useEffect(() => { if (authed) setErrors(getErrors()) }, [authed])

  // ── Bug reports ──
  const fetchBugs = async () => {
    if (!BUG_URL) { setBugs({ _nourl: true }); return }
    setBugsLoading(true)
    try {
      const res = await fetch(BUG_URL + '?action=get', { signal: AbortSignal.timeout(10000) })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setBugs(Array.isArray(data) ? data : [])
    } catch (e) {
      setBugs({ _error: e.message })
    }
    setBugsLoading(false)
  }
  useEffect(() => { if (authed && tab === 'bugs') fetchBugs() }, [authed, tab])

  // ── Analytics (全体分析) ──
  const [analyticsSummary, setAnalyticsSummary] = useState(null)
  const [analyticsErrors,  setAnalyticsErrors]  = useState(null)
  const [analyticsLoading, setAnalyticsLoading] = useState(false)
  const [analyticsScriptCopied, setAnalyticsScriptCopied] = useState(false)

  const fetchAnalytics = async () => {
    if (!ANALYTICS_URL) { setAnalyticsSummary({ _nourl: true }); return }
    setAnalyticsLoading(true)
    try {
      const [s, e] = await Promise.all([
        fetch(ANALYTICS_URL + '?action=summary', { signal: AbortSignal.timeout(10000) }).then(r => r.json()),
        fetch(ANALYTICS_URL + '?action=errors',  { signal: AbortSignal.timeout(10000) }).then(r => r.json()),
      ])
      setAnalyticsSummary(s)
      setAnalyticsErrors(Array.isArray(e) ? e : [])
    } catch (err) {
      setAnalyticsSummary({ _error: err.message })
    }
    setAnalyticsLoading(false)
  }
  useEffect(() => { if (authed && tab === 'analytics') fetchAnalytics() }, [authed, tab])

  // ── Diagnostics ──
  const runDiag = async () => {
    if (!scriptUrl) return
    setDiagLoading(true); setDiagResult(null)
    const t0 = Date.now()
    try {
      // Raw fetch first (15s) so we can distinguish timeout vs CORS vs script error
      const res = await fetch(scriptUrl + '?action=get', { signal: AbortSignal.timeout(15000) })
      const ms = Date.now() - t0
      if (!res.ok) {
        setDiagResult({ ok: false, error: `HTTPエラー ${res.status} ${res.statusText}`, getMs: ms, hint: 'http' })
        setDiagLoading(false); return
      }
      let data
      try { data = await res.json() }
      catch {
        setDiagResult({ ok: false, error: 'レスポンスがJSONではありません（Apps Script側でエラーが発生している可能性）', getMs: ms, hint: 'json' })
        setDiagLoading(false); return
      }
      const migrated = migrate(data)
      const today = new Date().toISOString().slice(0, 10)
      const heldEvents = (migrated.events || []).filter(e => e.date <= today).length
      const upcomingEvents = (migrated.events || []).length - heldEvents
      const pendingCount = (migrated.pendingMembers || []).length
      const noticeSet = !!(migrated.notice || '').trim()
      setDiagResult({
        ok: true, getMs: ms,
        members: migrated.members?.length ?? 0,
        events:  migrated.events?.length  ?? 0,
        heldEvents, upcomingEvents, pendingCount, noticeSet,
        version: data.dataVersion || 1,
        needsMigration: (data.dataVersion || 1) < CURRENT_DATA_VERSION,
        circleName: migrated.circleName || '（未設定）',
        accentColor: migrated.accentColor || 'rose',
      })
    } catch (e) {
      const ms = Date.now() - t0
      let hint = 'unknown', friendly = e.message
      if (e.name === 'TimeoutError' || /abort/i.test(e.message)) {
        hint = 'timeout'
        friendly = `応答なし（${Math.round(ms/1000)}秒でタイムアウト）。Apps Script側で処理が固まっている、未デプロイ、またはデプロイのアクセス権限が「全員」になっていない可能性があります。`
      } else if (/Failed to fetch|NetworkError/i.test(e.message)) {
        hint = 'network'
        friendly = 'ネットワークエラー、またはCORSでブロックされています。Apps ScriptのデプロイでURLが正しいか、アクセス権限が「全員」になっているか確認してください。'
      }
      setDiagResult({ ok: false, error: friendly, raw: e.message, getMs: ms, hint })
    }
    setDiagLoading(false)
  }

  // ── Data ──
  const fetchData = async () => {
    if (!scriptUrl) return
    setDataLoading(true)
    try { setRawData(await loadData(scriptUrl)) }
    catch (e) { setRawData({ _error: e.message }) }
    setDataLoading(false)
  }

  const fetchLogs = async () => {
    if (!scriptUrl) return
    setLogsLoading(true)
    try { setLogsData(await getLogs(scriptUrl)) }
    catch (e) { setLogsData({ _error: e.message }) }
    setLogsLoading(false)
  }

  const downloadJSON = (obj, name) => {
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' }))
    a.download = `${name}_${new Date().toISOString().slice(0, 10)}.json`
    a.click()
  }

  // ── Data health check ──
  const [healthResult, setHealthResult] = useState(null)
  const [healthFixing, setHealthFixing] = useState(false)

  const runHealthCheck = async () => {
    if (!scriptUrl) return
    setHealthResult({ _loading: true })
    try {
      const raw = await loadData(scriptUrl)
      const d = migrate(raw)
      const members = d.members || []
      const events = d.events || []
      const issues = []

      // 1. Orphaned attendance (records for deleted members)
      const orphaned = []
      events.forEach(ev => {
        Object.keys(ev.attendance || {}).forEach(name => {
          if (!members.includes(name)) orphaned.push({ event: ev.name, date: ev.date, member: name })
        })
      })
      if (orphaned.length > 0) issues.push({ id: 'orphaned', level: 'warn', label: '削除済みメンバーの出欠記録', count: orphaned.length, detail: orphaned.slice(0, 5).map(o => `${o.member}（${o.event}）`).join('、'), fixable: true })

      // 2. Duplicate members
      const dupMembers = members.filter((m, i) => members.indexOf(m) !== i)
      if (dupMembers.length > 0) issues.push({ id: 'dupMembers', level: 'error', label: '重複したメンバー名', count: dupMembers.length, detail: [...new Set(dupMembers)].join('、'), fixable: true })

      // 3. Events with no attendance data at all
      const emptyEvents = events.filter(ev => Object.keys(ev.attendance || {}).length === 0)
      if (emptyEvents.length > 0) issues.push({ id: 'emptyEvents', level: 'info', label: '出欠入力が0件のイベント', count: emptyEvents.length, detail: emptyEvents.slice(0, 5).map(e => `${e.name}（${e.date}）`).join('、'), fixable: false })

      // 4. Duplicate event IDs
      const evIds = events.map(e => e.id)
      const dupIds = evIds.filter((id, i) => evIds.indexOf(id) !== i)
      if (dupIds.length > 0) issues.push({ id: 'dupEventIds', level: 'error', label: '重複したイベントID', count: dupIds.length, detail: [...new Set(dupIds)].join('、'), fixable: true })

      // 5. Unused globalTags (declared but never used in any event)
      const usedTags = new Set(events.flatMap(e => e.tags || []))
      const unusedTags = (d.globalTags || []).filter(t => !usedTags.has(t))
      if (unusedTags.length > 0) issues.push({ id: 'unusedTags', level: 'info', label: '未使用のタグ', count: unusedTags.length, detail: unusedTags.map(t => `#${t}`).join('、'), fixable: true })

      // 6. Events missing required fields
      const brokenEvents = events.filter(ev => !ev.date || !ev.name)
      if (brokenEvents.length > 0) issues.push({ id: 'brokenEvents', level: 'error', label: '日付/名前が欠けたイベント', count: brokenEvents.length, detail: `${brokenEvents.length}件`, fixable: false })

      setHealthResult({ ok: true, issues, memberCount: members.length, eventCount: events.length, raw: d })
    } catch (e) {
      setHealthResult({ _error: e.message })
    }
  }

  const applyHealthFix = async () => {
    if (!healthResult?.raw || !scriptUrl) return
    setHealthFixing(true)
    try {
      const d = JSON.parse(JSON.stringify(healthResult.raw))
      const members = d.members || []
      // Fix orphaned attendance
      d.events = (d.events || []).map(ev => {
        const att = {}
        Object.entries(ev.attendance || {}).forEach(([name, v]) => { if (members.includes(name)) att[name] = v })
        return { ...ev, attendance: att }
      })
      // Dedup members (keep first)
      d.members = [...new Set(members)]
      // Dedup event IDs (regenerate collisions)
      const seen = new Set()
      d.events = d.events.map(ev => {
        if (seen.has(ev.id)) { const nid = `e${Date.now()}${Math.floor(Math.random() * 1000)}`; seen.add(nid); return { ...ev, id: nid } }
        seen.add(ev.id); return ev
      })
      // Remove unused globalTags
      const usedTags = new Set(d.events.flatMap(e => e.tags || []))
      d.globalTags = (d.globalTags || []).filter(t => usedTags.has(t))

      await saveData(scriptUrl, d)
      setHealthResult({ ...healthResult, _fixed: true })
      setTimeout(() => runHealthCheck(), 500)
    } catch (e) {
      setHealthResult({ ...healthResult, _fixError: e.message })
    }
    setHealthFixing(false)
  }

  // ── QR code (via external image API, URL-encoded) ──
  const memberUrl = scriptUrl ? `${window.location.origin}/member?c=${btoa(scriptUrl)}` : ''

  const runRestore = async () => {
    if (!scriptUrl || !importJson.trim()) return
    try {
      const d = JSON.parse(importJson)
      await saveData(scriptUrl, d)
      setImportMsg('✓ リストア完了')
    } catch (e) { setImportMsg('⚠ ' + e.message) }
    setTimeout(() => setImportMsg(''), 4000)
  }

  const runMigration = async () => {
    if (!scriptUrl || !rawData) return
    const migrated = migrate(rawData)
    try {
      await saveData(scriptUrl, migrated)
      setRawData(migrated)
      setMigrateMsg(`✓ v${rawData.dataVersion || 1} → v${CURRENT_DATA_VERSION} 完了`)
    } catch (e) { setMigrateMsg('⚠ ' + e.message) }
    setTimeout(() => setMigrateMsg(''), 4000)
  }

  // ── Render: Auth gate ──
  if (!authed) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: T.bg, ...mono }}>
      <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: '2rem', maxWidth: 320, width: '100%', textAlign: 'center' }}>
        <div style={{ fontSize: 36, marginBottom: 10 }}>🛠</div>
        <p style={{ color: '#f0f0f5', fontWeight: 600, fontSize: 16, marginBottom: 4 }}>Developer Tools</p>
        <p style={{ color: T.textDim, fontSize: 11, marginBottom: 24 }}>circle-attendance v{APP_VER}</p>
        <input
          type="password" placeholder="password" value={pw}
          onChange={e => setPw(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAuth()}
          style={{ width: '100%', boxSizing: 'border-box', background: '#060608', border: `1px solid ${T.border2}`, color: '#f0f0f5', padding: '8px 10px', borderRadius: 6, marginBottom: 8, ...mono, fontSize: 13 }}
        />
        {pwErr && <p style={{ color: T.red, fontSize: 12, marginBottom: 8 }}>{pwErr}</p>}
        <button onClick={handleAuth} style={{ width: '100%', padding: '9px', background: T.purple, border: 'none', borderRadius: 6, color: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
          Enter
        </button>
        <p style={{ color: T.textDim, fontSize: 10, marginTop: 14 }}>Authorized access only · <a href="/admin" style={{ color: T.textDim }}>← Admin</a></p>
      </div>
    </div>
  )

  // ── Render: Dashboard ──
  const TABS = [
    { id: 'diag',      label: '診断' },
    { id: 'health',    label: '🩺 健全性' },
    { id: 'errors',    label: errors.length > 0 ? `⚠ エラー (${errors.length})` : '⚠ エラー' },
    { id: 'analytics', label: '📊 全体分析' },
    { id: 'data',      label: 'データ' },
    { id: 'backup',    label: '💾 バックアップ' },
    { id: 'qr',        label: '📱 QR' },
    { id: 'logs',      label: 'ログ' },
    { id: 'bugs',      label: '🐛 バグ報告' },
    { id: 'cache',     label: 'キャッシュ' },
    { id: 'build',     label: 'ビルド' },
  ]

  return (
    <div style={{ fontFamily: 'ui-monospace, SFMono-Regular, monospace', fontSize: 13, background: T.bg, minHeight: '100vh', color: T.text }}>
      {/* Header */}
      <div style={{ background: T.surface, borderBottom: `1px solid ${T.border}`, padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10, position: 'sticky', top: 0, zIndex: 10 }}>
        <span style={{ fontSize: 18 }}>🛠</span>
        <span style={{ color: '#f0f0f5', fontWeight: 600 }}>Dev Tools</span>
        <span style={{ color: T.textDim, fontSize: 11 }}>v{APP_VER}</span>
        <div style={{ flex: 1 }} />
        <a href="/admin" style={{ color: T.textDim, fontSize: 11, textDecoration: 'none' }}>← Admin</a>
        <button onClick={() => setAuthed(false)} style={{ border: `1px solid ${T.border2}`, background: 'transparent', color: T.textDim, cursor: 'pointer', padding: '3px 8px', borderRadius: 4, fontSize: 11 }}>Lock</button>
      </div>

      {/* Script URL input (shared across tabs) */}
      <div style={{ background: '#0d111a', borderBottom: `1px solid ${T.border}`, padding: '8px 16px', display: 'flex', gap: 8, alignItems: 'center' }}>
        <span style={{ color: T.textDim, fontSize: 11, flexShrink: 0 }}>Script URL</span>
        <input
          type="url" value={scriptUrl} onChange={e => setScriptUrl(e.target.value)}
          placeholder="https://script.google.com/macros/s/..."
          style={{ flex: 1, background: '#060608', border: `1px solid ${T.border}`, color: '#f0f0f5', padding: '5px 8px', borderRadius: 4, ...mono, fontSize: 11 }}
        />
      </div>

      {/* Tab bar */}
      <div style={{ background: T.surface, borderBottom: `1px solid ${T.border}`, display: 'flex', padding: '0 16px' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{ padding: '7px 14px', border: 'none', borderBottom: tab === t.id ? `2px solid ${T.purple}` : '2px solid transparent', background: 'transparent', color: tab === t.id ? T.purple : T.textDim, cursor: 'pointer', fontSize: 12 }}>
            {t.label}
          </button>
        ))}
      </div>

      <div style={{ padding: 16, maxWidth: 700 }}>

        {/* ── DIAGNOSTICS ── */}
        {tab === 'diag' && (
          <div>
            {errors.length > 0 && (
              <button onClick={() => setTab('errors')} style={{ display: 'block', width: '100%', textAlign: 'left', background: '#1a0a0a', border: `1px solid ${T.redBord}`, borderRadius: 6, padding: '10px 12px', marginBottom: 16, cursor: 'pointer' }}>
                <span style={{ color: T.red, fontSize: 12, fontWeight: 600 }}>⚠ このブラウザで {errors.length} 件のエラーが記録されています</span>
                <span style={{ color: T.textDim, fontSize: 11, marginLeft: 8 }}>タップして確認 →</span>
              </button>
            )}
            <Label>接続テスト</Label>
            <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
              <button onClick={runDiag} disabled={diagLoading || !scriptUrl} style={{ padding: '6px 16px', background: T.border, border: `1px solid ${T.border2}`, color: T.textMuted, cursor: scriptUrl ? 'pointer' : 'default', borderRadius: 5, fontSize: 12, opacity: !scriptUrl ? 0.5 : 1 }}>
                {diagLoading ? '検査中...' : 'テスト実行'}
              </button>
              {diagResult && <StatusBadge ok={diagResult.ok} ms={diagResult.getMs} />}
            </div>

            {diagResult?.ok && (
              <div style={{ background: T.greenBg, border: `1px solid ${T.greenBord}`, borderRadius: 6, padding: 12, marginBottom: 16 }}>
                <Row k="団体名"       v={diagResult.circleName} />
                <Row k="members"       v={`${diagResult.members}人`} />
                <Row k="events"        v={`${diagResult.events}件（開催済 ${diagResult.heldEvents} / 開催前 ${diagResult.upcomingEvents}）`} />
                <Row k="pendingMembers" v={`${diagResult.pendingCount}件`} vStyle={diagResult.pendingCount > 0 ? { color: T.amber } : undefined} />
                <Row k="notice"        v={diagResult.noticeSet ? '設定あり' : '（未設定）'} />
                <Row k="accentColor"   v={diagResult.accentColor} />
                <Row k="dataVersion"   v={`v${diagResult.version}`} vStyle={{ color: diagResult.needsMigration ? T.amber : T.green }} />
                {diagResult.needsMigration && (
                  <p style={{ color: T.amber, fontSize: 11, marginTop: 8 }}>
                    ⚠ データスキーマが古い (v{diagResult.version}) → データタブからマイグレーション可能
                  </p>
                )}
              </div>
            )}
            {diagResult?.ok === false && (
              <div style={{ background: T.redBg, border: `1px solid ${T.redBord}`, borderRadius: 6, padding: 12, marginBottom: 16 }}>
                <Row k="error" v={diagResult.error} vStyle={{ color: T.red }} />
                {diagResult.raw && diagResult.raw !== diagResult.error && <Row k="raw" v={diagResult.raw} vStyle={{ color: T.textDim, fontSize: 10 }} />}
                {diagResult.hint === 'timeout' && (
                  <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${T.redBord}` }}>
                    <p style={{ color: T.amber, fontSize: 11, marginBottom: 6 }}>考えられる原因と対処：</p>
                    <ol style={{ color: T.textDim, fontSize: 11, paddingLeft: 16, lineHeight: 1.9, margin: 0 }}>
                      <li>Apps Scriptが未デプロイ、または古いバージョンのまま → 設定タブのコードを再デプロイ</li>
                      <li>デプロイのアクセス権限が「全員」になっていない → デプロイを管理 → 編集 → アクセスできるユーザー: 全員</li>
                      <li>Googleスプレッドシート側でエラー（シート構造の破損など）が起きている → スプレッドシートを直接開いて確認</li>
                      <li>単純なネットワーク遅延 → もう一度「テスト実行」</li>
                    </ol>
                  </div>
                )}
                {diagResult.hint === 'network' && (
                  <p style={{ color: T.amber, fontSize: 11, marginTop: 8 }}>Script URLが正しいか、Apps Scriptのデプロイ設定（アクセス: 全員）を確認してください。</p>
                )}
              </div>
            )}

            <Label>環境情報</Label>
            <Row k="origin"      v={envInfo.origin} />
            <Row k="admin"       v={envInfo.loggedIn ? `${envInfo.admin?.email} (${envInfo.admin?.sub?.slice(0,8)}...)` : '未ログイン'} />
            <Row k="displayName" v={envInfo.admin?.displayName || '（未設定）'} />
            <Row k="ls_keys"     v={`${envInfo.lsKeys} keys`} />
            <Row k="language"    v={envInfo.lang} />
            <Row k="user_agent"  v={envInfo.ua.slice(0, 80) + '...'} />
          </div>
        )}

        {/* ── HEALTH CHECK ── */}
        {tab === 'health' && (
          <div>
            <Label>データ健全性チェック</Label>
            <p style={{ color: T.textDim, fontSize: 11, marginBottom: 12, lineHeight: 1.7 }}>
              接続中のプロジェクトのデータを検査し、孤立レコード・重複・不整合を検出します。ワンクリックで修復も可能です。
            </p>
            <button onClick={runHealthCheck} disabled={!scriptUrl || healthResult?._loading} style={{ padding: '6px 16px', background: T.border, border: `1px solid ${T.border2}`, color: T.textMuted, cursor: scriptUrl ? 'pointer' : 'default', borderRadius: 5, fontSize: 12, marginBottom: 14, opacity: !scriptUrl ? 0.5 : 1 }}>
              {healthResult?._loading ? '検査中...' : '検査を実行'}
            </button>

            {healthResult?._error && <p style={{ color: T.red, fontSize: 12 }}>Error: {healthResult._error}</p>}
            {healthResult?._fixed && <p style={{ color: T.green, fontSize: 12, marginBottom: 10 }}>✓ 修復を適用しました</p>}
            {healthResult?._fixError && <p style={{ color: T.red, fontSize: 12, marginBottom: 10 }}>修復失敗: {healthResult._fixError}</p>}

            {healthResult?.ok && (
              <>
                {healthResult.issues.length === 0 ? (
                  <div style={{ background: T.greenBg, border: `1px solid ${T.greenBord}`, borderRadius: 6, padding: 16, textAlign: 'center' }}>
                    <p style={{ color: T.green, fontSize: 14, fontWeight: 600, margin: 0 }}>✓ 問題は見つかりませんでした</p>
                    <p style={{ color: T.textDim, fontSize: 11, marginTop: 6 }}>メンバー {healthResult.memberCount}人 · イベント {healthResult.eventCount}件</p>
                  </div>
                ) : (
                  <>
                    <p style={{ color: T.textMuted, fontSize: 12, marginBottom: 10 }}>{healthResult.issues.length}件の項目が見つかりました</p>
                    {healthResult.issues.map(iss => {
                      const col = iss.level === 'error' ? T.red : iss.level === 'warn' ? T.amber : T.blue
                      const bg = iss.level === 'error' ? T.redBg : iss.level === 'warn' ? '#1a1408' : '#0f1929'
                      return (
                        <div key={iss.id} style={{ background: bg, border: `1px solid ${col}`, borderRadius: 6, padding: '10px 12px', marginBottom: 8 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: 13, fontWeight: 600, color: col }}>{iss.label}</span>
                            <span style={{ fontSize: 12, color: col }}>{iss.count}件{iss.fixable && <span style={{ color: T.textDim, marginLeft: 6 }}>修復可</span>}</span>
                          </div>
                          <p style={{ fontSize: 11, color: T.textDim, margin: '4px 0 0' }}>{iss.detail}</p>
                        </div>
                      )
                    })}
                    {healthResult.issues.some(i => i.fixable) && (
                      <button onClick={applyHealthFix} disabled={healthFixing} style={{ marginTop: 10, width: '100%', padding: '10px', background: T.green, border: 'none', borderRadius: 6, color: '#04140d', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                        {healthFixing ? '修復中...' : '修復可能な項目をまとめて修復'}
                      </button>
                    )}
                    <p style={{ color: T.textDim, fontSize: 10, marginTop: 8, lineHeight: 1.6 }}>
                      ※ 修復前に念のため「バックアップ」タブでデータを保存することを推奨します。修復は孤立レコード削除・重複除去・未使用タグ削除を行います。
                    </p>
                  </>
                )}
              </>
            )}
          </div>
        )}

        {/* ── BACKUP / RESTORE ── */}
        {tab === 'backup' && (
          <div>
            <Label>バックアップ / リストア</Label>
            <p style={{ color: T.textDim, fontSize: 11, marginBottom: 14, lineHeight: 1.7 }}>
              Apps Scriptやスプレッドシートが壊れた時の保険として、データをJSONで手元に保存できます。復元も可能です。
            </p>

            <div style={{ background: '#0d111a', border: `1px solid ${T.border}`, borderRadius: 6, padding: 14, marginBottom: 14 }}>
              <p style={{ fontSize: 12, color: T.textMuted, fontWeight: 600, marginBottom: 8 }}>📥 バックアップ（ダウンロード）</p>
              <button onClick={async () => { if (!scriptUrl) return; try { const d = await loadData(scriptUrl); downloadJSON(d, 'circle_backup') } catch (e) { alert('取得失敗: ' + e.message) } }} disabled={!scriptUrl} style={{ padding: '8px 16px', background: T.greenBg, border: `1px solid ${T.greenBord}`, color: T.green, cursor: scriptUrl ? 'pointer' : 'default', borderRadius: 5, fontSize: 12, opacity: !scriptUrl ? 0.5 : 1 }}>
                現在のデータをダウンロード
              </button>
              <p style={{ fontSize: 10, color: T.textDim, marginTop: 8 }}>ファイル名: circle_backup_YYYY-MM-DD.json</p>
            </div>

            <div style={{ background: '#0d111a', border: `1px solid ${T.border}`, borderRadius: 6, padding: 14 }}>
              <p style={{ fontSize: 12, color: T.textMuted, fontWeight: 600, marginBottom: 8 }}>📤 リストア（復元）</p>
              <p style={{ fontSize: 11, color: T.amber, marginBottom: 8 }}>⚠ 現在のデータは上書きされます。実行前にバックアップ推奨。</p>
              <textarea value={importJson} onChange={e => setImportJson(e.target.value)} placeholder="バックアップJSONを貼り付け..." style={{ width: '100%', minHeight: 100, background: T.bg, border: `1px solid ${T.border2}`, borderRadius: 5, color: T.text, fontSize: 11, padding: 8, fontFamily: 'monospace', boxSizing: 'border-box' }} />
              <button onClick={runRestore} disabled={!scriptUrl || !importJson.trim()} style={{ marginTop: 8, padding: '8px 16px', background: T.redBg, border: `1px solid ${T.redBord}`, color: T.red, cursor: (scriptUrl && importJson.trim()) ? 'pointer' : 'default', borderRadius: 5, fontSize: 12, opacity: (!scriptUrl || !importJson.trim()) ? 0.5 : 1 }}>
                このデータで上書き復元
              </button>
              {importMsg && <p style={{ fontSize: 12, color: importMsg.startsWith('✓') ? T.green : T.red, marginTop: 8 }}>{importMsg}</p>}
            </div>
          </div>
        )}

        {/* ── QR CODE ── */}
        {tab === 'qr' && (
          <div>
            <Label>メンバー用URL / QRコード</Label>
            <p style={{ color: T.textDim, fontSize: 11, marginBottom: 14, lineHeight: 1.7 }}>
              メンバーが出欠入力するためのURLとQRコードです。サークルのLINEやポスターに貼って共有できます。
            </p>
            {!scriptUrl ? (
              <p style={{ color: T.amber, fontSize: 12 }}>スクリプトURLが未設定です</p>
            ) : (
              <>
                <div style={{ background: '#fff', borderRadius: 8, padding: 16, display: 'flex', justifyContent: 'center', marginBottom: 14 }}>
                  <img src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(memberUrl)}`} alt="メンバー用QRコード" width={220} height={220} style={{ display: 'block' }} />
                </div>
                <div style={{ background: '#0d111a', border: `1px solid ${T.border}`, borderRadius: 6, padding: 12, marginBottom: 10 }}>
                  <p style={{ fontSize: 10, color: T.textDim, marginBottom: 4 }}>メンバー用URL</p>
                  <p style={{ fontSize: 11, color: T.text, wordBreak: 'break-all', fontFamily: 'monospace' }}>{memberUrl}</p>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => { navigator.clipboard.writeText(memberUrl); alert('URLをコピーしました') }} style={{ flex: 1, padding: '8px', background: T.border, border: `1px solid ${T.border2}`, color: T.textMuted, cursor: 'pointer', borderRadius: 5, fontSize: 12 }}>URLをコピー</button>
                  <a href={`https://api.qrserver.com/v1/create-qr-code/?size=600x600&data=${encodeURIComponent(memberUrl)}&download=1`} download="member_qr.png" style={{ flex: 1, padding: '8px', background: T.greenBg, border: `1px solid ${T.greenBord}`, color: T.green, cursor: 'pointer', borderRadius: 5, fontSize: 12, textAlign: 'center', textDecoration: 'none' }}>QRを保存</a>
                </div>
                <p style={{ fontSize: 10, color: T.textDim, marginTop: 10, lineHeight: 1.6 }}>
                  ※ QRコードは api.qrserver.com で生成しています。URLにスクリプトURLが含まれるため、部外者に見せないよう注意してください。
                </p>
              </>
            )}
          </div>
        )}

        {/* ── DATA ── */}
        {tab === 'data' && (
          <div>
            <Label>データ取得</Label>
            <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
              <button onClick={fetchData} disabled={dataLoading || !scriptUrl} style={{ padding: '6px 14px', background: T.border, border: `1px solid ${T.border2}`, color: T.textMuted, cursor: 'pointer', borderRadius: 5, fontSize: 12 }}>
                {dataLoading ? '取得中...' : '取得'}
              </button>
              {rawData && !rawData._error && (
                <>
                  <button onClick={() => downloadJSON(rawData, 'backup')} style={{ padding: '6px 14px', background: T.greenBg, border: `1px solid ${T.greenBord}`, color: T.green, cursor: 'pointer', borderRadius: 5, fontSize: 12 }}>
                    📥 JSONバックアップ
                  </button>
                  {(rawData.dataVersion || 1) < CURRENT_DATA_VERSION && (
                    <button onClick={runMigration} style={{ padding: '6px 14px', background: '#1a1500', border: `1px solid #854d0e`, color: T.amber, cursor: 'pointer', borderRadius: 5, fontSize: 12 }}>
                      ⬆ マイグレーション実行
                    </button>
                  )}
                </>
              )}
            </div>
            {migrateMsg && <p style={{ color: migrateMsg.startsWith('✓') ? T.green : T.red, fontSize: 12, marginBottom: 10 }}>{migrateMsg}</p>}
            {rawData && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', gap: 12, marginBottom: 6 }}>
                  <span style={{ color: T.textDim, fontSize: 11 }}>
                    {rawData._error ? `Error: ${rawData._error}` : `${rawData.members?.length}人 · ${rawData.events?.length}件 · schema v${rawData.dataVersion || 1}`}
                  </span>
                </div>
                <CodeBlock maxHeight={280}>{JSON.stringify(rawData, null, 2)}</CodeBlock>
              </div>
            )}

            <Label>データリストア（JSON上書き）</Label>
            <p style={{ color: T.textDim, fontSize: 11, marginBottom: 8 }}>⚠ スプレッドシートのデータを上書きします。必ずバックアップを取ってから実行してください。</p>
            <textarea
              value={importJson} onChange={e => setImportJson(e.target.value)}
              placeholder='{"members":[], "events":[], "circleName":"", "dataVersion":3}'
              style={{ width: '100%', height: 100, background: '#060608', border: `1px solid ${T.border}`, color: '#f0f0f5', padding: 8, borderRadius: 5, ...mono, fontSize: 11, boxSizing: 'border-box', marginBottom: 8 }}
            />
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <button onClick={runRestore} disabled={!scriptUrl || !importJson.trim()} style={{ padding: '6px 14px', background: T.redBg, border: `1px solid ${T.redBord}`, color: T.red, cursor: 'pointer', borderRadius: 5, fontSize: 12 }}>
                ⚠ リストア実行
              </button>
              {importMsg && <span style={{ fontSize: 12, color: importMsg.startsWith('✓') ? T.green : T.red }}>{importMsg}</span>}
            </div>
          </div>
        )}

        {/* ── LOGS ── */}
        {tab === 'logs' && (
          <div>
            <Label>変更ログ</Label>
            <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
              <button onClick={fetchLogs} disabled={logsLoading || !scriptUrl} style={{ padding: '6px 14px', background: T.border, border: `1px solid ${T.border2}`, color: T.textMuted, cursor: 'pointer', borderRadius: 5, fontSize: 12 }}>
                {logsLoading ? '取得中...' : '取得'}
              </button>
              {Array.isArray(logsData) && logsData.length > 0 && (
                <button onClick={() => downloadJSON(logsData, 'logs')} style={{ padding: '6px 14px', background: T.greenBg, border: `1px solid ${T.greenBord}`, color: T.green, cursor: 'pointer', borderRadius: 5, fontSize: 12 }}>
                  📥 JSONエクスポート
                </button>
              )}
            </div>
            {Array.isArray(logsData) && (
              <>
                <p style={{ color: T.textDim, fontSize: 11, marginBottom: 8 }}>{logsData.length}件</p>
                <CodeBlock maxHeight={400}>{JSON.stringify(logsData.slice(0, 50), null, 2)}</CodeBlock>
                {logsData.length > 50 && <p style={{ color: T.textDim, fontSize: 11, marginTop: 6 }}>（最新50件を表示。全件はJSONエクスポートで確認できます）</p>}
              </>
            )}
            {logsData?._error && <p style={{ color: T.red, fontSize: 12 }}>Error: {logsData._error}</p>}
          </div>
        )}

        {/* ── ERRORS ── */}
        {tab === 'errors' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Label>ランタイムエラー（最新50件）</Label>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => setErrors(getErrors())} style={{ padding: '4px 10px', background: T.border, border: `1px solid ${T.border2}`, color: T.textMuted, cursor: 'pointer', borderRadius: 4, fontSize: 11 }}>更新</button>
                {errors.length > 0 && <button onClick={() => { clearErrors(); setErrors([]) }} style={{ padding: '4px 10px', background: T.redBg, border: `1px solid ${T.redBord}`, color: T.red, cursor: 'pointer', borderRadius: 4, fontSize: 11 }}>クリア</button>}
              </div>
            </div>
            <p style={{ color: T.textDim, fontSize: 11, marginBottom: 12 }}>このブラウザで発生したJSエラー・未処理Promise・console.errorを自動記録します。</p>
            {errors.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem 0', color: T.textDim }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>✓</div>
                <p style={{ fontSize: 13, color: T.green }}>エラーは記録されていません</p>
              </div>
            ) : errors.map((e, i) => (
              <div key={i} style={{ background: '#1a0a0a', border: `1px solid ${T.redBord}`, borderRadius: 5, padding: '10px 12px', marginBottom: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 11, padding: '1px 7px', borderRadius: 3, background: T.redBg, color: T.red, border: `1px solid ${T.redBord}` }}>
                    {e.type === 'promise' ? 'Promise' : e.type === 'console' ? 'console.error' : 'Error'}
                  </span>
                  <span style={{ color: T.textDim, fontSize: 10 }}>{String(e.at).slice(0, 16)} · {e.url}</span>
                </div>
                <p style={{ color: '#f0c0c0', fontSize: 12, margin: '4px 0', wordBreak: 'break-word' }}>{e.message}</p>
                {e.source && <p style={{ color: T.textDim, fontSize: 10, margin: '2px 0' }}>{e.source}</p>}
                {e.stack && <pre style={{ background: '#060608', border: `1px solid ${T.border}`, borderRadius: 4, padding: 8, fontSize: 10, overflow: 'auto', maxHeight: 120, color: T.textDim, margin: '6px 0 0', whiteSpace: 'pre-wrap' }}>{e.stack}</pre>}
              </div>
            ))}
          </div>
        )}

        {/* ── ANALYTICS (全体分析) ── */}
        {tab === 'analytics' && (
          <div>
            <Label>全クライアント横断データ（匿名集計）</Label>
            <p style={{ color: T.textDim, fontSize: 11, marginBottom: 14, lineHeight: 1.8 }}>
              個人情報（メンバー名・出欠内容・理由・団体名）は含まれません。各団体はハッシュ化されたIDのみで識別されます。
            </p>

            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              <button onClick={fetchAnalytics} disabled={analyticsLoading} style={{ padding: '6px 14px', background: T.border, border: `1px solid ${T.border2}`, color: T.textMuted, cursor: 'pointer', borderRadius: 5, fontSize: 12 }}>
                {analyticsLoading ? '取得中...' : '最新を取得'}
              </button>
            </div>

            {analyticsSummary?._nourl && (
              <div>
                <p style={{ color: T.amber, fontSize: 12, marginBottom: 12 }}>全体分析スクリプトの設定手順：</p>
                <ol style={{ color: T.textDim, fontSize: 11, paddingLeft: 18, lineHeight: 2.2 }}>
                  <li>Google スプレッドシートを新規作成（分析専用・他のシートと分ける）</li>
                  <li>「拡張機能」→「Apps Script」を開く</li>
                  <li>下のコードを貼り付けてデプロイ（アクセス: 全員）</li>
                  <li>Vercel の Environment Variables に <code style={{ background: '#1e293b', padding: '1px 5px', borderRadius: 3 }}>VITE_ANALYTICS_URL</code> を追加</li>
                  <li>Vercel で Redeploy → 以降、全クライアントのアプリが自動でハートビート／エラーを送信開始</li>
                </ol>
                <div style={{ position: 'relative', marginTop: 12 }}>
                  <CodeBlock maxHeight={260}>{ANALYTICS_SCRIPT}</CodeBlock>
                  <button onClick={() => { navigator.clipboard.writeText(ANALYTICS_SCRIPT); setAnalyticsScriptCopied(true); setTimeout(() => setAnalyticsScriptCopied(false), 2000) }} style={{ position: 'absolute', top: 6, right: 6, padding: '2px 8px', background: T.surface, border: `1px solid ${T.border2}`, color: T.textDim, cursor: 'pointer', borderRadius: 4, fontSize: 10 }}>
                    {analyticsScriptCopied ? '✓ コピー' : 'コピー'}
                  </button>
                </div>
              </div>
            )}
            {analyticsSummary?._error && <p style={{ color: T.red, fontSize: 12 }}>Error: {analyticsSummary._error}</p>}

            {analyticsSummary && !analyticsSummary._nourl && !analyticsSummary._error && (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 20 }}>
                  {[
                    { label: '稼働団体数', val: analyticsSummary.activeOrgs ?? 0, color: T.green },
                    { label: '推定メンバー数', val: analyticsSummary.estimatedMembers ?? 0, color: T.blue },
                    { label: '推定イベント総数', val: analyticsSummary.estimatedEvents ?? 0, color: T.purple },
                    { label: 'エラー件数', val: analyticsSummary.errorCount ?? 0, color: analyticsSummary.errorCount > 0 ? T.red : T.textDim },
                    { label: '管理者アクセス', val: analyticsSummary.adminPings ?? 0, color: T.textMuted },
                    { label: 'メンバーアクセス', val: analyticsSummary.memberPings ?? 0, color: T.textMuted },
                  ].map(s => (
                    <div key={s.label} style={{ background: '#0d111a', border: `1px solid ${T.border}`, borderRadius: 6, padding: '12px 14px' }}>
                      <p style={{ fontSize: 24, fontWeight: 600, color: s.color, margin: 0 }}>{s.val}</p>
                      <p style={{ fontSize: 11, color: T.textDim, margin: '2px 0 0' }}>{s.label}</p>
                    </div>
                  ))}
                </div>
                <p style={{ color: T.textDim, fontSize: 10, marginBottom: 16 }}>
                  ※ 推定メンバー数・イベント数は、各団体ごとの最新ハートビート時点の件数を合算したものです（重複なし）。
                </p>

                <Label>クライアント横断エラー（最新100件）</Label>
                {(!analyticsErrors || analyticsErrors.length === 0) ? (
                  <p style={{ color: T.green, fontSize: 12, marginTop: 8 }}>✓ エラーは記録されていません</p>
                ) : analyticsErrors.map((e, i) => (
                  <div key={i} style={{ background: '#1a0a0a', border: `1px solid ${T.redBord}`, borderRadius: 5, padding: '10px 12px', marginBottom: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 11, padding: '1px 7px', borderRadius: 3, background: T.redBg, color: T.red, border: `1px solid ${T.redBord}` }}>{e.type}</span>
                      <span style={{ color: T.textDim, fontSize: 10 }}>org:{e.orgId} · {String(e.at).slice(0, 16)} · {e.url}</span>
                    </div>
                    <p style={{ color: '#f0c0c0', fontSize: 12, margin: '4px 0', wordBreak: 'break-word' }}>{e.message}</p>
                  </div>
                ))}
              </>
            )}
          </div>
        )}

        {/* ── BUG REPORTS ── */}
        {tab === 'bugs' && (
          <div>
            <Label>バグ報告・問い合わせ</Label>

            {/* Setup status */}
            <div style={{ background: BUG_URL ? T.greenBg : T.redBg, border: `1px solid ${BUG_URL ? T.greenBord : T.redBord}`, borderRadius: 6, padding: 12, marginBottom: 16 }}>
              <p style={{ color: BUG_URL ? T.green : T.amber, fontSize: 12, marginBottom: 4 }}>
                {BUG_URL ? '✓ バグ報告スクリプト接続済み' : '⚠ VITE_BUG_REPORT_URL が未設定 — 以下を参照してセットアップしてください'}
              </p>
              <p style={{ color: T.textDim, fontSize: 11 }}>
                問い合わせ先メール: <a href={"mailto:" + CONTACT} style={{ color: T.blue }}>{CONTACT}</a>
              </p>
              <p style={{ color: T.textDim, fontSize: 11, marginTop: 4 }}>
                ユーザー向けレポートページ: <a href="/report" style={{ color: T.blue }}>/report</a>
              </p>
            </div>

            {/* Fetch button */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
              <button onClick={fetchBugs} disabled={bugsLoading} style={{ padding: '6px 14px', background: T.border, border: `1px solid ${T.border2}`, color: T.textMuted, cursor: 'pointer', borderRadius: 5, fontSize: 12 }}>
                {bugsLoading ? '取得中...' : '最新を取得'}
              </button>
              {Array.isArray(bugs) && bugs.length > 0 && (
                <button onClick={() => downloadJSON(bugs, 'bug_reports')} style={{ padding: '6px 14px', background: T.greenBg, border: `1px solid ${T.greenBord}`, color: T.green, cursor: 'pointer', borderRadius: 5, fontSize: 12 }}>
                  📥 エクスポート
                </button>
              )}
            </div>

            {/* Bug list */}
            {bugs?._nourl && (
              <div>
                <p style={{ color: T.amber, fontSize: 12, marginBottom: 12 }}>バグ報告スクリプトの設定手順：</p>
                <ol style={{ color: T.textDim, fontSize: 11, paddingLeft: 18, lineHeight: 2.2 }}>
                  <li>Google スプレッドシートを新規作成（バグ報告専用）</li>
                  <li>「拡張機能」→「Apps Script」を開く</li>
                  <li>下のコードを貼り付けてデプロイ（アクセス: 全員）</li>
                  <li>Vercel の Environment Variables に <code style={{ background: '#1e293b', padding: '1px 5px', borderRadius: 3 }}>VITE_BUG_REPORT_URL</code> を追加</li>
                  <li>Vercel で Redeploy</li>
                </ol>
                <div style={{ position: 'relative', marginTop: 12 }}>
                  <CodeBlock maxHeight={220}>{BUG_REPORT_SCRIPT}</CodeBlock>
                  <button onClick={() => { navigator.clipboard.writeText(BUG_REPORT_SCRIPT); setBugScriptCopied(true); setTimeout(() => setBugScriptCopied(false), 2000) }} style={{ position: 'absolute', top: 6, right: 6, padding: '2px 8px', background: T.surface, border: `1px solid ${T.border2}`, color: T.textDim, cursor: 'pointer', borderRadius: 4, fontSize: 10 }}>
                    {bugScriptCopied ? '✓ コピー' : 'コピー'}
                  </button>
                </div>
              </div>
            )}
            {bugs?._error && <p style={{ color: T.red, fontSize: 12 }}>Error: {bugs._error}</p>}
            {Array.isArray(bugs) && (
              <>
                {/* Stats */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8, marginBottom: 14 }}>
                  {[
                    { label: '合計', val: bugs.length, color: T.textMuted },
                    { label: '✨ 導入相談', val: bugs.filter(b => b.type === 'adopt').length, color: T.green },
                    { label: 'バグ', val: bugs.filter(b => b.type === 'bug').length, color: T.red },
                    { label: '機能要望', val: bugs.filter(b => b.type === 'feature').length, color: T.blue },
                  ].map(s => (
                    <div key={s.label} style={{ background: '#0d111a', border: `1px solid ${T.border}`, borderRadius: 5, padding: '8px 10px', textAlign: 'center' }}>
                      <p style={{ fontSize: 20, fontWeight: 600, color: s.color, margin: 0 }}>{s.val}</p>
                      <p style={{ fontSize: 11, color: T.textDim, margin: 0 }}>{s.label}</p>
                    </div>
                  ))}
                </div>
                {bugs.length === 0 && <p style={{ color: T.textDim, fontSize: 12 }}>報告なし</p>}
                {bugs.map((b, i) => (
                  <div key={i} style={{ background: '#0d111a', border: `1px solid ${b.type === 'adopt' ? T.greenBord : T.border}`, borderRadius: 5, padding: '10px 12px', marginBottom: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 11, padding: '1px 7px', borderRadius: 3, background: b.type === 'adopt' ? T.greenBg : b.type === 'bug' ? T.redBg : b.type === 'feature' ? '#0f1929' : T.border, color: b.type === 'adopt' ? T.green : b.type === 'bug' ? T.red : b.type === 'feature' ? T.blue : T.textDim, border: `1px solid ${b.type === 'adopt' ? T.greenBord : b.type === 'bug' ? T.redBord : b.type === 'feature' ? '#1e3a5f' : T.border}` }}>
                        {b.type === 'adopt' ? '✨ 導入相談' : b.type === 'bug' ? '🐛 バグ' : b.type === 'feature' ? '💡 要望' : '💬 その他'}
                      </span>
                      <span style={{ color: T.textDim, fontSize: 10 }}>{String(b.at).slice(0, 16)}</span>
                    </div>
                    <p style={{ color: '#f0f0f5', fontSize: 12, margin: '4px 0' }}>{b.message}</p>
                    {b.steps && <p style={{ color: T.textDim, fontSize: 11, margin: '3px 0' }}>手順: {b.steps}</p>}
                    {b.email && <p style={{ color: T.blue, fontSize: 11, margin: '3px 0' }}>返信先: {b.email}</p>}
                    <p style={{ color: T.textDim, fontSize: 10, margin: '3px 0 0' }}>v{b.version}</p>
                  </div>
                ))}
              </>
            )}
          </div>
        )}

        {/* ── CACHE ── */}
        {tab === 'cache' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Label>LocalStorage（{lsItems.length} keys）</Label>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={loadLS} style={{ padding: '4px 10px', background: T.border, border: `1px solid ${T.border2}`, color: T.textMuted, cursor: 'pointer', borderRadius: 4, fontSize: 11 }}>更新</button>
                <button onClick={() => { if (confirm('LocalStorageを全クリアしますか？ログアウト状態になります。')) { localStorage.clear(); loadLS() } }} style={{ padding: '4px 10px', background: T.redBg, border: `1px solid ${T.redBord}`, color: T.red, cursor: 'pointer', borderRadius: 4, fontSize: 11 }}>全クリア</button>
              </div>
            </div>
            {lsItems.length === 0 && <p style={{ color: T.textDim, fontSize: 12 }}>（空）</p>}
            {lsItems.map(item => (
              <div key={item.key} style={{ background: '#0d111a', border: `1px solid ${T.border}`, borderRadius: 5, padding: '8px 10px', marginBottom: 6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                  <span style={{ color: T.blue, fontSize: 12 }}>{item.key}</span>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span style={{ color: T.textDim, fontSize: 10 }}>{item.size} chars</span>
                    <button onClick={() => { localStorage.removeItem(item.key); loadLS() }} style={{ border: `1px solid ${T.border}`, background: 'transparent', color: T.textDim, cursor: 'pointer', padding: '1px 6px', borderRadius: 3, fontSize: 10 }}>削除</button>
                  </div>
                </div>
                <p style={{ color: T.textDim, fontSize: 10, wordBreak: 'break-all', margin: 0 }}>{item.preview}{item.size > 120 ? '...' : ''}</p>
              </div>
            ))}
          </div>
        )}

        {/* ── BUILD ── */}
        {tab === 'build' && (
          <div>
            <Label>ビルド情報</Label>
            <Row k="version"      v={`v${APP_VER}`} />
            <Row k="data_schema"  v={`v${CURRENT_DATA_VERSION}`} />
            <Row k="framework"    v="React 18 + Vite 5" />
            <Row k="router"       v="React Router v6" />
            <Row k="deploy"       v="Vercel (Vite preset)" />
            <Row k="github"       v={<a href={REPO_URL} style={{ color: T.blue }}>{REPO_URL}</a>} />
            <Row k="prod_url"     v={<a href={PROD_URL} style={{ color: T.blue }}>{PROD_URL}</a>} />
            <Row k="demo_url"     v={<a href="/demo" style={{ color: T.blue }}>/demo（営業用・ログイン不要の体験版）</a>} />
            <Row k="report_url"   v={<a href="/report" style={{ color: T.blue }}>/report（バグ報告）</a>} />
            <Row k="dev_password" v={DEV_PW === '0000' ? '(default: 0000 — VITE_DEV_PASSWORD で変更可)' : '(custom)'} />

            <div style={{ marginTop: 24 }}>
              <Label>データスキーマ v{CURRENT_DATA_VERSION}</Label>
              <CodeBlock>{`// Data schema v${CURRENT_DATA_VERSION}
{
  members:     string[],
  events:      Array<{
    id, date, timeStart, timeEnd, name, type, color,
    tags:       string[],
    memo:       string,
    attendance: Record<memberName, {
      plan:   'attending'|'late'|'absent'|'undecided'|null,
      actual: 'present'|'late'|'absent'|'unknown'|null,
      reason: string|null
    }>
  }>,
  circleName, accentColor, notice,
  alertThreshold: number|null,
  pendingMembers: Array<{id,realName,displayName,note,at}>,
  dataVersion:    number   // current: ${CURRENT_DATA_VERSION}
}

// 出席率 = (actual present+late) / (plan attending+late)

// Change log (_log): at|by|type|eventDate|eventName|member|before|after`}
              </CodeBlock>
            </div>

            <div style={{ marginTop: 24 }}>
              <Label>マイグレーション履歴</Label>
              <Row k="v1 → v2" v="circleName / accentColor 追加" />
              <Row k="v2 → v3" v="出席を{plan,actual,reason}に分離、tags/memo/notice/alertThreshold/pendingMembers 追加" />
            </div>

            <div style={{ marginTop: 24 }}>
              <Label>Apps Script コード（現行）</Label>
              <div style={{ position: 'relative' }}>
                <CodeBlock maxHeight={250}>{APPS_SCRIPT}</CodeBlock>
                <button onClick={() => navigator.clipboard.writeText(APPS_SCRIPT)} style={{ position: 'absolute', top: 6, right: 6, padding: '2px 8px', background: T.surface, border: `1px solid ${T.border2}`, color: T.textDim, cursor: 'pointer', borderRadius: 4, fontSize: 10 }}>
                  コピー
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
