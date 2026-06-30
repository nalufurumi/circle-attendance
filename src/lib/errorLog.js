// Lightweight client-side error capture for the developer page.
// Stores the most recent errors in localStorage so they can be inspected at /dev.

const KEY = 'circle_errors'
const MAX = 50

function read() {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]') } catch { return [] }
}
function push(entry) {
  try {
    const list = read()
    list.unshift(entry)
    localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX)))
  } catch {}
}

export function getErrors() { return read() }
export function clearErrors() { try { localStorage.removeItem(KEY) } catch {} }

let installed = false
export function installErrorLogger() {
  if (installed) return
  installed = true

  window.addEventListener('error', (e) => {
    push({
      at: new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' }),
      type: 'error',
      message: e.message || String(e.error || 'Unknown error'),
      source: `${e.filename || ''}:${e.lineno || 0}:${e.colno || 0}`,
      stack: e.error?.stack ? String(e.error.stack).slice(0, 600) : '',
      url: window.location.pathname,
    })
  })

  window.addEventListener('unhandledrejection', (e) => {
    push({
      at: new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' }),
      type: 'promise',
      message: String(e.reason?.message || e.reason || 'Unhandled rejection'),
      source: '',
      stack: e.reason?.stack ? String(e.reason.stack).slice(0, 600) : '',
      url: window.location.pathname,
    })
  })

  // Intercept console.error without breaking normal logging
  const origError = console.error.bind(console)
  console.error = (...args) => {
    try {
      push({
        at: new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' }),
        type: 'console',
        message: args.map(a => typeof a === 'string' ? a : (a?.message || JSON.stringify(a))).join(' ').slice(0, 400),
        source: '',
        stack: '',
        url: window.location.pathname,
      })
    } catch {}
    origError(...args)
  }
}
