# A.1 — City Unleashed
First implementation slice: local city properties, dealership, engine upgrades, three sequential story missions, venue visits, time/weather cycle and City Hub. Original 16 districts and radio preserved. Full CI, multiplayer, interiors, account-level persistence and device QA remain outstanding.

## Shared city prototype
Authenticated private rooms (up to eight players, 32 city participants per process). Server-generated join codes; expiring seats; validated, rate-limited position updates and no shared money, damage or NPC authority. Ghost-style visual presence and minimap markers, not full authoritative city multiplayer. Actual multi-device play and load tests outstanding.

## World expansion
25 districts, 2,880 × 2,400 map (50% greater area than 2,400 × 1,920), original positions retained, four additional delivery destinations, two restaurants, four new traffic loops and phased traffic lights in new districts. Owned homes and Mega’s Club have simple walkable interiors; club is a venue, not yet a full interactive concert. Day/night and weather are basic visual effects. Actual device FPS is unverified.

## Racing and networking polish
Two timed street races with ordered checkpoints, saved personal records and city-local cash awards; remote avatars interpolate between low-frequency snapshots. Authenticated HTTP integration regression added. Full authoritative co-op gameplay and physical device performance still require verification.
