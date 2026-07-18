import { useState } from 'react'

// ── カレンダーから候補日を選ぶUI ────────────────────────────────
// 対象ユーザー: テクノロジーに詳しくない学生・サークル運営者。
// 「日付を入力する」より「カレンダーをタップする」方が説明なしで伝わるため、
// 日付入力欄の代わりに月カレンダーを出し、タップで選択/解除できるようにしている。
//
// props:
//   value    : string[]  選択済みの日付(YYYY-MM-DD)の配列
//   onChange : (dates: string[]) => void
//   AC/ACB/ACD : アクセントカラー(親から受け取り、テーマ変更に追従させる)

const WEEK_LABELS = ['日', '月', '火', '水', '木', '金', '土']

// Date → 'YYYY-MM-DD'。toISOString()はUTCに変換されて日付がずれることがあるので使わない
function toYMD(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export default function CalendarPicker({ value = [], onChange, AC, ACB, ACD }) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  // 表示中の月(その月の1日を保持する)
  const [viewMonth, setViewMonth] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1))

  const year = viewMonth.getFullYear()
  const month = viewMonth.getMonth() // 0-11
  const firstDayOfWeek = new Date(year, month, 1).getDay() // 月初が何曜日か(0=日)
  const daysInMonth = new Date(year, month + 1, 0).getDate() // その月の日数

  // カレンダーのマス目を作る。月初まではnull(空白マス)で埋める
  const cells = []
  for (let i = 0; i < firstDayOfWeek; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  const isSelected = (ymd) => value.includes(ymd)

  const toggleDate = (day) => {
    const ymd = toYMD(new Date(year, month, day))
    if (isSelected(ymd)) onChange(value.filter(v => v !== ymd))
    else onChange([...value, ymd].sort()) // 常に日付順に並べておく(選んだ順ではなく暦順が自然)
  }

  // 今より前の月には戻れないようにする(過去の候補日を作る意味がないため)
  const canGoPrev = year > today.getFullYear() || (year === today.getFullYear() && month > today.getMonth())
  const goPrev = () => canGoPrev && setViewMonth(new Date(year, month - 1, 1))
  const goNext = () => setViewMonth(new Date(year, month + 1, 1))

  return (
    <div style={{ border: '1px solid var(--color-border-tertiary)', borderRadius: 'var(--border-radius-md)', overflow: 'hidden' }}>
      {/* 月の切り替え */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', background: 'var(--color-background-secondary)' }}>
        <button type="button" onClick={goPrev} disabled={!canGoPrev} aria-label="前の月"
          style={{ width: 32, height: 32, borderRadius: 8, border: 'none', background: 'transparent', cursor: canGoPrev ? 'pointer' : 'default', color: canGoPrev ? ACD : 'var(--color-border-secondary)', fontSize: 18, lineHeight: 1 }}>‹</button>
        <span style={{ fontWeight: 600, fontSize: 14 }}>{year}年{month + 1}月</span>
        <button type="button" onClick={goNext} aria-label="次の月"
          style={{ width: 32, height: 32, borderRadius: 8, border: 'none', background: 'transparent', cursor: 'pointer', color: ACD, fontSize: 18, lineHeight: 1 }}>›</button>
      </div>

      {/* 曜日の見出し。土日は色を変えて、部活の土日活動を探しやすくする */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', padding: '6px 4px 2px' }}>
        {WEEK_LABELS.map((w, i) => (
          <div key={w} style={{ textAlign: 'center', fontSize: 11, fontWeight: 600, padding: '2px 0',
            color: i === 0 ? '#C2453F' : i === 6 ? '#2F6FB3' : 'var(--color-text-tertiary)' }}>{w}</div>
        ))}
      </div>

      {/* 日付のマス目 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3, padding: '0 4px 8px' }}>
        {cells.map((day, i) => {
          if (day === null) return <div key={`e${i}`} />
          const dateObj = new Date(year, month, day)
          const ymd = toYMD(dateObj)
          const isPast = dateObj < today
          const isToday = ymd === toYMD(today)
          const selected = isSelected(ymd)
          const dow = dateObj.getDay()
          // 平日/土/日で文字色を変える(選択済みは白抜きなので対象外)
          const baseColor = dow === 0 ? '#C2453F' : dow === 6 ? '#2F6FB3' : 'var(--color-text-primary)'
          return (
            <button
              key={ymd}
              type="button"
              onClick={() => !isPast && toggleDate(day)}
              disabled={isPast}
              aria-pressed={selected}
              aria-label={`${month + 1}月${day}日${selected ? '（選択中）' : ''}`}
              style={{
                aspectRatio: '1 / 1', minHeight: 38,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                borderRadius: 8, fontSize: 14, fontWeight: selected || isToday ? 700 : 500,
                cursor: isPast ? 'default' : 'pointer',
                background: selected ? AC : isToday ? ACB : 'transparent',
                color: selected ? '#fff' : isPast ? 'var(--color-border-secondary)' : baseColor,
                border: isToday && !selected ? `1.5px solid ${AC}` : '1.5px solid transparent',
                opacity: isPast ? 0.45 : 1,
                transition: 'background .12s ease, transform .12s ease',
                padding: 0,
              }}>
              {day}
            </button>
          )
        })}
      </div>
    </div>
  )
}
