# Dependencies and CI

- **Node:** `.nvmrc` (`v24.11.1`) — CI uses `node-version-file` and `npm ci`.
- **After dep changes:** `nvm use && npm install`, then `npm ci` locally.

Vitest’s lock here stays valid across npm 10 and 11 on `npm ci`. Shim integrity: `npm run check:lock`. html-video had a **npm-10-only CI** period that needed an extra gate; both repos now use **Node 24** from `.nvmrc`.