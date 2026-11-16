---
name: release
description: Read before cutting an npm release for this repo.
---

Coordinated shim + SDK rollout: [shim-rollout](../shim-rollout/SKILL.md).

## Division of labor

|Who|Does|
|---|---|
|**Agent**|Product commits, `npm run ci:local`, version bump commit, tag, GitHub release, push, **`bin/npm-publish-web.sh`** (npm web 2FA).|
|**User**|Approve **browser** prompts when publish/login opens npm (security key). Shim publish to npm when the rollout needs a new `@flesler/cursor-canvas-web`.|

- On `/release`: run the full agent checklist; do not stop after the version commit or defer publish to the user unless this script fails.
- Run `npm run ci:local` before the version commit when practical; pre-push hooks run again on push.
- Do **not** run bare `npm publish` in the agent shell (no TTY). Use **`bin/npm-publish-web.sh`** only.

## Commit shape

NEVER squash product work into the version commit. NEVER use one commit that mixes features with `package.json` / `CHANGELOG.md` for the release (including subjects like `Release 1.3.0: …` that bundle both).

1. Land normal commits on `main` first — plain descriptive subjects (no `feat:` / `chore:` prefixes).
2. Last commit before the tag: **only** the release version bump and `CHANGELOG.md` for that version. Commit subject is **exactly the version number**, e.g. `1.3.0`.

   Bump `package.json` `version`, then sync the lockfile in the **same** commit:

   ```bash
   npm version X.Y.Z --no-git-tag-version --allow-same-version   # if package.json already shows X.Y.Z
   # or: npm version patch|minor|major --no-git-tag-version
   npm install   # when dependencies changed; refreshes resolved versions in package-lock.json
   ```

   `package-lock.json` must match: root `version`, `packages[""].version`, and dependency entries (not only `package.json`).

   After the shim is on npm, run `npm update @flesler/cursor-canvas-web` so `package-lock.json` **integrity** matches `npm view … dist.integrity` (`npm run check:lock` enforces this when the version is published). **Never** `npm install` a local `.tgz` or `file:` path.

   Move the git tag to the commit you will publish if you fixed the lock after the version-only commit (e.g. `git tag -f vX.Y.Z` on `main`); npm uses the tree at **HEAD** / the tag, not “the version commit” in isolation.

`CHANGELOG.md` uses `## [X.Y.Z]` with a `#### YYYY-MM-DD` line under each release. Put the new section in the version-only commit unless it already landed in earlier commits on `main`.

## Ready to ship?

If this release needs a new `@flesler/cursor-canvas-web`, the user ships the shim first (shim repo `.cursor/skills/release/SKILL.md`), then the agent bumps the dependency here and continues.

```bash
npm run ci:local
```

```bash
npm view @flesler/open-canvas version
node -p "require('./package.json').version"
```

Ship when `ci:local` is green, changelog matches the diff since the **previous git tag**, and the tree is clean except the version-only commit you are about to make.

## Tag, GitHub release, and push (agent)

NEVER run bare `git tag` (opens an editor). Pass name and message on the CLI:

```bash
VERSION=1.3.0
git tag -a "v${VERSION}" -m "v${VERSION}"
git push origin main "v${VERSION}"
```

One push for branch + tag (avoids running pre-push twice).

Then create the GitHub release for that tag (tags alone are not enough). `--title` is already the version — notes must **not** repeat `## [X.Y.Z]` (body starts at `####` date or `#####` groups):

```bash
VERSION=1.13.1
mkdir -p "/tmp/open-canvas-release-notes"
awk -v ver="${VERSION}" '
  $0 ~ "^## \\[" ver "\\]" { body=1; next }
  body && /^## / { exit }
  body { print }
' CHANGELOG.md > "/tmp/open-canvas-release-notes/v${VERSION}.md"
gh release create "v${VERSION}" --title "v${VERSION}" --notes-file "/tmp/open-canvas-release-notes/v${VERSION}.md"
```

Use `--latest` on the newest semver when backfilling older tags without bumping “Latest”. Fix shipped duplicates: `gh release edit "v${VERSION}" --notes-file "…"`.

## Publish to npm (agent + browser)

From repo root after push (on the tag commit you intend to ship):

```bash
npm whoami   # if 401, user must complete one web login; agent can retry after
./bin/npm-publish-web.sh
# optional: NPM_PUBLISH_TIMEOUT=300 ./bin/npm-publish-web.sh
```

`bin/npm-publish-web.sh` wraps `script` + `expect`: sends Enter, opens the browser for **web 2FA** (`auth-type=web` in user `~/.npmrc`). Tell the user **once** to watch for the npm auth tab and approve with their security key; do not ask them to run `npm publish` manually.

- Success: `+ <package.json name>@…` or “previously staged version” (upload already in flight).
- `prepublishOnly` runs `build:cli`. Defaults: `--access public --tag latest`.
- Registry **lags** minutes after success; do not treat immediate `npm view` as failure.

```bash
VERSION="$(node -p "require('./package.json').version")"
PKG="$(node -p "require('./package.json').name")"
~/.claude/skills/npm/scripts/wait-for.sh "$PKG" "$VERSION"
```

## Checklist (agent)

1. Product commits on `main` (including shim dependency bump with `package-lock.json` in the **same** commit — `npm update @flesler/cursor-canvas-web` once the new shim is on npm).
2. `npm run ci:local` green.
3. Version-only commit (`package.json`, `package-lock.json`, `CHANGELOG.md`) — subject `X.Y.Z`.
4. `git tag -a vX.Y.Z -m vX.Y.Z` → `git push origin main vX.Y.Z`.
5. `gh release create vX.Y.Z` with notes = that CHANGELOG section **without** the `## [X.Y.Z]` line.
6. `./bin/npm-publish-web.sh`; notify user if browser 2FA is required; `wait-for.sh` until the version appears on the registry.

## Checklist (user)

1. Publish shim to npm when SDK / canvas skill reference changed.
2. Approve npm **browser** 2FA when the agent runs `bin/npm-publish-web.sh` (only if prompted).