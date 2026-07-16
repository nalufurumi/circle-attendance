import { useState, useRef, useEffect } from 'react'
import { Card } from './ui.jsx'
import { POLL_ORDER, POLL_STATUS, tallyPollCandidate } from '../lib/constants.js'

// 押し忘れ対策: 最後の変更から この時間 操作がなければ自動保存する（デバウンス方式）
const AUTOSAVE_DELAY_MS = 5 * 60 * 1000 // 5分

// メンバー画面で「回答受付中の日程調整」に○/△/✕+コメントで回答するためのパネル。
//
// 設計方針: ○/△/✕やコメントの入力は「下書き」で、実際にサーバー(スプレッドシート)へ
// 保存されるのは「保存する」ボタンを押した瞬間だけ。タップの度に自動保存はしない。
// これにより「押した＝確定した」がはっきりし、保存できたか不安になることを防ぐ。
// ただし押し忘れのリスクに備え、最後の変更から5分間そのままなら裏側で自動保存する
// （表示は「保存しました」ではなく「自動保存されました」にして、手動確定との違いを残す）。
//
// selMember が選ばれている前提で、onRespond(pollId, candidateId, status, comment) を親から渡してもらう。
// onRespond は保存成功/失敗を示す真偽値を返す想定(Promise可)。
export default function MemberSchedulePanel({ polls, selMember, onRespond }) {
  // 下書き状態: { [pollId]: { [candId]: { status, comment } } }
  // 初期値はサーバーに保存済みの回答から作る。保存ボタンを押すまではここだけが変化する。
  const [draft, setDraft] = useState({})
  const [dirty, setDirty] = useState({})     // { [pollId]: boolean } 未保存の変更があるか
  const [saveState, setSaveState] = useState({}) // { [pollId]: 'idle'|'saving'|'saved'|'autosaved'|'error' }
  const [expanded, setExpanded] = useState(new Set())
  const timers = useRef({}) // { [pollId]: timeoutId } 自動保存タイマー
  // 自動保存タイマーのコールバックは古いレンダー時点のクロージャを持つため、
  // 常に最新の下書きを参照できるよう ref にも同期しておく（クロージャの陳腐化対策）
  const draftRef = useRef({})
  useEffect(() => { draftRef.current = draft }, [draft])

  // アンマウント時はタイマーを掃除しておく
  useEffect(() => () => { Object.values(timers.current).forEach(clearTimeout) }, [])

  const openPolls = (polls || []).filter(p => p.status === 'open')

  const fmtDate = (d) => {
    if (!d) return ''
    const dt = new Date(d + 'T00:00:00')
    return `${d}（${['日', '月', '火', '水', '木', '金', '土'][dt.getDay()]}）`
  }

  const toggle = (key) => setExpanded(prev => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n })

  // 候補1件の現在値を、指定した下書きオブジェクトから取得（レンダー用/タイマー用で共通利用）
  const getValFrom = (draftObj, poll, candId) => {
    const d = draftObj[poll.id]?.[candId]
    if (d) return d
    const saved = poll.responses?.[selMember]?.[candId]
    return { status: saved?.status ?? null, comment: saved?.comment ?? '' }
  }
  // レンダー中はその時点のstateを使う
  const getVal = (poll, candId) => getValFrom(draft, poll, candId)

  // 実際の保存処理。isAuto=true のときは「自動保存されました」表示にする
  const commit = async (poll, isAuto) => {
    const currentDraft = draftRef.current // タイマー経由でも必ず最新の下書きを読む
    const targets = poll.candidates
      .map(c => ({ c, v: getValFrom(currentDraft, poll, c.id) }))
      .filter(({ v }) => v.status)
    if (targets.length === 0) return
    setSaveState(s => ({ ...s, [poll.id]: 'saving' }))
    try {
      const results = await Promise.all(targets.map(({ c, v }) => onRespond(poll.id, c.id, v.status, v.comment)))
      const ok = results.every(r => r !== false)
      if (ok) {
        setSaveState(s => ({ ...s, [poll.id]: isAuto ? 'autosaved' : 'saved' }))
        setDirty(d => ({ ...d, [poll.id]: false }))
        clearTimeout(timers.current[poll.id])
        delete timers.current[poll.id]
        setTimeout(() => setSaveState(s => ({ ...s, [poll.id]: 'idle' })), isAuto ? 4000 : 2500)
      } else {
        setSaveState(s => ({ ...s, [poll.id]: 'error' }))
      }
    } catch {
      setSaveState(s => ({ ...s, [poll.id]: 'error' }))
    }
  }

  // 変更があるたびに呼ぶ: 「未保存」にしつつ、5分間操作がなければ自動保存するタイマーを仕掛け直す
  const scheduleAutosave = (poll) => {
    clearTimeout(timers.current[poll.id])
    timers.current[poll.id] = setTimeout(() => commit(poll, true), AUTOSAVE_DELAY_MS)
  }

  const setStatus = (poll, candId, status) => {
    const cur = getVal(poll, candId)
    setDraft(d => ({ ...d, [poll.id]: { ...(d[poll.id] || {}), [candId]: { ...cur, status } } }))
    setDirty(d => ({ ...d, [poll.id]: true }))
    setSaveState(s => ({ ...s, [poll.id]: 'idle' }))
    scheduleAutosave(poll)
  }

  const setComment = (poll, candId, comment) => {
    const cur = getVal(poll, candId)
    setDraft(d => ({ ...d, [poll.id]: { ...(d[poll.id] || {}), [candId]: { ...cur, comment } } }))
    setDirty(d => ({ ...d, [poll.id]: true }))
    setSaveState(s => ({ ...s, [poll.id]: 'idle' }))
    scheduleAutosave(poll)
  }

  // 「保存する」ボタン: 下書きにある回答をまとめて確定保存する
  const saveAll = (poll) => commit(poll, false)

  if (openPolls.length === 0) return null

  return (
    <div style={{ marginBottom: 16 }}>
      <p style={{ fontWeight: 500, fontSize: 13, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
        <i className="ti ti-calendar-question" style={{ fontSize: 16 }}></i>日程調整（回答受付中）
      </p>
      {openPolls.map(poll => {
        const responded = poll.candidates.every(c => poll.responses?.[selMember]?.[c.id]?.status)
        const isDirty = !!dirty[poll.id]
        const hasAnyStatus = poll.candidates.some(c => getVal(poll, c.id).status)
        return (
          <Card key={poll.id} style={{ padding: 14, marginBottom: 10, border: responded && !isDirty ? undefined : '1.5px solid var(--accent)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
              <p style={{ fontWeight: 500, margin: 0 }}>{poll.title}</p>
              {isDirty && <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--color-text-warning)', background: 'var(--color-background-warning)', padding: '2px 8px', borderRadius: 999, flexShrink: 0 }}>未保存</span>}
            </div>
            {poll.requireAll && <p style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginBottom: 8 }}>※ 全候補への回答をお願いします</p>}
            {poll.candidates.map(cand => {
              const key = `${poll.id}_${cand.id}`
              const val = getVal(poll, cand.id)
              const cur = val.status
              const comment = val.comment
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
                        <button key={st} onClick={() => setStatus(poll, cand.id, st)}
                          style={{ flex: 1, padding: '8px 0', borderRadius: 'var(--border-radius-md)', border: `1.5px solid ${active ? s.border : 'var(--color-border-tertiary)'}`, background: active ? s.bg : 'transparent', color: active ? s.text : 'var(--color-text-secondary)', cursor: 'pointer', fontWeight: 500, fontSize: 14 }}>
                          {s.icon} {s.label}
                        </button>
                      )
                    })}
                  </div>
                  <input type="text" placeholder="コメント（任意）例：19時以降なら参加できます"
                    value={comment}
                    onChange={e => setComment(poll, cand.id, e.target.value)}
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

            {/* 保存ボタン: ここを押すまでは上の選択は下書きのまま。押した瞬間に確定保存される */}
            {hasAnyStatus && (
              <div style={{ marginTop: 4 }}>
                <button
                  onClick={() => saveAll(poll)}
                  disabled={saveState[poll.id] === 'saving' || (!isDirty && saveState[poll.id] !== 'error')}
                  style={{
                    width: '100%', padding: '11px 0', borderRadius: 'var(--border-radius-md)', border: 'none',
                    fontWeight: 600, fontSize: 14,
                    cursor: (saveState[poll.id] === 'saving' || (!isDirty && saveState[poll.id] !== 'error')) ? 'default' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    opacity: (!isDirty && !['saved', 'autosaved', 'error'].includes(saveState[poll.id])) ? 0.5 : 1,
                    background: saveState[poll.id] === 'saved' ? 'var(--color-background-success)'
                      : saveState[poll.id] === 'autosaved' ? 'var(--color-background-success)'
                      : saveState[poll.id] === 'error' ? 'var(--color-background-danger)'
                      : 'var(--accent)',
                    color: saveState[poll.id] === 'saved' ? 'var(--color-text-success)'
                      : saveState[poll.id] === 'autosaved' ? 'var(--color-text-success)'
                      : saveState[poll.id] === 'error' ? 'var(--color-text-danger)'
                      : '#fff',
                  }}>
                  {saveState[poll.id] === 'saving' && <>保存中…</>}
                  {saveState[poll.id] === 'saved' && <><i className="ti ti-check" style={{ fontSize: 15 }}></i>保存しました</>}
                  {saveState[poll.id] === 'autosaved' && <><i className="ti ti-clock-check" style={{ fontSize: 15 }}></i>自動保存されました</>}
                  {saveState[poll.id] === 'error' && <><i className="ti ti-alert-circle" style={{ fontSize: 15 }}></i>保存に失敗しました。もう一度お試しください</>}
                  {(!saveState[poll.id] || saveState[poll.id] === 'idle') && (isDirty ? <>この内容で保存する</> : <>保存済み</>)}
                </button>
                {isDirty && (!saveState[poll.id] || saveState[poll.id] === 'idle') && (
                  <p style={{ fontSize: 11, color: 'var(--color-text-tertiary)', textAlign: 'center', margin: '6px 0 0' }}>
                    「保存する」を押すまで回答は確定されません（5分操作がないと自動で保存されます）
                  </p>
                )}
              </div>
            )}
          </Card>
        )
      })}
    </div>
  )
}
