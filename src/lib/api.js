const TIMEOUT = 10000
const CURRENT_DATA_VERSION = 3

/** Convert old string attendance value to new object format */
function upgradeAtt(val) {
  if (!val || typeof val === 'object') return val || { plan: null, actual: null, reason: null }
  // Old string → new object (treat as actual, since these were post-event entries)
  return { plan: null, actual: val === 'unknown' ? null : val, reason: null }
}

/** Run all schema migrations to bring data up to current version */
function migrate(raw) {
  if (!raw || typeof raw !== 'object') {
    return { members: [], events: [], circleName: '', accentColor: 'rose', notice: '', alertThreshold: null, pendingMembers: [], dataVersion: CURRENT_DATA_VERSION }
  }
  const v = typeof raw.dataVersion === 'number' ? raw.dataVersion : 1
  let d = { ...raw }

  // v1 → v2: add circleName, accentColor
  if (v < 2) {
    d.circleName  = d.circleName  || ''
    d.accentColor = d.accentColor || 'rose'
  }

  // v2 → v3: attendance string → object, add tags/memo/notice/alertThreshold/pendingMembers
  if (v < 3) {
    d.events = (d.events || []).map(ev => ({
      id:         ev.id         || `e${Date.now()}${Math.random().toString(36).slice(2)}`,
      date:       ev.date       || '',
      name:       ev.name       || '',
      type:       ev.type       || 'その他',
      color:      ev.color      || 'pink',
      tags:       ev.tags       || [],
      memo:       ev.memo       || '',
      attendance: Object.fromEntries(
        Object.entries(ev.attendance || {}).map(([k, v]) => [k, upgradeAtt(v)])
      ),
    }))
    d.notice          = d.notice          || ''
    d.alertThreshold  = d.alertThreshold  ?? null
    d.pendingMembers  = d.pendingMembers  || []
    d.globalTags      = d.globalTags      || []
    d.inputStyle      = d.inputStyle      || 'button'
  }

  if (!d.globalTags) d.globalTags = []
  d.dataVersion = CURRENT_DATA_VERSION
  return d
}

async function post(url, body) {
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(TIMEOUT),
  })
  if (!r.ok) throw new Error('HTTP ' + r.status)
  return r.json()
}

export async function loadData(scriptUrl) {
  const r = await fetch(scriptUrl + '?action=get', { signal: AbortSignal.timeout(TIMEOUT) })
  if (!r.ok) throw new Error('HTTP ' + r.status)
  return migrate(await r.json())
}

export async function saveData(scriptUrl, data, logEntry = null) {
  const body = { action: 'save', data }
  if (logEntry) body.log = logEntry
  return post(scriptUrl, body)
}

export async function getLogs(scriptUrl) {
  try {
    const r = await fetch(scriptUrl + '?action=logs', { signal: AbortSignal.timeout(TIMEOUT) })
    if (!r.ok) return []
    return r.json()
  } catch { return [] }
}

export function fireLog(scriptUrl, entry) {
  fetch(scriptUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify({ action: 'log', entry }),
  }).catch(() => {})
}

export function mkLog({ by, type, eventDate = '', eventName = '', member = '', before = '', after = '' }) {
  return {
    at: new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' }),
    by, type, eventDate, eventName, member, before, after,
  }
}

export { CURRENT_DATA_VERSION, migrate }
