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
          <span style={{ color: PG, fontSize: 20 }}>✧</span>
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
          メンバー全員がスマホ一台で出欠入力。<br />
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
            <span style={{ color: PG }}>✧</span>
            <span style={{ fontWeight: 600, fontSize: 14 }}>○○コピーダンスサークル</span>
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

      {/* ── Features ── */}
      <Section style={{ background: OFF }}>
        <div style={{ maxWidth: 480, margin: '0 auto' }}>
          <Tag>主な機能</Tag>
          <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 24, lineHeight: 1.3 }}>必要なものが、全部そろってる</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <FeatureCard icon="📱" title="URLで即アクセス" desc="メンバーはログイン不要。共有URLを開くだけで出欠入力できます" />
            <FeatureCard icon="📊" title="出席率を自動計算" desc="実績・予測の2軸で把握。閾値アラートで見落としゼロ" />
            <FeatureCard icon="🏷️" title="タグで整理" desc="練習・本番・ダンスなどタグで絞り込み。大人数でも迷わない" />
            <FeatureCard icon="🔒" title="データはあなたのもの" desc="Google スプレッドシートに直接保存。第三者のサーバーは使いません" />
            <FeatureCard icon="📝" title="変更ログで透明性" desc="誰がいつ何を変えたか全記録。管理者・メンバー両方の操作を追跡" />
            <FeatureCard icon="🎨" title="テーマカラー自由" desc="サークルカラーに合わせて変更可。メンバー画面にも即反映" />
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
            { icon: '🎵', label: 'コピーダンスサークル', desc: 'イベントごとの参加メンバー把握・本番出演調整に' },
            { icon: '🎭', label: '演劇・バンドサークル', desc: '練習出席率の管理・本番キャスト確認に' },
            { icon: '⚽', label: 'スポーツサークル', desc: '大会・練習の出欠確認、コート手配の人数把握に' },
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
        <span style={{ fontSize: 28, marginBottom: 16, display: 'block' }}>✧</span>
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
          <span style={{ color: PG, fontSize: 18 }}>✧</span>
          <span style={{ color: '#fff', fontWeight: 600 }}>出席管理</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 20, marginBottom: 16 }}>
          {[['体験版', '/demo'], ['お問い合わせ', '/report'], ['バグ報告', '/report']].map(([l, h]) => (
            <a key={l} href={h} style={{ color: '#6A6880', fontSize: 12, textDecoration: 'none' }}>{l}</a>
          ))}
        </div>
        <p style={{ color: '#6A6880', fontSize: 11 }}>© 2026 出席管理 · Made with ✧ · 完全無料・広告なし</p>
      </footer>
    </div>
  )
}
