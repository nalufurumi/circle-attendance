export const CLIENT_ID = '921522318195-m08akd0tflopcb1r4h2lfh9ejar2fhot.apps.googleusercontent.com'

// ── Accent color presets ──────────────────────────────────────
export const ACCENT_PRESETS = [
  { id: 'rose',    main: '#E8527A', bg: '#FEF0F4', dark: '#9E2047', label: 'ローズ' },
  { id: 'violet',  main: '#7C5BDE', bg: '#F3F0FE', dark: '#4A2FAA', label: 'バイオレット' },
  { id: 'blue',    main: '#3B8FE8', bg: '#EFF7FF', dark: '#1A5FA8', label: 'ブルー' },
  { id: 'teal',    main: '#0F9B8E', bg: '#EDFAF8', dark: '#097068', label: 'ティール' },
  { id: 'green',   main: '#2EB67D', bg: '#EDFAF4', dark: '#1A8055', label: 'グリーン' },
  { id: 'orange',  main: '#F0793B', bg: '#FEF3EE', dark: '#B84C18', label: 'オレンジ' },
  { id: 'amber',   main: '#D97706', bg: '#FFFBEB', dark: '#92400E', label: 'アンバー' },
  { id: 'red',     main: '#E53935', bg: '#FEF2F2', dark: '#B71C1C', label: 'レッド' },
]

/** Parse #rrggbb → [r,g,b] */
function hexToRgb(hex) {
  const m = /^#([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return m ? [parseInt(m[1],16), parseInt(m[2],16), parseInt(m[3],16)] : null
}

/**
 * Apply accent color to CSS variables (affects whole app instantly).
 * Accepts:
 *   - preset ID string  e.g. 'rose'
 *   - preset object     e.g. { main, bg, dark }
 *   - custom hex string e.g. '#FF1493'  → bg/dark auto-generated
 */
export function applyAccent(colorOrId) {
  let main, bg, dark

  if (typeof colorOrId === 'string' && colorOrId.startsWith('#')) {
    // ── Custom hex ──────────────────────────────────
    const rgb = hexToRgb(colorOrId)
    if (!rgb) return
    const [r, g, b] = rgb
    main = colorOrId
    bg   = `rgba(${r},${g},${b},0.12)`
    dark = `rgb(${Math.round(r*.65)},${Math.round(g*.65)},${Math.round(b*.65)})`
  } else {
    // ── Preset ID or preset object ──────────────────
    const preset = typeof colorOrId === 'string'
      ? ACCENT_PRESETS.find(p => p.id === colorOrId) || ACCENT_PRESETS[0]
      : colorOrId
    main = preset.main; bg = preset.bg; dark = preset.dark
  }

  const root = document.documentElement
  root.style.setProperty('--accent',      main)
  root.style.setProperty('--accent-bg',   bg)
  root.style.setProperty('--accent-dark', dark)
}

/** Validate hex color string */
export function isValidHex(s) {
  return /^#[0-9A-Fa-f]{6}$/.test(s)
}

// ── Attendance status ─────────────────────────────────────────
export const PLAN_ORDER   = ['attending', 'late', 'absent', 'undecided', null]
export const ACTUAL_ORDER = ['present',   'late', 'absent', 'unknown',   null]

export const PLAN_STATUS = {
  attending: { label: '参加予定', short: '参加予定', icon: '○', bg: 'var(--color-background-success)', text: 'var(--color-text-success)', border: 'var(--color-border-success)' },
  late:      { label: '遅刻予定', short: '遅刻予定', icon: '△', bg: 'var(--color-background-warning)', text: 'var(--color-text-warning)', border: 'var(--color-border-warning)' },
  absent:    { label: '不参加',   short: '不参加',   icon: '×', bg: 'var(--color-background-danger)',  text: 'var(--color-text-danger)',  border: 'var(--color-border-danger)'  },
  undecided: { label: '未定',     short: '未定',     icon: '？', bg: 'var(--color-background-secondary)', text: 'var(--color-text-tertiary)', border: 'var(--color-border-tertiary)' },
  null:      { label: '未入力',   short: '未入力',   icon: '－', bg: 'var(--color-background-secondary)', text: 'var(--color-text-tertiary)', border: 'var(--color-border-tertiary)' },
}
export const ACTUAL_STATUS = {
  present: { label: '参加',   short: '参加',   icon: '○', bg: 'var(--color-background-success)', text: 'var(--color-text-success)', border: 'var(--color-border-success)' },
  late:    { label: '遅刻',   short: '遅刻',   icon: '△', bg: 'var(--color-background-warning)', text: 'var(--color-text-warning)', border: 'var(--color-border-warning)' },
  absent:  { label: '不参加', short: '不参加', icon: '×', bg: 'var(--color-background-danger)',  text: 'var(--color-text-danger)',  border: 'var(--color-border-danger)'  },
  unknown: { label: '不明',   short: '不明',   icon: '？', bg: 'var(--color-background-secondary)', text: 'var(--color-text-tertiary)', border: 'var(--color-border-tertiary)' },
  null:    { label: '未入力', short: '未入力', icon: '－', bg: 'var(--color-background-secondary)', text: 'var(--color-text-tertiary)', border: 'var(--color-border-tertiary)' },
}

export const COLORS = [
  { id: 'pink',   hex: '#D4537E' },
  { id: 'red',    hex: '#E24B4A' },
  { id: 'orange', hex: '#EF9F27' },
  { id: 'green',  hex: '#1D9E75' },
  { id: 'blue',   hex: '#378ADD' },
  { id: 'purple', hex: '#7F77DD' },
  { id: 'teal',   hex: '#0F6E56' },
  { id: 'gray',   hex: '#888780' },
]
export const getColor = id => COLORS.find(c => c.id === id)?.hex || '#D4537E'

export const STATUS_ORDER = ['unknown', 'present', 'late', 'absent']
export const STATUS = {
  present: { label: '○', short: '出席', bg: 'var(--color-background-success)', text: 'var(--color-text-success)', border: 'var(--color-border-success)' },
  late:    { label: '△', short: '遅刻', bg: 'var(--color-background-warning)', text: 'var(--color-text-warning)', border: 'var(--color-border-warning)' },
  absent:  { label: '×', short: '欠席', bg: 'var(--color-background-danger)',  text: 'var(--color-text-danger)',  border: 'var(--color-border-danger)'  },
  unknown: { label: '－', short: '未記入', bg: 'var(--color-background-secondary)', text: 'var(--color-text-tertiary)', border: 'var(--color-border-tertiary)' },
}
export const DOT = { present: '#1D9E75', late: '#BA7517', absent: '#E24B4A', unknown: 'var(--color-border-secondary)' }
export const EVENT_TYPES = ['練習', '本番', 'イベント', 'MTG', 'その他']

// Fixed colors (non-accent)
export const GR = '#1D9E75', GRB = '#EAF7F0', GRD = '#0A5040'

export const todayStr = () => new Date().toISOString().slice(0, 10)
export const nowStr   = () => new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })

export const DEFAULT_DATA = {
  members: [], events: [], circleName: '', accentColor: 'rose',
  notice: '', alertThreshold: null, pendingMembers: [], globalTags: [], dataVersion: 3,
}

// ── Apps Script (v2 with log support) ────────────────────────
export const APPS_SCRIPT = `function doGet(e) {
  var action = (e && e.parameter && e.parameter.action) || 'get';
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  if (action === 'get') {
    var sh = ss.getSheetByName('_data') || ss.insertSheet('_data');
    var v = sh.getRange(1,1).getValue();
    return out(v || '{"members":[],"events":[],"circleName":""}');
  }

  if (action === 'logs') {
    var ls = ss.getSheetByName('_log');
    if (!ls || ls.getLastRow() <= 1) return out('[]');
    var rows = ls.getRange(2, 1, ls.getLastRow()-1, 8).getValues();
    var logs = rows.map(function(r) {
      return {at:r[0],by:r[1],type:r[2],eventDate:r[3],eventName:r[4],member:r[5],before:r[6],after:r[7]};
    }).reverse().slice(0, 500);
    return out(JSON.stringify(logs));
  }
}

function doPost(e) {
  var payload = JSON.parse(e.postData.contents);
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  if (payload.action === 'save') {
    var sh = ss.getSheetByName('_data') || ss.insertSheet('_data');
    sh.getRange(1,1).setValue(JSON.stringify(payload.data));
    buildView(ss, payload.data);
    if (payload.log) writeLog(ss, payload.log);
    return out('{"ok":true}');
  }

  if (payload.action === 'log') {
    var entries = Array.isArray(payload.entries) ? payload.entries : [payload.entry];
    entries.forEach(function(entry) { writeLog(ss, entry); });
    return out('{"ok":true}');
  }
}

function out(text) {
  return ContentService.createTextOutput(text).setMimeType(ContentService.MimeType.JSON);
}

function writeLog(ss, e) {
  var ls = ss.getSheetByName('_log') || ss.insertSheet('_log');
  if (ls.getLastRow() === 0) {
    ls.getRange(1,1,1,8).setValues([['日時','操作者','種別','イベント日','イベント名','メンバー','変更前','変更後']]);
  }
  ls.appendRow([e.at||'',e.by||'',e.type||'',e.eventDate||'',e.eventName||'',e.member||'',e.before||'',e.after||'']);
}

function buildView(ss, data) {
  var vs = ss.getSheetByName('出席一覧') || ss.insertSheet('出席一覧');
  vs.clearContents();
  if (!data.members||!data.events||!data.members.length||!data.events.length) return;
  var evs = data.events.slice().sort(function(a,b){ return a.date.localeCompare(b.date); });
  var hd = ['名前'].concat(evs.map(function(e){ return e.date+' '+e.name; })).concat(['実績出席率','欠席回数']);
  vs.getRange(1,1,1,hd.length).setValues([hd]);
  data.members.forEach(function(m,i) {
    var p=0,l=0,ab=0,ap=0,lp=0;
    var cells = evs.map(function(e) {
      var raw = (e.attendance && e.attendance[m]) || {};
      // v3 format: object with plan/actual; v2 format: string (backward compat)
      var actual = (typeof raw === 'string') ? raw : (raw.actual || '');
      var plan   = (typeof raw === 'string') ? '' : (raw.plan   || '');
      if(plan==='attending')ap++; else if(plan==='late')lp++;
      if(actual==='present'){p++;return'○';}
      if(actual==='late')   {l++;return'△';}
      if(actual==='absent') {ab++;return'×';}
      // Show plan if no actual yet
      if(plan==='attending')return'[予]';
      if(plan==='late')     return'[遅]';
      if(plan==='absent')   return'[欠]';
      return '－';
    });
    var denom = ap + lp;
    var rate  = denom > 0 ? Math.round((p+l)/denom*100)+'%' : '－';
    vs.getRange(i+2,1,1,cells.length+3).setValues([[m].concat(cells).concat([rate,ab])]);
  });
}`
