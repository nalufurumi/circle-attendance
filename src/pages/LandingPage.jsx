// ── ランディングページ (/lp) ─────────────────────────────────
// オフホワイト × ピーコックグリーンで統一したマーケティングページ

const PG  = '#00897B'   // Peacock Green
const PGD = '#004D40'   // Dark
const PGB = '#E0F2F1'   // Background tint
const PGL = '#B2DFDB'   // Light border
const OFF = '#F8F6F2'   // Off-white background
const OFF2 = '#EFECE6'  // Slightly deeper off-white

const Section = ({ children, style = {} }) => (
  <section style={{ padding: '64px 24px', ...style }}>{children}</section>
)
const Tag = ({ children }) => (
  <span style={{ display: 'inline-block', padding: '3px 12px', borderRadius: 999, background: PGB, color: PGD, fontSize: 12, fontWeight: 500, marginBottom: 12 }}>{children}</span>
)
const Btn = ({ href, children, variant = 'primary', style = {} }) => (
  <a href={href} style={{
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    padding: '12px 28px', borderRadius: 12, fontSize: 15, fontWeight: 600,
    textDecoration: 'none', gap: 6, transition: 'opacity 0.15s',
    ...(variant === 'primary'
      ? { background: PG, color: '#fff' }
      : { background: 'transparent', color: PGD, border: `1.5px solid ${PGL}` }),
    ...style,
  }}>{children}</a>
)
const FeatureCard = ({ icon, title, desc }) => (
  <div style={{ background: '#fff', borderRadius: 16, padding: '24px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
    <div style={{ width: 44, height: 44, borderRadius: 12, background: PGB, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, marginBottom: 14 }}>{icon}</div>
    <p style={{ fontWeight: 600, fontSize: 15, marginBottom: 6, color: '#18182A' }}>{title}</p>
    <p style={{ fontSize: 13, color: '#6A6880', lineHeight: 1.7 }}>{desc}</p>
  </div>
)
const Step = ({ n, title, desc }) => (
  <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
    <div style={{ width: 36, height: 36, borderRadius: '50%', background: PG, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 16, flexShrink: 0 }}>{n}</div>
    <div>
      <p style={{ fontWeight: 600, fontSize: 15, marginBottom: 4, color: '#18182A' }}>{title}</p>
      <p style={{ fontSize: 13, color: '#6A6880', lineHeight: 1.7 }}>{desc}</p>
    </div>
  </div>
)
const Trust = ({ icon, title, desc }) => (
  <div style={{ textAlign: 'center', padding: '0 8px' }}>
    <div style={{ fontSize: 28, marginBottom: 8 }}>{icon}</div>
    <p style={{ fontWeight: 600, fontSize: 14, color: '#18182A', marginBottom: 4 }}>{title}</p>
    <p style={{ fontSize: 12, color: '#6A6880', lineHeight: 1.6 }}>{desc}</p>
  </div>
)

export default function LandingPage() {
  return (
    <div style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Hiragino Sans', sans-serif", background: OFF, color: '#18182A', minHeight: '100vh' }}>

      {/* ── Nav ── */}
      <nav style={{ background: 'rgba(248,246,242,0.9)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', borderBottom: `1px solid ${OFF2}`, padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100 }}>
        <a href="/lp" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none', color: '#18182A' }}>
          <span style={{ fontWeight: 700, fontSize: 17 }}>出席管理</span>
        </a>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <a href="/demo" style={{ fontSize: 13, color: PGD, textDecoration: 'none', fontWeight: 500 }}>デモ</a>
          <Btn href="/report?type=adopt" style={{ padding: '8px 18px', fontSize: 13, borderRadius: 8 }}>導入相談</Btn>
        </div>
      </nav>

      {/* ── Hero ── */}
      <Section style={{ padding: '80px 24px 64px', textAlign: 'center', background: `linear-gradient(180deg, ${OFF} 0%, #fff 100%)` }}>
        <Tag>大学サークル向け 無料ツール</Tag>
        <h1 style={{ fontSize: 32, fontWeight: 800, lineHeight: 1.25, letterSpacing: '-0.5px', marginBottom: 16, color: '#18182A' }}>
          サークルの出席管理を、<br />
          <span style={{ color: PG }}>もっとスマートに</span>
        </h1>
        <p style={{ fontSize: 15, color: '#6A6880', lineHeight: 1.8, marginBottom: 32, maxWidth: 360, margin: '0 auto 32px' }}>
          日程調整から出欠管理まで、スマホ一台で完結。<br />
          管理者は統計・ログで全体を把握。<br />
          完全無料・広告なし。
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
          <Btn href="/demo">体験してみる →</Btn>
          <Btn href="/report?type=adopt" variant="secondary">導入を相談する</Btn>
        </div>

        {/* App preview card */}
        <div style={{ marginTop: 48, background: '#fff', borderRadius: 20, boxShadow: '0 8px 40px rgba(0,77,64,0.12)', padding: 20, maxWidth: 340, margin: '48px auto 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, paddingBottom: 12, borderBottom: `1px solid ${OFF2}` }}>
            <span>⚽</span>
            <span style={{ fontWeight: 600, fontSize: 14 }}>○○サッカー部</span>
          </div>
          {[
            { name: 'あやか', icon: '○', label: '参加予定', color: '#0F6E56', bg: '#EDFAF4' },
            { name: 'みお',   icon: '△', label: '遅刻予定', color: '#8A5000', bg: '#FFF9EC' },
            { name: 'さくら', icon: '－', label: '未入力',   color: '#AAA8BC', bg: '#F5F2EC' },
          ].map(m => (
            <div key={m.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: PGB, color: PGD, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600 }}>{m.name[0]}</div>
                <span style={{ fontSize: 13, fontWeight: 500 }}>{m.name}</span>
              </div>
              <span style={{ fontSize: 12, padding: '3px 10px', borderRadius: 999, background: m.bg, color: m.color, fontWeight: 500 }}>{m.icon} {m.label}</span>
            </div>
          ))}
          <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${OFF2}`, display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#6A6880' }}>
            <span>実績出席率</span>
            <strong style={{ color: PG }}>87%</strong>
          </div>
        </div>
      </Section>

      {/* ── Schedule Polling (新機能ハイライト) ── */}
      <Section style={{ background: PGB }}>
        <div style={{ maxWidth: 480, margin: '0 auto' }}>
          <Tag>NEW</Tag>
          <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8, lineHeight: 1.3, color: PGD }}>
            日程調整から、そのまま出欠管理へ
          </h2>
          <p style={{ fontSize: 13, color: PGD, opacity: 0.85, lineHeight: 1.7, marginBottom: 20 }}>
            「調整さん」のように候補日を出して投票してもらい、決まったらワンタップでイベント化。投票の○/△/✕とコメントはそのまま出欠の事前入力に引き継がれます。
          </p>

          <div style={{ background: '#fff', borderRadius: 20, boxShadow: '0 8px 40px rgba(0,77,64,0.12)', padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, paddingBottom: 12, borderBottom: `1px solid ${OFF2}` }}>
              <span style={{ color: PG }}>📅</span>
              <span style={{ fontWeight: 600, fontSize: 14 }}>8月合宿の日程を決めよう</span>
            </div>
            {[
              { date: '8/20（木）', yes: 5, maybe: 1, no: 0, best: true },
              { date: '8/27（木）', yes: 3, maybe: 1, no: 2, best: false },
            ].map(c => (
              <div key={c.date} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', marginBottom: 8, background: c.best ? PGB : '#F8F6F2', borderRadius: 10, border: c.best ? `1.5px solid ${PG}` : '1px solid transparent' }}>
                <span style={{ fontSize: 13, fontWeight: 500 }}>{c.date}</span>
                <div style={{ display: 'flex', gap: 8, fontSize: 12 }}>
                  <span style={{ color: '#0F6E56' }}>○{c.yes}</span>
                  <span style={{ color: '#8A5000' }}>△{c.maybe}</span>
                  <span style={{ color: '#B91C1C' }}>✕{c.no}</span>
                </div>
              </div>
            ))}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, padding: '10px 12px', background: PGD, borderRadius: 10 }}>
              <i className="ti ti-arrow-down" style={{ color: PGB, fontSize: 14 }}></i>
              <span style={{ fontSize: 12, color: '#fff', fontWeight: 500 }}>8/20に決定 → イベント自動作成（投票内容を引き継ぎ済み）</span>
            </div>
          </div>
        </div>
      </Section>

      {/* ── Features ── */}
      <Section style={{ background: OFF }}>
        <div style={{ maxWidth: 480, margin: '0 auto' }}>
          <Tag>主な機能</Tag>
          <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 24, lineHeight: 1.3 }}>必要なものが、全部そろってる</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <FeatureCard icon="📱" title="URLで即アクセス" desc="メンバーはログイン不要。共有URLを開くだけで出欠入力できます" />
            <FeatureCard icon="📅" title="日程調整も一気通貫" desc="候補日への投票→決定→イベント化まで自動。投票内容は出欠にそのまま引き継がれます" />
            <FeatureCard icon="📊" title="出席率を自動計算" desc="実績・予測の2軸で把握。アラート閾値で要フォローのメンバーを即把握" />
            <FeatureCard icon="🏷️" title="タグ検索で絞り込み" desc="タグで練習・本番・ダンスを分類。メンバーが自分に関係するイベントだけ確認できます" />
            <FeatureCard icon="🔒" title="データはあなたのもの" desc="Google スプレッドシートに直接保存。第三者のサーバーは使いません" />
            <FeatureCard icon="👥" title="全員の参加状況を確認" desc="メンバーも他の参加者の出欠状況を確認可能。当日の参加人数がすぐわかります" />
            <FeatureCard icon="🎨" title="サークルカラーに統一" desc="8色のプリセット＋カラーコード直接入力。メンバー画面にも即反映" />
            <FeatureCard icon="🩺" title="データを自動で健全に保つ" desc="不整合やゴミデータを自動検出。ワンタップで修復できるので運営側も安心" />
          </div>
        </div>
      </Section>

      {/* ── How it works ── */}
      <Section style={{ background: '#fff' }}>
        <div style={{ maxWidth: 480, margin: '0 auto' }}>
          <Tag>導入の流れ</Tag>
          <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 32, lineHeight: 1.3 }}>3ステップで始められる</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
            <Step n="1" title="Googleアカウントでログイン" desc="管理者のGoogleアカウントでログイン。アプリのインストールは不要です。" />
            <div style={{ width: 1, height: 20, background: PGL, margin: '0 0 0 17px' }} />
            <Step n="2" title="スプレッドシートを設定" desc="Googleスプレッドシートを新規作成し、提供するコードを貼り付けてデプロイするだけ。データの保存先が完成します。" />
            <div style={{ width: 1, height: 20, background: PGL, margin: '0 0 0 17px' }} />
            <Step n="3" title="URLをメンバーに共有" desc="管理画面からメンバー用URLをコピーして共有。メンバーはそのURLを開くだけで出欠入力できます。" />
          </div>
        </div>
      </Section>

      {/* ── Trust ── */}
      <Section style={{ background: PGB }}>
        <div style={{ maxWidth: 480, margin: '0 auto' }}>
          <h2 style={{ fontSize: 22, fontWeight: 700, textAlign: 'center', marginBottom: 32, color: PGD }}>安心して使える理由</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
            <Trust icon="¥0" title="完全無料" desc="今後も無料で提供予定。隠れた課金なし" />
            <Trust icon="🚫" title="広告なし" desc="メンバーの画面に広告は一切表示されません" />
            <Trust icon="🔐" title="個人情報不要" desc="メンバーはログイン不要・名前だけで使えます" />
          </div>
        </div>
      </Section>

      {/* ── Testimonial / Use case ── */}
      <Section style={{ background: '#fff' }}>
        <div style={{ maxWidth: 480, margin: '0 auto' }}>
          <Tag>こんなサークルに</Tag>
          <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 24, lineHeight: 1.3 }}>大学のサークル活動にぴったり</h2>
          {[
            { icon: '⚽', label: 'サッカー・フットサル部', desc: '練習・試合の出欠確認、遠征メンバーの把握に' },
            { icon: '🎸', label: '軽音楽・吹奏楽サークル', desc: '練習出席率の管理、ライブ・本番のメンバー確認に' },
            { icon: '🎾', label: 'テニス・バドミントンサークル', desc: 'コート予約に合わせた参加人数の把握に' },
            { icon: '📚', label: '勉強会・ゼミ', desc: '定期活動の出席記録・単位確認の補助に' },
          ].map(u => (
            <div key={u.label} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 16, padding: 16, background: OFF, borderRadius: 12 }}>
              <span style={{ fontSize: 24 }}>{u.icon}</span>
              <div>
                <p style={{ fontWeight: 600, fontSize: 14, marginBottom: 2 }}>{u.label}</p>
                <p style={{ fontSize: 13, color: '#6A6880', lineHeight: 1.6 }}>{u.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* ── CTA ── */}
      <Section style={{ background: PGD, textAlign: 'center', padding: '72px 24px' }}>
        <h2 style={{ fontSize: 26, fontWeight: 800, color: '#fff', marginBottom: 12, lineHeight: 1.3 }}>まず、試してみてください</h2>
        <p style={{ fontSize: 14, color: PGB, lineHeight: 1.8, marginBottom: 32 }}>
          登録不要。架空のサークルで全機能を体験できます。
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
          <a href="/demo" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '13px 32px', borderRadius: 12, background: PG, color: '#fff', textDecoration: 'none', fontWeight: 600, fontSize: 15, boxShadow: '0 4px 20px rgba(0,137,123,0.4)' }}>体験版を触る →</a>
          <a href="/report?type=adopt" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '13px 32px', borderRadius: 12, background: 'transparent', color: PGB, border: `1.5px solid ${PGL}`, textDecoration: 'none', fontWeight: 500, fontSize: 14 }}>導入を相談する</a>
        </div>
      </Section>

      {/* ── Footer ── */}
      <footer style={{ background: '#18182A', padding: '32px 24px', textAlign: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 12 }}>
          <span style={{ color: '#fff', fontWeight: 600 }}>出席管理</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 20, marginBottom: 16 }}>
          {[['体験版', '/demo'], ['お問い合わせ', '/report'], ['バグ報告', '/report']].map(([l, h]) => (
            <a key={l} href={h} style={{ color: '#6A6880', fontSize: 12, textDecoration: 'none' }}>{l}</a>
          ))}
        </div>
        <p style={{ color: '#6A6880', fontSize: 11 }}>© 2026 出席管理 · 完全無料・広告なし</p>
        <p style={{ color: '#4A4860', fontSize: 10, marginTop: 6 }}>Produced by Nalu Furumi / CreativeTeam Lunar</p>
      </footer>
    </div>
  )
}
