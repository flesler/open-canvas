---
name: release
description: Read before cutting an npm release for this repo.
---

Coordinated shim + SDK rollout: [shim-rollout](../shim-rollout/SKILL.md).

## Division of labor

|Who|Does|
|---|---|
|**Agent**|Product commits, `npm run ci:local`, version bump commit, annotated tag, `git push origin main vX.Y.Z` (one push for branch + tag).|
|**User**|`npm publish` only (npm 2FA). Shim publish to npm when the rollout needs a new `@flesler/cursor-canvas-web`.|

- **Never** `npm publish` in the agent — user publishes to npm only.
- On `/release` (or an explicit release request): run the full agent checklist below; do not stop after the version commit and wait for the user to tag or push.
- Run `npm run ci:local` before the version commit when practical; pre-push hooks run again on push — do not chain `git push` and `npm publish` in one command (user publishes separately).

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

   After the shim is on npm, run `npm update @flesler/cursor-canvas-web` so `package-lock.json` **integrity** matches `npm view … dist.integrity` (`bin/check-package-lock.sh` enforces this when the version is published). **Never** `npm install` a local `.tgz` or `file:` path.

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

## Tag and push (agent)

NEVER run bare `git tag` (opens an editor). Pass name and message on the CLI:

```bash
VERSION=1.3.0
git tag -a "v${VERSION}" -m "v${VERSION}"
git push origin main "v${VERSION}"
```

One push for branch + tag (avoids running pre-push twice).

Optional GitHub release (only if the user asks):

```bash
gh release create "v${VERSION}" --notes-file CHANGELOG.md --title "v${VERSION}"
```

Trim notes to that version’s section if the file lists multiple releases.

## Publish (user only)

```bash
npm publish --access public --tag latest
```

`prepublishOnly` runs `build:cli`. Scoped package needs `--access public` and npm 2FA.

After publish, user may confirm: `npm view @flesler/open-canvas version`.

## Checklist (agent)

1. Product commits on `main` (including shim dependency + lockfile when needed).
2. `npm run ci:local` green.
3. Version-only commit (`package.json`, `package-lock.json`, `CHANGELOG.md`) — subject `X.Y.Z`.
4. `git tag -a vX.Y.Z -m vX.Y.Z` → `git push origin main vX.Y.Z`.
5. Tell the user to `npm publish --access public --tag latest` when git is on the tag they expect.

## Checklist (user)

1. Publish shim to npm when SDK / canvas skill reference changed.
2. `npm publish --access public --tag latest` for `@flesler/open-canvas`.
3. `npm view @flesler/open-canvas version`.
