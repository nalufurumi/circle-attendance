import { useState } from 'react'
import { Card } from './ui.jsx'
import CandidateDatePicker from './CandidateDatePicker.jsx'
import { POLL_STATUS, tallyPollCandidate, pollResponsesToAttendance } from '../lib/constants.js'

// 管理者画面の「日程調整」タブの中身。
// data/onUpdate/adminLabel/mkLog/AC系カラーを親ページから受け取る汎用コンポーネント。
// 実運用(AdminPage)・デモ(DemoPage)どちらからも同じ形で呼べる。
export default function AdminSchedulePanel({ data, onUpdate, adminLabel, mkLog, AC, ACB, ACD, onEventCreated }) {
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState('')
  const [memo, setMemo] = useState('')                   // メンバーに伝えたい補足(任意)
  const [inputMode, setInputMode] = useState('calendar') // 'calendar' | 'manual'
  // カレンダー側の入力状態はCandidateDatePickerが持つ。ここには組み上がった候補リストだけ受け取る
  const [calendarCandidates, setCalendarCandidates] = useState([]) // [{date,timeStart,timeEnd}]
  const [pickerKey, setPickerKey] = useState(0)                    // key更新で中身をまるごとリセットする
  const [dupTimes, setDupTimes] = useState({ start: '', end: '' })  // 複製時に引き継ぐ初期時刻
  const [candidates, setCandidates] = useState([{ date: '', timeStart: '', timeEnd: '' }]) // 手入力モード用
  const [requireAll, setRequireAll] = useState(false)
  const [expandedPoll, setExpandedPoll] = useState(null)
  const [confirmingPick, setConfirmingPick] = useState(null) // { poll, candidateId, cand }
  const [eventName, setEventName] = useState('')
  const [eventType, setEventType] = useState('練習')
  const [formError, setFormError] = useState('')

  const polls = data.schedulePolls || []
  const openPolls = polls.filter(p => p.status === 'open')
  const closedPolls = polls.filter(p => p.status === 'closed')

  const addCandidateRow = () => setCandidates(c => [...c, { date: '', timeStart: '', timeEnd: '' }])
  const removeCandidateRow = (i) => setCandidates(c => c.filter((_, idx) => idx !== i))
  const updateCandidateRow = (i, field, val) => setCandidates(c => c.map((row, idx) => idx === i ? { ...row, [field]: val } : row))

  // フォーム入力を全部クリアする(作成後・キャンセル時に使う)
  const resetForm = () => {
    setTitle(''); setMemo(''); setCalendarCandidates([]); setDupTimes({ start: '', end: '' }); setPickerKey(k => k + 1)
    setCandidates([{ date: '', timeStart: '', timeEnd: '' }])
    setRequireAll(false); setFormError('')
  }

  const createPoll = () => {
    // 選択中のモードに応じて候補日リストを組み立てる
    const validCandidates = inputMode === 'calendar'
      ? calendarCandidates
      : candidates.filter(c => c.date)

    if (!title.trim()) { setFormError('「タイトル」が空欄です'); return }
    if (validCandidates.length === 0) {
      setFormError(inputMode === 'calendar'
        ? '候補日が選ばれていません（カレンダーの日付をタップしてください）'
        : '候補日が1件も入力されていません（日付を選んでください）')
      return
    }
    setFormError('')
    const poll = {
      id: `sp${Date.now()}`,
      title: title.trim(),
      memo: memo.trim(),
      candidates: validCandidates.map((c, i) => ({ id: `c${Date.now()}_${i}`, date: c.date, timeStart: c.timeStart, timeEnd: c.timeEnd })),
      requireAll,
      status: 'open',
      responses: {},
      resultCandidateId: null,
      eventId: null,
      createdAt: new Date().toISOString(),
    }
    onUpdate({ ...data, schedulePolls: [poll, ...polls] }, mkLog?.({ by: adminLabel, type: 'admin', member: '', before: '', after: `日程調整作成: ${poll.title}` }))
    resetForm(); setShowForm(false)
  }

  const deletePoll = (pollId) => {
    if (!confirm('この日程調整を削除しますか？回答内容も失われます。')) return
    onUpdate({ ...data, schedulePolls: polls.filter(p => p.id !== pollId) })
  }

  // 前回と同じ設定で新しく作る。日付は過去のものなので引き継がず、
  // 毎回打ち直すのが面倒な「タイトル・メモ・時間・回答必須」だけを引き継ぐ。
  const duplicatePoll = (poll) => {
    setTitle(poll.title)
    setMemo(poll.memo || '')
    setRequireAll(!!poll.requireAll)
    // 前回の候補で一番よく使われていた時刻を初期値として引き継ぐ
    const first = poll.candidates?.[0]
    setDupTimes({ start: first?.timeStart || '', end: first?.timeEnd || '' })
    setInputMode('calendar')
    setCalendarCandidates([])
    setPickerKey(k => k + 1)  // ピッカーを作り直して引き継いだ時刻を初期値に反映
    setFormError('')
    setShowForm(true)
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const openConfirmPick = (poll, candidateId) => {
    const cand = poll.candidates.find(c => c.id === candidateId)
    setEventName(poll.title)
    setEventType('練習')
    setConfirmingPick({ poll, candidateId, cand })
  }

  const finalizePoll = () => {
    if (!confirmingPick) return
    const { poll, candidateId, cand } = confirmingPick
    const attendance = pollResponsesToAttendance(poll, candidateId)
    const newEvent = {
      id: `e${Date.now()}`,
      date: cand.date, timeStart: cand.timeStart || '', timeEnd: cand.timeEnd || '',
      name: eventName.trim() || poll.title, type: eventType, color: 'pink', tags: [], memo: poll.memo || '',
      attendance,
    }
    const updatedPolls = polls.map(p => p.id === poll.id ? { ...p, status: 'closed', resultCandidateId: candidateId, eventId: newEvent.id } : p)
    onUpdate(
      { ...data, schedulePolls: updatedPolls, events: [...data.events, newEvent].sort((a, b) => b.date.localeCompare(a.date)) },
      mkLog?.({ by: adminLabel, type: 'admin', member: '', before: poll.title, after: `${cand.date} に決定→イベント化` })
    )
    setConfirmingPick(null)
    onEventCreated?.(newEvent.id)
  }

  const fmtDate = (d) => {
    if (!d) return ''
    const dt = new Date(d + 'T00:00:00')
    return `${d}（${['日', '月', '火', '水', '木', '金', '土'][dt.getDay()]}）`
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <span style={{ fontWeight: 500 }}>日程調整</span>
        <button onClick={() => { setShowForm(s => !s); setFormError('') }} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px', borderRadius: 999, background: ACB, border: 'none', color: ACD, cursor: 'pointer', fontSize: 13, fontWeight: 500 }}>
          <i className="ti ti-plus" style={{ fontSize: 14 }}></i>作成
        </button>
      </div>

      {showForm && (
        <Card style={{ padding: 14, marginBottom: 14 }}>
          <p style={{ fontWeight: 500, marginBottom: 10 }}>新しい日程調整</p>
          <div style={{ marginBottom: 10 }}>
            <p style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginBottom: 4 }}>タイトル</p>
            <input type="text" placeholder="例：7月の練習日程を決めよう" value={title} onChange={e => setTitle(e.target.value)} />
          </div>
          <div style={{ marginBottom: 10 }}>
            <p style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginBottom: 4 }}>メモ（任意・メンバーの回答画面に表示されます）</p>
            <textarea placeholder="例：2泊3日の合宿です。バイトがある人は早めに教えてください" value={memo} onChange={e => setMemo(e.target.value)}
              style={{ width: '100%', minHeight: 56, boxSizing: 'border-box', fontSize: 13, resize: 'vertical' }} />
          </div>
          <p style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginBottom: 6 }}>候補日</p>

          {/* 入力方法の切替。テクノロジーに詳しくない人がまず触るのはカレンダーなので既定はこちら。
              時間を1件ずつ変えたい等の細かい調整をしたい人向けに手入力も残す。 */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
            {[['calendar', 'カレンダーから選ぶ'], ['manual', '手入力']].map(([mode, label]) => (
              <button key={mode} type="button" onClick={() => setInputMode(mode)}
                style={{ flex: 1, padding: '7px 0', borderRadius: 999, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  border: `1px solid ${inputMode === mode ? AC : 'var(--color-border-tertiary)'}`,
                  background: inputMode === mode ? ACB : 'transparent',
                  color: inputMode === mode ? ACD : 'var(--color-text-secondary)' }}>
                {label}
              </button>
            ))}
          </div>

          {inputMode === 'calendar' ? (
            <CandidateDatePicker key={pickerKey} initialTimes={dupTimes} onChange={setCalendarCandidates} AC={AC} ACB={ACB} ACD={ACD} />
          ) : (
            <>
              {candidates.map((c, i) => (
                <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 6, alignItems: 'center' }}>
                  <input type="date" value={c.date} onChange={e => updateCandidateRow(i, 'date', e.target.value)} style={{ flex: 2 }} />
                  <input type="time" value={c.timeStart} onChange={e => updateCandidateRow(i, 'timeStart', e.target.value)} style={{ flex: 1 }} />
                  <input type="time" value={c.timeEnd} onChange={e => updateCandidateRow(i, 'timeEnd', e.target.value)} style={{ flex: 1 }} />
                  {candidates.length > 1 && (
                    <button onClick={() => removeCandidateRow(i)} style={{ border: 'none', background: 'transparent', color: 'var(--color-text-danger)', cursor: 'pointer', padding: 4, flexShrink: 0 }}>
                      <i className="ti ti-x" style={{ fontSize: 14 }}></i>
                    </button>
                  )}
                </div>
              ))}
              <button onClick={addCandidateRow} style={{ fontSize: 12, color: AC, border: 'none', background: 'transparent', cursor: 'pointer', padding: '4px 0', marginBottom: 10 }}>
                + 候補日を追加
              </button>
            </>
          )}

          <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, cursor: 'pointer' }}>
            <input type="checkbox" checked={requireAll} onChange={e => setRequireAll(e.target.checked)} style={{ width: 16, height: 16 }} />
            <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>全候補への回答を必須にする（オフなら回答したい候補だけでOK）</span>
          </label>

          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={createPoll} style={{ flex: 1, padding: '9px', background: AC, border: 'none', borderRadius: 'var(--border-radius-md)', color: '#fff', cursor: 'pointer', fontWeight: 500 }}>作成する</button>
            <button onClick={() => { setShowForm(false); resetForm() }} style={{ padding: '9px 16px', background: 'transparent', border: '0.5px solid var(--color-border-secondary)', borderRadius: 'var(--border-radius-md)', color: 'var(--color-text-secondary)', cursor: 'pointer' }}>キャンセル</button>
          </div>
          {formError && (
            <p style={{ fontSize: 12, color: 'var(--color-text-danger)', marginTop: 10, display: 'flex', alignItems: 'center', gap: 4 }}>
              <i className="ti ti-alert-circle" style={{ fontSize: 14 }}></i>{formError}
            </p>
          )}
        </Card>
      )}

      {polls.length === 0 && !showForm && (
        <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--color-text-secondary)' }}>
          <i className="ti ti-calendar-question" style={{ fontSize: 36 }}></i>
          <p style={{ marginTop: 8 }}>日程調整がまだありません</p>
          <p style={{ fontSize: 12, marginTop: 4 }}>候補日を出してメンバーに投票してもらいましょう</p>
        </div>
      )}

      {openPolls.length > 0 && (
        <>
          <p style={{ fontSize: 12, color: 'var(--color-text-tertiary)', marginBottom: 6 }}>回答受付中</p>
          {openPolls.map(poll => {
            const isOpen = expandedPoll === poll.id
            const respondentCount = Object.keys(poll.responses || {}).length
            return (
              <Card key={poll.id} style={{ marginBottom: 8, overflow: 'hidden' }}>
                <div onClick={() => setExpandedPoll(isOpen ? null : poll.id)} style={{ padding: '12px 14px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <p style={{ fontWeight: 500, margin: 0 }}>{poll.title}</p>
                    <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', margin: 0 }}>候補{poll.candidates.length}件 · 回答{respondentCount}人</p>
                  </div>
                  <i className={`ti ${isOpen ? 'ti-chevron-up' : 'ti-chevron-down'}`} style={{ fontSize: 16, color: 'var(--color-text-secondary)' }}></i>
                </div>
                {isOpen && (
                  <div style={{ borderTop: '0.5px solid var(--color-border-tertiary)', padding: '12px 14px' }}>
                    {poll.memo?.trim() && (
                      <div style={{ display: 'flex', gap: 6, background: 'var(--color-background-secondary)', borderRadius: 'var(--border-radius-sm)', padding: '6px 10px', marginBottom: 10, fontSize: 12, color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
                        <span style={{ flexShrink: 0 }}>📝</span><span>{poll.memo}</span>
                      </div>
                    )}
                    {poll.candidates.map(cand => {
                      const tally = tallyPollCandidate(poll, cand.id)
                      return (
                        <div key={cand.id} style={{ marginBottom: 12, padding: '10px 12px', background: 'var(--color-background-secondary)', borderRadius: 'var(--border-radius-md)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, flexWrap: 'wrap', gap: 6 }}>
                            <span style={{ fontSize: 13, fontWeight: 500 }}>{fmtDate(cand.date)}{cand.timeStart ? ` ${cand.timeStart}〜${cand.timeEnd || ''}` : ''}</span>
                            <button onClick={() => openConfirmPick(poll, cand.id)} style={{ padding: '4px 12px', background: AC, border: 'none', borderRadius: 999, color: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 500 }}>
                              この日程に決定
                            </button>
                          </div>
                          <div style={{ display: 'flex', gap: 12, fontSize: 12 }}>
                            <span style={{ color: 'var(--color-text-success)' }}>○ {tally.yes}人</span>
                            <span style={{ color: 'var(--color-text-warning)' }}>△ {tally.maybe}人</span>
                            <span style={{ color: 'var(--color-text-danger)' }}>✕ {tally.no}人</span>
                            {tally.null > 0 && <span style={{ color: 'var(--color-text-tertiary)' }}>未回答 {tally.null}人</span>}
                          </div>
                          {/* 回答者ごとの内訳 */}
                          <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                            {Object.entries(poll.responses || {}).map(([member, byCand]) => {
                              const r = byCand?.[cand.id]
                              if (!r) return null
                              const s = POLL_STATUS[r.status ?? 'null']
                              return (
                                <span key={member} style={{ fontSize: 11, padding: '2px 8px', borderRadius: 999, background: s.bg, color: s.text }}>
                                  {s.icon} {member}{r.comment ? `（${r.comment}）` : ''}
                                </span>
                              )
                            })}
                          </div>
                        </div>
                      )
                    })}
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                      <button onClick={() => duplicatePoll(poll)} style={{ fontSize: 12, color: AC, border: 'none', background: 'transparent', cursor: 'pointer', padding: '4px 0', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <i className="ti ti-copy" style={{ fontSize: 14 }}></i>同じ設定で新しく作る
                      </button>
                      <button onClick={() => deletePoll(poll.id)} style={{ fontSize: 12, color: 'var(--color-text-danger)', border: 'none', background: 'transparent', cursor: 'pointer', padding: '4px 0' }}>
                        この日程調整を削除
                      </button>
                    </div>
                  </div>
                )}
              </Card>
            )
          })}
        </>
      )}

      {closedPolls.length > 0 && (
        <>
          <p style={{ fontSize: 12, color: 'var(--color-text-tertiary)', margin: '16px 0 6px' }}>確定済み</p>
          {closedPolls.map(poll => {
            const cand = poll.candidates.find(c => c.id === poll.resultCandidateId)
            return (
              <Card key={poll.id} style={{ padding: '10px 14px', marginBottom: 6, opacity: 0.75 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <p style={{ fontSize: 13, margin: 0 }}>{poll.title}</p>
                    <p style={{ fontSize: 11, color: 'var(--color-text-tertiary)', margin: 0 }}>{cand ? fmtDate(cand.date) : ''} に決定 → イベント化済み</p>
                  </div>
                  <button onClick={() => duplicatePoll(poll)} title="同じ設定で新しく作る" aria-label={`${poll.title} と同じ設定で新しく作る`}
                    style={{ border: 'none', background: 'transparent', color: AC, cursor: 'pointer', padding: 4, flexShrink: 0 }}>
                    <i className="ti ti-copy" style={{ fontSize: 16 }}></i>
                  </button>
                  <i className="ti ti-check" style={{ fontSize: 16, color: 'var(--color-text-success)', flexShrink: 0 }}></i>
                </div>
              </Card>
            )
          })}
        </>
      )}

      {/* 決定確認モーダル */}
      {confirmingPick && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.35)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={() => setConfirmingPick(null)}>
          <div style={{ background: 'var(--color-background-primary)', borderRadius: 'var(--border-radius-lg)', padding: 24, maxWidth: 340, width: '100%', boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }} onClick={e => e.stopPropagation()}>
            <p style={{ fontWeight: 500, fontSize: 15, marginBottom: 4 }}>この日程で決定しますか？</p>
            <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 14 }}>{fmtDate(confirmingPick.cand.date)}{confirmingPick.cand.timeStart ? ` ${confirmingPick.cand.timeStart}〜${confirmingPick.cand.timeEnd || ''}` : ''}</p>

            <p style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginBottom: 4 }}>イベント名</p>
            <input type="text" value={eventName} onChange={e => setEventName(e.target.value)} style={{ marginBottom: 10, width: '100%', boxSizing: 'border-box' }} />

            <p style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginBottom: 4 }}>種別</p>
            <select value={eventType} onChange={e => setEventType(e.target.value)} style={{ marginBottom: 14, width: '100%' }}>
              {['練習', '本番', 'イベント', 'MTG', 'その他'].map(t => <option key={t}>{t}</option>)}
            </select>

            <div style={{ background: 'var(--color-background-secondary)', borderRadius: 'var(--border-radius-md)', padding: '8px 12px', marginBottom: 16 }}>
              <p style={{ fontSize: 11, color: 'var(--color-text-secondary)', margin: 0, lineHeight: 1.6 }}>
                投票時の○/△/✕とコメントは、そのままこのイベントの「事前入力」に引き継がれます。
              </p>
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={finalizePoll} style={{ flex: 1, padding: '10px', background: AC, border: 'none', borderRadius: 'var(--border-radius-md)', color: '#fff', cursor: 'pointer', fontWeight: 500, fontSize: 14 }}>決定してイベント化</button>
              <button onClick={() => setConfirmingPick(null)} style={{ flex: 1, padding: '10px', background: 'transparent', border: '0.5px solid var(--color-border-secondary)', borderRadius: 'var(--border-radius-md)', color: 'var(--color-text-secondary)', cursor: 'pointer', fontSize: 14 }}>キャンセル</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
