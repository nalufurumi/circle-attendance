# ✧ 出席管理アプリ

ICU（国際基督教大学）部活・サークル向けの出欠席管理Webアプリ。日程調整から出欠管理までをスマホ一台で完結できる。
完全無料・広告なし・個人情報不要。データは各サークル自身のGoogleスプレッドシートに保存される。

- 本番: https://circle-attendance-chi.vercel.app
- ランディングページ: `/lp` ／ 体験版: `/demo` ／ 営業スライド: `/slides`

## 主な機能

### メンバー画面（ログイン不要）
- 名前を選んで出欠を入力（プルダウン式：参加/遅刻/不参加/未定 等）
- 開始から24時間経過したイベントは自動で編集ロック
- 他メンバーの参加状況を確認可能（集計＋「全員を見る」で詳細展開）
- タグでイベントを絞り込み（上位5件表示＋「その他」で残りを展開）
- イベントを新しい順/古い順で並び替え
- 実績出席率・予測出席率を自分の画面で確認
- 回答受付中の「日程調整」に○/△/✕＋コメントで投票
- メンバー登録の申請（管理者の承認制）

### 管理者画面（Google Sign-In）
- **日程調整** — 候補日を複数出してメンバーに投票してもらい、決定と同時に投票結果（○/△/✕＋コメント）を引き継いだままイベントへ自動変換
- **イベント管理** — 作成・編集、タグ・カラーラベル・メモ、事前入力/当日記録の切り替え、参加者を名前検索、参加人数・出席率バッジ
- **メンバー管理** — 検索、並び替え（登録順/あ→ん/ん→あ/出席率順/ランダム）、表示名のインライン変更、削除確認
- **統計** — 実績/予測出席率、閾値アラート、高→低・低→高の並び替え
- **変更ログ** — 誰がいつ何を変更したか全記録
- **申請管理** — メンバー登録リクエストの承認/却下
- **設定** — 団体名、お知らせ（ピン留め）、出席率アラート閾値、テーマカラー（プリセット＋カラーコード直接指定）、タグ管理（並び替え・削除）

### 開発者ページ `/dev`（パスワード保護）
- **診断** — Apps Script接続テスト、プロジェクト概要（メンバー数・イベント数・日程調整件数など）
- **健全性チェック** — 孤立レコード・重複・不整合を自動検出し、ワンタップで修復
- **エラーログ** — ブラウザで発生したJSエラーを自動記録
- **全体分析** — 匿名テレメトリ（稼働団体数・推定メンバー数・エラー件数など、個人情報は含まない）
- **バックアップ/リストア** — データをJSONでダウンロード/復元
- **QRコード生成** — メンバー用URLをQR化
- **バグ報告/機能要望/導入相談** の一覧
- **自動テスト** — コアロジック（出席率計算・データ移行・タグ順序等）と主要ページの描画をワンクリック検証

## アーキテクチャ

```
React (Vite, SPA) ── Vercel でホスティング・GitHub push で自動デプロイ
        │
        ▼
Google Apps Script (各サークルが個別にデプロイ)
        │
        ▼
Google スプレッドシート（各サークル自身のシート＝データの完全な所有権）
```

- 認証: Google Sign-In（管理者のみ。メンバーはログイン不要）
- ルーティング: React Router（`/lp` `/demo` `/admin` `/member` `/report` `/dev` `/slides`）
- コード分割: 使用頻度の低いページ（開発者ツール・デモ・スライド等）は `React.lazy` で遅延ロードし、メイン画面のバンドルを軽量に保つ

## データスキーマ（v3）

```js
{
  members: string[],
  events: [{
    id, date, timeStart, timeEnd, name, type, color, tags, memo,
    attendance: { [memberName]: { plan, actual, reason } }
  }],
  schedulePolls: [{
    id, title, requireAll, status, // 'open' | 'closed'
    candidates: [{ id, date, timeStart, timeEnd }],
    responses: { [memberName]: { [candidateId]: { status, comment } } },
    resultCandidateId, eventId,
  }],
  circleName, accentColor, notice, alertThreshold,
  pendingMembers, globalTags, dataVersion,
}
```

旧バージョンのデータは `src/lib/api.js` の `migrate()` が自動でv3へ変換する。

## 開発

```bash
npm install
npm run dev      # ローカル開発サーバー
npm run build    # 本番ビルド
```

push すると Vercel が `main` ブランチを自動デプロイする。

## ディレクトリ構成

```
src/
  pages/         各ルートのページコンポーネント
  components/    共通UI（Card, Avatar）／日程調整パネル／ErrorBoundary
  lib/
    constants.js 状態定義・出席率計算・日程調整の集計/変換ロジック
    api.js       Apps Script との通信・データマイグレーション
    telemetry.js 匿名テレメトリ送信
    errorLog.js  ブラウザエラーの自動記録
    selftest.js  開発者ページの自動テストスイート
```

## 開発時の注意点

- **DemoPage は常にリリース機能と同期させる** — `AdminPage`/`MemberPage` に機能を追加したら、必ず `DemoPage.jsx` にも同じ変更を反映する（デモは独立した実装のため自動では追従しない）
- 新しい state を追加したら宣言漏れがないか要確認 — 過去に `useState` の宣言漏れによる本番クラッシュが複数回発生している
- Apps Script のコード（`APPS_SCRIPT` 定数）を変更した場合、各サークルは Apps Script の再デプロイが必要
