import { useState } from 'react'
import { Card } from './ui.jsx'
import { POLL_ORDER, POLL_STATUS, tallyPollCandidate } from '../lib/constants.js'

// メンバー画面で「回答受付中の日程調整」に○/△/✕+コメントで回答するためのパネル。
// selMember が選ばれている前提で、onRespond(pollId, candidateId, status, comment) を親から渡してもらう。
export default function MemberSchedulePanel({ polls, selMember, onRespond }) {
  const [drafts, setDrafts] = useState({}) // { `${pollId}_${candId}`: comment }
  const [expanded, setExpanded] = useState(new Set()) // `${pollId}_${candId}` を展開中かどうか

  const openPolls = (polls || []).filter(p => p.status === 'open')
  if (openPolls.length === 0) return null

  const fmtDate = (d) => {
    if (!d) return ''
    const dt = new Date(d + 'T00:00:00')
    return `${d}（${['日', '月', '火', '水', '木', '金', '土'][dt.getDay()]}）`
  }

  const toggle = (key) => setExpanded(prev => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n })

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
              const tally = tallyPollCandidate(poll, cand.id)
              const others = Object.entries(poll.responses || {}).filter(([name]) => name !== selMember)
              const isOpen = expanded.has(key)
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
                    style={{ fontSize: 13, marginBottom: others.length > 0 ? 8 : 0 }} />

                  {/* 他メンバーの回答状況 */}
                  {others.length > 0 && (
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 11, color: 'var(--color-text-success)' }}>○ {tally.yes}人</span>
                          <span style={{ fontSize: 11, color: 'var(--color-text-warning)' }}>△ {tally.maybe}人</span>
                          <span style={{ fontSize: 11, color: 'var(--color-text-danger)' }}>✕ {tally.no}人</span>
                        </div>
                        <button onClick={() => toggle(key)} style={{ fontSize: 11, color: 'var(--accent)', border: 'none', background: 'transparent', cursor: 'pointer', flexShrink: 0 }}>
                          {isOpen ? '▲ 閉じる' : `全員を見る (${others.length}人)`}
                        </button>
                      </div>
                      {isOpen && (
                        <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                          {others.map(([name, byCand]) => {
                            const or = byCand?.[cand.id]
                            const s = POLL_STATUS[or?.status ?? 'null']
                            return (
                              <span key={name} style={{ fontSize: 12, padding: '2px 9px', borderRadius: 999, background: s.bg, color: s.text }}>
                                {s.icon} {name}{or?.comment ? `（${or.comment}）` : ''}
                              </span>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </Card>
        )
      })}
    </div>
  )
}
