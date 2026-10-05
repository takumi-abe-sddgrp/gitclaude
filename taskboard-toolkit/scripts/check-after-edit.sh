#!/usr/bin/env bash
# PostToolUse（Edit|Write）のあとに呼ばれる。
# 編集されたのが src/ 以下の .ts / .tsx のときだけ、型チェックと ESLint を実行する。
# 問題があれば標準エラーに出して終了コード 2 を返し、Claude に直させる。

input=$(cat)

# jq がない環境もあるので、JSON の読み取りには Node を使う
file_path=$(printf '%s' "$input" | node -e '
  let s = "";
  process.stdin.on("data", (c) => (s += c)).on("end", () => {
    try { process.stdout.write(JSON.parse(s).tool_input?.file_path ?? ""); } catch {}
  });
')

# Windows のパス区切りを / にそろえてから判定する
normalized=${file_path//\\//}
case "$normalized" in
  */src/*.ts | */src/*.tsx) ;;
  *) exit 0 ;;
esac

cd "${CLAUDE_PROJECT_DIR:-.}" || exit 0

errors=""

if ! out=$(npx tsc --noEmit 2>&1); then
  errors+="[tsc --noEmit]"$'\n'"$out"$'\n'
fi

if ! out=$(npx eslint "$file_path" 2>&1); then
  errors+="[eslint $file_path]"$'\n'"$out"$'\n'
fi

if [ -n "$errors" ]; then
  printf '%s' "$errors" >&2
  exit 2
fi

exit 0
