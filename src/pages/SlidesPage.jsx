// ── 紹介スライド (/slides) ──────────────────────────────────────────
// あてんど の紹介デッキ。スマホでもPCでも見られるレスポンシブ対応。
// 左右スワイプ / 矢印キー / ドットで移動。最後のページからLPへ誘導。

import { useState, useEffect, useRef } from 'react'

const CSS = `
:root {
  --pg:#00897B; --pg-d:#004D40; --pg-l:#4DB6AC; --pg-bg:#E0F2F1;
  --mint:#4DD0C4; --off:#F8F6F2; --off2:#EFECE6; --ink:#14202B; --muted:#5A6870;
}
* { box-sizing:border-box; }
.deck { position:fixed; inset:0; background:var(--ink); display:flex; flex-direction:column; font-family:-apple-system,BlinkMacSystemFont,'Hiragino Sans','Noto Sans JP',sans-serif; overflow:hidden; }
.deck ::selection { background:var(--mint); color:var(--pg-d); }
.deck, .deck * { word-break: keep-all; overflow-wrap: break-word; }
.deck h1, .deck h2, .deck h3 { text-wrap: balance; }
.deck p, .deck li, .deck div { text-wrap: pretty; }
.stage { flex:1; position:relative; display:flex; align-items:center; justify-content:center; overflow:hidden; }
.slide { position:absolute; inset:0; display:flex; align-items:center; justify-content:center; padding:clamp(28px,6vw,72px); opacity:0; transform:translateX(40px); transition:opacity .5s ease, transform .5s ease; pointer-events:none; overflow-y:auto; }
.slide.active { opacity:1; transform:none; pointer-events:auto; }
.slide.prev { transform:translateX(-40px); }
.wrap { width:100%; max-width:860px; margin:auto; }
@media (prefers-reduced-motion: reduce){ .slide { transition:opacity .3s ease; transform:none; } }

.s-eyebrow { font-size:clamp(11px,1.6vw,13px); font-weight:800; letter-spacing:.14em; text-transform:uppercase; margin-bottom:16px; }
.s-h1 { font-size:clamp(30px,7vw,64px); font-weight:900; letter-spacing:-.03em; line-height:1.04; margin:0 0 18px; }
.s-h2 { font-size:clamp(24px,5vw,44px); font-weight:900; letter-spacing:-.03em; line-height:1.1; margin:0 0 18px; }
.s-lead { font-size:clamp(15px,2.4vw,21px); line-height:1.7; margin:0 0 14px; }
.s-body { font-size:clamp(14px,2vw,17px); line-height:1.75; }

/* light vs dark slide */
.slide.dark { color:#fff; }
.slide.dark .s-eyebrow { color:var(--mint); }
.slide.dark .s-lead { color:rgba(255,255,255,.85); }
.slide.light { background:var(--off); color:var(--ink); }
.slide.light .s-eyebrow { color:var(--pg); }
.slide.light .s-lead { color:var(--muted); }
.slide.tint { background:var(--pg-bg); color:var(--ink); }
.slide.tint .s-eyebrow { color:var(--pg-d); }
.slide.tint .s-lead { color:var(--pg-d); }

.center { text-align:center; }
.accent-line { width:56px; height:3px; background:var(--pg); border-radius:2px; margin:20px auto 0; }
.slide.dark .accent-line { background:var(--mint); }

/* two-column feature */
.cols { display:grid; grid-template-columns:1fr; gap:clamp(20px,4vw,44px); align-items:center; }
@media (min-width:720px){ .cols { grid-template-columns:1.05fr .95fr; } }
.flist { list-style:none; padding:0; margin:14px 0 0; display:flex; flex-direction:column; gap:11px; }
.flist li { display:flex; gap:10px; font-size:clamp(13px,1.9vw,16px); line-height:1.5; align-items:flex-start; }
.flist li .ck { color:var(--pg); font-weight:900; flex-shrink:0; }
.slide.dark .flist li .ck { color:var(--mint); }

/* mock cards */
.mock { background:#fff; border-radius:20px; box-shadow:0 14px 44px rgba(0,0,0,.22); padding:18px; color:var(--ink); }
.mbar { display:flex; align-items:center; gap:8px; padding-bottom:12px; border-bottom:1px solid var(--off2); margin-bottom:13px; font-weight:700; font-size:14px; }
.mrow { display:flex; align-items:center; justify-content:space-between; padding:10px 12px; border-radius:11px; margin-bottom:7px; background:var(--off); font-size:13px; }
.mrow.best { background:var(--pg-bg); border:1.5px solid var(--pg); }
.mrow .v { display:flex; gap:8px; font-weight:700; font-size:12px; }
.mrow .y{color:#0F6E56;} .mrow .m{color:#8A5000;} .mrow .n{color:#B91C1C;}
.mcta { display:flex; gap:8px; align-items:center; margin-top:9px; padding:10px 12px; border-radius:11px; background:var(--pg-d); color:#fff; font-size:12px; font-weight:600; }
.mp { display:flex; align-items:center; gap:9px; padding:9px 0; border-bottom:1px solid var(--off2); font-size:13px; }
.mav { width:28px; height:28px; border-radius:50%; background:var(--pg-bg); color:var(--pg-d); display:flex; align-items:center; justify-content:center; font-weight:700; font-size:12px; flex-shrink:0; }
.mbadge { font-size:10px; padding:1px 8px; border-radius:999px; background:var(--pg-bg); color:var(--pg-d); font-weight:600; }
.mbadge.g { background:var(--off2); color:var(--muted); }
.sbars { display:flex; align-items:flex-end; gap:9px; height:130px; padding:18px 4px 0; }
.sbars .b { flex:1; background:linear-gradient(180deg,var(--pg-l),var(--pg)); border-radius:6px 6px 0 0; position:relative; }
.sbars .b span { position:absolute; top:-17px; left:0; right:0; text-align:center; font-size:11px; font-weight:700; color:var(--pg-d); }

/* problem list */
.prob { display:grid; grid-template-columns:1fr; gap:12px; margin-top:22px; }
@media (min-width:640px){ .prob { grid-template-columns:1fr 1fr; } }
.prob-item { background:rgba(255,255,255,.06); border:1px solid rgba(255,255,255,.14); border-radius:16px; padding:18px 20px; display:flex; gap:12px; align-items:flex-start; }
.prob-item .x { font-size:22px; flex-shrink:0; }
.prob-item p { margin:0; font-size:clamp(13px,1.9vw,15px); line-height:1.6; color:rgba(255,255,255,.9); }

/* step chips */
.steps3 { display:grid; grid-template-columns:1fr; gap:14px; margin-top:24px; }
@media (min-width:720px){ .steps3 { grid-template-columns:repeat(3,1fr); } }
.stepc { background:#fff; border-radius:18px; padding:22px; color:var(--ink); box-shadow:0 6px 24px rgba(0,0,0,.14); position:relative; }
.stepc .ic { font-size:28px; }
.stepc .n { font-family:ui-monospace,monospace; font-size:12px; font-weight:700; color:var(--pg); letter-spacing:.1em; margin-top:8px; }
.stepc h3 { font-size:19px; font-weight:800; margin:6px 0 7px; letter-spacing:-.02em; }
.stepc p { font-size:13px; color:var(--muted); line-height:1.6; margin:0; }

/* use cases */
.uc4 { display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-top:24px; }
@media (min-width:720px){ .uc4 { grid-template-columns:repeat(4,1fr); } }
.uc4 .u { background:rgba(255,255,255,.06); border:1px solid rgba(255,255,255,.14); border-radius:16px; padding:20px 16px; text-align:center; }
.uc4 .u .ic { font-size:28px; margin-bottom:10px; }
.uc4 .u h4 { font-size:14px; font-weight:800; margin:0 0 6px; color:#fff; }
.uc4 .u p { font-size:12px; color:rgba(255,255,255,.72); margin:0; line-height:1.5; }

/* pricing */
.price { display:grid; grid-template-columns:1fr; gap:16px; margin-top:24px; }
@media (min-width:640px){ .price { grid-template-columns:1fr 1fr; } }
.pcard { background:#fff; border-radius:20px; padding:26px; color:var(--ink); border:1px solid var(--off2); }
.pcard.hl { border:2px solid var(--pg); box-shadow:0 10px 30px rgba(0,137,123,.16); }
.pcard .plan { font-size:13px; font-weight:800; color:var(--pg); letter-spacing:.06em; text-transform:uppercase; }
.pcard .amt { font-size:clamp(26px,5vw,38px); font-weight:900; letter-spacing:-.02em; margin:8px 0 4px; }
.pcard .amt small { font-size:14px; font-weight:600; color:var(--muted); }
.pcard ul { list-style:none; padding:0; margin:14px 0 0; display:flex; flex-direction:column; gap:8px; }
.pcard li { font-size:13px; color:var(--ink); display:flex; gap:8px; }
.pcard li .ck { color:var(--pg); font-weight:900; }
.pnote { font-size:12px; color:var(--muted); margin-top:16px; text-align:center; }
.slide.dark .pnote { color:rgba(255,255,255,.6); }

/* Lunar slides */
.lun-catch { font-size:clamp(15px,2.4vw,22px); color:var(--mint); font-weight:700; margin:6px 0 14px; }
.lun-who { font-size:clamp(13px,1.8vw,15px); color:rgba(255,255,255,.7); font-weight:700; margin:0 0 20px; }
.lun-poetry { font-size:clamp(15px,2.3vw,22px); line-height:1.8; max-width:32ch; color:#fff; font-weight:500; }
.lun-poetry em { font-style:normal; color:var(--mint); }
.lun-mvv { display:grid; grid-template-columns:1fr; gap:12px; margin-top:8px; }
@media (min-width:720px){ .lun-mvv { grid-template-columns:repeat(3,1fr); } }
.lun-mvv .m { background:rgba(255,255,255,.06); border:1px solid rgba(255,255,255,.14); border-radius:16px; padding:18px; }
.lun-mvv .m .k { font-size:11px; font-weight:800; letter-spacing:.1em; text-transform:uppercase; color:var(--mint); margin-bottom:8px; }
.lun-mvv .m .v { font-size:13px; line-height:1.65; color:rgba(255,255,255,.9); }
.lun-prod { margin-top:20px; padding-top:18px; border-top:1px solid rgba(255,255,255,.16); display:grid; grid-template-columns:1fr; gap:14px; }
@media (min-width:640px){ .lun-prod { grid-template-columns:1fr 1fr; } }
.lun-prod .now { font-size:15px; font-weight:800; margin:0; }
.lun-prod .now span { font-weight:600; color:rgba(255,255,255,.7); font-size:12px; display:block; margin-top:4px; }
.lun-prod .soon { font-size:13px; color:rgba(255,255,255,.82); line-height:1.65; margin:0; }
.lun-prod .soon b { color:#fff; }
.lun-mail { margin-top:18px; font-size:13px; color:rgba(255,255,255,.7); }
.lun-mail a { color:var(--mint); font-weight:700; }

/* final cta */
.btn { display:inline-flex; align-items:center; justify-content:center; gap:8px; font-weight:800; text-decoration:none; border:none; cursor:pointer; border-radius:999px; font-family:inherit; transition:transform .16s ease, box-shadow .16s ease; }
.btn-pri { background:#fff; color:var(--pg-d); padding:15px 34px; font-size:16px; box-shadow:0 8px 30px rgba(0,0,0,.28); }
.btn-pri:hover { transform:translateY(-2px); }
.btn-ghost { background:transparent; color:#fff; border:1.5px solid rgba(255,255,255,.45); padding:13px 28px; font-size:15px; }
.cta-row { display:flex; gap:12px; justify-content:center; flex-wrap:wrap; margin-top:28px; }

/* controls */
.ctl { display:flex; align-items:center; justify-content:space-between; padding:14px clamp(16px,4vw,40px); background:rgba(20,32,43,.96); border-top:1px solid rgba(255,255,255,.08); }
.ctl a.home { color:rgba(255,255,255,.5); font-size:12px; text-decoration:none; font-weight:600; }
.dots { display:flex; gap:7px; align-items:center; }
.dots button { width:8px; height:8px; border-radius:50%; border:none; background:rgba(255,255,255,.25); cursor:pointer; padding:0; transition:all .2s; }
.dots button.on { background:var(--mint); width:22px; border-radius:4px; }
.nav-btns { display:flex; gap:8px; }
.nav-btns button { width:38px; height:38px; border-radius:50%; border:1px solid rgba(255,255,255,.18); background:rgba(255,255,255,.06); color:#fff; cursor:pointer; font-size:16px; display:flex; align-items:center; justify-content:center; transition:background .15s; }
.nav-btns button:hover:not(:disabled) { background:rgba(255,255,255,.16); }
.nav-btns button:disabled { opacity:.3; cursor:default; }
.pageno { color:rgba(255,255,255,.4); font-size:12px; font-family:ui-monospace,monospace; min-width:44px; text-align:center; }
.chap { color:var(--mint); font-size:12px; font-weight:800; letter-spacing:.06em; margin-right:6px; padding:3px 11px; border:1px solid rgba(77,208,196,.35); border-radius:999px; }
.progress { height:3px; background:rgba(255,255,255,.08); position:relative; z-index:5; }
.progress-fill { height:100%; background:linear-gradient(90deg,var(--pg),var(--mint)); transition:width .5s cubic-bezier(.16,.8,.24,1); }
.credit-s { position:absolute; bottom:10px; left:0; right:0; text-align:center; font-size:10px; color:rgba(255,255,255,.35); }
.slide.light .credit-s, .slide.tint .credit-s { color:rgba(20,32,43,.3); }
`

// 各スライドは { bg: 'dark'|'light'|'tint', node } を返す
const slides = [
  // 0 タイトル
  { chapter: 'ようこそ', cls: 'dark', bg: '#004D40', render: () => (
    <div className="wrap center">
      <div className="s-eyebrow">イベント調整アプリ・紹介資料</div>
      <h1 className="s-h1" style={{ fontSize:'clamp(42px,9vw,86px)' }}>あてんど<span style={{ fontSize:'0.28em', verticalAlign:'super', color:'#4DD0C4', fontWeight:700, marginLeft:8 }}>β</span></h1>
      <p className="s-lead">ここから、あてんどのすべてを<br />ひとつずつご紹介します。</p>
      <div className="accent-line" />
      <p className="s-body" style={{ marginTop:18, color:'#B2DFDB' }}>矢印キー / スワイプ / 下のドットで進めます →</p>
      <p className="s-body" style={{ marginTop:28, color:'rgba(178,223,219,0.6)', fontSize:'12px' }}>※ ベータ版として公開中です。「あてんど」は仮称であり、今後変更される場合があります。</p>
    </div>
  )},
  // 1 課題
  { chapter: '課題', cls: 'dark', bg: '#14202B', render: () => (
    <div className="wrap">
      <div className="s-eyebrow">こんな困りごと、ありませんか</div>
      <h2 className="s-h2">サークルの日程・出欠管理は、<br />意外とめんどう。</h2>
      <div className="prob">
        <div className="prob-item"><span className="x">😮‍💨</span><p>LINEで日程を聞いても、返事がバラバラで集計しきれない</p></div>
        <div className="prob-item"><span className="x">🔁</span><p>調整さんで日程を決めても、出欠はまた別で取り直し</p></div>
        <div className="prob-item"><span className="x">🤔</span><p>「今日って誰が来るんだっけ？」が直前までわからない</p></div>
        <div className="prob-item"><span className="x">📉</span><p>誰がどれくらい参加しているか、記録が残らない</p></div>
      </div>
    </div>
  )},
  // 2 解決
  { chapter: '解決', cls: 'tint', bg: '#E0F2F1', render: () => (
    <div className="wrap center">
      <div className="s-eyebrow">あてんど なら</div>
      <h2 className="s-h2">調整も、出欠も、記録も。<br />ぜんぶ、ひとつに。</h2>
      <p className="s-lead" style={{ maxWidth:'40ch', margin:'0 auto' }}>バラバラのツールを行き来する必要はもうありません。イベントが決まる前から終わったあとまでを、一本の流れでつなぎます。</p>
      <div className="steps3">
        <div className="stepc"><span className="ic">🗓️</span><div className="n">STEP 01</div><h3>日程を決める</h3><p>候補日に投票してもらう</p></div>
        <div className="stepc"><span className="ic">✅</span><div className="n">STEP 02</div><h3>出欠を集める</h3><p>決定→自動でイベント化</p></div>
        <div className="stepc"><span className="ic">📈</span><div className="n">STEP 03</div><h3>記録する</h3><p>出席率を自動で集計</p></div>
      </div>
    </div>
  )},
  // 3 機能1 日程調整
  { chapter: '機能', cls: 'light', bg: '#F8F6F2', render: () => (
    <div className="wrap">
      <div className="cols">
        <div>
          <div className="s-eyebrow">機能① 日程調整</div>
          <h2 className="s-h2">「いつなら来られる？」<br />を、一発で。</h2>
          <p className="s-lead">候補日を並べて投票リンクを送るだけ。調整さんのように使えて、そのまま出欠につながります。</p>
          <ul className="flist">
            <li><span className="ck">✓</span>○△✕＋コメントで気軽に回答</li>
            <li><span className="ck">✓</span>候補ごとの集計・誰がどう答えたか一覧</li>
            <li><span className="ck">✓</span>「この日に決定」でイベントに自動変換</li>
          </ul>
        </div>
        <div className="mock">
          <div className="mbar"><span>📅</span>8月合宿の日程を決めよう</div>
          <div className="mrow best"><span>8/20（木）</span><div className="v"><span className="y">○5</span><span className="m">△1</span><span className="n">✕0</span></div></div>
          <div className="mrow"><span>8/27（木）</span><div className="v"><span className="y">○3</span><span className="m">△1</span><span className="n">✕2</span></div></div>
          <div className="mcta"><span>↓</span>8/20に決定 → イベント自動作成</div>
        </div>
      </div>
    </div>
  )},
  // 4 機能2 出欠管理
  { chapter: '機能', cls: 'light', bg: '#F8F6F2', render: () => (
    <div className="wrap">
      <div className="cols">
        <div className="mock">
          <div className="mbar"><span>⚽</span>全体練習（連携確認）</div>
          <div className="mp"><div className="mav">あ</div><span style={{flex:1}}>あやか</span><span className="mbadge">参加</span></div>
          <div className="mp"><div className="mav">み</div><span style={{flex:1}}>みお</span><span className="mbadge">参加</span></div>
          <div className="mp"><div className="mav">さ</div><span style={{flex:1}}>さくら</span><span className="mbadge g">遅刻</span></div>
          <div className="mp" style={{borderBottom:'none'}}><div className="mav">ひ</div><span style={{flex:1}}>ひなた</span><span className="mbadge g">欠席・バイト</span></div>
        </div>
        <div>
          <div className="s-eyebrow">機能② 出欠管理</div>
          <h2 className="s-h2">誰が来るか、<br />ひと目で。</h2>
          <p className="s-lead">メンバーは名前を選んで出欠を入れるだけ。ログインは要りません。</p>
          <ul className="flist">
            <li><span className="ck">✓</span>ログイン不要・URLを開くだけ</li>
            <li><span className="ck">✓</span>他のメンバーの参加状況も見える</li>
            <li><span className="ck">✓</span>参加予定と当日実績を分けて記録</li>
            <li><span className="ck">✓</span>欠席理由やコメントも残せる</li>
          </ul>
        </div>
      </div>
    </div>
  )},
  // 5 機能3 統計
  { chapter: '機能', cls: 'light', bg: '#F8F6F2', render: () => (
    <div className="wrap">
      <div className="cols">
        <div>
          <div className="s-eyebrow">機能③ 統計・記録</div>
          <h2 className="s-h2">出席率で、<br />運営が見える。</h2>
          <p className="s-lead">実績と予測、2つの出席率を自動で計算。参加が減っている人にはアラートで気づけます。</p>
          <ul className="flist">
            <li><span className="ck">✓</span>実績・予測の出席率を自動集計</li>
            <li><span className="ck">✓</span>出席率が低い人にアラート表示</li>
            <li><span className="ck">✓</span>変更ログで全操作を記録</li>
            <li><span className="ck">✓</span>CSV書き出しにも対応</li>
          </ul>
        </div>
        <div className="mock">
          <div className="mbar"><span>📊</span>メンバー別 出席率</div>
          <div className="sbars">
            <div className="b" style={{height:'95%'}}><span>95%</span></div>
            <div className="b" style={{height:'80%'}}><span>80%</span></div>
            <div className="b" style={{height:'72%'}}><span>72%</span></div>
            <div className="b" style={{height:'58%'}}><span>58%</span></div>
            <div className="b" style={{height:'45%'}}><span>45%</span></div>
          </div>
        </div>
      </div>
    </div>
  )},
  // 6 メンバー管理
  { chapter: '機能', cls: 'tint', bg: '#E0F2F1', render: () => (
    <div className="wrap">
      <div className="s-eyebrow">機能④ メンバー管理</div>
      <h2 className="s-h2">メンバーを、<br />きちんと把握。</h2>
      <div className="cols" style={{ marginTop:20 }}>
        <ul className="flist">
          <li><span className="ck">✓</span><b>ロール（役職）</b>：キャプテン・会計・班などを割り当て</li>
          <li><span className="ck">✓</span><b>学年 / ID</b>：2桁で入学年度などを管理</li>
          <li><span className="ck">✓</span><b>管理者メモ</b>：本人には見えない引き継ぎメモ</li>
          <li><span className="ck">✓</span><b>参加申請の承認</b>：編集して承認もできる</li>
        </ul>
        <div className="mock">
          <div className="mbar"><span>👥</span>メンバー</div>
          <div className="mp"><div className="mav">あ</div><span style={{flex:1}}>あやか</span><span className="mbadge">キャプテン</span></div>
          <div className="mp"><div className="mav">み</div><span style={{flex:1}}>みお <span style={{fontSize:11,color:'#5A6870'}}>25</span></span><span className="mbadge">会計</span></div>
          <div className="mp" style={{borderBottom:'none'}}><div className="mav">ひ</div><span style={{flex:1}}>ひなた <span style={{fontSize:11,color:'#5A6870'}}>26</span></span><span className="mbadge g">1年</span></div>
        </div>
      </div>
    </div>
  )},
  // 7 データ所有・安心
  { chapter: '安心', cls: 'dark', bg: '#004D40', render: () => (
    <div className="wrap center">
      <div className="s-eyebrow">安心して使える理由</div>
      <h2 className="s-h2">データは、<br />あなたたちのもの。</h2>
      <p className="s-lead" style={{ maxWidth:'42ch', margin:'0 auto 8px' }}>あてんどのデータは、各サークルが用意したGoogleスプレッドシートに直接保存されます。第三者のサーバーには置きません。</p>
      <div className="steps3" style={{ marginTop:28 }}>
        <div className="stepc"><span className="ic">🔒</span><h3 style={{marginTop:10}}>完全な所有権</h3><p>自分のGoogleシートに保存</p></div>
        <div className="stepc"><span className="ic">🚫</span><h3 style={{marginTop:10}}>広告なし</h3><p>余計なものは一切なし</p></div>
        <div className="stepc"><span className="ic">🆔</span><h3 style={{marginTop:10}}>登録不要</h3><p>メンバーは個人情報不要</p></div>
      </div>
    </div>
  )},
  // 8 ユースケース
  { chapter: '活用', cls: 'dark', bg: '#14202B', render: () => (
    <div className="wrap">
      <div className="s-eyebrow">こんなサークルに</div>
      <h2 className="s-h2">部活でも、サークルでも。</h2>
      <div className="uc4">
        <div className="u"><div className="ic">⚽</div><h4>運動系</h4><p>練習・試合の出欠、遠征調整に</p></div>
        <div className="u"><div className="ic">🎸</div><h4>音楽・軽音</h4><p>練習出席率、本番のメンバー確認に</p></div>
        <div className="u"><div className="ic">🎭</div><h4>演劇・イベント</h4><p>リハの出欠、キャスト調整に</p></div>
        <div className="u"><div className="ic">📚</div><h4>勉強会・ゼミ</h4><p>定期活動の出席記録に</p></div>
      </div>
    </div>
  )},
  // 9 料金
  { chapter: '料金', cls: 'tint', bg: '#E0F2F1', render: () => (
    <div className="wrap center">
      <div className="s-eyebrow">料金</div>
      <h2 className="s-h2">今なら、まるごと無料。</h2>
      <div className="price">
        <div className="pcard hl">
          <div className="plan">Free · いま</div>
          <div className="amt">¥0</div>
          <ul>
            <li><span className="ck">✓</span>日程調整・出欠管理・統計</li>
            <li><span className="ck">✓</span>メンバー管理・ロール</li>
            <li><span className="ck">✓</span>広告なし・人数制限なし</li>
          </ul>
        </div>
        <div className="pcard">
          <div className="plan">この先</div>
          <div className="amt" style={{fontSize:'clamp(20px,4vw,28px)'}}>追加機能を検討中</div>
          <ul>
            <li><span className="ck">✓</span>基本機能は無料のまま</li>
            <li><span className="ck">✓</span>LINE通知など便利機能を追加予定</li>
          </ul>
        </div>
      </div>
      <p className="pnote">※ 出欠管理の基本機能は、これからも無料で使い続けられるようにする予定です</p>
    </div>
  )},
  // 10 Lunar — コンセプト
  { chapter: 'Lunar', cls: 'dark', bg: '#004D40', render: () => (
    <div className="wrap">
      <div style={{ fontSize:32, marginBottom:12 }}>🌙</div>
      <div className="s-eyebrow">Creative Team</div>
      <h2 className="s-h2" style={{ marginBottom:2 }}>Lunar</h2>
      <p className="lun-catch">— 新しいスタンダードを手のなかに —</p>
      <p className="lun-who">ICU生によって創設されたクリエイティブチーム</p>
      <p className="lun-poetry">月が太陽の光を反射して地球を照らすように、テクノロジーを使い、アイデアをプロダクトに昇華し、ICU生に <em>"ワクワク"</em> を届ける。</p>
    </div>
  )},
  // 11 Lunar — MVV・プロダクト
  { chapter: 'Lunar', cls: 'dark', bg: '#14202B', render: () => (
    <div className="wrap">
      <div className="s-eyebrow">わたしたちが目指すもの</div>
      <div className="lun-mvv">
        <div className="m"><div className="k">Mission</div><div className="v">ICUをアカデメイアする。真の批判的思考で、新しいシステムを。</div></div>
        <div className="m"><div className="k">Vision</div><div className="v">ICUを、効率化されたクリエイティブな環境にする。</div></div>
        <div className="m"><div className="k">Values</div><div className="v">イノベイティブであれ／環境を最適化する／前提を疑う／自分たちが使いたいものを／遊び心を忘れない</div></div>
      </div>
      <div className="lun-prod">
        <div>
          <div className="s-eyebrow" style={{ marginBottom:8 }}>Product</div>
          <p className="now">イベント調整アプリ「あてんど」<span>= いま見ているこのアプリ</span></p>
        </div>
        <div>
          <div className="s-eyebrow" style={{ marginBottom:8 }}>構想中</div>
          <p className="soon"><b>履修サポート ／ 飲食店マップ ／ インターンマッチング…</b><br />ICU・三鷹武蔵境エリアの学生生活を、まるごと便利に。</p>
        </div>
      </div>
      <p className="lun-mail">お問い合わせ: <a href="mailto:nalufurumi@gmail.com">nalufurumi@gmail.com</a></p>
    </div>
  )},
  // 12 最終CTA → LP
  { chapter: 'はじめる', cls: 'dark', bg: '#004D40', final: true, render: (go) => (
    <div className="wrap center">
      <div className="s-eyebrow">まず、触ってみてください</div>
      <h2 className="s-h2" style={{ fontSize:'clamp(28px,6vw,54px)' }}>説明を読むより、<br />1分デモが早い。</h2>
      <div className="cta-row">
        <a href="/lp" className="btn btn-pri">紹介サイトを見る →</a>
        <a href="/demo" className="btn btn-ghost">デモを触る</a>
      </div>
      <p className="s-body" style={{ marginTop:26, color:'#B2DFDB' }}>circle-attendance-chi.vercel.app</p>
      <p className="s-body" style={{ marginTop:10, color:'rgba(178,223,219,0.55)', fontSize:'11px' }}>β版・「あてんど」は仮称です</p>
    </div>
  )},
]

export default function SlidesPage() {
  const [i, setI] = useState(0)
  const touch = useRef(null)
  const n = slides.length
  const go = (d) => setI(v => Math.max(0, Math.min(n - 1, v + d)))
  const to = (idx) => setI(Math.max(0, Math.min(n - 1, idx)))

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); go(1) }
      if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [n])

  const onTouchStart = (e) => { touch.current = e.touches[0].clientX }
  const onTouchEnd = (e) => {
    if (touch.current == null) return
    const dx = e.changedTouches[0].clientX - touch.current
    if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1)
    touch.current = null
  }

  return (
    <div className="deck">
      <style>{CSS}</style>
      <div className="progress"><div className="progress-fill" style={{ width: `${((i + 1) / n) * 100}%` }} /></div>
      <div className="stage" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        {slides.map((s, idx) => (
          <section
            key={idx}
            className={`slide ${s.cls} ${idx === i ? 'active' : ''} ${idx < i ? 'prev' : ''}`}
            style={{ background: s.bg }}
            aria-hidden={idx !== i}
          >
            {s.render(go)}
            <div className="credit-s">Produced by Nalu Furumi / CreativeTeam Lunar</div>
          </section>
        ))}
      </div>

      <div className="ctl">
        <a href="/lp" className="home">← あてんど</a>
        <div className="dots">
          {slides.map((_, idx) => (
            <button key={idx} className={idx === i ? 'on' : ''} onClick={() => to(idx)} aria-label={`スライド${idx + 1}`} />
          ))}
        </div>
        <div className="nav-btns">
          <span className="chap">{slides[i].chapter}</span>
          <button onClick={() => go(-1)} disabled={i === 0} aria-label="前へ">‹</button>
          <span className="pageno">{i + 1} / {n}</span>
          <button onClick={() => go(1)} disabled={i === n - 1} aria-label="次へ">›</button>
        </div>
      </div>
    </div>
  )
}
