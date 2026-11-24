# Update A — Beta candidate (B1)
This branch inherits all Alpha workstreams. It is not a certified Beta release and must not deploy to the public Z.5 server.
## Run a separate instance
From repository root, using Node 24:
```sh
npm install --prefix server --no-audit --no-fund
RX_CHANNEL=beta RX_DB=./recoil-x-beta.sqlite RX_BIND=127.0.0.1 PORT=8788 node server/a-beta-supervisor.mjs
```
Use a separate hosting site, working directory, database, backups, session keys and test accounts; never point Beta at production data. The supervisor is opt-in; confirm your host permits child processes. Existing in-memory matches cannot survive a process crash.
The health endpoint /rx-api/health reports channel beta and readyForProduction false only when RX_CHANNEL=beta. Shield capacity environment variables: RX_MAX_PLAYERS (40), RX_MAX_PENDING (12), RX_MAX_RSS_MIB (512), RX_MAX_AUTH_JOBS (2), RX_MAX_QUEUE (100). These are policy defaults, not host benchmarks.
## Workstream gates
| Workstream | Candidate scope | Beta gate |
|---|---|---|
| Multiplayer 3.0 | delivery profiles and reports | two devices; 10 concurrent; RTT/jitter/reconnect |
| Combat | confirmed hits and statistics | weapon/animation/hit tests |
| Performance | replaceable snapshot throttling | FPS and memory on mobile/TV/PC |
| Security & Accounts | revoke sessions; rate limits; moderation | simultaneous login/ban/recovery tests |
| UI | Sand control center | keyboard, controller, mobile and TV checks |
| Graphics | shader pass, reward previews | GPU compatibility; actual equipped model work |
| AI bots | cached detours and timed intel | navigation and group behavior scenarios |
| Progression | persistent XP and badges | duplicate and abuse tests |
| Community | leaderboard and moderated discovery | permission and moderation checks; tournaments pending |
| Season 1 | Nov 30 opening, kill competition, free badge pass | date boundaries; reward award/claim; themed inventory pending |
| Physics Breaker | knockback and ring-outs | multiplayer movement and fairness |
| Curator | 3D editor, co-op grid, event rules, first-person solo view | save/share/moderation; room isolation; main FPS engine integration pending |
| Shield | queue, maintenance, memory/auth guard, batch moderation, opt-in restart supervisor | capacity, recovery/rollback, hosting-edge security |
## B1 changes
- First-person solo Curator playtest with wall occlusion and relative movement. It is not the main FPS combat engine.
- Co-op UI isolation and stale-response protection.
- Shield admission offers suspended while capacity/maintenance/memory pressure prevents admission.
- Explicit Beta release channel and separate default database.
- Standalone restart supervisor with bounded exponential retry. No match restoration.
- Non-deploying Node 24 CI workflow and additional regression tests.
## Promotion checklist
1. Green full CI, inspect test output and resolve all failures. No skipped failures.
2. Run isolated staging, create test accounts, verify saves, moderation, progression and Season 1 date boundaries.
3. Test 2-device, 4-player Curator and 10-player load; verify server capacity, queue expiry and maintenance.
4. Test low graphics on iPhone 8 Plus, phone/tablet controls, TV/controller and desktop; compare FPS/memory to Z.5.
5. Verify DB backup restoration on a copy, kill the Beta process and verify supervisor recovery; confirm no production data is touched.
6. Finish outstanding core work, hosting CAPTCHA/edge protection where supported, and document device-ban/privacy policy. Do not claim DDoS immunity.
7. Only after approval, consider production promotion. Do not merge this branch automatically.
