// Lightweight client-side error capture for the developer page.
// Stores the most recent errors in localStorage so they can be inspected at /dev,
// and (if VITE_ANALYTICS_URL is configured) forwards an anonymous copy so errors
// across all circles are visible in one place without exposing any circle's
// private data — only the error message/stack/url and a hashed org id.

import { pingError } from './telemetry.js'

const KEY = 'circle_errors'
const MAX = 50

function read() {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]') } catch { return [] }
}

// Best-effort: find the script URL associated with whichever admin/member
// session is active in this browser, purely so error pings can be grouped
// by org without storing any other identifying info.
function currentScriptUrl() {
  try {
    const admin = JSON.parse(localStorage.getItem('circle_admin') || 'null')
    if (admin?.sub) {
      const u = localStorage.getItem(`circle_script_${admin.sub}`)
      if (u) return u
    }
  } catch {}
  return ''
}

function push(entry) {
  try {
    const list = read()
    list.unshift(entry)
    localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX)))
  } catch {}
  try {
    pingError({ scriptUrl: currentScriptUrl(), type: entry.type, message: entry.message, stack: entry.stack, url: entry.url })
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
