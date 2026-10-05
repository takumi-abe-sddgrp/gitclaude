# CLAUDE.md

このファイルは、このリポジトリで作業する Claude Code (claude.ai/code) への案内です。

@AGENTS.md

## コマンド

```bash
npm run dev          # 開発サーバー（Turbopack）→ http://localhost:3000
npm run build        # 本番ビルド（Turbopack）
npm run lint         # ESLint（eslint-config-next）
npx tsc --noEmit     # 型チェック（ビルドでも実行される）
npm test             # Vitest で全テストを実行（vitest run）
npm run test:watch   # Vitest を監視モードで実行

npx vitest run src/lib/tasks.test.ts   # 1ファイルだけ実行
npx vitest run -t "moveTask"           # テスト名で絞り込んで実行
```

- 構成は Next.js 16.3 / React 19 / Tailwind CSS v4 / TypeScript。Next.js 16 では Turbopack が既定だが、`package.json` のスクリプトで `--turbopack` を明示している。
- `next.config.ts` の `turbopack.root` は、ホームフォルダ（`C:\Users\abe`）にある無関係な `package-lock.json` を、プロジェクトのルートと取り違えさせないための設定。消さないこと。
- Vitest の設定は `vitest.config.mts`（jsdom 環境、`@/` を `src/` に割り当てる別名）と `vitest.setup.ts`（jest-dom の判定関数の読み込みと、テストごとの後片付け）にある。テストは対象ファイルの隣に `*.test.ts(x)` という名前で置く。

## 全体の構成

未着手 / 進行中 / 保留 / 完了 の4列のカンバン。データはブラウザの localStorage にだけ保存し、サーバー側の処理や API はない。`src/app/page.tsx` は `<Board />` を描画するだけ。

### 層の分け方（下の層から順に）

1. **`src/lib/tasks.ts`**: タスクを扱う純粋関数。列を定義しているのは `STATUSES` 配列だけで、その並び順がそのまま列の表示順と ←/→ ボタンの移動先（`adjacentStatus`）になる。列を増減するときは `STATUSES` と `STATUS_LABEL` を変える。`Record<Status, …>` を使っている箇所（`Column.tsx` の `EMPTY` など）は直し漏れが型エラーで分かるが、`Board.tsx` のグリッドの列数は手で合わせる必要がある。
   - **`src/lib/filter.ts`**: 検索（タイトルと説明が対象。NFKC で全角と半角をそろえ、大文字と小文字を区別しない。空白で区切った語はすべて含むものだけ残す）と、担当者・優先度・期限での絞り込み。期限の判定は `tasks.ts` の `dueStateOf` に1つだけあり、`TaskCard` の強調表示と共有する。完了したタスクは期限切れ・今日まで のどちらにも入れない（カードでも強調しない）。`filterTasks` は純粋関数のままにするため、今日の日付を第3引数で受け取る。特別な値 `ALL` / `UNASSIGNED` は先頭に空白を付けてあり、担当者名は保存・読み込みの両方で前後の空白を取り除くので、実在の名前とぶつからない。絞り込みの条件は `Board` が React の状態として持ち、保存はしない。絞り込むのは画面に出す一覧だけで、保存している配列には手を付けない。
2. **`src/lib/storage.ts`**: localStorage の読み書き（キーは `taskboard.tasks.v1`）。読み込むときに `isTask` / `isStatus` で中身を確かめ、形の崩れたデータは何も言わずに捨てる。例外は外に投げない。
3. **`src/lib/taskStore.ts`**: React の `useSyncExternalStore` に渡すための、コンポーネントの外に置くデータの入れ物。読み込んだ一覧を覚えておき、別のタブで変更があった（`storage` イベント）ら覚えた内容を捨てて読み直す。`update()` は保存に失敗すると `false` を返す（画面上の変更は残る）。
4. **`src/hooks/useTasks.ts`**: 上記の入れ物を**モジュールの中で1つだけ**作り、React に渡す。`getServerSnapshot` が `null` を返すので、サーバー側で描画するときと、ブラウザで画面を引き継ぐ（ハイドレーション）途中は `tasks === null` になる。コンポーネントは `null` を「読み込み中」として扱う前提で書かれている。
5. **`src/components/`**: 状態を持つのは `Board` だけ（どの列で追加フォームを開いているか、保存に失敗したか）。`Column` / `TaskCard` / `AddTaskForm` / `BoardHeader` は、親から受け取った値を描画するだけ。

### タスクの並び順

タスクは1本の配列で保存し、並び順を表す専用の項目は持たない。列の中の順番は、配列から `tasksIn(tasks, status)` でその列の分を取り出したときの順番そのもの。`moveTask(tasks, id, status, beforeId?)` は、`beforeId` のカードの直前、または移動先の列の最後尾にタスクを差し込んだ新しい配列を返す。何も変わらないときは**元と同じ配列**をそのまま返し、`taskStore.update` はそれを見て保存も画面への通知もしない。

### ドラッグ＆ドロップ

ブラウザ標準（HTML5）のドラッグ＆ドロップを使い、ライブラリは使っていない。`TaskCard` は、ドラッグするデータを独自の種類（`TASK_DRAG_TYPE`）にしてタスクの ID を載せる。`Column` はドラッグ中のデータ（`dataTransfer.types`）にこの種類があるときだけドロップを受け付けるので、ファイルや他のページの文字をドラッグしても反応しない。ドロップされた要素から `closest("[data-task-id]")` でカードを探し、カードの上ならその直前に、それ以外なら列の最後尾に入れる。タッチ操作やキーボードではドラッグ＆ドロップが使えないため、カードの ←/→ ボタンで隣の列へ移せるようにしている。

### 見た目

色は `src/app/globals.css` の CSS 変数（`--bg`, `--surface`, `--fg`, `--muted`, `--accent` など）で決め、`@theme inline` で Tailwind のクラス（`bg-surface`, `text-muted` など）に割り当てている。ダークモードは `prefers-color-scheme` で CSS 変数の値を切り替えるだけ。色を足すときは、ライト用・ダーク用・`@theme inline` の3か所に書く。画面の文言はすべて日本語。

## テストの注意点

- jsdom にはドラッグ用のデータ（`DataTransfer`）がないので、ドラッグ＆ドロップのテストでは `fireEvent.drop(el, { dataTransfer: { types, getData } })` のように代わりのオブジェクトを渡す（`Column.test.tsx` を参照）。
- `useTasks` のデータの入れ物はモジュールの中に1つしかないので、`Board.test.tsx` の中ではテストをまたいでタスクが残る。テストの順番や、タスクの名前が重ならないように気をつける。

## その他

- ルートにある `index.html` は、Next.js に移す前の試作品（1ファイルの HTML）で、ビルドには含まれない。
