# A.3 — Perfection
First polish pass, based on deployed A.2 (260/260 tests).

- Camera wall recovery retracts immediately and smoothly extends only when safe, reset on respawn and first-person mode. Shoulder and aiming logic retained.
- Visual-only weapon-specific recoil envelopes, eased reload stages, shotgun shell label correction, motion-dependent weapon sway, and smooth local crouch rig blending. Empty magazines no longer mark a shot before reload.
- Bounded procedural audio voices (5 mobile, 10 desktop), class-specific envelopes, stereo attenuation and mono fallback. Existing soundtrack and Smart TV audio path retained.
- Short menu entry transitions and keyboard focus rings. Respect the existing reduce-motion setting and disable extra motion on low-performance/TV profiles. Animation adaptation ignores menus.
- Visible A.3 release label, preserved compatibility build identifier and new service-worker cache revision.

Five targeted checks passed directly, plus inline JavaScript/service-worker syntax. Full CI and physical-device playtesting pending. No new modes, model overhaul, physics or weapon damage changes. Spatial audio is procedural stereo positioning, not a recorded audio pack or full occlusion simulation. This is the first A.3 pass, not final visual QA.
