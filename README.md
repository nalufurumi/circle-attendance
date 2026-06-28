# ✧ 出席管理アプリ

コピーアイドルサークル向けオンライン出席管理アプリ

## 機能

- **メンバー画面** — 自分の名前を選んで出席を入力（○/△/×）
- **管理者画面** — パスワード保護、イベント作成（カラーラベル付き）、メンバー管理、統計、CSV書き出し
- **Google スプレッドシート連携** — Apps Script 経由でシートを自動更新

## データ保存

- **ローカル**: ブラウザの localStorage に自動保存
- **共有**: 管理者設定 → Google Apps Script URL を登録すると全端末で同期

## 開発

```bash
npm install
npm run dev
```

## デプロイ

```bash
npm run build
```

Built with Vite + React
