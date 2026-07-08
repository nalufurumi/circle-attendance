import { useState } from 'react'
import { Card } from './ui.jsx'
import { POLL_ORDER, POLL_STATUS } from '../lib/constants.js'

// メンバー画面で「回答受付中の日程調整」に○/△/✕+コメントで回答するためのパネル。
// selMember が選ばれている前提で、onRespond(pollId, candidateId, status, comment) を親から渡してもらう。
export default function MemberSchedulePanel({ polls, selMember, onRespond }) {
  const [drafts, setDrafts] = useState({}) // { `${pollId}_${candId}`: comment }

  const openPolls = (polls || []).filter(p => p.status === 'open')
  if (openPolls.length === 0) return null

  const fmtDate = (d) => {
    if (!d) return ''
    const dt = new Date(d + 'T00:00:00')
    return `${d}（${['日', '月', '火', '水', '木', '金', '土'][dt.getDay()]}）`
  }

  return (
    <div style={{ marginBottom: 16 }}>
      <p style={{ fontWeight: 500, fontSize: 13, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
        <i className="ti ti-calendar-question" style={{ fontSize: 16 }}></i>日程調整（回答受付中）
      </p>
      {openPolls.map(poll => {
        const responded = poll.candidates.every(c => poll.responses?.[selMember]?.[c.id]?.status)
        return (
          <Card key={poll.id} style={{ padding: 14, marginBottom: 10, border: responded ? undefined : '1.5px solid var(--accent)' }}>
            <p style={{ fontWeight: 500, marginBottom: 2 }}>{poll.title}</p>
            {poll.requireAll && <p style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginBottom: 8 }}>※ 全候補への回答をお願いします</p>}
            {poll.candidates.map(cand => {
              const key = `${poll.id}_${cand.id}`
              const r = poll.responses?.[selMember]?.[cand.id] || {}
              const cur = r.status ?? null
              const comment = drafts[key] ?? r.comment ?? ''
              return (
                <div key={cand.id} style={{ marginBottom: 10, paddingBottom: 10, borderBottom: '0.5px solid var(--color-border-tertiary)' }}>
                  <p style={{ fontSize: 13, fontWeight: 500, marginBottom: 6 }}>{fmtDate(cand.date)}{cand.timeStart ? ` ${cand.timeStart}〜${cand.timeEnd || ''}` : ''}</p>
                  <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
                    {POLL_ORDER.filter(s => s !== null).map(st => {
                      const s = POLL_STATUS[st]
                      const active = cur === st
                      return (
                        <button key={st} onClick={() => onRespond(poll.id, cand.id, st, comment)}
                          style={{ flex: 1, padding: '8px 0', borderRadius: 'var(--border-radius-md)', border: `1.5px solid ${active ? s.border : 'var(--color-border-tertiary)'}`, background: active ? s.bg : 'transparent', color: active ? s.text : 'var(--color-text-secondary)', cursor: 'pointer', fontWeight: 500, fontSize: 14 }}>
                          {s.icon} {s.label}
                        </button>
                      )
                    })}
                  </div>
                  <input type="text" placeholder="コメント（任意）例：19時以降なら参加できます"
                    value={comment}
                    onChange={e => setDrafts({ ...drafts, [key]: e.target.value })}
                    onBlur={() => { if (cur) onRespond(poll.id, cand.id, cur, comment) }}
                    style={{ fontSize: 13 }} />
                </div>
              )
            })}
          </Card>
        )
      })}
    </div>
  )
}
