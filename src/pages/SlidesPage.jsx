// ── 営業スライド (/slides) ───────────────────────────────────
// スマホで見せる・シェアするピッチデッキ
// オフホワイト × ピーコックグリーン

import { useState, useRef } from 'react'

const PG  = '#00897B'
const PGD = '#004D40'
const PGB = '#E0F2F1'
const PGL = '#B2DFDB'
const OFF = '#F8F6F2'

const slides = [
  // 0. タイトル
  {
    id: 'title',
    bg: PGD,
    render: () => (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 40 }}>
        <div style={{ fontSize: 52, marginBottom: 16 }}>✧</div>
        <h1 style={{ fontSize: 34, fontWeight: 800, color: '#fff', lineHeight: 1.2, marginBottom: 16 }}>
          出席管理
        </h1>
        <p style={{ fontSize: 16, color: PGB, lineHeight: 1.8, marginBottom: 40 }}>
          サークルの出席管理を、<br />もっとスマートに
        </p>
        <div style={{ width: 48, height: 2, background: PG, borderRadius: 1 }} />
        <p style={{ fontSize: 12, color: PGL, marginTop: 16 }}>完全無料 · 広告なし · データはあなたのGoogleシートに</p>
      </div>
    ),
  },
  // 1. 課題
  {
    id: 'problem',
    bg: OFF,
    render: () => (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '40px 32px' }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: PG, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12 }}>Problem</span>
        <h2 style={{ fontSize: 26, fontWeight: 800, lineHeight: 1.3, marginBottom: 28, color: '#18182A' }}>
          出欠管理、<br />今どうやってる？
        </h2>
        {[
          { icon: '📱', text: 'LINEで「参加できる人いいねして〜」→ 流れていく' },
          { icon: '📊', text: 'Excelで管理 → 誰かが更新を忘れる' },
          { icon: '🤷', text: '当日になって「何人来る？」が毎回わからない' },
        ].map((p, i) => (
          <div key={i} style={{ display: 'flex', gap: 14, marginBottom: 16, padding: '14px 16px', background: '#fff', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <span style={{ fontSize: 22 }}>{p.icon}</span>
            <p style={{ fontSize: 14, color: '#18182A', lineHeight: 1.6 }}>{p.text}</p>
          </div>
        ))}
      </div>
    ),
  },
  // 2. ソリューション
  {
    id: 'solution',
    bg: PGB,
    render: () => (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '40px 32px' }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: PGD, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12 }}>Solution</span>
        <h2 style={{ fontSize: 26, fontWeight: 800, lineHeight: 1.3, marginBottom: 8, color: PGD }}>
          URLを送るだけで<br />全部解決
        </h2>
        <p style={{ fontSize: 14, color: PGD, opacity: 0.8, lineHeight: 1.7, marginBottom: 28 }}>
          アプリのインストール不要。ログイン不要。<br />
          URLを開くとその場で出欠入力できます。
        </p>
        <div style={{ background: '#fff', borderRadius: 16, padding: 20, boxShadow: '0 4px 20px rgba(0,77,64,0.12)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, paddingBottom: 10, borderBottom: `1px solid ${PGL}` }}>
            <span style={{ color: PG }}>✧</span>
            <span style={{ fontWeight: 600, fontSize: 13, color: '#18182A' }}>6月定期練習 · 6/15(日)</span>
          </div>
          {[
            { name: 'あやか', status: '○ 参加予定',   color: '#0F6E56', bg: '#EDFAF4' },
            { name: 'みお',   status: '△ 遅刻予定',   color: '#8A5000', bg: '#FFF9EC' },
            { name: 'ひなた', status: '× 不参加',     color: '#B91C1C', bg: '#FEF2F2' },
          ].map(m => (
            <div key={m.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0' }}>
              <span style={{ fontSize: 13 }}>{m.name}</span>
              <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 999, background: m.bg, color: m.color, fontWeight: 500 }}>{m.status}</span>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  // 3. 主要機能
  {
    id: 'features',
    bg: '#fff',
    render: () => (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '40px 32px' }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: PG, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12 }}>Features</span>
        <h2 style={{ fontSize: 26, fontWeight: 800, lineHeight: 1.3, marginBottom: 24, color: '#18182A' }}>
          必要なものが<br />全部そろってる
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {[
            { icon: '📱', label: 'URLで即入力', desc: 'アプリ不要' },
            { icon: '📊', label: '出席率自動計算', desc: '実績・予測の2軸' },
            { icon: '🏷️', label: 'タグで整理', desc: '大人数でも迷わない' },
            { icon: '📝', label: '変更ログ', desc: '全操作を記録' },
            { icon: '🔒', label: 'データ完全管理', desc: 'あなたのGoogleシート' },
            { icon: '🎨', label: 'テーマカラー', desc: 'サークルカラーに対応' },
          ].map(f => (
            <div key={f.label} style={{ background: OFF, borderRadius: 12, padding: '14px 12px' }}>
              <div style={{ fontSize: 20, marginBottom: 6 }}>{f.icon}</div>
              <p style={{ fontSize: 12, fontWeight: 600, color: '#18182A', marginBottom: 2 }}>{f.label}</p>
              <p style={{ fontSize: 11, color: '#6A6880' }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  // 4. なぜ無料・なぜ安全
  {
    id: 'trust',
    bg: OFF,
    render: () => (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '40px 32px' }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: PG, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12 }}>Why Us</span>
        <h2 style={{ fontSize: 26, fontWeight: 800, lineHeight: 1.3, marginBottom: 24, color: '#18182A' }}>
          安心して使える<br />3つの理由
        </h2>
        {[
          { icon: '¥0', title: '完全無料・広告なし', desc: '現在および今後も無料で提供予定。メンバーの画面に広告は表示されません。' },
          { icon: '🔐', title: 'データを誰にも渡さない', desc: '出欠データは各サークルのGoogleスプレッドシートに直接保存。第三者のサーバーは使いません。' },
          { icon: '👤', title: 'メンバーの個人情報不要', desc: 'メンバーはログインもアカウント登録も不要。名前を選ぶだけで使えます。' },
        ].map(t => (
          <div key={t.title} style={{ display: 'flex', gap: 14, marginBottom: 16 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: PGB, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700, color: PGD, flexShrink: 0 }}>{t.icon}</div>
            <div>
              <p style={{ fontWeight: 600, fontSize: 14, marginBottom: 2, color: '#18182A' }}>{t.title}</p>
              <p style={{ fontSize: 12, color: '#6A6880', lineHeight: 1.6 }}>{t.desc}</p>
            </div>
          </div>
        ))}
      </div>
    ),
  },
  // 5. CTA
  {
    id: 'cta',
    bg: PGD,
    render: () => (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 40 }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>✧</div>
        <h2 style={{ fontSize: 28, fontWeight: 800, color: '#fff', lineHeight: 1.3, marginBottom: 12 }}>
          まず、<br />触ってみてください
        </h2>
        <p style={{ fontSize: 14, color: PGB, lineHeight: 1.8, marginBottom: 36 }}>
          登録不要・インストール不要<br />
          今すぐ体験できます
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%', maxWidth: 260 }}>
          <a href="/demo" style={{ display: 'block', padding: '14px', borderRadius: 12, background: PG, color: '#fff', textDecoration: 'none', fontWeight: 600, fontSize: 15, boxShadow: '0 4px 20px rgba(0,137,123,0.5)' }}>
            体験版を触る →
          </a>
          <a href="/report?type=adopt" style={{ display: 'block', padding: '14px', borderRadius: 12, background: 'transparent', color: PGB, border: `1.5px solid ${PGL}`, textDecoration: 'none', fontWeight: 500, fontSize: 14 }}>
            導入を相談する
          </a>
          <a href="/lp" style={{ display: 'block', padding: '14px', borderRadius: 12, background: 'transparent', color: PGL, textDecoration: 'none', fontSize: 13 }}>
            詳しく見る
          </a>
        </div>
        <p style={{ marginTop: 32, fontSize: 11, color: PGL }}>circle-attendance-chi.vercel.app</p>
      </div>
    ),
  },
]

export default function SlidesPage() {
  const [cur, setCur] = useState(0)
  const startX = useRef(null)

  const prev = () => setCur(c => Math.max(0, c - 1))
  const next = () => setCur(c => Math.min(slides.length - 1, c + 1))

  const onTouchStart = (e) => { startX.current = e.touches[0].clientX }
  const onTouchEnd   = (e) => {
    if (startX.current === null) return
    const dx = e.changedTouches[0].clientX - startX.current
    if (Math.abs(dx) > 40) { dx < 0 ? next() : prev() }
    startX.current = null
  }

  const slide = slides[cur]

  return (
    <div style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Hiragino Sans', sans-serif", background: '#18182A', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: 16 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', maxWidth: 420, marginBottom: 12 }}>
        <a href="/lp" style={{ color: '#6A6880', fontSize: 12, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ color: PG }}>✧</span> 出席管理
        </a>
        <span style={{ color: '#6A6880', fontSize: 12 }}>{cur + 1} / {slides.length}</span>
      </div>

      {/* Slide */}
      <div
        style={{ width: '100%', maxWidth: 420, height: 540, background: slide.bg, borderRadius: 24, overflow: 'hidden', boxShadow: '0 8px 40px rgba(0,0,0,0.4)', position: 'relative', cursor: 'grab', userSelect: 'none' }}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {slide.render()}
      </div>

      {/* Dots */}
      <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
        {slides.map((_, i) => (
          <button key={i} onClick={() => setCur(i)} style={{ width: i === cur ? 20 : 8, height: 8, borderRadius: 4, background: i === cur ? PG : '#3A3A4A', border: 'none', cursor: 'pointer', transition: 'all 0.2s' }} />
        ))}
      </div>

      {/* Nav buttons */}
      <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
        <button onClick={prev} disabled={cur === 0} style={{ padding: '10px 24px', borderRadius: 8, background: cur === 0 ? '#2A2A3A' : '#3A3A4A', color: cur === 0 ? '#3A3A4A' : '#fff', border: 'none', cursor: cur === 0 ? 'default' : 'pointer', fontSize: 14, fontWeight: 500 }}>← 前へ</button>
        <button onClick={next} disabled={cur === slides.length - 1} style={{ padding: '10px 24px', borderRadius: 8, background: cur === slides.length - 1 ? '#2A2A3A' : PG, color: '#fff', border: 'none', cursor: cur === slides.length - 1 ? 'default' : 'pointer', fontSize: 14, fontWeight: 500 }}>次へ →</button>
      </div>

      <p style={{ color: '#3A3A4A', fontSize: 11, marginTop: 12 }}>スワイプまたはボタンで切替</p>
    </div>
  )
}
