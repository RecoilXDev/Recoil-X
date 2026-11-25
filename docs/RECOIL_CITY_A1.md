# A.1 — City Unleashed
First implementation slice: local city properties, dealership, engine upgrades, three sequential story missions, venue visits, time/weather cycle and City Hub. Original 16 districts and radio preserved. Full CI, multiplayer, interiors, account-level persistence and device QA remain outstanding.

## Shared city prototype
Authenticated private rooms (up to eight players, 32 city participants per process). Server-generated join codes; expiring seats; validated, rate-limited position updates and no shared money, damage or NPC authority. Ghost-style visual presence and minimap markers, not full authoritative city multiplayer. Actual multi-device play and load tests outstanding.

## World expansion
25 districts, 2,880 × 2,400 map (50% greater area than 2,400 × 1,920), original positions retained, four additional delivery destinations, two restaurants, four new traffic loops and phased traffic lights in new districts. Owned homes and Mega’s Club have simple walkable interiors; club is a venue, not yet a full interactive concert. Day/night and weather are basic visual effects. Actual device FPS is unverified.

## Racing and networking polish
Two timed street races with ordered checkpoints, saved personal records and city-local cash awards; remote avatars interpolate between low-frequency snapshots. Authenticated HTTP integration regression added. Full authoritative co-op gameplay and physical device performance still require verification.

## Stability and quality pass
Room lease identifiers isolate stale pulse/leave requests; a late connection is cleaned up using its own lease. Dealer recalls and per-owned-car respray persistence, story cancellation and checkpoint route markers added. City death clears active races. Service-worker cache bumped to A.1 and includes the New Dawn menu track. Full CI and physical device verification required.

Activities are mutually exclusive with a cancellation path; remote and local avatar animation phase bounded. Direct deterministic 600-second simulation per tier (7,200 total steps) passed finite-state and population-limit assertions. A shorter version is in CI. No physical-device FPS certification or complete multiplayer authority is claimed.
