// Privacy-safe telemetry for the developer ("client management & growth data").
//
// HARD RULE: this module must NEVER send member names, attendance values,
// absence reasons, notices, circle names, emails, or any other content that
// could identify a person or a specific circle's private data. Only counts
// and anonymous identifiers (a hashed org id) are sent.
//
// Disabled entirely unless VITE_ANALYTICS_URL is configured — if unset, every
// function here is a no-op, so circles that don't want telemetry are
// unaffected by default deploys that don't set the env var.

const ANALYTICS_URL = import.meta.env.VITE_ANALYTICS_URL || ''

// Simple non-cryptographic hash so we can tell "the same org pinged again"
// apart from "a different org pinged" without storing the actual script URL
// or circle name anywhere in the analytics sheet.
function hashId(str) {
  let h = 0
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0
  }
  return Math.abs(h).toString(36)
}

function send(payload) {
  if (!ANALYTICS_URL) return
  try {
    navigator.sendBeacon
      ? navigator.sendBeacon(ANALYTICS_URL, JSON.stringify(payload))
      : fetch(ANALYTICS_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify(payload), keepalive: true }).catch(() => {})
  } catch {}
}

/**
 * Heartbeat ping — call once per admin session and once per member session.
 * Sends ONLY: anonymous org id (hash of script URL), role, and aggregate
 * counts (member count, event count). No names, no attendance content.
 */
export function pingHeartbeat({ scriptUrl, role, memberCount, eventCount }) {
  if (!scriptUrl) return
  send({
    kind: 'heartbeat',
    orgId: hashId(scriptUrl),
    role,                    // 'admin' | 'member'
    memberCount: memberCount ?? null,
    eventCount: eventCount ?? null,
    appVersion: '2.2.0',
    at: new Date().toISOString(),
  })
}

/**
 * Error ping — mirrors what's already logged locally to circle_errors,
 * but also forwards (message + stack only, no surrounding app state) to
 * the developer so issues across all circles are visible in one place.
 */
export function pingError({ scriptUrl, type, message, stack, url }) {
  send({
    kind: 'error',
    orgId: scriptUrl ? hashId(scriptUrl) : 'unknown',
    type, message, stack, url,
    appVersion: '2.2.0',
    at: new Date().toISOString(),
  })
}
