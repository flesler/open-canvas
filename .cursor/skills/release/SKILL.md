---
name: release
description: Read before cutting an npm release for this repo.
---

Coordinated shim + SDK rollout: [shim-rollout](../shim-rollout/SKILL.md).

## Commit shape

NEVER squash product work into the version commit. NEVER use one commit that mixes features with `package.json` / `CHANGELOG.md` for the release (including subjects like `Release 1.3.0: …` that bundle both).

1. Land normal commits on `main` first — plain descriptive subjects (no `feat:` / `chore:` prefixes).
2. Last commit before the tag: **only** `package.json` version (± lockfile if needed) and `CHANGELOG.md` for that version. Commit subject is **exactly the version number**, e.g. `1.3.0`.

`CHANGELOG.md` uses `## [X.Y.Z]` with a `#### YYYY-MM-DD` line under each release. Put the new section in the version-only commit unless it already landed in earlier commits on `main`.

## Ready to ship?

If this release needs a new `@flesler/cursor-canvas-web`, ship the shim first (its `.cursor/skills/release/SKILL.md`), bump the dependency here, then continue.

```bash
npm run ci:local
```

```bash
npm view @flesler/open-canvas version
node -p "require('./package.json').version"
```

Ship when `ci:local` is green, changelog matches the diff since the **previous git tag**, and the tree is clean except the version-only commit you are about to make.

## Tag (no editor)

NEVER run bare `git tag` (opens an editor). Pass name and message on the CLI:

```bash
VERSION=1.3.0
git tag -a "v${VERSION}" -m "v${VERSION}"
git push origin "v${VERSION}"
```

Push the version commit to `main` before or with the tag.

Optional GitHub release (explicit OK only):

```bash
gh release create "v${VERSION}" --notes-file CHANGELOG.md --title "v${VERSION}"
```

Trim notes to that version’s section if the file lists multiple releases.

## Publish

```bash
npm publish --access public --tag latest
```

`prepublishOnly` runs `build:cli`. Scoped package needs `--access public` and npm 2FA.

## Checklist

1. Product commits on `main`
2. Shim published first when SDK / canvas skill reference changed; dependency + lockfile updated here
3. `npm run ci:local`
4. Version-only commit (`package.json`, `CHANGELOG.md`, ± lockfile) — subject `X.Y.Z`
5. `git tag -a vX.Y.Z -m vX.Y.Z` → push `main` + tag
6. `npm publish --access public --tag latest`
7. `npm view @flesler/open-canvas version`
