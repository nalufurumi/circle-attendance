import { useEffect, useRef } from 'react'

// ── ランディングページ (/lp) ───────────────────────────────────────
// 「あてんど」の"入口＆ロビー"。ブランドカラー=ピーコックグリーン(#00897B)。
// PCワイド〜モバイルまで完全対応:
//   - コンテンツ幅は広め(max 1240)＋左右余白は vw 連動
//   - 横並びレイアウトは狭くなると縦積みに切替(auto-fit / breakpoint)
//   - タイポは clamp で流動

const CSS = `
:root {
  --pg:#00897B; --pg-d:#004D40; --pg-l:#4DB6AC; --pg-bg:#E0F2F1; --pg-mint:#B2DFDB;
  --off:#F8F6F2; --off2:#ECE8E1; --ink:#14202B; --muted:#5A6870; --line:#E4E0D8;
}
* { box-sizing:border-box; }
.lp { background:var(--off); color:var(--ink); margin:0; overflow-x:hidden;
  font-family:-apple-system,BlinkMacSystemFont,'Hiragino Sans','Noto Sans JP',sans-serif; -webkit-font-smoothing:antialiased; }
.lp ::selection { background:var(--pg); color:#fff; }
.lp a { text-decoration:none; }

.rv { opacity:0; transform:translateY(34px); transition:opacity .75s cubic-bezier(.16,.8,.24,1), transform .75s cubic-bezier(.16,.8,.24,1); }
.rv.in { opacity:1; transform:none; }
@media (prefers-reduced-motion:reduce){ .rv{opacity:1!important;transform:none!important;transition:none} .mq-t{animation:none!important} }

/* container: PCで広く使う。左右余白は画面幅連動 */
.wrap { width:100%; max-width:1240px; margin:0 auto; padding-left:clamp(20px,5vw,72px); padding-right:clamp(20px,5vw,72px); }

/* nav */
.nav { position:sticky; top:0; z-index:100; display:flex; align-items:center; justify-content:space-between;
  padding:15px clamp(20px,5vw,72px); background:rgba(248,246,242,.82); backdrop-filter:blur(14px); -webkit-backdrop-filter:blur(14px); border-bottom:1px solid var(--line); }
.logo { display:flex; align-items:baseline; gap:8px; color:var(--ink); }
.logo b { font-size:21px; font-weight:900; letter-spacing:-.03em; }
.logo i { font-size:11px; color:var(--pg); font-weight:800; font-style:normal; letter-spacing:.08em; }
.nav-r { display:flex; align-items:center; gap:clamp(10px,2vw,22px); }
.nav-r a.txt { color:var(--muted); font-size:13px; font-weight:600; }
.nav-r a.txt:hover { color:var(--pg-d); }
.pill { display:inline-flex; align-items:center; justify-content:center; gap:7px; border-radius:999px; font-weight:800; cursor:pointer; border:none; font-family:inherit; transition:transform .16s ease, box-shadow .16s ease, background .16s, color .16s; }
.pill-main { background:var(--pg); color:#fff; padding:12px 24px; font-size:14px; box-shadow:0 6px 20px rgba(0,137,123,.26); }
.pill-main:hover { transform:translateY(-2px); box-shadow:0 10px 28px rgba(0,137,123,.38); }
.pill-out { background:transparent; color:var(--pg-d); border:1.5px solid var(--pg-l); padding:12px 24px; font-size:14px; }
.pill-out:hover { background:var(--pg-bg); }
.pill-lg { padding:16px 34px; font-size:16px; }
.pill-sm { padding:9px 18px; font-size:13px; }

/* hero — PCでは2カラム(コピー+ビジュアル)、狭いと縦積み */
.hero { position:relative; padding:clamp(48px,7vw,96px) 0 clamp(40px,6vw,72px); }
.hero-grid { display:grid; grid-template-columns:1fr; gap:clamp(32px,5vw,64px); align-items:center; }
@media (min-width:900px){ .hero-grid { grid-template-columns:1.05fr .95fr; } }
.hero-copy { text-align:center; }
@media (min-width:900px){ .hero-copy { text-align:left; } }
.eyb { display:inline-flex; align-items:center; gap:8px; font-size:12px; font-weight:800; color:var(--pg-d); background:var(--pg-bg); border:1px solid rgba(0,137,123,.2); padding:7px 15px; border-radius:999px; margin-bottom:24px; letter-spacing:.02em; }
.eyb .dot { width:7px; height:7px; border-radius:50%; background:var(--pg); animation:pl 1.8s ease-in-out infinite; }
@keyframes pl { 0%,100%{opacity:.35;transform:scale(.8)} 50%{opacity:1;transform:scale(1.2)} }
.hero h1 { font-size:clamp(38px,6.4vw,80px); font-weight:900; letter-spacing:-.035em; line-height:1.02; margin:0 0 22px; }
.hero h1 em { font-style:normal; color:var(--pg); }
.hero .sub { font-size:clamp(15px,1.9vw,20px); color:var(--muted); line-height:1.7; max-width:30ch; margin:0 0 32px; }
.hero-copy.c-center .sub { margin-left:auto; margin-right:auto; }
.hero-cta { display:flex; gap:12px; flex-wrap:wrap; justify-content:center; }
@media (min-width:900px){ .hero-cta { justify-content:flex-start; } }
.hero-note { margin-top:18px; font-size:12.5px; color:var(--muted); }
/* hero visual: phone-ish mock */
.hero-vis { display:flex; justify-content:center; }
.hero-card { background:#fff; border-radius:26px; box-shadow:0 24px 70px rgba(0,77,64,.16); padding:20px; width:100%; max-width:380px; border:1px solid var(--off2); }

/* generic mock parts */
.mbar { display:flex; align-items:center; gap:8px; padding-bottom:12px; border-bottom:1px solid var(--off2); margin-bottom:13px; font-weight:800; font-size:14px; }
.mrow { display:flex; align-items:center; justify-content:space-between; padding:11px 13px; border-radius:12px; margin-bottom:8px; background:var(--off); font-size:13px; font-weight:600; }
.mrow.best { background:var(--pg-bg); border:1.5px solid var(--pg); }
.mrow .v { display:flex; gap:9px; font-size:12px; font-weight:800; }
.mrow .y{color:#0F6E56} .mrow .m{color:#8A5000} .mrow .n{color:#B91C1C}
.mcta { display:flex; gap:8px; align-items:center; margin-top:10px; padding:11px 13px; border-radius:12px; background:var(--pg-d); color:#fff; font-size:12px; font-weight:700; }
.mp { display:flex; align-items:center; gap:9px; padding:10px 0; border-bottom:1px solid var(--off2); font-size:13px; font-weight:600; }
.mav { width:30px; height:30px; border-radius:50%; background:var(--pg-bg); color:var(--pg-d); display:flex; align-items:center; justify-content:center; font-weight:800; font-size:13px; flex-shrink:0; }
.mbadge { font-size:10px; padding:2px 9px; border-radius:999px; background:var(--pg-bg); color:var(--pg-d); font-weight:700; }
.mbadge.g { background:var(--off2); color:var(--muted); }

/* marquee */
.mq { margin:clamp(24px,4vw,48px) 0; border-top:1px solid var(--line); border-bottom:1px solid var(--line); padding:18px 0; overflow:hidden; white-space:nowrap; }
.mq-t { display:inline-block; animation:mv 26s linear infinite; }
.mq-t span { font-size:clamp(20px,3.4vw,34px); font-weight:900; letter-spacing:-.03em; margin:0 22px; color:var(--pg-d); opacity:.16; }
.mq-t span em { font-style:normal; color:var(--pg); opacity:1; }
@keyframes mv { from{transform:translateX(0)} to{transform:translateX(-50%)} }

/* section */
.sec { padding:clamp(52px,8vw,110px) 0; }
.sec-head { max-width:640px; }
.tag { display:inline-block; font-size:12px; font-weight:800; letter-spacing:.14em; text-transform:uppercase; color:var(--pg); margin-bottom:14px; }
.sec h2 { font-size:clamp(28px,4.6vw,52px); font-weight:900; letter-spacing:-.03em; line-height:1.06; margin:0 0 18px; }
.sec .lead { font-size:clamp(15px,1.8vw,18px); color:var(--muted); line-height:1.7; max-width:48ch; }

/* STEP flow: auto-fit で狭くなったら自動で縦積み。最小280pxを保証 */
.flow { display:grid; gap:clamp(14px,2vw,22px); margin-top:clamp(32px,5vw,52px);
  grid-template-columns:repeat(auto-fit, minmax(280px, 1fr)); }
.fcard { background:#fff; border:1px solid var(--off2); border-radius:22px; padding:clamp(24px,3vw,34px); min-width:0;
  transition:transform .22s ease, box-shadow .22s ease; }
.fcard:hover { transform:translateY(-5px); box-shadow:0 16px 40px rgba(20,32,43,.09); }
.fcard .ic { font-size:32px; line-height:1; }
.fcard .n { font-family:ui-monospace,'SF Mono',monospace; font-size:12px; font-weight:700; color:var(--pg); letter-spacing:.12em; margin-top:14px; }
.fcard h3 { font-size:clamp(19px,2.2vw,24px); font-weight:900; letter-spacing:-.02em; margin:9px 0 9px; overflow-wrap:break-word; }
.fcard p { font-size:14px; color:var(--muted); line-height:1.75; margin:0; overflow-wrap:break-word; }

/* split: PCで2カラム、狭いと縦積み。ビジュアルはスマホで下 */
.split { display:grid; grid-template-columns:1fr; gap:clamp(28px,4vw,64px); align-items:center; }
@media (min-width:860px){ .split { grid-template-columns:1fr 1fr; } .split.rev .sv { order:2; } }
.st .tag2 { display:inline-block; font-size:11px; font-weight:800; letter-spacing:.08em; text-transform:uppercase; color:#fff; background:var(--pg); padding:5px 12px; border-radius:999px; margin-bottom:16px; }
.st h3 { font-size:clamp(24px,3.4vw,40px); font-weight:900; letter-spacing:-.03em; line-height:1.12; margin:0 0 16px; }
.st p { font-size:clamp(14px,1.7vw,16px); color:var(--muted); line-height:1.75; margin:0 0 18px; max-width:42ch; }
.st ul { list-style:none; padding:0; margin:0; display:flex; flex-direction:column; gap:11px; }
.st li { display:flex; gap:10px; align-items:flex-start; font-size:clamp(13px,1.6vw,15.5px); line-height:1.5; }
.st li .ck { color:var(--pg); font-weight:900; flex-shrink:0; }
.mock { background:#fff; border-radius:22px; box-shadow:0 16px 48px rgba(0,77,64,.13); padding:18px; border:1px solid var(--off2); }

/* stats band: auto-fit */
.band { display:grid; gap:clamp(16px,3vw,32px); margin-top:clamp(28px,4vw,44px);
  grid-template-columns:repeat(auto-fit, minmax(150px, 1fr)); }
.bi { text-align:center; min-width:0; }
.bi .big { font-size:clamp(34px,5vw,64px); font-weight:900; letter-spacing:-.03em; line-height:1;
  background:linear-gradient(120deg,var(--pg),var(--pg-l)); -webkit-background-clip:text; background-clip:text; -webkit-text-fill-color:transparent; }
.bi .lbl { font-size:12.5px; color:var(--muted); margin-top:11px; font-weight:600; line-height:1.5; }

/* ── Lunar section (dark, brand) ── */
.lunar { background:var(--pg-d); color:#fff; position:relative; overflow:hidden; }
.lunar::before { content:''; position:absolute; top:-30%; right:-10%; width:min(560px,70vw); height:min(560px,70vw); border-radius:50%;
  background:radial-gradient(circle at 30% 30%, rgba(178,223,219,.22), transparent 62%); pointer-events:none; }
.lunar-in { position:relative; }
.lunar .moon { font-size:34px; margin-bottom:18px; }
.lunar .ltag { font-size:12px; font-weight:800; letter-spacing:.2em; text-transform:uppercase; color:var(--pg-mint); margin-bottom:14px; }
.lunar h2 { font-size:clamp(30px,5.4vw,58px); font-weight:900; letter-spacing:-.03em; line-height:1.05; margin:0 0 8px; }
.lunar .catch { font-size:clamp(14px,2vw,18px); color:var(--pg-mint); font-weight:700; margin:0 0 22px; letter-spacing:.01em; }
.lunar .who { font-size:13px; font-weight:700; color:rgba(255,255,255,.7); margin:0 0 18px; }
.lunar .poetry { font-size:clamp(15px,2vw,20px); line-height:1.85; color:#fff; max-width:34ch; margin:0 0 40px; font-weight:500; }
.lunar .poetry em { font-style:normal; color:var(--pg-mint); }
.lmvv { display:grid; grid-template-columns:1fr; gap:14px; margin:0 0 40px; }
@media (min-width:760px){ .lmvv { grid-template-columns:repeat(3,1fr); } }
.lmvv .m { background:rgba(255,255,255,.06); border:1px solid rgba(255,255,255,.12); border-radius:18px; padding:22px; }
.lmvv .m .k { font-size:12px; font-weight:800; letter-spacing:.1em; color:var(--pg-mint); text-transform:uppercase; margin-bottom:9px; }
.lmvv .m .val { font-size:14px; line-height:1.7; color:rgba(255,255,255,.92); }
.lprod { display:grid; grid-template-columns:1fr; gap:20px; align-items:start; padding-top:34px; border-top:1px solid rgba(255,255,255,.14); }
@media (min-width:760px){ .lprod { grid-template-columns:1fr 1fr; } }
.lprod .blk .bk { font-size:12px; font-weight:800; letter-spacing:.1em; color:var(--pg-mint); text-transform:uppercase; margin-bottom:12px; }
.lprod .now { font-size:16px; font-weight:800; margin:0 0 6px; }
.lprod .now span { font-size:13px; font-weight:600; color:rgba(255,255,255,.7); }
.lprod .soon { font-size:14px; color:rgba(255,255,255,.82); line-height:1.7; margin:0; }
.lprod .soon b { color:#fff; font-weight:700; }
.lcontact { margin-top:36px; font-size:14px; color:rgba(255,255,255,.75); }
.lcontact a { color:var(--pg-mint); font-weight:700; }

/* final */
.final { text-align:center; padding:clamp(64px,10vw,130px) 0; background:var(--pg-bg); }
.final h2 { font-size:clamp(32px,6vw,66px); font-weight:900; letter-spacing:-.035em; line-height:1.02; margin:0 0 18px; color:var(--pg-d); }
.final h2 em { font-style:normal; color:var(--pg); }
.final p { font-size:clamp(15px,1.9vw,19px); color:var(--pg-d); opacity:.8; margin:0 0 32px; }
.final .hero-cta { justify-content:center; }

/* footer */
.foot { background:var(--ink); color:rgba(255,255,255,.7); padding:clamp(40px,6vw,64px) 0; text-align:center; }
.foot .fl { font-size:19px; font-weight:900; letter-spacing:-.02em; margin-bottom:6px; color:#fff; }
.foot .fl em { font-style:normal; color:var(--pg-l); }
.foot .fby { font-size:12px; color:rgba(255,255,255,.55); margin-bottom:18px; }
.foot .lk { display:flex; gap:24px; justify-content:center; flex-wrap:wrap; margin-bottom:18px; }
.foot .lk a { color:rgba(255,255,255,.7); font-size:13px; font-weight:600; }
.foot .lk a:hover { color:var(--pg-l); }
.foot .cp { font-size:12px; color:rgba(255,255,255,.45); }
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
          <a href="/report?type=adopt" className="pill pill-main pill-sm">導入相談</a>
        </div>
      </nav>

      {/* Hero */}
      <header className="hero">
        <div className="wrap">
          <div className="hero-grid">
            <div className="hero-copy c-center">
              <span className="eyb rv"><span className="dot"></span>大学サークル向け・完全無料</span>
              <h1 className="rv">調整も出欠も、<br /><em>ぜんぶここで。</em></h1>
              <p className="sub rv">日程調整から出欠管理、記録まで。サークル運営がスマホ一台で完結するアプリ。</p>
              <div className="hero-cta rv">
                <a href="/demo" className="pill pill-main pill-lg">デモを触ってみる →</a>
                <a href="/slides" className="pill pill-out pill-lg">くわしく見る</a>
              </div>
              <p className="hero-note rv">ログイン不要でメンバーが使える・広告なし・登録なし</p>
            </div>
            <div className="hero-vis rv">
              <div className="hero-card">
                <div className="mbar"><span>📅</span>8月合宿の日程を決めよう</div>
                <div className="mrow best"><span>8/20（木）</span><div className="v"><span className="y">○5</span><span className="m">△1</span><span className="n">✕0</span></div></div>
                <div className="mrow"><span>8/27（木）</span><div className="v"><span className="y">○3</span><span className="m">△1</span><span className="n">✕2</span></div></div>
                <div className="mcta"><span>↓</span>8/20に決定 → イベント自動作成</div>
              </div>
            </div>
          </div>
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
          <div className="sec-head">
            <p className="tag rv">3ステップで完結</p>
            <h2 className="rv">運営の「めんどう」を、ひとつに。</h2>
          </div>
          <div className="flow">
            <div className="fcard rv"><span className="ic">🗓️</span><div className="n">STEP 01</div><h3>日程を決める</h3><p>候補日を出して投票してもらう。みんなの都合が一目でわかります。</p></div>
            <div className="fcard rv"><span className="ic">✅</span><div className="n">STEP 02</div><h3>出欠を集める</h3><p>決まった日程はワンタップでイベント化。投票内容がそのまま引き継がれます。</p></div>
            <div className="fcard rv"><span className="ic">📈</span><div className="n">STEP 03</div><h3>記録する</h3><p>出欠実績や出席率を自動集計。あとから振り返れる資産になります。</p></div>
          </div>
        </div>
      </section>

      {/* Split 1 */}
      <section className="sec" style={{ background:'#fff', borderTop:'1px solid var(--line)', borderBottom:'1px solid var(--line)' }}>
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
      <section className="sec" style={{ background:'#fff', borderTop:'1px solid var(--line)' }}>
        <div className="wrap">
          <div className="band">
            <div className="bi rv"><div className="big">¥0</div><div className="lbl">完全無料で使える</div></div>
            <div className="bi rv"><div className="big">0秒</div><div className="lbl">メンバーの登録時間</div></div>
            <div className="bi rv"><div className="big">3→1</div><div className="lbl">調整・出欠・記録をひとつに</div></div>
            <div className="bi rv"><div className="big">100%</div><div className="lbl">データは自分たちで保有</div></div>
          </div>
        </div>
      </section>

      {/* ── Lunar ── */}
      <section className="lunar">
        <div className="sec">
          <div className="wrap lunar-in">
            <div className="moon rv">🌙</div>
            <p className="ltag rv">Creative Team</p>
            <h2 className="rv">Lunar</h2>
            <p className="catch rv">— 新しいスタンダードを手のなかに —</p>
            <p className="who rv">ICU生によって創設されたクリエイティブチーム</p>
            <p className="poetry rv">月が太陽の光を反射して地球を照らすように、テクノロジーを使い、アイデアをプロダクトに昇華し、ICU生に <em>"ワクワク"</em> を届ける。</p>

            <div className="lmvv">
              <div className="m rv"><div className="k">Mission</div><div className="val">ICUをアカデメイアする。真の批判的思考で、新しいシステムを。</div></div>
              <div className="m rv"><div className="k">Vision</div><div className="val">ICUを、効率化されたクリエイティブな環境にする。</div></div>
              <div className="m rv"><div className="k">Values</div><div className="val">イノベイティブであれ／環境を最適化する／前提を疑う／自分たちが使いたいものを／遊び心を忘れない</div></div>
            </div>

            <div className="lprod rv">
              <div className="blk">
                <div className="bk">Product</div>
                <p className="now">イベント調整アプリ「あてんど」<br /><span>= いま、あなたが見ているこのアプリ</span></p>
              </div>
              <div className="blk">
                <div className="bk">構想中</div>
                <p className="soon"><b>履修サポート ／ 飲食店マップ ／ インターンマッチング…</b><br />その他にも、ICU・三鷹武蔵境エリアの学生生活を、まるごと便利にするプロダクトを続けて生み出していきます。</p>
              </div>
            </div>

            <p className="lcontact rv">お問い合わせ: <a href="mailto:nalufurumi@gmail.com">nalufurumi@gmail.com</a></p>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="final">
        <div className="wrap">
          <h2 className="rv">まず、<em>触ってみて。</em></h2>
          <p className="rv">説明を読むより、1分デモが早い。もっと知りたくなったら紹介資料へ。</p>
          <div className="hero-cta rv">
            <a href="/demo" className="pill pill-main pill-lg">デモを触ってみる →</a>
            <a href="/slides" className="pill pill-out pill-lg">紹介資料を見る</a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="foot">
        <div className="wrap">
          <div className="fl">あてんど<em>.</em></div>
          <div className="fby">by Creative Team Lunar 🌙</div>
          <div className="lk">
            <a href="/demo">体験デモ</a>
            <a href="/slides">紹介資料</a>
            <a href="/report">お問い合わせ</a>
            <a href="/report?type=bug">バグ報告</a>
          </div>
          <p className="cp">© 2026 あてんど · Produced by Nalu Furumi / Creative Team Lunar</p>
        </div>
      </footer>
    </div>
  )
}
