# A.3 — Perfection
First polish pass, based on deployed A.2 (260/260 tests).

- Camera wall recovery retracts immediately and smoothly extends only when safe, reset on respawn and first-person mode. Shoulder and aiming logic retained.
- Visual-only weapon-specific recoil envelopes, eased reload stages, shotgun shell label correction, motion-dependent weapon sway, and smooth local crouch rig blending. Empty magazines no longer mark a shot before reload.
- Bounded procedural audio voices (5 mobile, 10 desktop), class-specific envelopes, stereo attenuation and mono fallback. Existing soundtrack and Smart TV audio path retained.
- Short menu entry transitions and keyboard focus rings. Respect the existing reduce-motion setting and disable extra motion on low-performance/TV profiles. Animation adaptation ignores menus.
- Visible A.3 release label, preserved compatibility build identifier and new service-worker cache revision.

Five targeted checks passed directly, plus inline JavaScript/service-worker syntax. Full CI and physical-device playtesting pending. No new modes, model overhaul, physics or weapon damage changes. Spatial audio is procedural stereo positioning, not a recorded audio pack or full occlusion simulation. This is the first A.3 pass, not final visual QA.

Deployment follow-up: initial A.3 passed all 265 tests but failed an outdated live branding check. The next deployment failed one legacy title assertion after the browser title was corrected. The regression now requires the browser title and startup branding to match release metadata, and preserves legacy branding safeguards. Direct checks of both the regression and expected live HTML passed; complete redeployment is pending.

## Second polish pass
Distance-driven local footsteps, sprint/slide weapon pose easing, remote and bot firing pose timestamps, and a single cancellable hit indicator timeout. Reset transient motion on respawn/match exit. City hero stride now blends to idle on standard/high graphics with TV and reduced-motion bypass. No authoritative simulation, damage, vehicle physics or player economy changes. Three targeted checks and three/four script syntax checks passed directly; full CI and visual/audio testing pending. Procedural footsteps are deliberately subtle, not recorded samples. Parkour remains the existing slide/vault mechanic with visual pose refinement, not new physics.

## Third polish pass
Weather-aware procedural wind, rain, storm, sand, underwater and city ambience, one cached three-second mono noise buffer, single non-overlapping ambient voice, disabled on TV/low-power devices and on mute, pause, hidden tabs and City cinematic mode. Existing radio/music unaffected. Vault now has a short visual-only eased pose in first person and third-person fighter rig; slide pose refined; no physics, damage, networking or economy changes. Three targeted checks and four syntax checks passed directly. Full CI, actual sound quality, and visual/device acceptance remain pending. No advanced new parkour mechanic is claimed: existing vault and slide are visually refined.
