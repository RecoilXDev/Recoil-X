# A.2 — Operation Polish
Baseline: A.1 241/241 tests and Alwaysdata deployment succeeded. First optimization pass: direct mission-goal lookup, early exit collision query, constant-time road checks, reusable typed GPU geometry buffer, cached minimap geometry and routes, reduced input allocations and redundant camera work, adaptive render scale with hysteresis, weather filter changes only when needed, hide weapon mesh in safe interiors, cache version bump. Simulation and controls unchanged. Full CI and actual device benchmarks pending; no FPS increase claimed.

FPS polish: pooled nameplate DOM nodes, direct actor iteration without cloning actor objects, cached viewport dimensions and frame budget, and no render-scale adaptation from menu-only samples. Direct A.1/A.2 comparison: 1,200 identical driving inputs per graphics tier, zero observed position differences and matching cash/heat. Geometry packing regression added. All new changes require full CI and device validation.

## Networking, diagnostics and resource lifetime
Private city requests use bounded exponential retry delays and retain remote avatars briefly through transient failures. City Hub displays measured frame-time estimates, internal render scale, renderer type, active NPC count and HTTP request RTT (not raw network ping). Explicit radio unmount and renderer listener cleanup prevent detached panels and late WebGL restore allocation. Overdrive avoids sending stale snapshots after expired player cleanup removes a match. Expired city rooms are swept during periodic server housekeeping. No measured latency or device FPS improvements claimed.

City automatically selects a conservative 30 FPS render target for TVs, mobile touch devices, low-memory or unknown hardware. Manual graphics quality remains selectable; physics stays at its existing substep rate. Minimap objective markers no longer construct the full hub view. Actual TV and phone benchmarks remain required.

## Cinematic Replay
Four deterministic, repeatable director sequences (drive, pursuit, action props and skyline) and a 35-second sequence playlist. Isolated world using existing driving/combat logic, playback pause/restart/next/speed, hide controls and restore original career on exit. Not a video encoder or replay of recorded player input. Browser capture remains external. Full CI and visual QA outstanding.

Cinematic follow-up: full HUD-free capture, tap/H reveal, manual next from any selected scene, actual weapon regression with the game loadout (18 rounds fired and three props damaged in direct test). Camera finite in all four scenes. Impact animation now eases into the existing knockdown pose, and the shared third-person rig shows aiming/weapon on firing. Ragdoll is still a simulated pose, not independent limb physics.

## Bot and arena CPU pass
Allocation-free ray/AABB slabs, early-exit line-of-sight checks, single-pass nearest eligible target selection, AI accumulator reset between matches and avoiding identical FPS counter text writes. 12,000 direct ray and sight comparisons passed against the preceding implementation; automated regression includes randomized rays, cover blocking and target eligibility/ties. Bot count, accuracy and tactical policy not intentionally changed. Hardware performance still unmeasured.

## Extended stability verification
Direct 30-minute high-detail city simulation (7,200 steps): bounded vehicle count (16), active pedestrians (18), finite positions/HP/cash, no negative balances. This is a world simulation, not a browser heap measurement. Automated 10-client WebSocket match traffic increased from 25 to 125 input intervals per client; six-minute simulated 10-player match and bounded history tests added. Pending CI. No claim of production load or latency certification.
