import { useState } from 'react'
import {
  COLORS, getColor, PLAN_ORDER, ACTUAL_ORDER, PLAN_STATUS, ACTUAL_STATUS,
  EVENT_TYPES, applyAccent, todayStr, computeStats, isEditLocked,
} from '../lib/constants.js'

const AC = 'var(--accent)', ACB = 'var(--accent-bg)', ACD = 'var(--accent-dark)'

// ── Seed data ─────────────────────────────────────────────────
const D = (offset) => { const d = new Date(); d.setDate(d.getDate() + offset); return d.toISOString().slice(0, 10) }
function seedData() {
  return {
    circleName: 'サンプル☆コピーダンス',
    accentColor: 'peacock',
    notice: '次回の全体練習は衣装持参でお願いします！🎀 集合は13:45、A studioです。',
    alertThreshold: 60,
    globalTags: ['全体', 'ダンス', '2期生', '新曲'],
    members: ['あやか', 'みお', 'さくら', 'ひなた', 'ゆい', 'りん', 'まな', 'のあ'],
    pendingMembers: [
      { id: 'req1', realName: '田中陽菜', displayName: 'ひな', note: '新2年生・パート未定', at: '2026/6/28 21:10' },
    ],
    events: [
      { id: 'd1', date: D(7),  timeStart: '14:00', timeEnd: '17:00', name: '全体練習（新曲）', type: '練習', color: 'pink',   tags: ['全体', '新曲'], memo: '新曲のフォーメーション確認します！動きやすい服装で。', attendance: {
        あやか: { plan: 'attending', actual: null, reason: null }, みお: { plan: 'attending', actual: null, reason: null },
        さくら: { plan: 'late', actual: null, reason: null }, ひなた: { plan: 'absent', actual: null, reason: 'バイト' },
        ゆい: { plan: 'attending', actual: null, reason: null }, りん: { plan: 'undecided', actual: null, reason: null },
      }},
      { id: 'd2', date: D(3),  timeStart: '18:00', timeEnd: '20:00', name: '2期生ミーティング', type: 'MTG', color: 'blue', tags: ['2期生'], memo: '', attendance: {
        さくら: { plan: 'attending', actual: null, reason: null }, ゆい: { plan: 'attending', actual: null, reason: null }, のあ: { plan: 'attending', actual: null, reason: null },
      }},
      { id: 'd3', date: D(-2), timeStart: '13:00', timeEnd: '16:00', name: '春の定期公演リハ', type: '本番', color: 'red', tags: ['全体', 'ダンス'], memo: '本番想定で通します。', attendance: {
        あやか: { plan: 'attending', actual: 'present', reason: null }, みお: { plan: 'attending', actual: 'present', reason: null },
        さくら: { plan: 'attending', actual: 'late', reason: null }, ひなた: { plan: 'attending', actual: 'present', reason: null },
        ゆい: { plan: 'late', actual: 'late', reason: '電車遅延' }, りん: { plan: 'attending', actual: 'absent', reason: '体調不良' },
        まな: { plan: 'attending', actual: 'present', reason: null }, のあ: { plan: 'attending', actual: 'present', reason: null },
      }},
      { id: 'd4', date: D(-9), timeStart: '14:00', timeEnd: '17:00', name: '全体練習', type: '練習', color: 'green', tags: ['全体', 'ダンス'], memo: '', attendance: {
        あやか: { plan: 'attending', actual: 'present', reason: null }, みお: { plan: 'attending', actual: 'present', reason: null },
        さくら: { plan: 'attending', actual: 'present', reason: null }, ひなた: { plan: 'absent', actual: 'absent', reason: 'テスト期間' },
        ゆい: { plan: 'attending', actual: 'present', reason: null }, りん: { plan: 'attending', actual: 'late', reason: null },
        まな: { plan: 'attending', actual: 'present', reason: null }, のあ: { plan: 'late', actual: 'absent', reason: '寝坊' },
      }},
    ],
  }
}

const Card = ({ children, style = {} }) => (
  <div style={{ background: 'var(--color-background-primary)', borderRadius: 'var(--border-radius-lg)', boxShadow: 'var(--shadow-card)', ...style }}>{children}</div>
)
const Avatar = ({ name, size = 32 }) => (
  <div style={{ width: size, height: size, borderRadius: '50%', background: ACB, color: ACD, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 500, fontSize: size * 0.4, flexShrink: 0 }}>{name.slice(0, 1)}</div>
)

export default function DemoPage() {
  const [data, setData] = useState(seedData)
  const [view, setView] = useState('member')   // member | admin
  const [selMember, setSelMember] = useState(null)
  const [adminTab, setAdminTab] = useState('events')
  const [expandedEv, setExpandedEv] = useState(null)
  const [evMode, setEvMode] = useState({})
  const [activeTag, setActiveTag] = useState(null)
  const [memberSearch, setMemberSearch] = useState('')
  const [logs, setLogs] = useState([])
  const [showAddEv, setShowAddEv] = useState(false)
  const [editingEvId, setEditingEvId] = useState(null)
  const [newEv, setNewEv] = useState({ date: todayStr(), timeStart: '', timeEnd: '', name: '', type: '練習', color: 'pink', tags: [], memo: '' })
  const [tagInput, setTagInput] = useState('')
  const [newTagInput, setNewTagInput] = useState('')
  const [notice, setNotice] = useState(seedData().notice)
  const [memberSort, setMemberSort] = useState('registration')
  const [pendingChange, setPendingChange] = useState(null)
  const [pendingMemberDelete, setPendingMemberDelete] = useState(null)
  const [reasonDraft, setReasonDraft] = useState({})
  const today = todayStr()

  const allTags = [...new Set([...(data.globalTags || []), ...data.events.flatMap(e => e.tags || [])])]
  const sortedEvs = [...data.events].sort((a, b) => evOrder === 'desc' ? b.date.localeCompare(a.date) : a.date.localeCompare(b.date))

  const addLog = (entry) => setLogs(l => [{ at: new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' }), ...entry }, ...l].slice(0, 50))

  // In-memory attendance change (member side — no confirmation needed)
  const updateAtt = (evId, member, field, value) => {
    const ev = data.events.find(e => e.id === evId); if (!ev) return
    const sm = field === 'plan' ? PLAN_STATUS : ACTUAL_STATUS
    setData(d => ({
      ...d,
      events: d.events.map(e => {
        if (e.id !== evId) return e
        const att = e.attendance[member] || { plan: null, actual: null, reason: null }
        const cur = att[field] ?? null
        addLog({ by: member, type: 'member', eventName: e.name, member, before: sm[cur]?.label || '未入力', after: sm[value]?.label || '未入力' })
        return { ...e, attendance: { ...e.attendance, [member]: { ...att, [field]: value } } }
      }),
    }))
  }
  const saveReason = (evId, member, reason) => {
    setData(d => ({ ...d, events: d.events.map(e => e.id !== evId ? e : { ...e, attendance: { ...e.attendance, [member]: { ...(e.attendance[member] || {}), reason: reason || null } } }) }))
  }

  // Admin attendance change — goes through confirmation modal
  const cycleAdmin = (evId, member, field) => {
    const ev = data.events.find(e => e.id === evId); if (!ev) return
    const order = field === 'plan' ? PLAN_ORDER : ACTUAL_ORDER
    const att = ev.attendance[member] || { plan: null, actual: null, reason: null }
    const cur = att[field] ?? null
    const nxt = order[(order.indexOf(cur) + 1) % order.length]
    setPendingChange({ evId, ev, member, field, cur, nxt })
  }
  const doAdminChange = ({ evId, ev, member, field, cur, nxt }) => {
    const sm = field === 'plan' ? PLAN_STATUS : ACTUAL_STATUS
    setData(d => ({ ...d, events: d.events.map(e => e.id !== evId ? e : { ...e, attendance: { ...e.attendance, [member]: { ...(e.attendance[member] || {}), [field]: nxt } } }) }))
    addLog({ by: '管理者', type: 'admin', eventName: ev.name, member, before: sm[cur]?.label || '未入力', after: sm[nxt]?.label || '未入力' })
    setPendingChange(null)
  }

  const startEditEvent = (ev) => {
    setNewEv({ date: ev.date, timeStart: ev.timeStart || '', timeEnd: ev.timeEnd || '', name: ev.name, type: ev.type, color: ev.color, tags: ev.tags || [], memo: ev.memo || '' })
    setEditingEvId(ev.id); setShowAddEv(true); setExpandedEv(null)
  }

  const addEvent = () => {
    if (!newEv.date || !newEv.name.trim()) return
    if (editingEvId) {
      setData(d => ({
        ...d,
        globalTags: [...new Set([...(d.globalTags || []), ...newEv.tags])],
        events: d.events.map(e => e.id !== editingEvId ? e : { ...e, date: newEv.date, timeStart: newEv.timeStart, timeEnd: newEv.timeEnd, name: newEv.name.trim(), type: newEv.type, color: newEv.color, tags: newEv.tags, memo: newEv.memo }),
      }))
      addLog({ by: '管理者', type: 'admin', eventName: newEv.name.trim(), member: '', before: 'イベント編集前', after: 'イベント編集' })
      setExpandedEv(editingEvId)
    } else {
      const ev = { id: `e${Date.now()}`, date: newEv.date, timeStart: newEv.timeStart, timeEnd: newEv.timeEnd, name: newEv.name.trim(), type: newEv.type, color: newEv.color, tags: newEv.tags, memo: newEv.memo, attendance: {} }
      setData(d => ({ ...d, events: [...d.events, ev], globalTags: [...new Set([...(d.globalTags || []), ...newEv.tags])] }))
      addLog({ by: '管理者', type: 'admin', eventName: ev.name, member: '', before: '（未作成）', after: 'イベント追加' })
      setExpandedEv(ev.id)
    }
    setNewEv({ date: todayStr(), timeStart: '', timeEnd: '', name: '', type: '練習', color: 'pink', tags: [], memo: '' })
    setTagInput(''); setShowAddEv(false); setEditingEvId(null)
  }

  const doRemoveMember = (name) => {
    setData(d => ({ ...d, members: d.members.filter(m => m !== name), events: d.events.map(e => { const a = { ...e.attendance }; delete a[name]; return { ...e, attendance: a } }) }))
    addLog({ by: '管理者', type: 'admin', eventName: '', member: name, before: 'メンバー存在', after: 'メンバー削除' })
    setPendingMemberDelete(null)
  }

  const approveMember = (req) => {
    if (data.members.includes(req.displayName)) return
    setData(d => ({ ...d, members: [...d.members, req.displayName], pendingMembers: d.pendingMembers.filter(r => r.id !== req.id) }))
    addLog({ by: '管理者', type: 'admin', eventName: '', member: req.displayName, before: '申請中', after: 'メンバー承認' })
  }
  const rejectMember = (req) => {
    setData(d => ({ ...d, pendingMembers: d.pendingMembers.filter(r => r.id !== req.id) }))
    addLog({ by: '管理者', type: 'admin', eventName: '', member: req.displayName, before: '申請中', after: '却下' })
  }

  const getStats = m => {
    const s = computeStats(data.events, m)
    return { present: s.present, late: s.late, absent: s.absent, denom: s.heldDenom, rate: s.actualRate, predicted: s.predictedRate, planTotal: s.planTotal }
  }

  return (
    <div style={{ fontFamily: 'var(--font-sans)', fontSize: 14, color: 'var(--color-text-primary)', paddingBottom: '2rem' }}>
      {/* Demo banner */}
      <div style={{ background: ACD, color: '#fff', padding: '8px 16px', fontSize: 12, textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
        <i className="ti ti-flask" style={{ fontSize: 14 }}></i>
        体験版です — 自由に触ってOK！変更はページを再読み込みすると元に戻ります
      </div>

      {/* Header with view toggle */}
      <div style={{ background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', boxShadow: 'var(--shadow-header)', padding: '10px 16px', position: 'sticky', top: 0, zIndex: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ color: AC }}>✧</span>
        <span style={{ fontWeight: 500, fontSize: 15, flex: 1 }}>{data.circleName}</span>
        <div style={{ display: 'flex', gap: 6 }}>
          {[{ id: 'member', icon: 'ti-user', label: 'メンバー画面' }, { id: 'admin', icon: 'ti-shield', label: '管理者画面' }].map(v => (
            <button key={v.id} onClick={() => { setView(v.id); setSelMember(null) }} style={{ padding: '5px 11px', borderRadius: 999, fontSize: 12, cursor: 'pointer', background: view === v.id ? ACB : 'transparent', border: `0.5px solid ${view === v.id ? AC : 'var(--color-border-tertiary)'}`, color: view === v.id ? ACD : 'var(--color-text-secondary)', fontWeight: view === v.id ? 500 : 400 }}>
              <i className={`ti ${v.icon}`} style={{ fontSize: 12, marginRight: 3 }}></i>{v.label}
            </button>
          ))}
        </div>
      </div>

      {/* ═══ MEMBER VIEW ═══ */}
      {view === 'member' && (
        <div style={{ padding: 16 }}>
          {!selMember ? (
            <>
              {data.notice && (
                <div style={{ background: ACB, border: `0.5px solid ${AC}`, borderRadius: 'var(--border-radius-md)', padding: '10px 14px', marginBottom: 16, display: 'flex', gap: 8 }}>
                  <span style={{ flexShrink: 0 }}>📌</span>
                  <p style={{ fontSize: 13, color: ACD, lineHeight: 1.7 }}>{data.notice}</p>
                </div>
              )}
              <p style={{ fontWeight: 500, marginBottom: 4 }}>名前を選んでください</p>
              <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 12 }}>タップして出席状況を確認・入力できます</p>

              <div style={{ position: 'relative', marginBottom: 12 }}>
                <i className="ti ti-search" style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-tertiary)', fontSize: 15, pointerEvents: 'none' }}></i>
                <input type="text" placeholder="名前を検索..." value={memberSearch} onChange={e => setMemberSearch(e.target.value)} style={{ paddingLeft: 34 }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {data.members.filter(m => m.includes(memberSearch)).map(m => (
                  <button key={m} onClick={() => setSelMember(m)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px', background: 'var(--color-background-primary)', borderRadius: 'var(--border-radius-lg)', cursor: 'pointer', textAlign: 'left', border: 'none', boxShadow: 'var(--shadow-card)' }}>
                    <Avatar name={m} size={36} /><span style={{ fontWeight: 500, fontSize: 13 }}>{m}</span>
                  </button>
                ))}
              </div>
              {memberSearch && data.members.filter(m => m.includes(memberSearch)).length === 0 && (
                <p style={{ textAlign: 'center', color: 'var(--color-text-tertiary)', fontSize: 13, marginTop: 16 }}>「{memberSearch}」は見つかりませんでした</p>
              )}

              <div style={{ marginTop: 20, textAlign: 'center' }}>
                <span style={{ fontSize: 13, color: 'var(--color-text-tertiary)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <i className="ti ti-user-plus" style={{ fontSize: 15 }}></i>メンバー登録を申請する（体験版では無効）
                </span>
              </div>
            </>
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <button onClick={() => { setSelMember(null); setActiveTag(null) }} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--color-text-secondary)', padding: 0 }}><i className="ti ti-arrow-left" style={{ fontSize: 20 }}></i></button>
                <Avatar name={selMember} size={42} />
                <div>
                  <p style={{ fontWeight: 500, fontSize: 16, margin: 0 }}>{selMember}</p>
                  {(() => {
                    const st = getStats(selMember)
                    const rc = st.rate == null ? 'var(--color-text-tertiary)' : st.rate >= 80 ? 'var(--color-text-success)' : st.rate >= 60 ? 'var(--color-text-warning)' : 'var(--color-text-danger)'
                    return <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', margin: 0 }}>実績出席率 <strong style={{ color: rc }}>{st.rate == null ? '－' : `${st.rate}%`}</strong>{st.predicted != null && <span style={{ color: 'var(--color-text-tertiary)' }}>　予測 {st.predicted}%</span>}　欠席 {st.absent}回</p>
                  })()}
                </div>
              </div>
              <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:6 }}>
                <button onClick={()=>setEvOrder(o=>o==='desc'?'asc':'desc')} style={{ fontSize:12, color:'var(--color-text-secondary)', border:'0.5px solid var(--color-border-tertiary)', background:'transparent', borderRadius:999, padding:'3px 10px', cursor:'pointer', display:'flex', alignItems:'center', gap:4 }}>
                  <i className={`ti ${evOrder==='desc'?'ti-sort-descending':'ti-sort-ascending'}`} style={{ fontSize:13 }}></i>
                  {evOrder==='desc'?'新しい順':'古い順'}
                </button>
              </div>
              {allTags.length > 0 && (
                <div style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <button onClick={() => setActiveTag(null)} style={{ padding: '3px 10px', borderRadius: 999, fontSize: 12, cursor: 'pointer', border: 'none', background: !activeTag ? AC : 'var(--color-background-secondary)', color: !activeTag ? '#fff' : 'var(--color-text-secondary)' }}>#すべて</button>
                    {(showAllTags ? allTags : allTags.slice(0, 5)).map(tag => (
                      <button key={tag} onClick={() => setActiveTag(activeTag === tag ? null : tag)} style={{ padding: '3px 10px', borderRadius: 999, fontSize: 12, cursor: 'pointer', border: 'none', background: activeTag === tag ? AC : 'var(--color-background-secondary)', color: activeTag === tag ? '#fff' : 'var(--color-text-secondary)' }}>#{tag}</button>
                    ))}
                    {allTags.length > 5 && (
                      <button onClick={() => setShowAllTags(s => !s)} style={{ padding: '3px 10px', borderRadius: 999, fontSize: 12, cursor: 'pointer', border: '0.5px solid var(--color-border-tertiary)', background: 'transparent', color: 'var(--color-text-tertiary)' }}>
                        {showAllTags ? '▲ 閉じる' : `＋その他 ${allTags.length - 5}個 ▾`}
                      </button>
                    )}
                  </div>
                </div>
              )}
              {sortedEvs.filter(e => !activeTag || e.tags?.includes(activeTag)).map(ev => {
                const isUpcoming = ev.date > today
                const att = ev.attendance[selMember] || { plan: null, actual: null, reason: null }
                const field = isUpcoming ? 'plan' : 'actual'
                const cur = att[field] ?? null
                const sm = isUpcoming ? PLAN_STATUS : ACTUAL_STATUS
                const statusOrder = isUpcoming ? PLAN_ORDER : ACTUAL_ORDER
                const s = sm[cur] || sm[null]
                const locked = isEditLocked(ev)
                return (
                  <Card key={ev.id} style={{ marginBottom: 10, padding: 14, opacity: locked ? 0.85 : 1 }}>
                    <div style={{ display: 'flex', gap: 10 }}>
                      <div style={{ width: 4, borderRadius: 2, background: getColor(ev.color), flexShrink: 0, alignSelf: 'stretch', minHeight: 36 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                          <div style={{ minWidth: 0 }}>
                            <p style={{ fontWeight: 500, margin: 0 }}>{ev.name}</p>
                            <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                          <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', margin: 0 }}>{ev.date}{ev.timeStart ? ` ${ev.timeStart}〜${ev.timeEnd || ''}` : ''} · {ev.type}</p>
                          {(() => {
                            const isOver = ev.date <= today
                            const pc = data.members.filter(m => { const a = ev.attendance[m]?.actual; return a==='present'||a==='late' }).length
                            const pp = data.members.filter(m => { const p = ev.attendance[m]?.plan; return p==='attending'||p==='late' }).length
                            if (isOver && pp > 0) { const rate = Math.round((pc/pp)*100); const rc = rate>=80?'var(--color-text-success)':rate>=60?'var(--color-text-warning)':'var(--color-text-danger)'; return <span style={{ fontSize:12, fontWeight:600, color:rc }}>{rate}%</span> }
                            if (!isOver && pp > 0) return <span style={{ fontSize:11, color:'var(--color-text-tertiary)' }}>予定 {pp}人</span>
                            return null
                          })()}
                        </div>
                          </div>
                          <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 4, flexShrink: 0, alignSelf: 'flex-start', background: locked ? 'var(--color-background-secondary)' : (isUpcoming ? ACB : 'var(--color-background-secondary)'), color: locked ? 'var(--color-text-tertiary)' : (isUpcoming ? ACD : 'var(--color-text-tertiary)'), fontWeight: 500 }}>
                            {locked ? '🔒 締切' : (isUpcoming ? '事前入力' : '当日記録')}
                          </span>
                        </div>
                        {ev.tags?.length > 0 && <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', margin: '6px 0' }}>{ev.tags.map(t => <span key={t} style={{ fontSize: 11, padding: '1px 7px', background: ACB, color: ACD, borderRadius: 999 }}>#{t}</span>)}</div>}
                        {ev.memo && <div style={{ display: 'flex', gap: 6, background: 'var(--color-background-secondary)', borderRadius: 'var(--border-radius-sm)', padding: '6px 10px', margin: '6px 0', fontSize: 12, color: 'var(--color-text-secondary)' }}><span>📝</span><span>{ev.memo}</span></div>}
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
                          <select
                            disabled={locked}
                            value={cur ?? '__null__'}
                            onChange={e => { if (locked) return; const v = e.target.value === '__null__' ? null : e.target.value; updateAtt(ev.id, selMember, field, v) }}
                            style={{ padding: '7px 14px', background: s.bg, border: `0.5px solid ${s.border}`, borderRadius: 'var(--border-radius-md)', color: s.text, fontSize: 14, fontWeight: 500, cursor: locked ? 'not-allowed' : 'pointer', opacity: locked ? 0.7 : 1, minWidth: 150 }}
                          >
                            {statusOrder.map(st => (
                              <option key={String(st)} value={st ?? '__null__'}>{sm[st]?.icon} {sm[st]?.label}</option>
                            ))}
                          </select>
                        </div>
                        {locked && <p style={{ fontSize: 11, color: 'var(--color-text-tertiary)', textAlign: 'right', marginTop: 6 }}>開始から24時間が経過したため編集できません</p>}
                        {!locked && (
                          <div style={{ marginTop: 8, display: 'flex', gap: 6, alignItems: 'center' }}>
                            <input type="text" placeholder="理由（任意）例：テスト・バイト"
                              value={reasonDraft[ev.id] ?? att.reason ?? ''}
                              onChange={e => setReasonDraft({ ...reasonDraft, [ev.id]: e.target.value })}
                              onBlur={() => saveReason(ev.id, selMember, reasonDraft[ev.id] ?? att.reason ?? '')}
                              style={{ flex: 1, fontSize: 13 }} />
                            {att.reason && <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)', flexShrink: 0 }}>保存済</span>}
                          </div>
                        )}
                        {locked && att.reason && <p style={{ marginTop: 6, fontSize: 12, color: 'var(--color-text-secondary)' }}>理由: {att.reason}</p>}

                        {/* Other members' status */}
                        {data.members.length > 1 && (() => {
                          const others = data.members.filter(m => m !== selMember)
                          const sm2 = isUpcoming ? PLAN_STATUS : ACTUAL_STATUS
                          const fld2 = isUpcoming ? 'plan' : 'actual'
                          const tally = {}
                          others.forEach(m => { const st = ev.attendance[m]?.[fld2] ?? null; const k = st || 'null'; if (!tally[k]) tally[k] = []; tally[k].push(m) })
                          const topStates = (isUpcoming ? ['attending','late','absent','undecided'] : ['present','late','absent','unknown']).filter(k => tally[k]?.length > 0)
                          const expanded = expandedEvStatus.has(ev.id)
                          const toggle = () => setExpandedEvStatus(prev => { const n = new Set(prev); n.has(ev.id) ? n.delete(ev.id) : n.add(ev.id); return n })
                          return (
                            <div style={{ marginTop: 10, paddingTop: 10, borderTop: '0.5px solid var(--color-border-tertiary)' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                  {topStates.slice(0, 3).map(k => <span key={k} style={{ fontSize: 11, color: sm2[k]?.text || 'var(--color-text-tertiary)' }}>{sm2[k]?.icon} {sm2[k]?.short} {tally[k].length}人</span>)}
                                  {tally['null']?.length > 0 && <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>未入力 {tally['null'].length}人</span>}
                                </div>
                                <button onClick={toggle} style={{ fontSize: 11, color: AC, border: 'none', background: 'transparent', cursor: 'pointer', flexShrink: 0 }}>{expanded ? '▲ 閉じる' : `全員を見る (${others.length}人)`}</button>
                              </div>
                              {expanded && (
                                <div style={{ marginTop: 8 }}>
                                  {topStates.concat(tally['null']?.length > 0 ? ['null'] : []).map(k => {
                                    const ms = tally[k] || []; const s2 = sm2[k] || sm2[null]
                                    return (
                                      <div key={k} style={{ marginBottom: 6 }}>
                                        <p style={{ fontSize: 11, color: s2.text, fontWeight: 500, marginBottom: 4 }}>{s2.icon} {s2.short || '未入力'} ({ms.length}人)</p>
                                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                                          {ms.map(m => <span key={m} style={{ fontSize: 12, padding: '2px 9px', background: 'var(--color-background-secondary)', borderRadius: 999 }}>{m}{ev.attendance[m]?.reason ? ` (${ev.attendance[m].reason})` : ''}</span>)}
                                        </div>
                                      </div>
                                    )
                                  })}
                                </div>
                              )}
                            </div>
                          )
                        })()}
                      </div>
                    </div>
                  </Card>
                )
              })}
              <p style={{ fontSize: 11, color: 'var(--color-text-tertiary)', textAlign: 'center', marginTop: 12 }}>プルダウンから状況を選択してください</p>
            </>
          )}
        </div>
      )}

      {/* ═══ ADMIN VIEW ═══ */}
      {view === 'admin' && (
        <>
          <div style={{ background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', boxShadow: 'var(--shadow-header)', position: 'sticky', top: 48, zIndex: 9, display: 'flex', overflowX: 'auto' }}>
            {[{ id: 'events', icon: 'ti-calendar', label: 'イベント' }, { id: 'members', icon: 'ti-users', label: 'メンバー' }, { id: 'stats', icon: 'ti-chart-bar', label: '統計' }, { id: 'log', icon: 'ti-history', label: 'ログ' }, { id: 'requests', icon: 'ti-user-check', label: '申請' }, { id: 'settings', icon: 'ti-settings', label: '設定' }].map(t => (
              <button key={t.id} onClick={() => setAdminTab(t.id)} style={{ flex: '1 0 auto', minWidth: 64, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, padding: '6px 4px 10px', border: 'none', borderBottom: adminTab === t.id ? `2px solid ${AC}` : '2px solid transparent', background: 'transparent', color: adminTab === t.id ? AC : 'var(--color-text-secondary)', cursor: 'pointer', fontSize: 11, fontWeight: adminTab === t.id ? 500 : 400 }}>
                <i className={`ti ${t.icon}`} style={{ fontSize: 18 }}></i>{t.label}
                {t.id === 'requests' && data.pendingMembers.length > 0 && <span style={{ position: 'absolute', marginTop: -22, marginLeft: 18, width: 7, height: 7, borderRadius: '50%', background: 'var(--color-text-danger)' }} />}
              </button>
            ))}
          </div>

          <div style={{ padding: 16 }}>
            {adminTab === 'events' && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <span style={{ fontWeight: 500 }}>イベント管理</span>
                  <button onClick={() => { setEditingEvId(null); setNewEv({ date: todayStr(), timeStart: '', timeEnd: '', name: '', type: '練習', color: 'pink', tags: [], memo: '' }); setShowAddEv(!showAddEv) }} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px', borderRadius: 999, background: ACB, border: 'none', color: ACD, cursor: 'pointer', fontSize: 13, fontWeight: 500 }}>
                    <i className="ti ti-plus" style={{ fontSize: 14 }}></i>追加
                  </button>
                </div>
                {showAddEv && (
                  <Card style={{ padding: 14, marginBottom: 12 }}>
                    <p style={{ fontWeight: 500, marginBottom: 10 }}>{editingEvId ? 'イベントを編集' : '新しいイベント'}</p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                      <div><p style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginBottom: 4 }}>日付</p><input type="date" value={newEv.date} onChange={e => setNewEv({ ...newEv, date: e.target.value })} /></div>
                      <div><p style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginBottom: 4 }}>種別</p><select value={newEv.type} onChange={e => setNewEv({ ...newEv, type: e.target.value })}>{EVENT_TYPES.map(t => <option key={t}>{t}</option>)}</select></div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                      <div><p style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginBottom: 4 }}>開始（任意）</p><input type="time" value={newEv.timeStart} onChange={e => setNewEv({ ...newEv, timeStart: e.target.value })} /></div>
                      <div><p style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginBottom: 4 }}>終了（任意）</p><input type="time" value={newEv.timeEnd} onChange={e => setNewEv({ ...newEv, timeEnd: e.target.value })} /></div>
                    </div>
                    <div style={{ marginBottom: 8 }}><p style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginBottom: 4 }}>イベント名</p><input type="text" placeholder="例：6月定期練習" value={newEv.name} onChange={e => setNewEv({ ...newEv, name: e.target.value })} /></div>
                    <div style={{ marginBottom: 8 }}>
                      <p style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginBottom: 6 }}>タグ</p>
                      {allTags.length > 0 && <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 6 }}>{allTags.map(tag => { const sel = newEv.tags.includes(tag); return <button key={tag} onClick={() => setNewEv(p => ({ ...p, tags: sel ? p.tags.filter(t => t !== tag) : [...p.tags, tag] }))} style={{ padding: '3px 10px', borderRadius: 999, fontSize: 12, border: 'none', cursor: 'pointer', background: sel ? AC : 'var(--color-background-secondary)', color: sel ? '#fff' : 'var(--color-text-secondary)' }}>#{tag}</button> })}</div>}
                      <div style={{ display: 'flex', gap: 6 }}>
                        <input type="text" placeholder="新しいタグを入力して「追加」" value={tagInput} onChange={e => setTagInput(e.target.value)} style={{ flex: 1 }} />
                        <button onClick={() => { const t = tagInput.trim().replace(/^#/, ''); if (t) setNewEv(p => ({ ...p, tags: [...p.tags.filter(x => x !== t), t] })); setTagInput('') }} style={{ padding: '0 14px', background: 'var(--color-background-secondary)', border: 'none', borderRadius: 'var(--border-radius-md)', color: 'var(--color-text-secondary)', cursor: 'pointer', fontSize: 13 }}>追加</button>
                      </div>
                    </div>
                    <div style={{ marginBottom: 8 }}><p style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginBottom: 4 }}>メモ（メンバーに表示）</p><textarea placeholder="例：衣装持参でお願いします" value={newEv.memo} onChange={e => setNewEv({ ...newEv, memo: e.target.value })} style={{ minHeight: 50 }} /></div>
                    <div style={{ marginBottom: 12 }}>
                      <p style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginBottom: 6 }}>ラベルカラー</p>
                      <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>{COLORS.map(c => <button key={c.id} onClick={() => setNewEv({ ...newEv, color: c.id })} style={{ width: 24, height: 24, borderRadius: '50%', background: c.hex, border: 'none', cursor: 'pointer', outline: newEv.color === c.id ? `3px solid ${c.hex}` : 'none', outlineOffset: -5 }} />)}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={addEvent} style={{ flex: 1, padding: '9px', background: AC, border: 'none', borderRadius: 'var(--border-radius-md)', color: '#fff', cursor: 'pointer', fontWeight: 500 }}>{editingEvId ? '更新する' : '追加する'}</button>
                      <button onClick={() => { setShowAddEv(false); setEditingEvId(null) }} style={{ padding: '9px 16px', background: 'transparent', border: '0.5px solid var(--color-border-secondary)', borderRadius: 'var(--border-radius-md)', color: 'var(--color-text-secondary)', cursor: 'pointer' }}>キャンセル</button>
                    </div>
                  </Card>
                )}
              </>
            )}
            {adminTab === 'events' && sortedEvs.map(ev => {
              const isOpen = expandedEv === ev.id
              const mode = evMode[ev.id] || (ev.date > today ? 'plan' : 'actual')
              const sm = mode === 'plan' ? PLAN_STATUS : ACTUAL_STATUS
              const statusOrder = mode === 'plan'
                ? [['attending', '参加予定'], ['late', '遅刻予定'], ['absent', '不参加'], ['undecided', '未定'], [null, '未入力']]
                : [['present', '参加'], ['late', '遅刻'], ['absent', '不参加'], ['unknown', '不明'], [null, '未入力']]
              return (
                <Card key={ev.id} style={{ marginBottom: 8, overflow: 'hidden' }}>
                  <div onClick={() => { setExpandedEv(isOpen ? null : ev.id); setEvSearch('') }} style={{ padding: '12px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                      <div style={{ width: 4, height: 36, borderRadius: 2, background: getColor(ev.color), flexShrink: 0 }} />
                      <div style={{ minWidth: 0 }}>
                        <p style={{ fontWeight: 500, margin: 0 }}>{ev.name}</p>
                        <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', margin: 0 }}>{ev.date}{ev.timeStart ? ` ${ev.timeStart}〜${ev.timeEnd || ''}` : ''} · {ev.type}</p>
                        {ev.tags?.length > 0 && <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap', marginTop: 3 }}>{ev.tags.map(t => <span key={t} style={{ fontSize: 10, padding: '1px 6px', background: ACB, color: ACD, borderRadius: 999 }}>#{t}</span>)}</div>}
                      </div>
                    </div>
                    <i className={`ti ${isOpen ? 'ti-chevron-up' : 'ti-chevron-down'}`} style={{ fontSize: 16, color: 'var(--color-text-secondary)' }}></i>
                  </div>
                  {isOpen && (
                    <div style={{ borderTop: '0.5px solid var(--color-border-tertiary)', padding: '12px 14px' }}>
                      <div style={{ position: 'relative', marginBottom: 10 }}>
                        <i className="ti ti-search" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-tertiary)', fontSize: 13, pointerEvents: 'none' }}></i>
                        <input type="text" placeholder="メンバーを絞り込む..." value={evSearch} onChange={e => setEvSearch(e.target.value)} style={{ paddingLeft: 30, fontSize: 13, padding: '6px 10px 6px 30px' }} />
                      </div>
                      <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
                        {['plan', 'actual'].map(m => <button key={m} onClick={() => setEvMode({ ...evMode, [ev.id]: m })} style={{ padding: '4px 12px', borderRadius: 999, border: 'none', cursor: 'pointer', fontSize: 12, background: mode === m ? AC : 'var(--color-background-secondary)', color: mode === m ? '#fff' : 'var(--color-text-secondary)' }}>{m === 'plan' ? '事前入力' : '当日記録'}</button>)}
                      </div>
                      {statusOrder.map(([st, groupLabel]) => {
                        const members = data.members.filter(m => m.includes(evSearch)).filter(m => (ev.attendance[m]?.[mode] ?? null) === st)
                        if (members.length === 0) return null
                        const s = sm[st] || sm[null]
                        return (
                          <div key={String(st)} style={{ marginBottom: 10 }}>
                            <p style={{ fontSize: 11, color: s.text, fontWeight: 500, marginBottom: 5, display: 'flex', alignItems: 'center', gap: 4 }}>
                              {s.icon} {groupLabel} <span style={{ color: 'var(--color-text-tertiary)', fontWeight: 400 }}>({members.length}人)</span>
                            </p>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5 }}>
                              {members.map(member => {
                                const att = ev.attendance[member] || {}
                                return (
                                  <div key={member}>
                                    <button onClick={() => cycleAdmin(ev.id, member, mode)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 10px', background: s.bg, border: `0.5px solid ${s.border}`, borderRadius: 'var(--border-radius-md)', cursor: 'pointer', width: '100%' }}>
                                      <span style={{ fontSize: 13, color: 'var(--color-text-primary)' }}>{member}</span>
                                      <i className="ti ti-pencil" style={{ fontSize: 12, color: s.text, opacity: 0.5 }}></i>
                                    </button>
                                    {att.reason && <p style={{ fontSize: 10, color: 'var(--color-text-tertiary)', marginTop: 2, paddingLeft: 4 }}>理由: {att.reason}</p>}
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        )
                      })}
                      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
                        <button onClick={() => startEditEvent(ev)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 12, color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <i className="ti ti-edit" style={{ fontSize: 13 }}></i>編集
                        </button>
                      </div>
                    </div>
                  )}
                </Card>
              )
            })}

            {adminTab === 'members' && (
              <>
                <div style={{ position: 'relative', marginBottom: 10 }}>
                  <i className="ti ti-search" style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-tertiary)', fontSize: 14, pointerEvents: 'none' }}></i>
                  <input type="text" placeholder="メンバーを検索..." value={memberSearch} onChange={e => setMemberSearch(e.target.value)} style={{ paddingLeft: 34 }} />
                </div>

                {data.members.length > 1 && (
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10, alignItems: 'center' }}>
                    <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>並び替え:</span>
                    {[
                      { id: 'registration', label: '登録順', icon: 'ti-list-numbers' },
                      { id: 'asc', label: 'あ→ん', icon: 'ti-sort-ascending' },
                      { id: 'desc', label: 'ん→あ', icon: 'ti-sort-descending' },
                      { id: 'rate', label: '出席率▼', icon: 'ti-chart-bar' },
                      { id: 'random', label: 'ランダム', icon: 'ti-arrows-shuffle' },
                    ].map(s => (
                      <button key={s.id} onClick={() => {
                        if (s.id === 'rate') {
                          const byRate = [...data.members].sort((a, b) => (getStats(b).rate ?? -1) - (getStats(a).rate ?? -1)); setData(d => ({ ...d, members: byRate })); setMemberSort('rate')
                        } else if (s.id === 'random') {
                          const shuffled = [...data.members]
                          for (let i = shuffled.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]] }
                          setData(d => ({ ...d, members: shuffled }))
                        } else if (s.id === 'asc') {
                          setData(d => ({ ...d, members: [...d.members].sort((a, b) => a.localeCompare(b, 'ja')) }))
                        } else if (s.id === 'desc') {
                          setData(d => ({ ...d, members: [...d.members].sort((a, b) => b.localeCompare(a, 'ja')) }))
                        }
                        setMemberSort(s.id)
                      }} style={{ display: 'flex', alignItems: 'center', gap: 3, padding: '4px 10px', borderRadius: 999, fontSize: 12, border: 'none', cursor: 'pointer', background: memberSort === s.id ? AC : 'var(--color-background-secondary)', color: memberSort === s.id ? '#fff' : 'var(--color-text-secondary)' }}>
                        <i className={`ti ${s.icon}`} style={{ fontSize: 13 }}></i>{s.label}
                      </button>
                    ))}
                  </div>
                )}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {data.members.filter(m => m.includes(memberSearch)).map((m) => (
                    <Card key={m} style={{ padding: '10px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Avatar name={m} /><span style={{ fontWeight: 500 }}>{m}</span>
                      </div>
                      <button onClick={() => setPendingMemberDelete(m)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: '4px 6px', color: 'var(--color-text-danger)' }}>
                        <i className="ti ti-x" style={{ fontSize: 14 }}></i>
                      </button>
                    </Card>
                  ))}
                </div>
              </>
            )}

            {adminTab === 'stats' && (
              <>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14, flexWrap:'wrap', gap:8 }}>
                  <p style={{ fontSize:12, color:'var(--color-text-secondary)', margin:0 }}>実績出席率＝（開催済参加＋遅刻）÷（開催済で参加/遅刻予定だった回数）</p>
                  <button onClick={()=>setStatOrder(o=>o==='desc'?'asc':'desc')} style={{ fontSize:12, color:'var(--color-text-secondary)', border:'0.5px solid var(--color-border-tertiary)', background:'transparent', borderRadius:999, padding:'4px 12px', cursor:'pointer', display:'flex', alignItems:'center', gap:4, flexShrink:0 }}>
                    <i className={`ti ${statOrder==='desc'?'ti-sort-descending':'ti-sort-ascending'}`} style={{ fontSize:13 }}></i>
                    {statOrder==='desc'?'出席率: 高→低':'出席率: 低→高'}
                  </button>
                </div>
                {(statOrder === 'asc' ? [...data.members].sort((a,b)=>(getStats(a).rate??-1)-(getStats(b).rate??-1)) : [...data.members].sort((a,b)=>(getStats(b).rate??-1)-(getStats(a).rate??-1))).map(m => {
                  const st = getStats(m)
                  const thresh = data.alertThreshold
                  const below = thresh != null && st.rate != null && st.rate < thresh
                  const rc = st.rate == null ? 'var(--color-text-tertiary)' : st.rate >= 80 ? 'var(--color-text-success)' : st.rate >= 60 ? 'var(--color-text-warning)' : 'var(--color-text-danger)'
                  return (
                    <Card key={m} style={{ padding: 14, marginBottom: 10, border: below ? '1.5px solid var(--color-text-danger)' : undefined }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Avatar name={m} /><span style={{ fontWeight: 500 }}>{m}</span>{below && <span style={{ fontSize: 11, padding: '1px 7px', background: 'var(--color-background-danger)', color: 'var(--color-text-danger)', borderRadius: 999, fontWeight: 500 }}>アラート</span>}</div>
                        <div style={{ textAlign: 'right' }}>
                          <span style={{ fontSize: 22, fontWeight: 500, color: rc }}>{st.rate == null ? '－' : `${st.rate}%`}</span>
                          <p style={{ fontSize: 10, color: 'var(--color-text-tertiary)', margin: 0 }}>実績</p>
                        </div>
                      </div>
                      <div style={{ height: 3, background: 'var(--color-background-secondary)', borderRadius: 999, marginBottom: 8, overflow: 'hidden' }}><div style={{ height: '100%', width: `${st.rate ?? 0}%`, background: rc, borderRadius: 999 }} /></div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10, fontSize: 11, color: 'var(--color-text-secondary)' }}>
                        <i className="ti ti-chart-dots" style={{ fontSize: 12 }}></i>
                        予測出席率（予定込み）: <strong style={{ color: 'var(--color-text-primary)' }}>{st.predicted == null ? '－' : `${st.predicted}%`}</strong>
                        <span style={{ color: 'var(--color-text-tertiary)' }}>（予定総数 {st.planTotal}回）</span>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 5 }}>
                        {[{ l: '実績参加', v: st.present, bg: 'var(--color-background-success)', c: 'var(--color-text-success)' }, { l: '実績遅刻', v: st.late, bg: 'var(--color-background-warning)', c: 'var(--color-text-warning)' }, { l: '実績欠席', v: st.absent, bg: 'var(--color-background-danger)', c: 'var(--color-text-danger)' }, { l: '実績分母', v: st.denom, bg: 'var(--color-background-secondary)', c: 'var(--color-text-tertiary)' }].map(it => (
                          <div key={it.l} style={{ background: it.bg, borderRadius: 'var(--border-radius-md)', padding: '5px 4px', textAlign: 'center' }}><p style={{ fontSize: 15, fontWeight: 500, color: it.c, margin: 0 }}>{it.v}</p><p style={{ fontSize: 10, color: it.c, margin: 0 }}>{it.l}</p></div>
                        ))}
                      </div>
                    </Card>
                  )
                })}
              </>
            )}

            {/* LOG tab */}
            {adminTab === 'log' && (
              <div>
                <p style={{ fontWeight: 500, marginBottom: 4 }}>変更ログ</p>
                <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 14 }}>誰がいつ出欠を変更したか記録されます（体験版はこのセッションのみ）</p>
                {logs.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--color-text-secondary)' }}>
                    <i className="ti ti-history" style={{ fontSize: 36 }}></i>
                    <p style={{ marginTop: 8 }}>まだ記録がありません</p>
                    <p style={{ fontSize: 12, marginTop: 4 }}>出欠を変更すると記録されます</p>
                  </div>
                ) : logs.map((log, i) => (
                  <Card key={i} style={{ padding: '10px 12px', marginBottom: 6 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                      <div style={{ minWidth: 0 }}>
                        <span style={{ fontSize: 11, padding: '1px 7px', borderRadius: 3, background: log.type === 'admin' ? ACB : 'var(--color-background-secondary)', color: log.type === 'admin' ? ACD : 'var(--color-text-secondary)' }}>{log.type === 'admin' ? '管理者' : 'メンバー'}</span>
                        <span style={{ fontSize: 13, marginLeft: 6 }}>{log.member}</span>
                        <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', margin: '4px 0 0' }}>{log.eventName}：{log.before} → <strong style={{ color: 'var(--color-text-primary)' }}>{log.after}</strong></p>
                      </div>
                      <span style={{ fontSize: 10, color: 'var(--color-text-tertiary)', whiteSpace: 'nowrap', flexShrink: 0 }}>{String(log.at).slice(-8)}</span>
                    </div>
                  </Card>
                ))}
              </div>
            )}

            {/* REQUESTS tab */}
            {adminTab === 'requests' && (
              <div>
                <p style={{ fontWeight: 500, marginBottom: 4 }}>メンバー申請</p>
                <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 14 }}>メンバーページから申請されたメンバー候補の一覧です。承認するとメンバーに追加されます。</p>
                {data.pendingMembers.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--color-text-secondary)' }}>
                    <i className="ti ti-user-check" style={{ fontSize: 36 }}></i>
                    <p style={{ marginTop: 8 }}>現在申請はありません</p>
                  </div>
                ) : data.pendingMembers.map(req => (
                  <Card key={req.id} style={{ padding: 14, marginBottom: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                      <div style={{ minWidth: 0 }}>
                        <p style={{ fontWeight: 500, margin: 0 }}>{req.displayName} <span style={{ fontSize: 12, color: 'var(--color-text-secondary)', fontWeight: 400 }}>（表示名）</span></p>
                        <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', margin: '3px 0' }}>本名: {req.realName}</p>
                        {req.note && <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', margin: '2px 0' }}>備考: {req.note}</p>}
                        <p style={{ fontSize: 11, color: 'var(--color-text-tertiary)', margin: '4px 0 0' }}>{req.at}</p>
                      </div>
                      <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                        <button onClick={() => approveMember(req)} style={{ padding: '6px 14px', background: '#1D9E75', border: 'none', borderRadius: 'var(--border-radius-md)', color: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 500 }}>承認</button>
                        <button onClick={() => rejectMember(req)} style={{ padding: '6px 14px', background: 'transparent', border: '0.5px solid var(--color-border-secondary)', borderRadius: 'var(--border-radius-md)', color: 'var(--color-text-secondary)', cursor: 'pointer', fontSize: 12 }}>却下</button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}

            {/* SETTINGS tab */}
            {adminTab === 'settings' && (
              <div>
                <Card style={{ padding: 14, marginBottom: 12 }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 12 }}>
                    <i className="ti ti-sparkles" style={{ fontSize: 18, color: AC, marginTop: 2 }}></i>
                    <p style={{ fontWeight: 500, margin: 0 }}>団体名</p>
                  </div>
                  <input type="text" value={data.circleName} onChange={e => setData({ ...data, circleName: e.target.value })} />
                  <p style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginTop: 6 }}>メンバー側の画面タイトルに表示されます</p>
                </Card>

                <Card style={{ padding: 14, marginBottom: 12 }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 10 }}>
                    <i className="ti ti-pin" style={{ fontSize: 18, color: AC, marginTop: 2 }}></i>
                    <div><p style={{ fontWeight: 500, margin: 0 }}>お知らせ（ピン留め）</p><p style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 3 }}>メンバーページの上部に表示</p></div>
                  </div>
                  <textarea value={notice} onChange={e => setNotice(e.target.value)} style={{ minHeight: 70, marginBottom: 8 }} />
                  <button onClick={() => setData({ ...data, notice })} style={{ width: '100%', padding: '7px', background: AC, border: 'none', borderRadius: 'var(--border-radius-md)', color: '#fff', cursor: 'pointer', fontWeight: 500, fontSize: 13 }}>保存する</button>
                </Card>

                <Card style={{ padding: 14, marginBottom: 12 }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 12 }}>
                    <i className="ti ti-palette" style={{ fontSize: 18, color: AC, marginTop: 2 }}></i>
                    <p style={{ fontWeight: 500, margin: 0 }}>テーマカラー</p>
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {[['rose', '#E8527A'], ['violet', '#7C5BDE'], ['blue', '#3B8FE8'], ['teal', '#0F9B8E'], ['green', '#2EB67D'], ['orange', '#F0793B'], ['amber', '#D97706'], ['red', '#E53935']].map(([id, hex]) => (
                      <button key={id} onClick={() => { applyAccent(id); setData({ ...data, accentColor: id }) }} style={{ width: 36, height: 36, borderRadius: '50%', background: hex, border: 'none', cursor: 'pointer', outline: data.accentColor === id ? `3px solid ${hex}` : 'none', outlineOffset: 3 }} />
                    ))}
                  </div>
                </Card>

                <Card style={{ padding: 14, marginBottom: 12 }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 10 }}>
                    <i className="ti ti-tags" style={{ fontSize: 18, color: AC, marginTop: 2 }}></i>
                    <p style={{ fontWeight: 500, margin: 0 }}>タグ管理</p>
                  </div>
                  {allTags.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 10 }}>
                      {allTags.map(tag => (
                        <span key={tag} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 10px', background: ACB, color: ACD, borderRadius: 999, fontSize: 12 }}>
                          #{tag}
                          <button onClick={() => setData(d => ({ ...d, globalTags: (d.globalTags || []).filter(t => t !== tag) }))} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: ACD, fontSize: 12, padding: 0, lineHeight: 1 }}>×</button>
                        </span>
                      ))}
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: 6 }}>
                    <input type="text" placeholder="新しいタグを入力して「追加」" value={newTagInput} onChange={e => setNewTagInput(e.target.value)} style={{ flex: 1 }} />
                    <button onClick={() => { const t = newTagInput.trim().replace(/^#/, ''); if (t && !allTags.includes(t)) setData(d => ({ ...d, globalTags: [...(d.globalTags || []), t] })); setNewTagInput('') }} style={{ padding: '0 16px', background: AC, border: 'none', borderRadius: 'var(--border-radius-md)', color: '#fff', cursor: 'pointer', fontWeight: 500, whiteSpace: 'nowrap' }}>追加</button>
                  </div>
                </Card>
              </div>
            )}
          </div>
        </>
      )}

      {/* CTA footer */}
      <div style={{ padding: 16, marginTop: 8 }}>
        <Card style={{ padding: 18, textAlign: 'center', background: ACB }}>
          <p style={{ fontWeight: 500, marginBottom: 6, color: ACD }}>気に入ったらいつでも導入できます ✨</p>
          <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', lineHeight: 1.7, marginBottom: 14 }}>
            今はまだ無料・広告なし。データは各サークルのGoogleスプレッドシートに保存されるので、運営者がデータを完全に管理できます。
          </p>
          <a href="/report?type=adopt" style={{ display: 'inline-block', padding: '10px 24px', background: AC, color: '#fff', borderRadius: 'var(--border-radius-md)', textDecoration: 'none', fontWeight: 500, fontSize: 14 }}>
            導入検討の方はこちら
          </a>
        </Card>
      </div>

      {/* Admin confirmation modal */}
      {pendingChange && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.35)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={() => setPendingChange(null)}>
          <div style={{ background: 'var(--color-background-primary)', borderRadius: 'var(--border-radius-lg)', padding: 24, maxWidth: 320, width: '100%', boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }} onClick={e => e.stopPropagation()}>
            <p style={{ fontWeight: 500, fontSize: 15, marginBottom: 6 }}>本当に変更しますか？</p>
            <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 4 }}><strong>{pendingChange.member}</strong> の{pendingChange.field === 'plan' ? '事前入力' : '当日記録'}</p>
            {(() => {
              const sm = pendingChange.field === 'plan' ? PLAN_STATUS : ACTUAL_STATUS
              return (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--color-background-secondary)', borderRadius: 'var(--border-radius-md)', padding: '10px 14px', marginBottom: 16 }}>
                  <span style={{ fontSize: 16 }}>{sm[pendingChange.cur]?.icon || '－'}</span>
                  <span style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>{sm[pendingChange.cur]?.label || '未入力'}</span>
                  <i className="ti ti-arrow-right" style={{ fontSize: 14, color: 'var(--color-text-tertiary)', margin: '0 4px' }}></i>
                  <span style={{ fontSize: 16 }}>{sm[pendingChange.nxt]?.icon || '－'}</span>
                  <span style={{ fontSize: 13, fontWeight: 500 }}>{sm[pendingChange.nxt]?.label || '未入力'}</span>
                </div>
              )
            })()}
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => doAdminChange(pendingChange)} style={{ flex: 1, padding: '10px', background: AC, border: 'none', borderRadius: 'var(--border-radius-md)', color: '#fff', cursor: 'pointer', fontWeight: 500, fontSize: 14 }}>変更する</button>
              <button onClick={() => setPendingChange(null)} style={{ flex: 1, padding: '10px', background: 'transparent', border: '0.5px solid var(--color-border-secondary)', borderRadius: 'var(--border-radius-md)', color: 'var(--color-text-secondary)', cursor: 'pointer', fontSize: 14 }}>キャンセル</button>
            </div>
          </div>
        </div>
      )}

      {/* Member delete confirmation */}
      {pendingMemberDelete && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.35)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={() => setPendingMemberDelete(null)}>
          <div style={{ background: 'var(--color-background-primary)', borderRadius: 'var(--border-radius-lg)', padding: 24, maxWidth: 320, width: '100%', boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }} onClick={e => e.stopPropagation()}>
            <div style={{ textAlign: 'center', marginBottom: 14 }}><i className="ti ti-alert-triangle" style={{ fontSize: 32, color: 'var(--color-text-danger)' }}></i></div>
            <p style={{ fontWeight: 500, fontSize: 15, marginBottom: 6, textAlign: 'center' }}>メンバーを削除しますか？</p>
            <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 16, textAlign: 'center', lineHeight: 1.7 }}>
              <strong>{pendingMemberDelete}</strong> を削除すると、<br />このメンバーの全イベントの出欠記録も削除されます。
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => doRemoveMember(pendingMemberDelete)} style={{ flex: 1, padding: '10px', background: 'var(--color-text-danger)', border: 'none', borderRadius: 'var(--border-radius-md)', color: '#fff', cursor: 'pointer', fontWeight: 500, fontSize: 14 }}>削除する</button>
              <button onClick={() => setPendingMemberDelete(null)} style={{ flex: 1, padding: '10px', background: 'transparent', border: '0.5px solid var(--color-border-secondary)', borderRadius: 'var(--border-radius-md)', color: 'var(--color-text-secondary)', cursor: 'pointer', fontSize: 14 }}>キャンセル</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
