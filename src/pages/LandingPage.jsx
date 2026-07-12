import { useEffect, useRef } from 'react'

// ── ランディングページ (/lp) ───────────────────────────────────────
// 「あてんど」= イベント調整アプリ のマーケティングLP。
// ピーコックグリーン × オフホワイト。スクロールリビール＋大胆なタイポ。
// モバイル縦・PC横 両対応（clamp / grid / media query）。

const CSS = `
:root {
  --pg: #00897B; --pg-d: #004D40; --pg-l: #4DB6AC; --pg-bg: #E0F2F1;
  --mint: #4DD0C4; --off: #F8F6F2; --off2: #EFECE6; --ink: #14202B;
  --muted: #5A6870;
}
* { box-sizing: border-box; }
.att-lp {
  font-family: -apple-system, BlinkMacSystemFont, 'Hiragino Sans', 'Noto Sans JP', sans-serif;
  background: var(--off); color: var(--ink);
  overflow-x: hidden; margin: 0;
}
.att-lp ::selection { background: var(--mint); color: var(--pg-d); }

/* ── Reveal on scroll ── */
.reveal { opacity: 0; transform: translateY(32px); transition: opacity .7s cubic-bezier(.2,.7,.2,1), transform .7s cubic-bezier(.2,.7,.2,1); }
.reveal.in { opacity: 1; transform: none; }
@media (prefers-reduced-motion: reduce) {
  .reveal { opacity: 1 !important; transform: none !important; transition: none; }
  .marquee-track { animation: none !important; }
}

/* ── Nav ── */
.nav {
  position: sticky; top: 0; z-index: 100;
  display: flex; align-items: center; justify-content: space-between;
  padding: 16px clamp(20px, 5vw, 64px);
  background: rgba(248,246,242,0.82); backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px);
  border-bottom: 1px solid var(--off2);
}
.nav-logo { display: flex; align-items: baseline; gap: 8px; text-decoration: none; color: var(--ink); }
.nav-logo b { font-size: 20px; font-weight: 800; letter-spacing: -0.02em; }
.nav-logo span { font-size: 11px; color: var(--muted); font-weight: 600; }
.nav-actions { display: flex; align-items: center; gap: clamp(10px, 2vw, 20px); }
.nav-link { font-size: 13px; color: var(--pg-d); text-decoration: none; font-weight: 600; }
.btn {
  display: inline-flex; align-items: center; justify-content: center; gap: 8px;
  font-weight: 700; text-decoration: none; border: none; cursor: pointer;
  border-radius: 999px; transition: transform .16s ease, box-shadow .16s ease, background .16s ease;
  font-family: inherit;
}
.btn-pri { background: var(--pg); color: #fff; padding: 13px 26px; font-size: 15px; box-shadow: 0 6px 20px rgba(0,137,123,0.28); }
.btn-pri:hover { transform: translateY(-2px); box-shadow: 0 10px 28px rgba(0,137,123,0.4); }
.btn-ghost { background: transparent; color: var(--pg-d); border: 1.5px solid var(--pg-l); padding: 11px 22px; font-size: 14px; }
.btn-ghost:hover { background: var(--pg-bg); }
.btn-sm { padding: 9px 18px; font-size: 13px; }

/* ── Hero ── */
.hero { position: relative; padding: clamp(48px, 9vw, 110px) clamp(20px, 5vw, 64px) clamp(40px, 6vw, 80px); text-align: center; }
.hero-eyebrow {
  display: inline-flex; align-items: center; gap: 7px; font-size: 12px; font-weight: 700;
  color: var(--pg-d); background: var(--pg-bg); padding: 6px 15px; border-radius: 999px; margin-bottom: 22px;
  letter-spacing: 0.02em;
}
.hero-eyebrow .dot { width: 7px; height: 7px; border-radius: 50%; background: var(--pg); animation: pulse 1.8s ease-in-out infinite; }
@keyframes pulse { 0%,100%{ opacity:.4; transform:scale(.8);} 50%{opacity:1; transform:scale(1.15);} }
.hero h1 {
  font-size: clamp(38px, 8.5vw, 92px); line-height: 0.98; font-weight: 900;
  letter-spacing: -0.03em; margin: 0 auto 22px; max-width: 14ch;
}
.hero h1 .accent {
  background: linear-gradient(105deg, var(--pg) 0%, var(--mint) 100%);
  -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent;
}
.hero p.sub { font-size: clamp(15px, 2.2vw, 20px); color: var(--muted); line-height: 1.7; max-width: 34ch; margin: 0 auto 34px; }
.hero-cta { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; }
.hero-note { margin-top: 18px; font-size: 12px; color: var(--muted); }

/* ── Marquee ── */
.marquee { margin: clamp(30px,5vw,56px) 0; border-top: 1px solid var(--off2); border-bottom: 1px solid var(--off2); padding: 18px 0; overflow: hidden; white-space: nowrap; }
.marquee-track { display: inline-block; animation: scrollx 26s linear infinite; }
.marquee-track span { font-size: clamp(20px,3vw,32px); font-weight: 800; color: var(--pg-d); opacity: .18; margin: 0 26px; letter-spacing: -0.02em; }
.marquee-track span .g { color: var(--pg); opacity: 1; }
@keyframes scrollx { from{ transform: translateX(0);} to{ transform: translateX(-50%);} }

/* ── Section shell ── */
.sec { padding: clamp(56px, 9vw, 120px) clamp(20px, 5vw, 64px); max-width: 1180px; margin: 0 auto; }
.sec-dark { background: var(--pg-d); color: #fff; max-width: none; }
.sec-dark .sec-inner { max-width: 1180px; margin: 0 auto; }
.eyebrow { font-size: 12px; font-weight: 800; letter-spacing: 0.14em; text-transform: uppercase; color: var(--pg); margin-bottom: 14px; }
.sec-dark .eyebrow { color: var(--mint); }
.sec h2 { font-size: clamp(28px, 5vw, 52px); font-weight: 900; letter-spacing: -0.03em; line-height: 1.05; margin: 0 0 18px; }
.sec .lead { font-size: clamp(15px, 2vw, 18px); color: var(--muted); line-height: 1.7; max-width: 52ch; }
.sec-dark .lead { color: rgba(255,255,255,0.8); }

/* ── Flow (3 steps big) ── */
.flow { display: grid; gap: clamp(16px, 2.5vw, 28px); grid-template-columns: 1fr; margin-top: clamp(32px,5vw,54px); }
@media (min-width: 760px) { .flow { grid-template-columns: repeat(3, 1fr); } }
.flow-card { background: #fff; border-radius: 22px; padding: clamp(22px,3vw,32px); box-shadow: 0 2px 20px rgba(20,32,43,0.05); border: 1px solid var(--off2); position: relative; overflow: hidden; }
.flow-card .num { font-family: 'SF Mono', ui-monospace, monospace; font-size: 13px; font-weight: 700; color: var(--pg); letter-spacing: 0.1em; }
.flow-card h3 { font-size: clamp(19px,2.4vw,23px); font-weight: 800; margin: 12px 0 8px; letter-spacing: -0.02em; }
.flow-card p { font-size: 14px; color: var(--muted); line-height: 1.7; margin: 0; }
.flow-card .ic { font-size: 30px; margin-bottom: 4px; display: block; }
.flow-card .arrow { position: absolute; right: -6px; top: 50%; font-size: 26px; color: var(--pg-l); display: none; }
@media (min-width: 760px) { .flow-card:not(:last-child) .arrow { display: block; } }

/* ── Feature rows (alternating) ── */
.frow { display: grid; grid-template-columns: 1fr; gap: clamp(24px,4vw,56px); align-items: center; margin-top: clamp(40px,6vw,80px); }
@media (min-width: 860px) { .frow { grid-template-columns: 1fr 1fr; } .frow.rev .fr-visual { order: 2; } }
.fr-text .tag { display: inline-block; font-size: 11px; font-weight: 800; letter-spacing: 0.08em; color: var(--pg); background: var(--pg-bg); padding: 4px 11px; border-radius: 999px; margin-bottom: 14px; text-transform: uppercase; }
.fr-text h3 { font-size: clamp(22px,3vw,32px); font-weight: 900; letter-spacing: -0.025em; line-height: 1.15; margin: 0 0 14px; }
.fr-text p { font-size: 15px; color: var(--muted); line-height: 1.75; margin: 0 0 16px; }
.fr-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 9px; }
.fr-list li { display: flex; gap: 9px; align-items: flex-start; font-size: 14px; color: var(--ink); line-height: 1.55; }
.fr-list li .ck { color: var(--pg); font-weight: 800; flex-shrink: 0; }

/* ── Mock UI card ── */
.mock { background: #fff; border-radius: 22px; box-shadow: 0 12px 44px rgba(0,77,64,0.13); padding: 18px; border: 1px solid var(--off2); }
.mock-bar { display: flex; align-items: center; gap: 8px; padding-bottom: 12px; border-bottom: 1px solid var(--off2); margin-bottom: 14px; }
.mock-bar .ttl { font-weight: 700; font-size: 14px; }
.mock-row { display: flex; align-items: center; justify-content: space-between; padding: 11px 13px; border-radius: 12px; margin-bottom: 8px; background: var(--off); font-size: 13px; }
.mock-row.best { background: var(--pg-bg); border: 1.5px solid var(--pg); }
.mock-row .votes { display: flex; gap: 9px; font-size: 12px; font-weight: 600; }
.mock-row .y { color: #0F6E56; } .mock-row .m { color: #8A5000; } .mock-row .n { color: #B91C1C; }
.mock-cta { display: flex; align-items: center; gap: 8px; margin-top: 10px; padding: 11px 13px; border-radius: 12px; background: var(--pg-d); color: #fff; font-size: 12px; font-weight: 600; }
.mock-person { display: flex; align-items: center; gap: 8px; padding: 9px 0; border-bottom: 1px solid var(--off2); }
.mock-av { width: 30px; height: 30px; border-radius: 50%; background: var(--pg-bg); color: var(--pg-d); display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 13px; flex-shrink: 0; }
.mock-badge { font-size: 10px; padding: 1px 8px; border-radius: 999px; background: var(--pg-bg); color: var(--pg-d); font-weight: 600; }
.mock-badge.g { background: var(--off2); color: var(--muted); }
.stat-bars { display: flex; align-items: flex-end; gap: 10px; height: 120px; padding: 8px 4px 0; }
.stat-bars .bar { flex: 1; background: linear-gradient(180deg, var(--pg-l), var(--pg)); border-radius: 6px 6px 0 0; position: relative; }
.stat-bars .bar span { position: absolute; top: -18px; left: 0; right: 0; text-align: center; font-size: 11px; font-weight: 700; color: var(--pg-d); }

/* ── Feature grid (all features) ── */
.fgrid { display: grid; grid-template-columns: 1fr; gap: 14px; margin-top: clamp(32px,5vw,52px); }
@media (min-width: 560px) { .fgrid { grid-template-columns: 1fr 1fr; } }
@media (min-width: 900px) { .fgrid { grid-template-columns: repeat(3, 1fr); } }
.fcard { background: #fff; border-radius: 18px; padding: 24px 22px; border: 1px solid var(--off2); transition: transform .2s ease, box-shadow .2s ease; }
.fcard:hover { transform: translateY(-4px); box-shadow: 0 12px 30px rgba(20,32,43,0.09); }
.fcard .ic { width: 46px; height: 46px; border-radius: 13px; background: var(--pg-bg); display: flex; align-items: center; justify-content: center; font-size: 23px; margin-bottom: 15px; }
.fcard h4 { font-size: 15.5px; font-weight: 800; margin: 0 0 7px; letter-spacing: -0.01em; }
.fcard p { font-size: 13px; color: var(--muted); line-height: 1.65; margin: 0; }

/* ── Use cases ── */
.uc-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-top: clamp(30px,5vw,48px); }
@media (min-width: 760px) { .uc-grid { grid-template-columns: repeat(4, 1fr); } }
.uc { background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.14); border-radius: 18px; padding: 24px 20px; }
.uc .ic { font-size: 30px; margin-bottom: 12px; }
.uc h4 { font-size: 15px; font-weight: 800; margin: 0 0 7px; color: #fff; }
.uc p { font-size: 12.5px; color: rgba(255,255,255,0.72); line-height: 1.6; margin: 0; }

/* ── Stats band ── */
.band { display: grid; grid-template-columns: repeat(2, 1fr); gap: clamp(20px,4vw,40px); margin-top: clamp(30px,5vw,48px); }
@media (min-width: 680px) { .band { grid-template-columns: repeat(4, 1fr); } }
.band-item { text-align: center; }
.band-item .big { font-size: clamp(34px,6vw,58px); font-weight: 900; letter-spacing: -0.03em; line-height: 1; background: linear-gradient(120deg, var(--pg), var(--mint)); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; }
.band-item .lbl { font-size: 12.5px; color: var(--muted); margin-top: 10px; font-weight: 600; }

/* ── FAQ ── */
.faq { margin-top: clamp(28px,4vw,44px); max-width: 760px; }
.faq details { border-bottom: 1px solid var(--off2); padding: 18px 0; }
.faq summary { font-size: 16px; font-weight: 700; cursor: pointer; list-style: none; display: flex; justify-content: space-between; align-items: center; gap: 12px; }
.faq summary::-webkit-details-marker { display: none; }
.faq summary::after { content: '+'; font-size: 22px; color: var(--pg); font-weight: 400; transition: transform .2s; }
.faq details[open] summary::after { transform: rotate(45deg); }
.faq p { font-size: 14px; color: var(--muted); line-height: 1.75; margin: 12px 0 0; }

/* ── Final CTA ── */
.final { text-align: center; padding: clamp(64px,10vw,130px) clamp(20px,5vw,64px); background: var(--pg-d); color: #fff; }
.final h2 { font-size: clamp(30px,6vw,60px); font-weight: 900; letter-spacing: -0.03em; line-height: 1.05; margin: 0 0 18px; }
.final p { font-size: clamp(15px,2vw,18px); color: rgba(255,255,255,0.82); margin: 0 0 30px; }
.final .btn-pri { background: #fff; color: var(--pg-d); box-shadow: 0 8px 30px rgba(0,0,0,0.25); }
.final .btn-ghost { color: #fff; border-color: rgba(255,255,255,0.4); }
.final .url { margin-top: 22px; font-size: 13px; color: rgba(255,255,255,0.6); font-family: ui-monospace, monospace; }

/* ── Footer ── */
.foot { background: var(--ink); color: rgba(255,255,255,0.7); padding: clamp(40px,6vw,64px) clamp(20px,5vw,64px); text-align: center; }
.foot .flogo { font-size: 18px; font-weight: 800; color: #fff; margin-bottom: 14px; }
.foot .links { display: flex; gap: 22px; justify-content: center; flex-wrap: wrap; margin-bottom: 18px; }
.foot .links a { color: rgba(255,255,255,0.7); font-size: 13px; text-decoration: none; }
.foot .links a:hover { color: #fff; }
.foot .cp { font-size: 12px; color: rgba(255,255,255,0.45); }
.foot .credit { font-size: 11px; color: rgba(255,255,255,0.35); margin-top: 8px; }
`

function useReveal() {
  const ref = useRef(null)
  useEffect(() => {
    const els = ref.current?.querySelectorAll('.reveal') || []
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target) } })
    }, { threshold: 0.12 })
    els.forEach(el => io.observe(el))
    return () => io.disconnect()
  }, [])
  return ref
}

export default function LandingPage() {
  const root = useReveal()
  return (
    <div className="att-lp" ref={root}>
      <style>{CSS}</style>

      {/* ── Nav ── */}
      <nav className="nav">
        <a href="/lp" className="nav-logo"><b>あてんど</b><span>attend</span></a>
        <div className="nav-actions">
          <a href="/demo" className="nav-link">体験デモ</a>
          <a href="/slides" className="nav-link">資料</a>
          <a href="/report?type=adopt" className="btn btn-pri btn-sm">導入相談</a>
        </div>
      </nav>

      {/* ── Hero ── */}
      <header className="hero">
        <span className="hero-eyebrow reveal"><span className="dot"></span>大学サークル向け・完全無料</span>
        <h1 className="reveal">日程調整から<br />出欠管理まで、<br /><span className="accent">ぜんぶここで。</span></h1>
        <p className="sub reveal">「いつやる？」の投票も、「誰が来る？」の確認も、当日の記録も。イベント調整アプリ「あてんど」なら、スマホ一台で完結します。</p>
        <div className="hero-cta reveal">
          <a href="/demo" className="btn btn-pri">デモを触ってみる →</a>
          <a href="/slides" className="btn btn-ghost">資料を見る</a>
        </div>
        <p className="hero-note reveal">ログイン不要でメンバーが使える・広告なし・個人情報の登録なし</p>
      </header>

      {/* ── Marquee ── */}
      <div className="marquee">
        <div className="marquee-track">
          <span>日程調整<span className="g"> ✦ </span></span><span>出欠管理<span className="g"> ✦ </span></span>
          <span>イベント記録<span className="g"> ✦ </span></span><span>出席率<span className="g"> ✦ </span></span>
          <span>メンバー管理<span className="g"> ✦ </span></span><span>ロール<span className="g"> ✦ </span></span>
          <span>日程調整<span className="g"> ✦ </span></span><span>出欠管理<span className="g"> ✦ </span></span>
          <span>イベント記録<span className="g"> ✦ </span></span><span>出席率<span className="g"> ✦ </span></span>
          <span>メンバー管理<span className="g"> ✦ </span></span><span>ロール<span className="g"> ✦ </span></span>
        </div>
      </div>

      {/* ── The Flow ── */}
      <section className="sec">
        <p className="eyebrow reveal">3ステップで完結</p>
        <h2 className="reveal">サークル運営の<br />「めんどう」を、ひとつに。</h2>
        <p className="lead reveal">バラバラのツールを行き来する必要はもうありません。あてんどは、イベントが決まる前から終わったあとまでを一本の流れでつなぎます。</p>
        <div className="flow">
          <div className="flow-card reveal">
            <span className="ic">🗓️</span>
            <div className="num">STEP 01</div>
            <h3>日程を決める</h3>
            <p>候補日を出してメンバーに投票してもらう。○△✕とコメントで、みんなの都合が一目でわかります。</p>
            <span className="arrow">→</span>
          </div>
          <div className="flow-card reveal">
            <span className="ic">✅</span>
            <div className="num">STEP 02</div>
            <h3>出欠を集める</h3>
            <p>決まった日程はワンタップでイベント化。投票内容がそのまま出欠に引き継がれるので、入力し直す手間はありません。</p>
            <span className="arrow">→</span>
          </div>
          <div className="flow-card reveal">
            <span className="ic">📈</span>
            <div className="num">STEP 03</div>
            <h3>記録する</h3>
            <p>当日の出欠実績や出席率を自動で集計。誰がどれだけ参加したかが、あとから振り返れる資産になります。</p>
          </div>
        </div>
      </section>

      {/* ── Feature 1: 日程調整 ── */}
      <section className="sec">
        <div className="frow">
          <div className="fr-text reveal">
            <span className="tag">日程調整</span>
            <h3>「いつなら来られる？」を、一発で。</h3>
            <p>候補日を並べて投票リンクを送るだけ。調整さんのように使えて、そのまま出欠管理につながるのがあてんどの強みです。</p>
            <ul className="fr-list">
              <li><span className="ck">✓</span>○（参加できる）／△（微妙）／✕（無理）の3択＋コメント</li>
              <li><span className="ck">✓</span>候補ごとの集計と、誰がどう答えたかが見える</li>
              <li><span className="ck">✓</span>「この日に決定」でイベントに自動変換</li>
            </ul>
          </div>
          <div className="fr-visual reveal">
            <div className="mock">
              <div className="mock-bar"><span>📅</span><span className="ttl">8月合宿の日程を決めよう</span></div>
              <div className="mock-row best"><span>8/20（木）</span><div className="votes"><span className="y">○5</span><span className="m">△1</span><span className="n">✕0</span></div></div>
              <div className="mock-row"><span>8/27（木）</span><div className="votes"><span className="y">○3</span><span className="m">△1</span><span className="n">✕2</span></div></div>
              <div className="mock-cta"><span>↓</span>8/20に決定 → イベントを自動作成</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Feature 2: 出欠管理 ── */}
      <section className="sec">
        <div className="frow rev">
          <div className="fr-text reveal">
            <span className="tag">出欠管理</span>
            <h3>誰が来るか、ひと目で。</h3>
            <p>メンバーは名前を選んで出欠を入れるだけ。ログインは要りません。参加予定と当日実績を分けて記録できます。</p>
            <ul className="fr-list">
              <li><span className="ck">✓</span>ログイン不要・URLを開くだけで入力</li>
              <li><span className="ck">✓</span>他のメンバーの参加状況も確認できる</li>
              <li><span className="ck">✓</span>欠席理由やコメントも残せる</li>
              <li><span className="ck">✓</span>タグでイベントを絞り込み</li>
            </ul>
          </div>
          <div className="fr-visual reveal">
            <div className="mock">
              <div className="mock-bar"><span>⚽</span><span className="ttl">全体練習（連携確認）</span></div>
              <div className="mock-person"><div className="mock-av">あ</div><span style={{flex:1,fontSize:'13px'}}>あやか</span><span className="mock-badge">参加</span></div>
              <div className="mock-person"><div className="mock-av">み</div><span style={{flex:1,fontSize:'13px'}}>みお</span><span className="mock-badge">参加</span></div>
              <div className="mock-person"><div className="mock-av">さ</div><span style={{flex:1,fontSize:'13px'}}>さくら</span><span className="mock-badge g">遅刻</span></div>
              <div className="mock-person" style={{borderBottom:'none'}}><div className="mock-av">ひ</div><span style={{flex:1,fontSize:'13px'}}>ひなた</span><span className="mock-badge g">欠席・バイト</span></div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Feature 3: 統計 ── */}
      <section className="sec">
        <div className="frow">
          <div className="fr-text reveal">
            <span className="tag">統計・記録</span>
            <h3>出席率で、運営が見える。</h3>
            <p>実績と予測、2つの出席率を自動で計算。参加が減っているメンバーには閾値アラートで気づけます。</p>
            <ul className="fr-list">
              <li><span className="ck">✓</span>実績出席率・予測出席率を自動集計</li>
              <li><span className="ck">✓</span>出席率が低いメンバーにアラート</li>
              <li><span className="ck">✓</span>変更ログで「誰がいつ何を」を全記録</li>
              <li><span className="ck">✓</span>CSV書き出しにも対応</li>
            </ul>
          </div>
          <div className="fr-visual reveal">
            <div className="mock">
              <div className="mock-bar"><span>📊</span><span className="ttl">メンバー別 出席率</span></div>
              <div className="stat-bars">
                <div className="bar" style={{height:'95%'}}><span>95%</span></div>
                <div className="bar" style={{height:'80%'}}><span>80%</span></div>
                <div className="bar" style={{height:'72%'}}><span>72%</span></div>
                <div className="bar" style={{height:'58%'}}><span>58%</span></div>
                <div className="bar" style={{height:'45%'}}><span>45%</span></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── All features grid ── */}
      <section className="sec">
        <p className="eyebrow reveal">できること</p>
        <h2 className="reveal">運営に必要なもの、ぜんぶ。</h2>
        <div className="fgrid">
          {[
            ['🗓️','日程調整','候補日への投票→決定→イベント化まで自動。投票内容は出欠に引き継ぎ'],
            ['📱','ログイン不要','メンバーは共有URLを開くだけ。アカウント登録は不要'],
            ['📊','出席率の自動計算','実績・予測の2軸。閾値アラートで要フォローの人を把握'],
            ['👥','メンバー管理','ロール（役職）・学年・管理者メモでメンバーを整理'],
            ['🏷️','タグで分類','練習・本番・班などタグで整理。メンバーは絞り込んで確認'],
            ['🙋','参加申請の承認','メンバーの登録申請を承認制に。編集して承認もできる'],
            ['📌','お知らせ','ピン留めのお知らせをメンバー画面の一番上に表示'],
            ['🎨','サークルカラー','テーマカラーを変えるとメンバー画面にも即反映'],
            ['🔒','データは自分のもの','各サークルのGoogleスプレッドシートに直接保存'],
          ].map(([ic,t,d]) => (
            <div className="fcard reveal" key={t}>
              <div className="ic">{ic}</div>
              <h4>{t}</h4>
              <p>{d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Use cases (dark) ── */}
      <section className="sec-dark">
        <div className="sec-inner">
          <p className="eyebrow reveal">こんなサークルに</p>
          <h2 className="reveal" style={{ color:'#fff' }}>部活でも、サークルでも。</h2>
          <div className="uc-grid">
            {[
              ['⚽','運動系の部活','練習・試合の出欠、遠征メンバーの把握に'],
              ['🎸','音楽・軽音サークル','練習出席率の管理、ライブ本番のメンバー確認に'],
              ['🎭','演劇・イベント系','リハの出欠、本番キャストの調整に'],
              ['📚','勉強会・ゼミ','定期活動の出席記録、参加傾向の把握に'],
            ].map(([ic,t,d]) => (
              <div className="uc reveal" key={t}>
                <div className="ic">{ic}</div>
                <h4>{t}</h4>
                <p>{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Stats band ── */}
      <section className="sec">
        <div className="band">
          <div className="band-item reveal"><div className="big">¥0</div><div className="lbl">完全無料で使える</div></div>
          <div className="band-item reveal"><div className="big">0秒</div><div className="lbl">メンバーの登録時間</div></div>
          <div className="band-item reveal"><div className="big">3→1</div><div className="lbl">調整・出欠・記録をひとつに</div></div>
          <div className="band-item reveal"><div className="big">100%</div><div className="lbl">データは自分たちで保有</div></div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="sec">
        <p className="eyebrow reveal">よくある質問</p>
        <h2 className="reveal">気になること、先に。</h2>
        <div className="faq reveal">
          <details><summary>本当に無料ですか？</summary><p>はい。現在は完全無料・広告なしで使えます。将来的に有料の追加機能を検討していますが、出欠管理の基本機能は無料で使い続けられるようにする予定です。</p></details>
          <details><summary>メンバーもアカウント登録が必要ですか？</summary><p>いいえ。メンバーは共有URLを開いて名前を選ぶだけで使えます。アカウント登録もログインも不要です。管理者だけがGoogleアカウントでログインします。</p></details>
          <details><summary>データはどこに保存されますか？</summary><p>各サークルが用意したGoogleスプレッドシートに直接保存されます。運営者がデータを完全に管理でき、第三者のサーバーには保存されません。</p></details>
          <details><summary>導入は大変ですか？</summary><p>Googleスプレッドシートとスクリプトを設定するだけで始められます。導入相談から丁寧にサポートするので、はじめてでも安心です。</p></details>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="final">
        <h2 className="reveal">まず、触ってみてください。</h2>
        <p className="reveal">説明を読むより、1分デモが早い。</p>
        <div className="hero-cta reveal">
          <a href="/demo" className="btn btn-pri">デモを触ってみる →</a>
          <a href="/report?type=adopt" className="btn btn-ghost">導入を相談する</a>
        </div>
        <p className="url reveal">circle-attendance-chi.vercel.app</p>
      </section>

      {/* ── Footer ── */}
      <footer className="foot">
        <div className="flogo">あてんど</div>
        <div className="links">
          <a href="/demo">体験デモ</a>
          <a href="/slides">紹介資料</a>
          <a href="/report">お問い合わせ</a>
          <a href="/report?type=bug">バグ報告</a>
        </div>
        <p className="cp">© 2026 あてんど · イベント調整アプリ · 完全無料・広告なし</p>
        <p className="credit">Produced by Nalu Furumi / CreativeTeam Lunar</p>
      </footer>
    </div>
  )
}
