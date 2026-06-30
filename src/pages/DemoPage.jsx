import { useState } from 'react'
import {
  COLORS, getColor, PLAN_ORDER, ACTUAL_ORDER, PLAN_STATUS, ACTUAL_STATUS,
  EVENT_TYPES, applyAccent, todayStr,
} from '../lib/constants.js'

const AC = 'var(--accent)', ACB = 'var(--accent-bg)', ACD = 'var(--accent-dark)'

// ── Seed data ─────────────────────────────────────────────────
const D = (offset) => { const d = new Date(); d.setDate(d.getDate() + offset); return d.toISOString().slice(0, 10) }
function seedData() {
  return {
    circleName: 'サンプル☆コピーダンス',
    accentColor: 'rose',
    notice: '次回の全体練習は衣装持参でお願いします！🎀 集合は13:45、A studioです。',
    alertThreshold: 60,
    globalTags: ['全体', 'ダンス', '2期生', '新曲'],
    members: ['あやか', 'みお', 'さくら', 'ひなた', 'ゆい', 'りん', 'まな', 'のあ'],
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
  const today = todayStr()

  const allTags = [...new Set([...(data.globalTags || []), ...data.events.flatMap(e => e.tags || [])])]
  const sortedEvs = [...data.events].sort((a, b) => b.date.localeCompare(a.date))

  // In-memory cycle (no save)
  const cycle = (evId, member, field) => {
    const order = field === 'plan' ? PLAN_ORDER : ACTUAL_ORDER
    setData(d => ({
      ...d,
      events: d.events.map(e => {
        if (e.id !== evId) return e
        const att = e.attendance[member] || { plan: null, actual: null, reason: null }
        const cur = att[field] ?? null
        const nxt = order[(order.indexOf(cur) + 1) % order.length]
        return { ...e, attendance: { ...e.attendance, [member]: { ...att, [field]: nxt } } }
      }),
    }))
  }

  const getStats = m => {
    let p = 0, l = 0, ab = 0, ap = 0, lp = 0
    data.events.forEach(ev => {
      const att = ev.attendance[m] || {}
      if (att.actual === 'present') p++; else if (att.actual === 'late') l++; else if (att.actual === 'absent') ab++
      if (att.plan === 'attending') ap++; else if (att.plan === 'late') lp++
    })
    const denom = ap + lp
    return { present: p, late: l, absent: ab, denom, rate: denom > 0 ? Math.round(((p + l) / denom) * 100) : null }
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
              <p style={{ fontWeight: 500, marginBottom: 12 }}>名前を選んでください</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {data.members.map(m => (
                  <button key={m} onClick={() => setSelMember(m)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px', background: 'var(--color-background-primary)', borderRadius: 'var(--border-radius-lg)', cursor: 'pointer', textAlign: 'left', border: 'none', boxShadow: 'var(--shadow-card)' }}>
                    <Avatar name={m} size={36} /><span style={{ fontWeight: 500, fontSize: 13 }}>{m}</span>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <button onClick={() => { setSelMember(null); setActiveTag(null) }} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--color-text-secondary)', padding: 0 }}><i className="ti ti-arrow-left" style={{ fontSize: 20 }}></i></button>
                <Avatar name={selMember} size={42} />
                <div>
                  <p style={{ fontWeight: 500, fontSize: 16, margin: 0 }}>{selMember}</p>
                  {(() => { const st = getStats(selMember); const rc = st.rate == null ? 'var(--color-text-tertiary)' : st.rate >= 80 ? 'var(--color-text-success)' : st.rate >= 60 ? 'var(--color-text-warning)' : 'var(--color-text-danger)'; return <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', margin: 0 }}>実績出席率 <strong style={{ color: rc }}>{st.rate == null ? '－' : `${st.rate}%`}</strong>　欠席 {st.absent}回</p> })()}
                </div>
              </div>
              {allTags.length > 0 && (
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
                  <button onClick={() => setActiveTag(null)} style={{ padding: '3px 10px', borderRadius: 999, fontSize: 12, cursor: 'pointer', border: 'none', background: !activeTag ? AC : 'var(--color-background-secondary)', color: !activeTag ? '#fff' : 'var(--color-text-secondary)' }}>#すべて</button>
                  {allTags.map(tag => <button key={tag} onClick={() => setActiveTag(activeTag === tag ? null : tag)} style={{ padding: '3px 10px', borderRadius: 999, fontSize: 12, cursor: 'pointer', border: 'none', background: activeTag === tag ? AC : 'var(--color-background-secondary)', color: activeTag === tag ? '#fff' : 'var(--color-text-secondary)' }}>#{tag}</button>)}
                </div>
              )}
              {sortedEvs.filter(e => !activeTag || e.tags?.includes(activeTag)).map(ev => {
                const isUpcoming = ev.date > today
                const att = ev.attendance[selMember] || { plan: null, actual: null, reason: null }
                const field = isUpcoming ? 'plan' : 'actual'
                const cur = att[field] ?? null
                const sm = isUpcoming ? PLAN_STATUS : ACTUAL_STATUS
                const s = sm[cur] || sm[null]
                return (
                  <Card key={ev.id} style={{ marginBottom: 10, padding: 14 }}>
                    <div style={{ display: 'flex', gap: 10 }}>
                      <div style={{ width: 4, borderRadius: 2, background: getColor(ev.color), flexShrink: 0, alignSelf: 'stretch', minHeight: 36 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                          <div style={{ minWidth: 0 }}>
                            <p style={{ fontWeight: 500, margin: 0 }}>{ev.name}</p>
                            <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', margin: 0 }}>{ev.date}{ev.timeStart ? ` ${ev.timeStart}〜${ev.timeEnd}` : ''} · {ev.type}</p>
                          </div>
                          <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 4, flexShrink: 0, alignSelf: 'flex-start', background: isUpcoming ? ACB : 'var(--color-background-secondary)', color: isUpcoming ? ACD : 'var(--color-text-tertiary)', fontWeight: 500 }}>{isUpcoming ? '事前入力' : '当日記録'}</span>
                        </div>
                        {ev.tags?.length > 0 && <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', margin: '6px 0' }}>{ev.tags.map(t => <span key={t} style={{ fontSize: 11, padding: '1px 7px', background: ACB, color: ACD, borderRadius: 999 }}>#{t}</span>)}</div>}
                        {ev.memo && <div style={{ display: 'flex', gap: 6, background: 'var(--color-background-secondary)', borderRadius: 'var(--border-radius-sm)', padding: '6px 10px', margin: '6px 0', fontSize: 12, color: 'var(--color-text-secondary)' }}><span>📝</span><span>{ev.memo}</span></div>}
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
                          <button onClick={() => cycle(ev.id, selMember, field)} style={{ padding: '7px 18px', background: s.bg, border: `0.5px solid ${s.border}`, borderRadius: 'var(--border-radius-md)', cursor: 'pointer', color: s.text, fontSize: 14, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontSize: 16 }}>{s.icon}</span><span>{s.label}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </Card>
                )
              })}
            </>
          )}
        </div>
      )}

      {/* ═══ ADMIN VIEW ═══ */}
      {view === 'admin' && (
        <>
          <div style={{ background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', boxShadow: 'var(--shadow-header)', position: 'sticky', top: 48, zIndex: 9, display: 'flex' }}>
            {[{ id: 'events', icon: 'ti-calendar', label: 'イベント' }, { id: 'members', icon: 'ti-users', label: 'メンバー' }, { id: 'stats', icon: 'ti-chart-bar', label: '統計' }].map(t => (
              <button key={t.id} onClick={() => setAdminTab(t.id)} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, padding: '6px 0 10px', border: 'none', borderBottom: adminTab === t.id ? `2px solid ${AC}` : '2px solid transparent', background: 'transparent', color: adminTab === t.id ? AC : 'var(--color-text-secondary)', cursor: 'pointer', fontSize: 11, fontWeight: adminTab === t.id ? 500 : 400 }}>
                <i className={`ti ${t.icon}`} style={{ fontSize: 18 }}></i>{t.label}
              </button>
            ))}
          </div>

          <div style={{ padding: 16 }}>
            {adminTab === 'events' && sortedEvs.map(ev => {
              const isOpen = expandedEv === ev.id
              const mode = evMode[ev.id] || (ev.date > today ? 'plan' : 'actual')
              const sm = mode === 'plan' ? PLAN_STATUS : ACTUAL_STATUS
              return (
                <Card key={ev.id} style={{ marginBottom: 8, overflow: 'hidden' }}>
                  <div onClick={() => setExpandedEv(isOpen ? null : ev.id)} style={{ padding: '12px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                      <div style={{ width: 4, height: 36, borderRadius: 2, background: getColor(ev.color), flexShrink: 0 }} />
                      <div style={{ minWidth: 0 }}>
                        <p style={{ fontWeight: 500, margin: 0 }}>{ev.name}</p>
                        <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', margin: 0 }}>{ev.date}{ev.timeStart ? ` ${ev.timeStart}〜${ev.timeEnd}` : ''} · {ev.type}</p>
                        {ev.tags?.length > 0 && <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap', marginTop: 3 }}>{ev.tags.map(t => <span key={t} style={{ fontSize: 10, padding: '1px 6px', background: ACB, color: ACD, borderRadius: 999 }}>#{t}</span>)}</div>}
                      </div>
                    </div>
                    <i className={`ti ${isOpen ? 'ti-chevron-up' : 'ti-chevron-down'}`} style={{ fontSize: 16, color: 'var(--color-text-secondary)' }}></i>
                  </div>
                  {isOpen && (
                    <div style={{ borderTop: '0.5px solid var(--color-border-tertiary)', padding: '12px 14px' }}>
                      <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
                        {['plan', 'actual'].map(m => <button key={m} onClick={() => setEvMode({ ...evMode, [ev.id]: m })} style={{ padding: '4px 12px', borderRadius: 999, border: 'none', cursor: 'pointer', fontSize: 12, background: mode === m ? AC : 'var(--color-background-secondary)', color: mode === m ? '#fff' : 'var(--color-text-secondary)' }}>{m === 'plan' ? '事前入力' : '当日記録'}</button>)}
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                        {data.members.map(member => {
                          const att = ev.attendance[member] || {}
                          const cur = att[mode] ?? null
                          const s = sm[cur] || sm[null]
                          return (
                            <button key={member} onClick={() => cycle(ev.id, member, mode)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', background: s.bg, border: `0.5px solid ${s.border}`, borderRadius: 'var(--border-radius-md)', cursor: 'pointer' }}>
                              <span style={{ fontSize: 13 }}>{member}</span>
                              <span style={{ fontSize: 14, fontWeight: 500, color: s.text }}>{s.icon} {s.short}</span>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </Card>
              )
            })}

            {adminTab === 'members' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {data.members.map(m => (
                  <Card key={m} style={{ padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Avatar name={m} /><span style={{ fontWeight: 500 }}>{m}</span>
                  </Card>
                ))}
              </div>
            )}

            {adminTab === 'stats' && data.members.map(m => {
              const st = getStats(m)
              const thresh = data.alertThreshold
              const below = thresh != null && st.rate != null && st.rate < thresh
              const rc = st.rate == null ? 'var(--color-text-tertiary)' : st.rate >= 80 ? 'var(--color-text-success)' : st.rate >= 60 ? 'var(--color-text-warning)' : 'var(--color-text-danger)'
              return (
                <Card key={m} style={{ padding: 14, marginBottom: 10, border: below ? '1.5px solid var(--color-text-danger)' : undefined }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Avatar name={m} /><span style={{ fontWeight: 500 }}>{m}</span>{below && <span style={{ fontSize: 11, padding: '1px 7px', background: 'var(--color-background-danger)', color: 'var(--color-text-danger)', borderRadius: 999, fontWeight: 500 }}>アラート</span>}</div>
                    <span style={{ fontSize: 22, fontWeight: 500, color: rc }}>{st.rate == null ? '－' : `${st.rate}%`}</span>
                  </div>
                  <div style={{ height: 3, background: 'var(--color-background-secondary)', borderRadius: 999, marginBottom: 10, overflow: 'hidden' }}><div style={{ height: '100%', width: `${st.rate ?? 0}%`, background: rc, borderRadius: 999 }} /></div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 5 }}>
                    {[{ l: '実績参加', v: st.present, bg: 'var(--color-background-success)', c: 'var(--color-text-success)' }, { l: '実績遅刻', v: st.late, bg: 'var(--color-background-warning)', c: 'var(--color-text-warning)' }, { l: '実績欠席', v: st.absent, bg: 'var(--color-background-danger)', c: 'var(--color-text-danger)' }, { l: '予定分母', v: st.denom, bg: 'var(--color-background-secondary)', c: 'var(--color-text-tertiary)' }].map(it => (
                      <div key={it.l} style={{ background: it.bg, borderRadius: 'var(--border-radius-md)', padding: '5px 4px', textAlign: 'center' }}><p style={{ fontSize: 15, fontWeight: 500, color: it.c, margin: 0 }}>{it.v}</p><p style={{ fontSize: 10, color: it.c, margin: 0 }}>{it.l}</p></div>
                    ))}
                  </div>
                </Card>
              )
            })}
          </div>
        </>
      )}

      {/* CTA footer */}
      <div style={{ padding: 16, marginTop: 8 }}>
        <Card style={{ padding: 18, textAlign: 'center', background: ACB }}>
          <p style={{ fontWeight: 500, marginBottom: 6, color: ACD }}>気に入ったら無料で導入できます ✨</p>
          <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', lineHeight: 1.7, marginBottom: 14 }}>
            完全無料・広告なし。データは各サークルのGoogleスプレッドシートに保存されるので、運営者がデータを完全に管理できます。
          </p>
          <a href="/admin" style={{ display: 'inline-block', padding: '10px 24px', background: AC, color: '#fff', borderRadius: 'var(--border-radius-md)', textDecoration: 'none', fontWeight: 500, fontSize: 14 }}>
            管理を始める
          </a>
        </Card>
      </div>
    </div>
  )
}
