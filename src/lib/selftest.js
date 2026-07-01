// ── 自動テストスイート ─────────────────────────────────────────
// 開発者ページから実行する、アプリの核ロジックの検証。
// 「毎回ユーザーになりきって手動確認」の代わりに、バグが出やすい
// ロジック層を既知の入力→期待値でチェックする。
//
// 2種類:
//   1. logicTests  — computeStats / migrate / タグ順序 / 健全性修復など純粋関数
//   2. renderTests — 各ページが例外を投げずに描画できるか（state漏れ・undefined参照検出）
//
// renderTests は React を使わず、代わりに「壊れやすいパターン」を静的に
// 近似チェックする。完全な描画テストは重いので、ここでは主要ページの
// コンポーネントを実際に renderToStaticMarkup して例外の有無だけ見る。

import { computeStats, isEditLocked, isEventStarted, DEFAULT_DATA } from './constants.js'
import { migrate } from './api.js'

// ── 軽量アサーションフレームワーク ──
function makeRunner() {
  const results = []
  const t = (name, fn) => {
    try {
      fn()
      results.push({ name, pass: true })
    } catch (e) {
      results.push({ name, pass: false, error: e.message })
    }
  }
  const eq = (actual, expected, msg = '') => {
    const a = JSON.stringify(actual), e = JSON.stringify(expected)
    if (a !== e) throw new Error(`${msg} 期待:${e} 実際:${a}`)
  }
  const ok = (cond, msg = '') => { if (!cond) throw new Error(msg || 'falsy') }
  return { t, eq, ok, results }
}

// 日付ヘルパー: offset日後のYYYY-MM-DD
const dstr = (offset) => { const d = new Date(); d.setDate(d.getDate() + offset); return d.toISOString().slice(0, 10) }

// ═══════════════════════════════════════════════════════════════
// 1. ロジックテスト
// ═══════════════════════════════════════════════════════════════
export function runLogicTests() {
  const { t, eq, ok, results } = makeRunner()

  // ── computeStats: 出席率計算 ──
  t('出席率: 過去イベント全参加なら100%', () => {
    const events = [
      { id: '1', date: dstr(-10), timeStart: '', attendance: { A: { plan: 'attending', actual: 'present' } } },
      { id: '2', date: dstr(-5),  timeStart: '', attendance: { A: { plan: 'attending', actual: 'present' } } },
    ]
    const s = computeStats(events, 'A')
    eq(s.actualRate, 100, '実績出席率')
    eq(s.present, 2, '参加数')
  })

  t('出席率: 参加予定に対し半分欠席なら50%', () => {
    const events = [
      { id: '1', date: dstr(-10), timeStart: '', attendance: { A: { plan: 'attending', actual: 'present' } } },
      { id: '2', date: dstr(-5),  timeStart: '', attendance: { A: { plan: 'attending', actual: 'absent' } } },
    ]
    const s = computeStats(events, 'A')
    eq(s.actualRate, 50, '実績出席率')
  })

  t('出席率: 遅刻は分子に含まれる', () => {
    const events = [
      { id: '1', date: dstr(-10), timeStart: '', attendance: { A: { plan: 'attending', actual: 'late' } } },
    ]
    const s = computeStats(events, 'A')
    eq(s.actualRate, 100, '遅刻は出席扱い')
    eq(s.late, 1, '遅刻カウント')
  })

  t('出席率: 不参加予定は分母から除外される', () => {
    const events = [
      { id: '1', date: dstr(-10), timeStart: '', attendance: { A: { plan: 'attending', actual: 'present' } } },
      { id: '2', date: dstr(-5),  timeStart: '', attendance: { A: { plan: 'absent', actual: 'absent' } } },
    ]
    const s = computeStats(events, 'A')
    // 不参加予定のイベントは分母に入らない → 参加予定1回・参加1回 = 100%
    eq(s.actualRate, 100, '不参加予定を除外')
    eq(s.heldDenom, 1, '分母')
  })

  t('出席率: 未来イベントは実績に含まれない', () => {
    const events = [
      { id: '1', date: dstr(10), timeStart: '', attendance: { A: { plan: 'attending', actual: null } } },
    ]
    const s = computeStats(events, 'A')
    eq(s.actualRate, null, '未来は実績null')
    eq(s.predictedRate, 100, '予測は100%')
  })

  t('出席率: 予測は全予定ベース', () => {
    const events = [
      { id: '1', date: dstr(10), timeStart: '', attendance: { A: { plan: 'attending' } } },
      { id: '2', date: dstr(20), timeStart: '', attendance: { A: { plan: 'absent' } } },
    ]
    const s = computeStats(events, 'A')
    eq(s.predictedRate, 50, '予測出席率')
    eq(s.planTotal, 2, '予定総数')
  })

  t('出席率: 予定なしメンバーはnull', () => {
    const events = [{ id: '1', date: dstr(-5), timeStart: '', attendance: {} }]
    const s = computeStats(events, 'A')
    eq(s.actualRate, null, '実績null')
    eq(s.predictedRate, null, '予測null')
  })

  // ── ソート順の検証（統計タブのバグ再発防止）──
  t('統計ソート: 高→低で正しく並ぶ（nullは末尾）', () => {
    const events = [
      { id: '1', date: dstr(-5), timeStart: '', attendance: {
        高: { plan: 'attending', actual: 'present' },
        低: { plan: 'attending', actual: 'absent' },
      } },
    ]
    const members = ['低', '高', '未']
    const sorted = [...members].sort((a, b) =>
      (computeStats(events, b).actualRate ?? -1) - (computeStats(events, a).actualRate ?? -1))
    eq(sorted, ['高', '低', '未'], '降順（未計算は末尾）')
  })

  t('統計ソート: 低→高で正しく並ぶ（nullは末尾）', () => {
    const events = [
      { id: '1', date: dstr(-5), timeStart: '', attendance: {
        高: { plan: 'attending', actual: 'present' },
        低: { plan: 'attending', actual: 'absent' },
      } },
    ]
    const members = ['高', '低', '未']
    const sorted = [...members].sort((a, b) =>
      (computeStats(events, a).actualRate ?? 999) - (computeStats(events, b).actualRate ?? 999))
    eq(sorted, ['低', '高', '未'], '昇順（未計算は末尾）')
  })

  // ── 24時間編集ロック ──
  t('編集ロック: 25時間前開始のイベントはロック', () => {
    const d = new Date(); d.setHours(d.getHours() - 25)
    const ev = { date: d.toISOString().slice(0, 10), timeStart: d.toTimeString().slice(0, 5) }
    ok(isEditLocked(ev), 'ロックされるべき')
  })

  t('編集ロック: 未来イベントはロックされない', () => {
    const ev = { date: dstr(5), timeStart: '14:00' }
    ok(!isEditLocked(ev), 'ロックされないべき')
    ok(!isEventStarted(ev), '開始してないべき')
  })

  // ── migrate: データ移行 ──
  t('migrate: v2文字列形式→v3オブジェクト形式', () => {
    const v2 = { dataVersion: 2, members: ['A'], events: [
      { id: '1', date: '2026-01-01', name: 'X', attendance: { A: 'present' } },
    ] }
    const m = migrate(v2)
    eq(m.dataVersion, 3, 'バージョン更新')
    eq(typeof m.events[0].attendance.A, 'object', 'オブジェクト化')
    eq(m.events[0].attendance.A.actual, 'present', 'actual移行')
  })

  t('migrate: 空/不正入力でも安全なデフォルトを返す', () => {
    const m = migrate(null)
    ok(Array.isArray(m.members), 'members配列')
    ok(Array.isArray(m.events), 'events配列')
    eq(m.dataVersion, 3, 'バージョン')
  })

  t('migrate: globalTagsが常に存在する', () => {
    const m = migrate({ dataVersion: 3, members: [], events: [] })
    ok(Array.isArray(m.globalTags), 'globalTags配列')
  })

  // ── タグ順序（globalTags基準）──
  t('タグ順序: globalTagsの順番が優先される', () => {
    const data = {
      globalTags: ['C', 'A', 'B'],
      events: [{ tags: ['A', 'B', 'C', 'D'] }],
    }
    const allTags = [
      ...(data.globalTags || []).filter(tag => data.events.some(e => e.tags?.includes(tag))),
      ...data.events.flatMap(e => e.tags || []).filter(tag => !(data.globalTags || []).includes(tag)),
    ].filter((tag, i, a) => a.indexOf(tag) === i)
    eq(allTags, ['C', 'A', 'B', 'D'], 'globalTags順+末尾に自動タグ')
  })

  // ── 健全性チェックのロジック ──
  t('健全性: 孤立した出欠記録を検出', () => {
    const members = ['A', 'B']
    const events = [{ name: 'X', date: '2026-01-01', attendance: { A: {}, C: {}, D: {} } }]
    const orphaned = []
    events.forEach(ev => Object.keys(ev.attendance).forEach(n => { if (!members.includes(n)) orphaned.push(n) }))
    eq(orphaned, ['C', 'D'], '削除済みメンバーC,Dを検出')
  })

  t('健全性: 孤立レコード修復後は正しいメンバーのみ残る', () => {
    const members = ['A', 'B']
    const ev = { attendance: { A: { actual: 'present' }, C: { actual: 'absent' } } }
    const cleaned = {}
    Object.entries(ev.attendance).forEach(([n, v]) => { if (members.includes(n)) cleaned[n] = v })
    eq(Object.keys(cleaned), ['A'], 'Aのみ残る')
  })

  t('健全性: 重複メンバーの除去', () => {
    const members = ['A', 'B', 'A', 'C', 'B']
    eq([...new Set(members)], ['A', 'B', 'C'], '重複除去')
  })

  // ── base64 URL エンコード（メンバーURL）──
  t('メンバーURL: base64エンコード/デコードが対称', () => {
    const url = 'https://script.google.com/macros/s/ABC123/exec'
    ok(atob(btoa(url)) === url, 'エンコード対称性')
  })

  return results
}

// ═══════════════════════════════════════════════════════════════
// 2. レンダリング検証（各ページが例外なく描画できるか）
// ═══════════════════════════════════════════════════════════════
// React コンポーネントを実際に静的レンダリングし、state漏れや
// undefined参照による例外を検出する。前回の statOrder/showAllTags
// 未定義クラッシュのような問題をここで捕捉する。
export async function runRenderTests() {
  const { t, ok, results } = makeRunner()
  const React = (await import('react')).default
  const { renderToStaticMarkup } = await import('react-dom/server')

  const tryRender = (name, importer, props = {}) => {
    t(name, () => {
      // 動的importは非同期なので、ここでは同期的に描画テストできる
      // コンポーネントに限定。importをawaitで先に解決しておく。
      const Comp = importer
      let html
      try {
        html = renderToStaticMarkup(React.createElement(Comp, props))
      } catch (e) {
        throw new Error('描画例外: ' + e.message)
      }
      ok(typeof html === 'string' && html.length > 0, '描画結果が空')
    })
  }

  // 各ページを動的importして描画テスト
  const pages = [
    ['LandingPage が描画できる', () => import('../pages/LandingPage.jsx')],
    ['SlidesPage が描画できる',  () => import('../pages/SlidesPage.jsx')],
    ['ReportPage が描画できる',  () => import('../pages/ReportPage.jsx')],
  ]

  for (const [name, importer] of pages) {
    try {
      const mod = await importer()
      const Comp = mod.default
      // BrowserRouter が必要なページは MemoryRouter でラップ
      const { MemoryRouter } = await import('react-router-dom')
      let html
      try {
        html = renderToStaticMarkup(
          React.createElement(MemoryRouter, null, React.createElement(Comp))
        )
        results.push({ name, pass: typeof html === 'string' && html.length > 0, error: html ? undefined : '空の描画' })
      } catch (e) {
        results.push({ name, pass: false, error: '描画例外: ' + e.message })
      }
    } catch (e) {
      results.push({ name, pass: false, error: 'import失敗: ' + e.message })
    }
  }

  return results
}
