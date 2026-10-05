---
name: taskboard-feature-dev
description: TaskBoard（localStorage 版カンバン）に機能を TDD で追加するときのワークフロー。層構造・テスト先行・検証手順、および WSL/時差など今回踏んだ落とし穴を含む。TaskBoard に列・タスク項目・並べ替え・保存形式などの機能を足すときに使う。
user-invocable: true
allowed-tools:
  - Read
  - Edit
  - Write
  - Bash
---

# taskboard-feature-dev — TaskBoard 機能開発ワークフロー

localStorage だけで動く 4 列カンバン（未着手/進行中/保留/完了）に機能を TDD で追加するための手順。API もサーバーも無い純クライアント構成。

## 層構造（下から）

1. `src/lib/tasks.ts` — 純粋関数とデータモデル。列は `STATUSES` 配列が単一の真実（並び順＝表示順＝←/→ の移動先）。優先度など列挙は同じパターン（`XXX` 配列＋`XXX_LABEL`＋`isXxx` ガード）で足す。
2. `src/lib/storage.ts` — localStorage 読み書き（キー `taskboard.tasks.v1`）。読み込み時に形を検証し、壊れたデータは黙って捨てる。例外は投げない。
3. `src/lib/taskStore.ts` — `useSyncExternalStore` 用の外部ストア。`update()` は保存失敗で `false`。
4. `src/hooks/useTasks.ts` — ストアをモジュールに1つだけ。SSR/ハイドレーション中は `tasks === null`。
5. `src/components/` — 状態を持つのは `Board` のみ。他は受け取った値を描画するだけ。

## TDD の進め方

1. **RED**: まず対象層の隣に `*.test.ts(x)` を書く/足す。既存フィクスチャ（`task()` ヘルパー、`sample`）も新モデルに合わせて更新する。
2. 走らせて失敗を確認（型エラーも RED）。
3. **GREEN**: 下の層から実装。
4. 各層ごとに検証（下記）。

## 検証コマンド

```bash
npx tsc --noEmit     # 型チェック。*.test.ts(x) も対象 = テスト↔実装の契約を保証
npm run lint         # eslint（注意: Next 16 で `next lint` は廃止）
npm test             # vitest（← WSL では動かない場合あり。下記）
```

### 純粋ロジックをこのセッションで実行検証する（vitest が動かない環境向け）

`src/lib/*.ts` は `@/` エイリアスも DOM も使わず自己完結なので、vitest 無しでもアサーションを実行できる:

```bash
# Node に type-strip 非対応のことがあるので tsc で CJS 化してから実行
npx tsc <files> --module commonjs --target es2023 --lib es2023 \
  --esModuleInterop --outDir <tmp> --skipLibCheck
TZ=Asia/Tokyo node <tmp>/verify.js   # 必ず JST でも回す（時差バグ検出）
```

## 落とし穴（実地で踏んだもの）

- **後方互換**: `storage.ts` は欠けたデータを捨てる。新フィールドを必須検証に足すと旧タスクが全消えする。→ 「コア形状の検証」と「新フィールドの既定値補完（normalize）」を分け、旧データ・型崩れ値を救う。
- **日付の時差**: `new Date("YYYY-MM-DDT00:00:00")` はローカル時刻解釈。UTC の `toISOString()` と突き合わせると JST 等で有効日を弾く。→ `...T00:00:00Z` と UTC 固定で比較する。
- **色を足すとき**: `globals.css` のライト用・ダーク用・`@theme inline` の 3 か所に書く。
- **列の増減**: `STATUSES` と `STATUS_LABEL` を変更。`Board.tsx` のグリッド列数は手で合わせる（型では検出されない）。
- **WSL で vitest/dev が動かない**: `node_modules` が Windows 向けにインストールされていると Linux 用ネイティブバイナリ（rolldown 等）が無く、レジストリもプロキシ遮断で入れられない。→ `npm test` / `npm run dev` は Windows 側で実行する。

## テストの注意

- jsdom に `DataTransfer` は無い。D&D テストは `fireEvent.drop(el, { dataTransfer: { types, getData } })` で代替する（`Column.test.tsx` 参照）。
- `<input type="date">` は不正日（例 2026-02-30）を空文字にサニタイズする。不正日付の検証は DOM 経由でなく `validateTask` の単体テストで確かめる。
- `useTasks` のストアはモジュール単一なので `Board.test.tsx` はテスト間でタスクが残る。名前が重ならないよう注意。
