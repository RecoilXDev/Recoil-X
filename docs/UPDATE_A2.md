# A.2 — Operation Polish
Baseline: A.1 241/241 tests and Alwaysdata deployment succeeded. First optimization pass: direct mission-goal lookup, early exit collision query, constant-time road checks, reusable typed GPU geometry buffer, cached minimap geometry and routes, reduced input allocations and redundant camera work, adaptive render scale with hysteresis, weather filter changes only when needed, hide weapon mesh in safe interiors, cache version bump. Simulation and controls unchanged. Full CI and actual device benchmarks pending; no FPS increase claimed.

FPS polish: pooled nameplate DOM nodes, direct actor iteration without cloning actor objects, cached viewport dimensions and frame budget, and no render-scale adaptation from menu-only samples. Direct A.1/A.2 comparison: 1,200 identical driving inputs per graphics tier, zero observed position differences and matching cash/heat. Geometry packing regression added. All new changes require full CI and device validation.

## Networking, diagnostics and resource lifetime
Private city requests use bounded exponential retry delays and retain remote avatars briefly through transient failures. City Hub displays measured frame-time estimates, internal render scale, renderer type, active NPC count and HTTP request RTT (not raw network ping). Explicit radio unmount and renderer listener cleanup prevent detached panels and late WebGL restore allocation. Overdrive avoids sending stale snapshots after expired player cleanup removes a match. Expired city rooms are swept during periodic server housekeeping. No measured latency or device FPS improvements claimed.

City automatically selects a conservative 30 FPS render target for TVs, mobile touch devices, low-memory or unknown hardware. Manual graphics quality remains selectable; physics stays at its existing substep rate. Minimap objective markers no longer construct the full hub view. Actual TV and phone benchmarks remain required.

## Cinematic Replay
Four deterministic, repeatable director sequences (drive, pursuit, action props and skyline) and a 35-second sequence playlist. Isolated world using existing driving/combat logic, playback pause/restart/next/speed, hide controls and restore original career on exit. Not a video encoder or replay of recorded player input. Browser capture remains external. Full CI and visual QA outstanding.
