import { useState, useEffect } from 'react'
import { loadData, saveData, getLogs, migrate, CURRENT_DATA_VERSION } from '../lib/api.js'
import { APPS_SCRIPT } from '../lib/constants.js'
import { getErrors, clearErrors } from '../lib/errorLog.js'

const DEV_PW       = import.meta.env.VITE_DEV_PASSWORD || '0000'
const BUG_URL      = import.meta.env.VITE_BUG_REPORT_URL || ''
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
    { id: 'diag',   label: '診断' },
    { id: 'errors', label: errors.length > 0 ? `⚠ エラー (${errors.length})` : '⚠ エラー' },
    { id: 'data',   label: 'データ' },
    { id: 'logs',   label: 'ログ' },
    { id: 'bugs',   label: '🐛 バグ報告' },
    { id: 'cache',  label: 'キャッシュ' },
    { id: 'build',  label: 'ビルド' },
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
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 14 }}>
                  {[
                    { label: '合計', val: bugs.length, color: T.textMuted },
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
                  <div key={i} style={{ background: '#0d111a', border: `1px solid ${T.border}`, borderRadius: 5, padding: '10px 12px', marginBottom: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 11, padding: '1px 7px', borderRadius: 3, background: b.type === 'bug' ? T.redBg : b.type === 'feature' ? '#0f1929' : T.border, color: b.type === 'bug' ? T.red : b.type === 'feature' ? T.blue : T.textDim, border: `1px solid ${b.type === 'bug' ? T.redBord : b.type === 'feature' ? '#1e3a5f' : T.border}` }}>
                        {b.type === 'bug' ? '🐛 バグ' : b.type === 'feature' ? '💡 要望' : '💬 その他'}
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
