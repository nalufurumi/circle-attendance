export const CLIENT_ID = '921522318195-m08akd0tflopcb1r4h2lfh9ejar2fhot.apps.googleusercontent.com'

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

export const PK = '#D4537E', PKB = '#FBEAF0', PKD = '#993556'
export const PU = '#7F77DD', PUB = '#EEEDFE', PUD = '#3C3489'
export const GR = '#1D9E75', GRB = '#EAF7F0', GRD = '#0A5040'

export const todayStr = () => new Date().toISOString().slice(0, 10)
export const nowStr   = () => new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })

export const DEFAULT_DATA = { members: [], events: [], circleName: '' }

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
  var hd = ['名前'].concat(evs.map(function(e){ return e.date+' '+e.name; })).concat(['出席率','欠席回数']);
  vs.getRange(1,1,1,hd.length).setValues([hd]);
  data.members.forEach(function(m,i) {
    var p=0,l=0,ab=0,tot=0;
    var cells = evs.map(function(e) {
      var s=(e.attendance&&e.attendance[m])||'';
      if(s)tot++;
      if(s==='present'){p++;return'○';} if(s==='late'){l++;return'△';} if(s==='absent'){ab++;return'×';} return'－';
    });
    var rate=tot>0?Math.round((p+l)/tot*100)+'%':'－';
    vs.getRange(i+2,1,1,cells.length+3).setValues([[m].concat(cells).concat([rate,ab])]);
  });
}`
