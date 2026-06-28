const TIMEOUT = 10000
const CURRENT_DATA_VERSION = 2

/** Migrate data from older schema versions to current */
function migrate(raw) {
  if (!raw || typeof raw !== 'object') return { members: [], events: [], circleName: '', dataVersion: CURRENT_DATA_VERSION }
  const v = raw.dataVersion || 1
  if (v >= CURRENT_DATA_VERSION) return raw

  // v1 → v2: ensure all event fields exist, add circleName + dataVersion
  return {
    members: Array.isArray(raw.members) ? raw.members : [],
    events: Array.isArray(raw.events) ? raw.events.map(ev => ({
      id:         ev.id         || `e${Date.now()}${Math.random().toString(36).slice(2)}`,
      date:       ev.date       || '',
      name:       ev.name       || '',
      type:       ev.type       || 'その他',
      color:      ev.color      || 'pink',
      attendance: ev.attendance || {},
    })) : [],
    circleName:  raw.circleName  || '',
    dataVersion: CURRENT_DATA_VERSION,
  }
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

/** Load current data from Apps Script, auto-migrating old schemas */
export async function loadData(scriptUrl) {
  const r = await fetch(scriptUrl + '?action=get', { signal: AbortSignal.timeout(TIMEOUT) })
  if (!r.ok) throw new Error('HTTP ' + r.status)
  const raw = await r.json()
  return migrate(raw)
}

/** Save data to Apps Script, optionally with one log entry */
export async function saveData(scriptUrl, data, logEntry = null) {
  const body = { action: 'save', data }
  if (logEntry) body.log = logEntry
  return post(scriptUrl, body)
}

/** Fetch log entries (newest first, max 500) */
export async function getLogs(scriptUrl) {
  try {
    const r = await fetch(scriptUrl + '?action=logs', { signal: AbortSignal.timeout(TIMEOUT) })
    if (!r.ok) return []
    return r.json()
  } catch { return [] }
}

/** Fire-and-forget log write (for member-side actions) */
export function fireLog(scriptUrl, entry) {
  fetch(scriptUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify({ action: 'log', entry }),
  }).catch(() => {})
}

/** Build a log entry object */
export function mkLog({ by, type, eventDate = '', eventName = '', member = '', before = '', after = '' }) {
  return {
    at: new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' }),
    by, type, eventDate, eventName, member, before, after,
  }
}

export { CURRENT_DATA_VERSION, migrate }
