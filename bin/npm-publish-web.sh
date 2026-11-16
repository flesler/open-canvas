#!/usr/bin/env bash
# Publish with npm web 2FA from shells without a TTY (e.g. Cursor agent).
# Uses script(1) for a pseudo-TTY and expect to send Enter when npm opens the browser.
#
# Usage: bin/npm-publish-web.sh [npm publish args...]
# Default args: --access public --tag latest
# Env: NPM_PUBLISH_TIMEOUT — seconds (default 180); wrapped with timeout(1).
#
# Success is matched from package.json "name" (+ name@version). Registry can lag minutes
# after a green exit; use: npm view <name> version
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CAP="${NPM_PUBLISH_TIMEOUT:-180}"

if [[ $# -eq 0 ]]; then
  set -- --access public --tag latest
fi

PKG_NAME="$(node -p "require('${ROOT}/package.json').name")"
# Tcl expect -re: escape regex metacharacters in the package name.
PKG_RE="$(printf '%s' "$PKG_NAME" | sed 's/[][.^$*+?{}()|\\]/\\&/g')"

PUBLISH_CMD=(npm publish "$@")
QUOTED="$(printf '%q ' "${PUBLISH_CMD[@]}")"

timeout "${CAP}" expect <<EXPECT
set timeout [expr {${CAP} - 5}]
cd {$ROOT}
log_user 1
set pkg_re "${PKG_RE}"
spawn script -qefc {$QUOTED} /dev/null
expect {
  -re {Press ENTER[^\n]*} { send "\\r"; exp_continue }
  -re {Authenticate your account at:} { send "\\r"; exp_continue }
  -re {Your package is being processed} { exp_continue }
  -re "\\\\+ \$pkg_re@" { exit 0 }
  -re {Cannot publish over previously staged version} { exit 0 }
  -re {npm error code} { exit 1 }
  timeout { exit 2 }
  eof { exit 1 }
}
EXPECT