import { useState } from 'react'
import CalendarPicker from './CalendarPicker.jsx'

// ── 候補日の選択と時間設定をまとめて担当するコンポーネント ──────────────
//
// 役割分担:
//   CalendarPicker         … 月カレンダーのマス目だけ(日付を選ぶ/外す)
//   CandidateDatePicker    … 候補「枠」の管理・時間設定・候補リストの組み立て(このファイル)
//   AdminSchedulePanel     … フォーム全体と日程調整の一覧
//
// 「枠(slot)」という単位について:
//   同じ日に「午前」「夜」など複数の候補を出せるようにするため、候補は日付ではなく
//   { id, date, start, end } の枠として持つ。1つの日付に複数の枠がぶら下がる。
//   start/end が null の枠は「全体の時間」を使う(個別指定していない状態)。
//
// 操作の考え方(テクノロジーに詳しくない人向け):
//   - カレンダーのタップは今まで通り「その日を候補に入れる/外す」のトグルのまま。
//     ここに複数枠の概念を持ち込むと、押すたびに増えて消せなくなり混乱するため。
//   - 複数枠が必要な人だけ、チップをタップして開くパネルから明示的に追加する。
//   - 同じ日に2枠以上あると時間で区別するしかないので、その時だけ時間の指定を促す。

const WEEK = ['日', '月', '火', '水', '木', '金', '土']

function toYMD(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// 指定曜日を、今日から期限日までの範囲で全部拾う(定期練習をまとめて候補にするため)
function generateRepeat(weekdays, untilYMD) {
  const out = []
  if (!weekdays.length || !untilYMD) return out
  const start = new Date(); start.setHours(0, 0, 0, 0)
  const until = new Date(untilYMD + 'T00:00:00')
  if (until < start) return out
  const cur = new Date(start)
  let guard = 0
  while (cur <= until && guard++ < 400) {
    if (weekdays.includes(cur.getDay())) out.push(toYMD(cur))
    cur.setDate(cur.getDate() + 1)
  }
  return out
}

let slotSeq = 0
const newSlot = (date) => ({ id: `s${Date.now()}_${slotSeq++}`, date, start: null, end: null })

export default function CandidateDatePicker({ onChange, initialTimes, AC, ACB, ACD }) {
  const [slots, setSlots] = useState([])           // [{ id, date, start, end }]
  const [bulkStart, setBulkStart] = useState(initialTimes?.start || '')
  const [bulkEnd, setBulkEnd] = useState(initialTimes?.end || '')
  const [editingDate, setEditingDate] = useState(null)  // 時間帯を編集中の日付
  const [showRepeat, setShowRepeat] = useState(false)
  const [repeatDays, setRepeatDays] = useState([])
  const [repeatUntil, setRepeatUntil] = useState('')

  // 実際にメンバーへ出す候補の時刻(個別指定があればそれ、なければ全体)
  const effTime = (slot, bulk) => ({
    start: slot.start ?? bulk.start,
    end: slot.end ?? bulk.end,
  })

  // 親に渡す候補リスト。日付順→同じ日は時刻順に並べる(メンバーに見せる順が自然になる)
  const emit = (nextSlots, bulk) => {
    const list = nextSlots
      .map(s => { const t = effTime(s, bulk); return { date: s.date, timeStart: t.start, timeEnd: t.end } })
      .sort((a, b) => a.date === b.date ? (a.timeStart || '').localeCompare(b.timeStart || '') : a.date.localeCompare(b.date))
    onChange(list)
  }

  const applySlots = (next, bulk = { start: bulkStart, end: bulkEnd }) => {
    setSlots(next)
    emit(next, bulk)
  }

  // カレンダーは「日付の集合」として扱う。増えた日は枠を1つ足し、消えた日は枠を全部外す
  const handleDatesChange = (nextDates) => {
    const curDates = [...new Set(slots.map(s => s.date))]
    const added = nextDates.filter(d => !curDates.includes(d))
    const removed = curDates.filter(d => !nextDates.includes(d))
    let next = slots.filter(s => !removed.includes(s.date))
    added.forEach(d => { next = [...next, newSlot(d)] })
    if (editingDate && removed.includes(editingDate)) setEditingDate(null)
    applySlots(next)
  }

  const handleBulk = (field, val) => {
    const bulk = { start: field === 'start' ? val : bulkStart, end: field === 'end' ? val : bulkEnd }
    setBulkStart(bulk.start); setBulkEnd(bulk.end)
    emit(slots, bulk)
  }

  const updateSlot = (id, field, val) => {
    const cur = slots.find(s => s.id === id)
    if (!cur) return
    // 個別指定を始めた枠は、未設定側も現在の全体値で埋めておく(片方だけ空になるのを防ぐ)
    const base = { start: cur.start ?? bulkStart, end: cur.end ?? bulkEnd }
    applySlots(slots.map(s => s.id === id ? { ...s, ...base, [field]: val } : s))
  }

  const resetSlotToBulk = (id) => applySlots(slots.map(s => s.id === id ? { ...s, start: null, end: null } : s))

  const addSlotToDate = (date) => applySlots([...slots, newSlot(date)])

  const removeSlot = (id) => {
    const target = slots.find(s => s.id === id)
    const next = slots.filter(s => s.id !== id)
    if (target && !next.some(s => s.date === target.date) && editingDate === target.date) setEditingDate(null)
    applySlots(next)
  }

  const applyRepeat = () => {
    const generated = generateRepeat(repeatDays, repeatUntil)
    if (!generated.length) return
    const have = new Set(slots.map(s => s.date))
    const add = generated.filter(d => !have.has(d)).map(d => newSlot(d))
    if (!add.length) return
    applySlots([...slots, ...add].sort((a, b) => a.date.localeCompare(b.date)))
    setShowRepeat(false); setRepeatDays([]); setRepeatUntil('')
  }

  const toggleRepeatDay = (d) =>
    setRepeatDays(days => days.includes(d) ? days.filter(x => x !== d) : [...days, d].sort())

  const fmtShort = (d) => {
    const dt = new Date(d + 'T00:00:00')
    return `${dt.getMonth() + 1}/${dt.getDate()}(${WEEK[dt.getDay()]})`
  }
  const fmtRange = (s, e) => (s || e) ? `${s || ''}〜${e || ''}` : ''

  const selectedDates = [...new Set(slots.map(s => s.date))].sort()
  const countByDate = slots.reduce((acc, s) => ({ ...acc, [s.date]: (acc[s.date] || 0) + 1 }), {})
  const bulkLabel = fmtRange(bulkStart, bulkEnd)
  const repeatPreview = generateRepeat(repeatDays, repeatUntil)
  const repeatNewCount = repeatPreview.filter(d => !selectedDates.includes(d)).length
  // 同じ日に2枠以上あるのに時刻が入っていないと候補を区別できない。その状態を検出して注意を出す
  const ambiguous = Object.entries(countByDate)
    .filter(([d, n]) => n > 1 && slots.filter(s => s.date === d).some(s => !effTime(s, { start: bulkStart, end: bulkEnd }).start))
    .map(([d]) => d)

  const editingSlots = editingDate ? slots.filter(s => s.date === editingDate) : []

  return (
    <>
      <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 6 }}>
        日付をタップすると候補に入ります（もう一度タップで取り消し）
      </p>
      <CalendarPicker value={selectedDates} onChange={handleDatesChange} countByDate={countByDate} AC={AC} ACB={ACB} ACD={ACD} />

      <button type="button" onClick={() => setShowRepeat(v => !v)}
        style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 8, padding: '6px 12px', borderRadius: 999, border: `1px solid ${showRepeat ? AC : 'var(--color-border-tertiary)'}`, background: showRepeat ? ACB : 'transparent', color: showRepeat ? ACD : 'var(--color-text-secondary)', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
        <i className="ti ti-repeat" style={{ fontSize: 14 }}></i>
        毎週くり返しでまとめて追加
      </button>

      {showRepeat && (
        <div style={{ border: `1.5px solid ${AC}`, borderRadius: 'var(--border-radius-md)', padding: 12, marginTop: 8, background: 'var(--color-background-secondary)' }}>
          <p style={{ fontSize: 11, color: 'var(--color-text-secondary)', margin: '0 0 6px' }}>くり返す曜日（複数選べます）</p>
          <div style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
            {WEEK.map((w, i) => {
              const on = repeatDays.includes(i)
              const wc = i === 0 ? '#C2453F' : i === 6 ? '#2F6FB3' : 'var(--color-text-primary)'
              return (
                <button key={w} type="button" onClick={() => toggleRepeatDay(i)} aria-pressed={on}
                  style={{ flex: 1, padding: '8px 0', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                    border: `1.5px solid ${on ? AC : 'var(--color-border-tertiary)'}`,
                    background: on ? AC : 'transparent', color: on ? '#fff' : wc }}>{w}</button>
              )
            })}
          </div>
          <p style={{ fontSize: 11, color: 'var(--color-text-secondary)', margin: '0 0 4px' }}>いつまで</p>
          <input type="date" value={repeatUntil} onChange={e => setRepeatUntil(e.target.value)} style={{ width: '100%', marginBottom: 12 }} />
          <button type="button" onClick={applyRepeat} disabled={repeatNewCount === 0}
            style={{ width: '100%', padding: '9px 0', borderRadius: 'var(--border-radius-md)', border: 'none', fontWeight: 600, fontSize: 13,
              cursor: repeatNewCount === 0 ? 'default' : 'pointer',
              background: repeatNewCount === 0 ? 'var(--color-background-tertiary)' : AC,
              color: repeatNewCount === 0 ? 'var(--color-text-tertiary)' : '#fff' }}>
            {repeatNewCount > 0 ? `${repeatNewCount}件をまとめて追加` : '曜日と期限を選んでください'}
          </button>
          <p style={{ fontSize: 11, color: 'var(--color-text-tertiary)', margin: '6px 0 0', lineHeight: 1.6 }}>
            今日から選んだ日までの、その曜日を全部追加します（今ある候補はそのまま残ります）
          </p>
        </div>
      )}

      {/* 選んだ候補の一覧。1枠=1チップ。メンバーが見る候補と1対1で対応させる */}
      <div style={{ marginTop: 10, marginBottom: 10 }}>
        <p style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginBottom: 6 }}>
          選んだ候補{slots.length > 0 && `（${slots.length}件）`}
        </p>
        {slots.length === 0 ? (
          <p style={{ fontSize: 12, color: 'var(--color-text-tertiary)', margin: 0 }}>まだ選ばれていません</p>
        ) : (
          <>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
              {[...slots].sort((a, b) => a.date === b.date
                ? ((a.start ?? bulkStart) || '').localeCompare((b.start ?? bulkStart) || '')
                : a.date.localeCompare(b.date)).map(s => {
                const t = effTime(s, { start: bulkStart, end: bulkEnd })
                const multi = countByDate[s.date] > 1
                const isEditing = editingDate === s.date
                const custom = s.start != null
                return (
                  <span key={s.id} style={{
                    display: 'flex', alignItems: 'center', borderRadius: 999, fontSize: 12, fontWeight: 600,
                    background: ACB, color: ACD,
                    border: `1.5px solid ${isEditing || custom ? AC : 'transparent'}`,
                  }}>
                    <button type="button" onClick={() => setEditingDate(isEditing ? null : s.date)}
                      aria-label={`${fmtShort(s.date)}の時間を変える`}
                      style={{ display: 'flex', alignItems: 'center', gap: 4, border: 'none', background: 'transparent', color: ACD, cursor: 'pointer', fontSize: 12, fontWeight: 600, padding: '5px 4px 5px 10px' }}>
                      {fmtShort(s.date)}
                      {/* 同じ日に複数枠がある時は、時刻を出さないと候補を区別できないので必ず出す */}
                      {(custom || multi) && (
                        <span style={{ fontWeight: 500, opacity: 0.85 }}>
                          {fmtRange(t.start, t.end) || '時間未設定'}
                        </span>
                      )}
                      <i className="ti ti-clock" style={{ fontSize: 13, opacity: custom ? 1 : 0.45 }}></i>
                    </button>
                    <button type="button" onClick={() => removeSlot(s.id)} aria-label={`${fmtShort(s.date)}を取り消す`}
                      style={{ border: 'none', background: 'transparent', color: ACD, cursor: 'pointer', fontSize: 14, padding: '5px 10px 5px 4px', lineHeight: 1 }}>×</button>
                  </span>
                )
              })}
            </div>
            <p style={{ fontSize: 11, color: 'var(--color-text-tertiary)', margin: '6px 0 0' }}>
              日付をタップすると、時間の変更や「同じ日にもう1つ」の追加ができます
            </p>
            {ambiguous.length > 0 && (
              <p style={{ fontSize: 11, color: 'var(--color-text-warning)', margin: '6px 0 0', display: 'flex', gap: 4, lineHeight: 1.6 }}>
                <i className="ti ti-alert-circle" style={{ fontSize: 13, flexShrink: 0, marginTop: 1 }}></i>
                <span>{ambiguous.map(fmtShort).join('・')} は同じ日に複数の候補があります。メンバーが見分けられるよう時間を入れてください</span>
              </p>
            )}
          </>
        )}
      </div>

      {/* その日の時間帯パネル。複数枠の追加・削除・個別時刻の設定をここに集約する */}
      {editingDate && (
        <div style={{ border: `1.5px solid ${AC}`, borderRadius: 'var(--border-radius-md)', padding: 12, marginBottom: 10, background: 'var(--color-background-secondary)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 600 }}>{fmtShort(editingDate)} の時間帯</span>
            <button type="button" onClick={() => setEditingDate(null)}
              style={{ border: 'none', background: 'transparent', color: 'var(--color-text-secondary)', cursor: 'pointer', fontSize: 12 }}>閉じる</button>
          </div>

          {editingSlots.map((s, i) => {
            const t = effTime(s, { start: bulkStart, end: bulkEnd })
            return (
              <div key={s.id} style={{ marginBottom: 8 }}>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <input type="time" value={t.start || ''} onChange={e => updateSlot(s.id, 'start', e.target.value)} style={{ flex: 1 }} />
                  <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>〜</span>
                  <input type="time" value={t.end || ''} onChange={e => updateSlot(s.id, 'end', e.target.value)} style={{ flex: 1 }} />
                  {editingSlots.length > 1 && (
                    <button type="button" onClick={() => removeSlot(s.id)} aria-label={`${i + 1}つ目の時間帯を削除`}
                      style={{ border: 'none', background: 'transparent', color: 'var(--color-text-danger)', cursor: 'pointer', padding: 4, flexShrink: 0 }}>
                      <i className="ti ti-trash" style={{ fontSize: 15 }}></i>
                    </button>
                  )}
                </div>
                {s.start != null && (
                  <button type="button" onClick={() => resetSlotToBulk(s.id)}
                    style={{ border: 'none', background: 'transparent', color: AC, cursor: 'pointer', fontSize: 11, padding: '2px 0 0' }}>
                    ← 全体と同じ{bulkLabel && `（${bulkLabel}）`}に戻す
                  </button>
                )}
              </div>
            )
          })}

          <button type="button" onClick={() => addSlotToDate(editingDate)}
            style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 4, padding: '7px 12px', borderRadius: 999, border: `1px dashed ${AC}`, background: 'transparent', color: ACD, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
            <i className="ti ti-plus" style={{ fontSize: 14 }}></i>
            この日にもう1つ時間帯を追加
          </button>
          <p style={{ fontSize: 11, color: 'var(--color-text-tertiary)', margin: '8px 0 0', lineHeight: 1.6 }}>
            午前と夜など、同じ日に別々の候補を出したいときに使います
          </p>
        </div>
      )}

      {/* 全体の時間。個別指定した枠はここを変えても影響を受けない */}
      <div style={{ marginBottom: 10 }}>
        <p style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginBottom: 4 }}>
          時間（任意・個別に変えた候補をのぞく全体に入ります）
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
