import { useEffect, useRef } from 'react'

// ── ランディングページ (/lp) ───────────────────────────────────────
// 「あてんど」の"入口＆ロビー"。ファーストインプレッション重視。
// smooth.city 参照: 黒背景 × ビビッドなライム × 超極太の巨大タイポ。
// キャッチーに勢いで見せ、詳細はスライド(/slides)へ送る。
// モバイル〜デスクトップまで clamp / grid / minmax で流動対応。

const CSS = `
:root {
  --bg:#0B0F0E; --bg2:#121817; --ink:#EDF2EF; --dim:#8A9691;
  --lime:#B8F135; --lime-d:#9BD41E; --pg:#00C4A7; --card:#161D1B; --line:rgba(255,255,255,0.08);
}
* { box-sizing:border-box; }
.lp { background:var(--bg); color:var(--ink); margin:0; overflow-x:hidden;
  font-family:-apple-system,BlinkMacSystemFont,'Hiragino Sans','Noto Sans JP',sans-serif;
  -webkit-font-smoothing:antialiased; }
.lp ::selection { background:var(--lime); color:#0B0F0E; }
.lp a { text-decoration:none; }

/* reveal */
.rv { opacity:0; transform:translateY(38px); transition:opacity .8s cubic-bezier(.16,.8,.24,1), transform .8s cubic-bezier(.16,.8,.24,1); }
.rv.in { opacity:1; transform:none; }
@media (prefers-reduced-motion:reduce){ .rv{opacity:1!important;transform:none!important;transition:none} .mq-t{animation:none!important} }

/* container */
.wrap { width:100%; max-width:1200px; margin:0 auto; padding-left:clamp(20px,5vw,56px); padding-right:clamp(20px,5vw,56px); }

/* nav */
.nav { position:sticky; top:0; z-index:100; display:flex; align-items:center; justify-content:space-between;
  padding:16px clamp(20px,5vw,56px); background:rgba(11,15,14,.72); backdrop-filter:blur(16px); -webkit-backdrop-filter:blur(16px); border-bottom:1px solid var(--line); }
.logo { display:flex; align-items:baseline; gap:8px; color:var(--ink); }
.logo b { font-size:21px; font-weight:900; letter-spacing:-.03em; }
.logo i { font-size:11px; color:var(--lime); font-weight:700; font-style:normal; letter-spacing:.08em; }
.nav-r { display:flex; align-items:center; gap:clamp(10px,2vw,22px); }
.nav-r a.txt { color:var(--dim); font-size:13px; font-weight:600; }
.nav-r a.txt:hover { color:var(--ink); }
.pill { display:inline-flex; align-items:center; gap:7px; border-radius:999px; font-weight:800; cursor:pointer; border:none;
  font-family:inherit; transition:transform .16s ease, box-shadow .16s ease, background .16s; }
.pill-lime { background:var(--lime); color:#0B0F0E; padding:11px 22px; font-size:14px; }
.pill-lime:hover { transform:translateY(-2px); box-shadow:0 10px 30px rgba(184,241,53,.32); }
.pill-out { background:transparent; color:var(--ink); border:1.5px solid rgba(255,255,255,.22); padding:12px 24px; font-size:14px; }
.pill-out:hover { border-color:var(--lime); color:var(--lime); }
.pill-lg { padding:16px 34px; font-size:16px; }
.pill-sm { padding:9px 18px; font-size:13px; }

/* hero */
.hero { position:relative; padding:clamp(56px,10vw,120px) 0 clamp(40px,6vw,80px); }
.hero::before { content:''; position:absolute; top:-10%; left:50%; width:min(680px,90vw); height:min(680px,90vw); transform:translateX(-50%);
  background:radial-gradient(circle, rgba(184,241,53,.14) 0%, transparent 68%); pointer-events:none; }
.hero-in { position:relative; text-align:center; }
.eyb { display:inline-flex; align-items:center; gap:8px; font-size:12px; font-weight:800; color:var(--lime); background:rgba(184,241,53,.1);
  border:1px solid rgba(184,241,53,.25); padding:7px 16px; border-radius:999px; margin-bottom:26px; letter-spacing:.03em; }
.eyb .dot { width:7px; height:7px; border-radius:50%; background:var(--lime); animation:pl 1.8s ease-in-out infinite; }
@keyframes pl { 0%,100%{opacity:.35;transform:scale(.8)} 50%{opacity:1;transform:scale(1.2)} }
.hero h1 { font-size:clamp(44px,10vw,120px); font-weight:900; letter-spacing:-.04em; line-height:.92; margin:0 auto 26px; max-width:16ch; }
.hero h1 em { font-style:normal; color:var(--lime); }
.hero .sub { font-size:clamp(15px,2.3vw,21px); color:var(--dim); line-height:1.7; max-width:30ch; margin:0 auto 36px; }
.hero-cta { display:flex; gap:13px; justify-content:center; flex-wrap:wrap; }
.hero-note { margin-top:20px; font-size:12.5px; color:var(--dim); }

/* marquee */
.mq { margin:clamp(34px,6vw,64px) 0; border-top:1px solid var(--line); border-bottom:1px solid var(--line); padding:20px 0; overflow:hidden; white-space:nowrap; }
.mq-t { display:inline-block; animation:mv 24s linear infinite; }
.mq-t span { font-size:clamp(22px,4vw,40px); font-weight:900; letter-spacing:-.03em; margin:0 24px; color:var(--ink); opacity:.14; }
.mq-t span em { font-style:normal; color:var(--lime); opacity:1; }
@keyframes mv { from{transform:translateX(0)} to{transform:translateX(-50%)} }

/* section */
.sec { padding:clamp(60px,10vw,130px) 0; }
.tag { display:inline-block; font-size:12px; font-weight:800; letter-spacing:.14em; text-transform:uppercase; color:var(--lime); margin-bottom:16px; }
.sec h2 { font-size:clamp(30px,6vw,64px); font-weight:900; letter-spacing:-.035em; line-height:1.02; margin:0 0 20px; }
.sec .lead { font-size:clamp(15px,2vw,19px); color:var(--dim); line-height:1.7; max-width:46ch; }

/* big flow — 縦積みバグ対策: minmax で最低幅を保証・auto-fit で自動段組み */
.flow { display:grid; gap:clamp(14px,2vw,20px); margin-top:clamp(36px,5vw,56px);
  grid-template-columns:1fr; }
@media (min-width:720px){ .flow { grid-template-columns:repeat(3,minmax(0,1fr)); } }
.fcard { background:var(--card); border:1px solid var(--line); border-radius:24px; padding:clamp(24px,3vw,34px);
  position:relative; min-width:0; transition:transform .22s ease, border-color .22s ease; }
.fcard:hover { transform:translateY(-5px); border-color:rgba(184,241,53,.4); }
.fcard .ic { font-size:34px; line-height:1; }
.fcard .n { font-family:ui-monospace,'SF Mono',monospace; font-size:12px; font-weight:700; color:var(--lime); letter-spacing:.12em; margin-top:14px; }
.fcard h3 { font-size:clamp(20px,2.6vw,26px); font-weight:900; letter-spacing:-.02em; margin:10px 0 10px; word-break:normal; overflow-wrap:break-word; }
.fcard p { font-size:14px; color:var(--dim); line-height:1.75; margin:0; word-break:normal; overflow-wrap:break-word; }

/* split highlight */
.split { display:grid; grid-template-columns:1fr; gap:clamp(28px,4vw,60px); align-items:center; }
@media (min-width:880px){ .split { grid-template-columns:1.02fr .98fr; } .split.rev .sv { order:2; } }
.st .tag2 { display:inline-block; font-size:11px; font-weight:800; letter-spacing:.08em; text-transform:uppercase; color:#0B0F0E; background:var(--lime); padding:5px 12px; border-radius:999px; margin-bottom:16px; }
.st h3 { font-size:clamp(26px,4vw,44px); font-weight:900; letter-spacing:-.03em; line-height:1.08; margin:0 0 16px; }
.st p { font-size:clamp(14px,1.8vw,16px); color:var(--dim); line-height:1.75; margin:0 0 18px; max-width:40ch; }
.st ul { list-style:none; padding:0; margin:0; display:flex; flex-direction:column; gap:11px; }
.st li { display:flex; gap:10px; align-items:flex-start; font-size:clamp(13px,1.7vw,15.5px); line-height:1.5; }
.st li .ck { color:var(--lime); font-weight:900; flex-shrink:0; }

/* mock */
.mock { background:#fff; border-radius:22px; box-shadow:0 20px 60px rgba(0,0,0,.4); padding:18px; color:#14202B; }
.mbar { display:flex; align-items:center; gap:8px; padding-bottom:12px; border-bottom:1px solid #EFECE6; margin-bottom:13px; font-weight:800; font-size:14px; }
.mrow { display:flex; align-items:center; justify-content:space-between; padding:11px 13px; border-radius:12px; margin-bottom:8px; background:#F8F6F2; font-size:13px; font-weight:600; }
.mrow.best { background:#EFFCDD; border:1.5px solid var(--lime-d); }
.mrow .v { display:flex; gap:9px; font-size:12px; font-weight:800; }
.mrow .y{color:#4E8C00} .mrow .m{color:#8A5000} .mrow .n{color:#B91C1C}
.mcta { display:flex; gap:8px; align-items:center; margin-top:10px; padding:11px 13px; border-radius:12px; background:#0B0F0E; color:var(--lime); font-size:12px; font-weight:700; }
.mp { display:flex; align-items:center; gap:9px; padding:10px 0; border-bottom:1px solid #EFECE6; font-size:13px; font-weight:600; }
.mav { width:30px; height:30px; border-radius:50%; background:#EFFCDD; color:#4E8C00; display:flex; align-items:center; justify-content:center; font-weight:800; font-size:13px; flex-shrink:0; }
.mbadge { font-size:10px; padding:2px 9px; border-radius:999px; background:#EFFCDD; color:#4E8C00; font-weight:700; }
.mbadge.g { background:#EFECE6; color:#8A9691; }

/* stats band */
.band { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:clamp(16px,3vw,32px); margin-top:clamp(28px,4vw,44px); }
@media (min-width:720px){ .band { grid-template-columns:repeat(4,minmax(0,1fr)); } }
.bi { text-align:center; min-width:0; }
.bi .big { font-size:clamp(38px,7vw,72px); font-weight:900; letter-spacing:-.04em; line-height:1; color:var(--lime); }
.bi .lbl { font-size:12.5px; color:var(--dim); margin-top:12px; font-weight:600; line-height:1.5; }

/* final */
.final { text-align:center; padding:clamp(72px,11vw,150px) 0; position:relative; }
.final::before { content:''; position:absolute; top:0; left:50%; width:min(700px,90vw); height:100%; transform:translateX(-50%);
  background:radial-gradient(ellipse at center, rgba(184,241,53,.12) 0%, transparent 65%); pointer-events:none; }
.final-in { position:relative; }
.final h2 { font-size:clamp(34px,8vw,84px); font-weight:900; letter-spacing:-.04em; line-height:.98; margin:0 0 20px; }
.final h2 em { font-style:normal; color:var(--lime); }
.final p { font-size:clamp(15px,2vw,19px); color:var(--dim); margin:0 0 34px; }

/* footer */
.foot { border-top:1px solid var(--line); padding:clamp(40px,6vw,64px) 0; text-align:center; }
.foot .fl { font-size:19px; font-weight:900; letter-spacing:-.02em; margin-bottom:16px; }
.foot .fl em { font-style:normal; color:var(--lime); }
.foot .lk { display:flex; gap:24px; justify-content:center; flex-wrap:wrap; margin-bottom:20px; }
.foot .lk a { color:var(--dim); font-size:13px; font-weight:600; }
.foot .lk a:hover { color:var(--lime); }
.foot .cp { font-size:12px; color:var(--dim); opacity:.7; }
.foot .cr { font-size:11px; color:var(--dim); opacity:.5; margin-top:8px; }
`

function useReveal() {
  const ref = useRef(null)
  useEffect(() => {
    const els = ref.current?.querySelectorAll('.rv') || []
    const io = new IntersectionObserver((es) => {
      es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target) } })
    }, { threshold: 0.1 })
    els.forEach(el => io.observe(el))
    return () => io.disconnect()
  }, [])
  return ref
}

export default function LandingPage() {
  const root = useReveal()
  return (
    <div className="lp" ref={root}>
      <style>{CSS}</style>

      <nav className="nav">
        <a href="/lp" className="logo"><b>あてんど</b><i>attend</i></a>
        <div className="nav-r">
          <a href="/slides" className="txt">紹介資料</a>
          <a href="/demo" className="txt">デモ</a>
          <a href="/report?type=adopt" className="pill pill-lime pill-sm">導入相談</a>
        </div>
      </nav>

      {/* Hero */}
      <header className="hero">
        <div className="wrap hero-in">
          <span className="eyb rv"><span className="dot"></span>大学サークル向け・完全無料</span>
          <h1 className="rv">調整も出欠も、<br /><em>ぜんぶここで。</em></h1>
          <p className="sub rv">日程調整から出欠管理、記録まで。サークル運営がスマホ一台で完結するアプリ。</p>
          <div className="hero-cta rv">
            <a href="/demo" className="pill pill-lime pill-lg">デモを触ってみる →</a>
            <a href="/slides" className="pill pill-out pill-lg">くわしく見る</a>
          </div>
          <p className="hero-note rv">ログイン不要でメンバーが使える・広告なし・登録なし</p>
        </div>
      </header>

      {/* Marquee */}
      <div className="mq">
        <div className="mq-t">
          <span>日程調整<em> ／ </em></span><span>出欠管理<em> ／ </em></span><span>イベント記録<em> ／ </em></span><span>出席率<em> ／ </em></span><span>メンバー管理<em> ／ </em></span>
          <span>日程調整<em> ／ </em></span><span>出欠管理<em> ／ </em></span><span>イベント記録<em> ／ </em></span><span>出席率<em> ／ </em></span><span>メンバー管理<em> ／ </em></span>
        </div>
      </div>

      {/* Flow */}
      <section className="sec">
        <div className="wrap">
          <p className="tag rv">3ステップで完結</p>
          <h2 className="rv">運営の「めんどう」を、<br />ひとつに。</h2>
          <div className="flow">
            <div className="fcard rv">
              <span className="ic">🗓️</span>
              <div className="n">STEP 01</div>
              <h3>日程を決める</h3>
              <p>候補日を出して投票してもらう。みんなの都合が一目でわかります。</p>
            </div>
            <div className="fcard rv">
              <span className="ic">✅</span>
              <div className="n">STEP 02</div>
              <h3>出欠を集める</h3>
              <p>決まった日程はワンタップでイベント化。投票内容がそのまま引き継がれます。</p>
            </div>
            <div className="fcard rv">
              <span className="ic">📈</span>
              <div className="n">STEP 03</div>
              <h3>記録する</h3>
              <p>出欠実績や出席率を自動集計。あとから振り返れる資産になります。</p>
            </div>
          </div>
        </div>
      </section>

      {/* Split 1 */}
      <section className="sec">
        <div className="wrap">
          <div className="split">
            <div className="st rv">
              <span className="tag2">日程調整</span>
              <h3>「いつなら来られる？」を、一発で。</h3>
              <p>候補日を並べて投票リンクを送るだけ。そのまま出欠管理につながります。</p>
              <ul>
                <li><span className="ck">✓</span>○△✕＋コメントで気軽に回答</li>
                <li><span className="ck">✓</span>候補ごとの集計が一目でわかる</li>
                <li><span className="ck">✓</span>「この日に決定」で自動イベント化</li>
              </ul>
            </div>
            <div className="sv rv">
              <div className="mock">
                <div className="mbar"><span>📅</span>8月合宿の日程を決めよう</div>
                <div className="mrow best"><span>8/20（木）</span><div className="v"><span className="y">○5</span><span className="m">△1</span><span className="n">✕0</span></div></div>
                <div className="mrow"><span>8/27（木）</span><div className="v"><span className="y">○3</span><span className="m">△1</span><span className="n">✕2</span></div></div>
                <div className="mcta"><span>↓</span>8/20に決定 → イベント自動作成</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Split 2 */}
      <section className="sec">
        <div className="wrap">
          <div className="split rev">
            <div className="st rv">
              <span className="tag2">出欠管理</span>
              <h3>誰が来るか、ひと目で。</h3>
              <p>メンバーは名前を選んで出欠を入れるだけ。ログインは要りません。</p>
              <ul>
                <li><span className="ck">✓</span>ログイン不要・URLを開くだけ</li>
                <li><span className="ck">✓</span>他のメンバーの参加状況も見える</li>
                <li><span className="ck">✓</span>欠席理由やコメントも残せる</li>
              </ul>
            </div>
            <div className="sv rv">
              <div className="mock">
                <div className="mbar"><span>⚽</span>全体練習（連携確認）</div>
                <div className="mp"><div className="mav">あ</div><span style={{flex:1}}>あやか</span><span className="mbadge">参加</span></div>
                <div className="mp"><div className="mav">み</div><span style={{flex:1}}>みお</span><span className="mbadge">参加</span></div>
                <div className="mp"><div className="mav">さ</div><span style={{flex:1}}>さくら</span><span className="mbadge g">遅刻</span></div>
                <div className="mp" style={{borderBottom:'none'}}><div className="mav">ひ</div><span style={{flex:1}}>ひなた</span><span className="mbadge g">欠席・バイト</span></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats band */}
      <section className="sec">
        <div className="wrap">
          <div className="band">
            <div className="bi rv"><div className="big">¥0</div><div className="lbl">完全無料で使える</div></div>
            <div className="bi rv"><div className="big">0秒</div><div className="lbl">メンバーの登録時間</div></div>
            <div className="bi rv"><div className="big">3→1</div><div className="lbl">調整・出欠・記録をひとつに</div></div>
            <div className="bi rv"><div className="big">100%</div><div className="lbl">データは自分たちで保有</div></div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="final">
        <div className="wrap final-in">
          <h2 className="rv">まず、<em>触ってみて。</em></h2>
          <p className="rv">説明を読むより、1分デモが早い。もっと知りたくなったら紹介資料へ。</p>
          <div className="hero-cta rv">
            <a href="/demo" className="pill pill-lime pill-lg">デモを触ってみる →</a>
            <a href="/slides" className="pill pill-out pill-lg">紹介資料を見る</a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="foot">
        <div className="wrap">
          <div className="fl">あてんど<em>.</em></div>
          <div className="lk">
            <a href="/demo">体験デモ</a>
            <a href="/slides">紹介資料</a>
            <a href="/report">お問い合わせ</a>
            <a href="/report?type=bug">バグ報告</a>
          </div>
          <p className="cp">© 2026 あてんど · イベント調整アプリ · 完全無料・広告なし</p>
          <p className="cr">Produced by Nalu Furumi / CreativeTeam Lunar</p>
        </div>
      </footer>
    </div>
  )
}
