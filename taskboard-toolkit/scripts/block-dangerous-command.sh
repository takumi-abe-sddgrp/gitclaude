#!/usr/bin/env bash
# ~/.claude/hooks/block-dangerous-command.sh
# PreToolUse hook for Bash: exit 2 blocks the command and shows stderr to Claude.
# Parses stdin without jq (jq is not installed on this machine).

input="$(cat)"
cmd="$(printf '%s' "$input" | sed -n 's/.*"command"[[:space:]]*:[[:space:]]*"\(\([^"\\]\|\\.\)*\)".*/\1/p' | head -n1)"

[ -z "$cmd" ] && exit 0

block() {
  echo "Blocked by block-dangerous-command.sh: $1" >&2
  exit 2
}

# rm -rf on root, home, or a whole drive
if printf '%s' "$cmd" | grep -Eq 'rm[[:space:]]+(-[a-zA-Z]*[rR][a-zA-Z]*[fF]?|-[a-zA-Z]*[fF][a-zA-Z]*[rR])[a-zA-Z]*[[:space:]]+(/|~|\$HOME|/c|[A-Za-z]:[/\\]?)([[:space:]]|$|\*)'; then
  block "recursive delete of root/home/drive"
fi

# Force push (including --force-with-lease, -f)
if printf '%s' "$cmd" | grep -Eq 'git[[:space:]]+push([[:space:]].*)?[[:space:]](--force|--force-with-lease|-f)([[:space:]=]|$)'; then
  block "git force push"
fi

# Hard reset / clean that discards work
if printf '%s' "$cmd" | grep -Eq 'git[[:space:]]+(reset[[:space:]]+--hard|clean[[:space:]]+-[a-zA-Z]*f)'; then
  block "destructive git reset/clean"
fi

# Privilege escalation, disk formatting, fork bomb
if printf '%s' "$cmd" | grep -Eq '(^|[;&|[:space:]])(sudo|mkfs(\.[a-z0-9]+)?|format(\.com)?|diskpart)([[:space:]]|$)|:\(\)[[:space:]]*\{'; then
  block "privileged or disk-level command"
fi

# Piping remote scripts straight into a shell
if printf '%s' "$cmd" | grep -Eq '(curl|wget|iwr|Invoke-WebRequest)[^|]*\|[[:space:]]*(ba|z)?sh'; then
  block "piping a downloaded script into a shell"
fi

exit 0
