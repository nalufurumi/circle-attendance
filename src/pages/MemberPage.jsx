import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { loadData, saveData, mkLog } from '../lib/api.js'
import {
  PLAN_ORDER, ACTUAL_ORDER, PLAN_STATUS, ACTUAL_STATUS,
  getColor, applyAccent, DEFAULT_DATA, todayStr,
} from '../lib/constants.js'

const AC  = 'var(--accent)'
const ACB = 'var(--accent-bg)'
const ACD = 'var(--accent-dark)'

const Avatar = ({ name, size = 32 }) => (
  <div style={{ width:size, height:size, borderRadius:'50%', background:ACB, color:ACD,
    display:'flex', alignItems:'center', justifyContent:'center', fontWeight:500,
    fontSize:size*.4, flexShrink:0 }}>{name.slice(0,1)}</div>
)
const Card = ({ children, style={} }) => (
  <div style={{ background:'var(--color-background-primary)', borderRadius:'var(--border-radius-lg)', boxShadow:'var(--shadow-card)', ...style }}>{children}</div>
)
const TagChip = ({ label, active, onClick }) => (
  <button onClick={onClick} style={{ padding:'3px 10px', borderRadius:999, fontSize:12, cursor:'pointer', border:'none',
    background:active?AC:'var(--color-background-secondary)', color:active?'#fff':'var(--color-text-secondary)',
    fontWeight:active?500:400 }}>#{label}</button>
)

function MemberRequestForm({ scriptUrl, onClose }) {
  const [form, setForm] = useState({ realName:'', displayName:'', note:'' })
  const [status, setStatus] = useState('idle')

  const submit = async () => {
    if (!form.realName.trim() || !form.displayName.trim()) return
    setStatus('sending')
    const req = { id:`req_${Date.now()}`, realName:form.realName.trim(), displayName:form.displayName.trim(), note:form.note.trim(), at:new Date().toLocaleString('ja-JP',{timeZone:'Asia/Tokyo'}) }
    try {
      const cur = await loadData(scriptUrl)
      await saveData(scriptUrl, { ...cur, pendingMembers:[...(cur.pendingMembers||[]), req] })
      setStatus('sent')
    } catch { setStatus('error') }
  }

  if (status === 'sent') return (
    <Card style={{ padding:16, marginTop:12, textAlign:'center' }}>
      <p style={{ fontSize:28, marginBottom:8 }}>✅</p>
      <p style={{ fontWeight:500, marginBottom:6 }}>申請を送信しました</p>
      <p style={{ fontSize:12, color:'var(--color-text-secondary)', lineHeight:1.7 }}>管理者が承認するとメンバーとして登録されます。</p>
      <button onClick={onClose} style={{ display:'block', width:'100%', marginTop:12, padding:'8px', background:ACB, border:'none', borderRadius:'var(--border-radius-md)', color:ACD, cursor:'pointer', fontWeight:500 }}>閉じる</button>
    </Card>
  )

  return (
    <Card style={{ padding:16, marginTop:12 }}>
      <p style={{ fontWeight:500, marginBottom:12 }}>メンバー登録の申請</p>
      <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
        <div>
          <p style={{ fontSize:12, color:'var(--color-text-secondary)', marginBottom:4 }}>本名 <span style={{ color:'var(--color-text-danger)' }}>*</span></p>
          <input type="text" placeholder="田中 花子" value={form.realName} onChange={e=>setForm({...form,realName:e.target.value})} />
          <p style={{ fontSize:11, color:'var(--color-text-tertiary)', marginTop:3 }}>管理者の確認用。他のメンバーには表示されません。</p>
        </div>
        <div>
          <p style={{ fontSize:12, color:'var(--color-text-secondary)', marginBottom:4 }}>アプリ上の表示名 <span style={{ color:'var(--color-text-danger)' }}>*</span></p>
          <input type="text" placeholder="はなこ / 花 など" value={form.displayName} onChange={e=>setForm({...form,displayName:e.target.value})} />
        </div>
        <div>
          <p style={{ fontSize:12, color:'var(--color-text-secondary)', marginBottom:4 }}>備考（任意）</p>
          <input type="text" placeholder="入学年度・パートなど" value={form.note} onChange={e=>setForm({...form,note:e.target.value})} />
        </div>
        {status==='error'&&<p style={{ fontSize:12, color:'var(--color-text-danger)' }}>送信に失敗しました。もう一度お試しください。</p>}
        <div style={{ display:'flex', gap:8 }}>
          <button onClick={submit} disabled={!form.realName.trim()||!form.displayName.trim()||status==='sending'} style={{ flex:1, padding:'9px', background:(form.realName.trim()&&form.displayName.trim())?AC:'var(--color-background-secondary)', border:'none', borderRadius:'var(--border-radius-md)', color:(form.realName.trim()&&form.displayName.trim())?'#fff':'var(--color-text-tertiary)', cursor:'pointer', fontWeight:500 }}>
            {status==='sending'?'送信中...':'申請する'}
          </button>
          <button onClick={onClose} style={{ padding:'9px 16px', background:'transparent', border:'0.5px solid var(--color-border-secondary)', borderRadius:'var(--border-radius-md)', color:'var(--color-text-secondary)', cursor:'pointer' }}>キャンセル</button>
        </div>
      </div>
    </Card>
  )
}

export default function MemberPage() {
  const [params]      = useSearchParams()
  const [scriptUrl,   setScriptUrl]   = useState('')
  const [data,        setData]        = useState(DEFAULT_DATA)
  const [loading,     setLoading]     = useState(true)
  const [error,       setError]       = useState('')
  const [selMember,   setSelMember]   = useState(null)
  const [saving,      setSaving]      = useState(false)
  const [search,      setSearch]      = useState('')
  const [activeTag,   setActiveTag]   = useState(null)
  const [reasonDraft, setReasonDraft] = useState({})
  const [showRequest, setShowRequest] = useState(false)
  const today = todayStr()

  useEffect(() => {
    const c = params.get('c')
    if (!c) { setError('URLが正しくありません。管理者に共有URLを確認してください。'); setLoading(false); return }
    let url
    try { url = atob(c) } catch { setError('URLが破損しています。'); setLoading(false); return }
    if (!url.startsWith('http')) { setError('URLが無効です。'); setLoading(false); return }
    setScriptUrl(url)
    loadData(url)
      .then(d => { const m={...DEFAULT_DATA,...d}; setData(m); if(m.accentColor) applyAccent(m.accentColor) })
      .catch(() => setError('データの取得に失敗しました。'))
      .finally(() => setLoading(false))
  }, [params])

  const updateAtt = async (evId, member, field, value) => {
    const ev = data.events.find(e=>e.id===evId)
    if (!ev || saving) return
    const oldAtt = ev.attendance?.[member] || { plan:null, actual:null, reason:null }
    const newAtt = { ...oldAtt, [field]: value }
    const nd = { ...data, events: data.events.map(e=>e.id!==evId?e:{...e,attendance:{...e.attendance,[member]:newAtt}}) }
    setData(nd); setSaving(true)
    try {
      await saveData(scriptUrl, nd, mkLog({ by:member, type:'member', eventDate:ev.date, eventName:ev.name, member, before:String(oldAtt[field]||'未入力'), after:String(value||'未入力') }))
    } catch { setData(data) }
    finally { setSaving(false) }
  }

  const saveReason = async (evId, member, reason) => {
    const ev = data.events.find(e=>e.id===evId); if(!ev) return
    const oldAtt = ev.attendance?.[member]||{plan:null,actual:null,reason:null}
    const nd = { ...data, events:data.events.map(e=>e.id!==evId?e:{...e,attendance:{...e.attendance,[member]:{...oldAtt,reason:reason||null}}}) }
    setData(nd); try { await saveData(scriptUrl, nd) } catch {}
  }

  const allTags = [...new Set(data.events.flatMap(e=>e.tags||[]))]
  const sortedEvs = [...data.events].sort((a,b)=>b.date.localeCompare(a.date))
  const filteredEvs = activeTag ? sortedEvs.filter(e=>e.tags?.includes(activeTag)) : sortedEvs
  const getStats = m => {
    let p=0,l=0,ab=0,un=0
    data.events.forEach(ev=>{ const s=ev.attendance?.[m]?.actual||null; if(s==='present')p++; else if(s==='late')l++; else if(s==='absent')ab++; else un++ })
    const rec=data.events.length-un
    return { present:p, late:l, absent:ab, rate:rec>0?Math.round(((p+l)/rec)*100):null }
  }

  if (loading) return <div style={{ padding:'3rem', textAlign:'center', color:'var(--color-text-secondary)', fontFamily:'var(--font-sans)' }}><i className="ti ti-refresh" style={{ fontSize:28 }}></i><p style={{ marginTop:8 }}>読み込み中...</p></div>
  if (error)   return <div style={{ padding:'2rem', textAlign:'center', fontFamily:'var(--font-sans)' }}><i className="ti ti-alert-circle" style={{ fontSize:36, color:'var(--color-text-danger)' }}></i><p style={{ marginTop:12, fontWeight:500 }}>{error}</p></div>

  return (
    <div style={{ fontFamily:'var(--font-sans)', fontSize:14, color:'var(--color-text-primary)', paddingBottom:'2rem' }}>
      {/* Header */}
      <div style={{ background:'rgba(255,255,255,0.88)', backdropFilter:'blur(12px)', WebkitBackdropFilter:'blur(12px)', boxShadow:'var(--shadow-header)', padding:'12px 16px', position:'sticky', top:0, zIndex:10, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div><span style={{ color:AC, marginRight:6 }}>✧</span><span style={{ fontWeight:500, fontSize:15 }}>{data.circleName||'出席管理'}</span></div>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          {saving&&<span style={{ fontSize:11, color:'var(--color-text-warning)' }}>保存中...</span>}
          {selMember&&<button onClick={()=>{setSelMember(null);setActiveTag(null);setReasonDraft({})}} style={{ border:'none', background:'transparent', cursor:'pointer', color:'var(--color-text-secondary)', fontSize:12, display:'flex', alignItems:'center', gap:4 }}><i className="ti ti-arrow-left" style={{ fontSize:14 }}></i>戻る</button>}
        </div>
      </div>

      <div style={{ padding:16 }}>
        {!selMember ? (
          <>
            {/* Pinned notice */}
            {data.notice?.trim()&&(
              <div style={{ background:ACB, border:`0.5px solid ${AC}`, borderRadius:'var(--border-radius-md)', padding:'10px 14px', marginBottom:16, display:'flex', gap:8 }}>
                <span style={{ flexShrink:0 }}>📌</span>
                <p style={{ fontSize:13, color:ACD, lineHeight:1.7 }}>{data.notice}</p>
              </div>
            )}

            <p style={{ fontWeight:500, marginBottom:4 }}>名前を選んでください</p>
            <p style={{ fontSize:12, color:'var(--color-text-secondary)', marginBottom:12 }}>タップして出席状況を確認・入力できます</p>

            {/* Search */}
            <div style={{ position:'relative', marginBottom:12 }}>
              <i className="ti ti-search" style={{ position:'absolute', left:11, top:'50%', transform:'translateY(-50%)', color:'var(--color-text-tertiary)', fontSize:15, pointerEvents:'none' }}></i>
              <input type="text" placeholder="名前を検索..." value={search} onChange={e=>setSearch(e.target.value)} style={{ paddingLeft:34 }} />
            </div>

            {data.members.length===0 ? (
              <div style={{ textAlign:'center', padding:'2rem 0', color:'var(--color-text-secondary)' }}><i className="ti ti-users" style={{ fontSize:36 }}></i><p style={{ marginTop:8 }}>メンバーがまだいません</p></div>
            ) : (
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                {data.members.filter(m=>m.includes(search)).map(m=>(
                  <button key={m} onClick={()=>setSelMember(m)} style={{ display:'flex', alignItems:'center', gap:10, padding:'12px', background:'var(--color-background-primary)', borderRadius:'var(--border-radius-lg)', cursor:'pointer', textAlign:'left', border:'none', boxShadow:'var(--shadow-card)' }}>
                    <Avatar name={m} size={36}/><span style={{ fontWeight:500, fontSize:13 }}>{m}</span>
                  </button>
                ))}
              </div>
            )}
            {search&&data.members.filter(m=>m.includes(search)).length===0&&(
              <p style={{ textAlign:'center', color:'var(--color-text-tertiary)', fontSize:13, marginTop:16 }}>「{search}」は見つかりませんでした</p>
            )}

            {/* Member request */}
            <div style={{ marginTop:20, textAlign:'center' }}>
              {!showRequest ? (
                <button onClick={()=>setShowRequest(true)} style={{ border:'none', background:'transparent', cursor:'pointer', color:'var(--color-text-secondary)', fontSize:13, display:'inline-flex', alignItems:'center', gap:4 }}>
                  <i className="ti ti-user-plus" style={{ fontSize:15 }}></i>メンバー登録を申請する
                </button>
              ) : <MemberRequestForm scriptUrl={scriptUrl} onClose={()=>setShowRequest(false)} />}
            </div>
          </>
        ) : (
          <>
            {/* Member header */}
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16 }}>
              <Avatar name={selMember} size={44}/>
              <div>
                <p style={{ fontWeight:500, fontSize:16, margin:0 }}>{selMember}</p>
                {(()=>{
                  const st=getStats(selMember)
                  const rc=st.rate==null?'var(--color-text-tertiary)':st.rate>=80?'var(--color-text-success)':st.rate>=60?'var(--color-text-warning)':'var(--color-text-danger)'
                  return <p style={{ fontSize:12, color:'var(--color-text-secondary)', margin:0 }}>実績出席率 <strong style={{ color:rc }}>{st.rate==null?'－':`${st.rate}%`}</strong>　欠席 {st.absent}回</p>
                })()}
              </div>
            </div>

            {/* Tag filter */}
            {allTags.length>0&&(
              <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:12 }}>
                <TagChip label="すべて" active={!activeTag} onClick={()=>setActiveTag(null)} />
                {allTags.map(tag=><TagChip key={tag} label={tag} active={activeTag===tag} onClick={()=>setActiveTag(activeTag===tag?null:tag)} />)}
              </div>
            )}

            {filteredEvs.length===0 ? (
              <div style={{ textAlign:'center', padding:'2rem 0', color:'var(--color-text-secondary)' }}><i className="ti ti-calendar" style={{ fontSize:36 }}></i><p style={{ marginTop:8 }}>{activeTag?`#${activeTag} のイベントはありません`:'イベントがまだありません'}</p></div>
            ) : filteredEvs.map(ev=>{
              const isUpcoming = ev.date > today
              const att = ev.attendance?.[selMember]||{plan:null,actual:null,reason:null}
              const field = isUpcoming?'plan':'actual'
              const curStatus = att[field]??null
              const statusMap = isUpcoming?PLAN_STATUS:ACTUAL_STATUS
              const statusOrder = isUpcoming?PLAN_ORDER:ACTUAL_ORDER
              const s = statusMap[curStatus]||statusMap[null]
              const showReason = curStatus==='absent'

              return (
                <Card key={ev.id} style={{ marginBottom:10, padding:14 }}>
                  <div style={{ display:'flex', gap:10 }}>
                    <div style={{ width:4, borderRadius:2, background:getColor(ev.color), flexShrink:0, alignSelf:'stretch', minHeight:36 }}/>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:8, marginBottom:4 }}>
                        <div style={{ minWidth:0 }}>
                          <p style={{ fontWeight:500, margin:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{ev.name}</p>
                          <p style={{ fontSize:12, color:'var(--color-text-secondary)', margin:0 }}>{ev.date} · {ev.type}</p>
                        </div>
                        <span style={{ fontSize:10, padding:'2px 7px', borderRadius:4, flexShrink:0, background:isUpcoming?ACB:'var(--color-background-secondary)', color:isUpcoming?ACD:'var(--color-text-tertiary)', fontWeight:500 }}>
                          {isUpcoming?'事前入力':'当日記録'}
                        </span>
                      </div>

                      {ev.tags?.length>0&&(
                        <div style={{ display:'flex', gap:4, flexWrap:'wrap', marginBottom:6 }}>
                          {ev.tags.map(t=><span key={t} style={{ fontSize:11, padding:'1px 7px', background:ACB, color:ACD, borderRadius:999 }}>#{t}</span>)}
                        </div>
                      )}

                      {ev.memo?.trim()&&(
                        <div style={{ display:'flex', gap:6, background:'var(--color-background-secondary)', borderRadius:'var(--border-radius-sm)', padding:'6px 10px', marginBottom:8, fontSize:12, color:'var(--color-text-secondary)', lineHeight:1.5 }}>
                          <span style={{ flexShrink:0 }}>📝</span><span>{ev.memo}</span>
                        </div>
                      )}

                      <div style={{ display:'flex', justifyContent:'flex-end', marginTop:4 }}>
                        <button
                          onClick={()=>{ const ni=(statusOrder.indexOf(curStatus)+1)%statusOrder.length; updateAtt(ev.id,selMember,field,statusOrder[ni]) }}
                          style={{ padding:'7px 18px', background:s.bg, border:`0.5px solid ${s.border}`, borderRadius:'var(--border-radius-md)', cursor:'pointer', color:s.text, fontSize:14, fontWeight:500, display:'flex', alignItems:'center', gap:6 }}>
                          <span style={{ fontSize:16 }}>{s.icon}</span><span>{s.label}</span>
                        </button>
                      </div>

                      {showReason&&(
                        <div style={{ marginTop:8, display:'flex', gap:6, alignItems:'center' }}>
                          <input type="text" placeholder="理由（任意）例：テスト・バイト"
                            value={reasonDraft[ev.id]??att.reason??''}
                            onChange={e=>setReasonDraft({...reasonDraft,[ev.id]:e.target.value})}
                            onBlur={()=>saveReason(ev.id,selMember,reasonDraft[ev.id]??att.reason??'')}
                            style={{ flex:1, fontSize:13 }} />
                          {att.reason&&<span style={{ fontSize:11, color:'var(--color-text-tertiary)', flexShrink:0 }}>保存済</span>}
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              )
            })}
            <p style={{ fontSize:11, color:'var(--color-text-tertiary)', textAlign:'center', marginTop:12 }}>ボタンをタップして状況を切り替え</p>
          </>
        )}

        <div style={{ textAlign:'center', marginTop:28, paddingTop:16, borderTop:'0.5px solid var(--color-border-tertiary)' }}>
          <a href="/report" style={{ fontSize:12, color:'var(--color-text-tertiary)', textDecoration:'none', display:'inline-flex', alignItems:'center', gap:4 }}>
            <i className="ti ti-bug" style={{ fontSize:13 }}></i>バグ報告・お問い合わせ
          </a>
        </div>
      </div>
    </div>
  )
}
