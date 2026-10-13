# Skip

Intentional non-goals — things we considered and chose not to do, with enough context that we don’t re-litigate every release.

## GitHub Actions cache for Playwright browsers

We run `npx playwright install chromium` in [`.github/workflows/ci.yml`](../.github/workflows/ci.yml) so `render.test.ts` and `test:smoke` can launch Chromium. We do **not** cache `~/.cache/ms-playwright` in Actions.

**Measured (ubuntu-latest, 2026-10-13, run `38473880953`):** `playwright install chromium` ≈ **8s** wall time (chromium + headless shell + ffmpeg).

**Scale:** a full local `~/.cache/ms-playwright` tree is on the order of **~700MB**; CI installs a subset but still large blobs.

**Why skip caching**

- `actions/setup-node` `cache: npm` only covers npm’s cache, not browser binaries.
- Playwright does not enable GHA caching unless we add an explicit `actions/cache` step (or a dedicated action).
- Restoring/uploading hundreds of MB often costs **similar or more** time than a fresh ~8s download on hosted runners, plus cache quota and key churn.
- If we ever cache, key on **Playwright version from `package-lock.json`** (e.g. `node_modules/playwright` → `1.64.0`), not the whole repo or unrelated lock changes — not worth adding until installs are routinely **~30s+** or we multiply browser-heavy jobs per push.

**Alternatives we keep instead:** one `playwright install` in CI; smoke already needs Chromium via `ensureChromium`. Optional future lean-up: fold selector coverage into smoke and drop browser unit tests — still one install, not a second cache strategy.
