const TIMEOUT = 10000

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

/** Load current data from Apps Script */
export async function loadData(scriptUrl) {
  const r = await fetch(scriptUrl + '?action=get', { signal: AbortSignal.timeout(TIMEOUT) })
  if (!r.ok) throw new Error('HTTP ' + r.status)
  return r.json()
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
