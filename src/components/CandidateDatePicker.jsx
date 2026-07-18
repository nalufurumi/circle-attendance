import { useState } from 'react'
import CalendarPicker from './CalendarPicker.jsx'

// ── 候補日の選択と時間設定をまとめて担当するコンポーネント ──────────────
//
// 役割分担:
//   CalendarPicker         … 月カレンダーのマス目だけ(日付を選ぶ/外す)
//   CandidateDatePicker    … 選んだ日の一覧・時間の設定・候補リストの組み立て(このファイル)
//   AdminSchedulePanel     … フォーム全体と日程調整の一覧
//
// 時間の考え方:
//   基本は「選んだ日すべてに同じ時間」を入れる(毎回入力させると面倒で離脱するため)。
//   ただしサークルでは「平日は19時から・土日は10時から」のように曜日で時間が変わることが
//   多いので、チップの日付部分をタップするとその日だけ時間を上書きできるようにしている。
//   上書きした日はチップに時刻を表示し、一括設定の日と見分けられるようにする。
//
// props:
//   onChange(candidates) : [{ date, timeStart, timeEnd }] を親に渡す
//   AC/ACB/ACD           : アクセントカラー

const WEEK = ['日', '月', '火', '水', '木', '金', '土']

export default function CandidateDatePicker({ onChange, AC, ACB, ACD }) {
  const [dates, setDates] = useState([])           // 選択中の日付(YYYY-MM-DD)
  const [bulkStart, setBulkStart] = useState('')   // 全体の開始時刻
  const [bulkEnd, setBulkEnd] = useState('')       // 全体の終了時刻
  const [overrides, setOverrides] = useState({})   // { [date]: { start, end } } 個別指定した日だけ入る
  const [editing, setEditing] = useState(null)     // 時間を編集中の日付

  // 親に渡す候補リストを組み立てる。個別指定があればそれを、なければ全体の時刻を使う
  const emit = (nextDates, nextBulk, nextOverrides) => {
    const list = nextDates.map(d => {
      const o = nextOverrides[d]
      return { date: d, timeStart: o ? o.start : nextBulk.start, timeEnd: o ? o.end : nextBulk.end }
    })
    onChange(list)
  }

  const handleDatesChange = (next) => {
    // 選択を外した日の個別時刻は残しておいても使われないので掃除する
    const cleaned = {}
    next.forEach(d => { if (overrides[d]) cleaned[d] = overrides[d] })
    setDates(next); setOverrides(cleaned)
    if (editing && !next.includes(editing)) setEditing(null)
    emit(next, { start: bulkStart, end: bulkEnd }, cleaned)
  }

  const handleBulk = (field, val) => {
    const next = { start: field === 'start' ? val : bulkStart, end: field === 'end' ? val : bulkEnd }
    setBulkStart(next.start); setBulkEnd(next.end)
    emit(dates, next, overrides)
  }

  const handleOverride = (date, field, val) => {
    const cur = overrides[date] || { start: bulkStart, end: bulkEnd }
    const next = { ...overrides, [date]: { ...cur, [field]: val } }
    setOverrides(next)
    emit(dates, { start: bulkStart, end: bulkEnd }, next)
  }

  // 個別指定をやめて全体の時刻に戻す
  const clearOverride = (date) => {
    const next = { ...overrides }; delete next[date]
    setOverrides(next); setEditing(null)
    emit(dates, { start: bulkStart, end: bulkEnd }, next)
  }

  const removeDate = (date) => handleDatesChange(dates.filter(d => d !== date))

  const fmtShort = (d) => {
    const dt = new Date(d + 'T00:00:00')
    return `${dt.getMonth() + 1}/${dt.getDate()}(${WEEK[dt.getDay()]})`
  }
  const fmtRange = (s, e) => (s || e) ? `${s || ''}〜${e || ''}` : ''

  const bulkLabel = fmtRange(bulkStart, bulkEnd)

  return (
    <>
      <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 6 }}>
        日付をタップすると候補に入ります（もう一度タップで取り消し）
      </p>
      <CalendarPicker value={dates} onChange={handleDatesChange} AC={AC} ACB={ACB} ACD={ACD} />

      {/* 選んだ日の一覧。別の月に移動しても選択内容が見えるように必ず手元に残す */}
      <div style={{ marginTop: 10, marginBottom: 10 }}>
        <p style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginBottom: 6 }}>
          選んだ日{dates.length > 0 && `（${dates.length}件）`}
        </p>
        {dates.length === 0 ? (
          <p style={{ fontSize: 12, color: 'var(--color-text-tertiary)', margin: 0 }}>まだ選ばれていません</p>
        ) : (
          <>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
              {dates.map(d => {
                const o = overrides[d]
                const isEditing = editing === d
                return (
                  <span key={d} style={{
                    display: 'flex', alignItems: 'center', borderRadius: 999, fontSize: 12, fontWeight: 600,
                    background: ACB, color: ACD,
                    border: `1.5px solid ${isEditing ? AC : o ? AC : 'transparent'}`,
                  }}>
                    {/* 日付部分をタップ = その日だけ時間を変える */}
                    <button type="button" onClick={() => setEditing(isEditing ? null : d)}
                      aria-label={`${fmtShort(d)}の時間を変える`}
                      style={{ display: 'flex', alignItems: 'center', gap: 4, border: 'none', background: 'transparent', color: ACD, cursor: 'pointer', fontSize: 12, fontWeight: 600, padding: '5px 4px 5px 10px' }}>
                      {fmtShort(d)}
                      {o && <span style={{ fontWeight: 500, opacity: 0.85 }}>{fmtRange(o.start, o.end) || '時間未設定'}</span>}
                      <i className="ti ti-clock" style={{ fontSize: 13, opacity: o ? 1 : 0.45 }}></i>
                    </button>
                    {/* ×は削除。役割を分けて誤操作を防ぐ */}
                    <button type="button" onClick={() => removeDate(d)} aria-label={`${fmtShort(d)}を取り消す`}
                      style={{ border: 'none', background: 'transparent', color: ACD, cursor: 'pointer', fontSize: 14, padding: '5px 10px 5px 4px', lineHeight: 1 }}>×</button>
                  </span>
                )
              })}
            </div>
            <p style={{ fontSize: 11, color: 'var(--color-text-tertiary)', margin: '6px 0 0' }}>
              日付をタップすると、その日だけ時間を変えられます
            </p>
          </>
        )}
      </div>

      {/* 個別の時間編集パネル。チップの日付をタップすると開く */}
      {editing && (
        <div style={{ border: `1.5px solid ${AC}`, borderRadius: 'var(--border-radius-md)', padding: 12, marginBottom: 10, background: 'var(--color-background-secondary)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 600 }}>{fmtShort(editing)} の時間</span>
            <button type="button" onClick={() => setEditing(null)}
              style={{ border: 'none', background: 'transparent', color: 'var(--color-text-secondary)', cursor: 'pointer', fontSize: 12 }}>閉じる</button>
          </div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 8 }}>
            <input type="time" value={(overrides[editing] || { start: bulkStart })
              .start || ''} onChange={e => handleOverride(editing, 'start', e.target.value)} style={{ flex: 1 }} />
            <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>〜</span>
            <input type="time" value={(overrides[editing] || { end: bulkEnd })
              .end || ''} onChange={e => handleOverride(editing, 'end', e.target.value)} style={{ flex: 1 }} />
          </div>
          {overrides[editing] ? (
            <button type="button" onClick={() => clearOverride(editing)}
              style={{ border: 'none', background: 'transparent', color: AC, cursor: 'pointer', fontSize: 12, padding: 0 }}>
              ← 全体と同じ{bulkLabel && `（${bulkLabel}）`}に戻す
            </button>
          ) : (
            <p style={{ fontSize: 11, color: 'var(--color-text-tertiary)', margin: 0 }}>
              いま全体と同じ{bulkLabel ? `（${bulkLabel}）` : '（時間なし）'}です。変えるとこの日だけ変わります
            </p>
          )}
        </div>
      )}

      {/* 全体の時間。個別指定した日はここを変えても影響を受けない */}
      <div style={{ marginBottom: 10 }}>
        <p style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginBottom: 4 }}>
          時間（任意・個別に変えた日をのぞく全体に入ります）
        </p>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <input type="time" value={bulkStart} onChange={e => handleBulk('start', e.target.value)} style={{ flex: 1 }} />
          <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>〜</span>
          <input type="time" value={bulkEnd} onChange={e => handleBulk('end', e.target.value)} style={{ flex: 1 }} />
        </div>
      </div>
    </>
  )
}
