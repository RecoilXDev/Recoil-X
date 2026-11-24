# RECOIL X Z.5 — Visual asset provenance review

Checked against the game source on 24 November 2026. This is a **code provenance audit**, **not** independent legal clearance or visual proof that no asset resembles another game's artwork.

## Findings grounded in the source

| Asset family | Source / observed implementation | Status |
| --- | --- | --- |
| 3D weapons and illustrated finishes | `index.html`: `GUN_ART`, `V8_GUN_FINISHES` and `v8Svg(f)` generate geometric SVG paths, fills and highlights from in-repository values | Code-generated within RECOIL X; visual similarity review outstanding |
| Knives and collectible blades | `index.html`: `VX_KNIFE_BOXES`, `VX_KNIVES`, `vxKnifePreview(k)` build weapon art using local geometry and colour variables | Code-generated within RECOIL X; visual similarity review outstanding |
| Mystery arenas and the OG futuristic map | `index.html`: `rx31BuildMysteryArena`, in-game map arrays, procedural cover and map-specific geometry | Local map generation; comparison with third-party level layouts outstanding |
| External files | The HTML has no static `<img src>` tags or external image CDN in the reviewed build. PeerJS is loaded externally as a network library, not a visual asset. | No direct external image dependency found in this HTML review; other files and licences still require inspection |
| High-risk legacy labels | Source comments mention MM2-style rarity colours and a Roblox-like camera; these describe gameplay inspiration and do **not** prove copying. Some item names evoke known genre conventions. | Do not claim originality solely from in-code comments |

## Action taken in this release

- Replaced the player-facing *tribute designs* / MM2 disclaimer with neutral **RECOIL X illustrated cosmetics** copy, instead of implying licensed third-party art.
- Kept existing weapon IDs and inventory keys stable so users do not lose owned items.
- Added a player-facing prompt to report any design too similar to a third-party weapon, knife, logo, or skin.
- Retained the sand edition, original map IDs, gameplay and account records.

## Manual review still required

1. Capture front, side and inspection frames for every named cosmetic and both standard/rare colourways; compare silhouette, distinctive accessories, trademark-bearing text, and surface detail with relevant published assets from other games.
2. Prioritise names and styles that explicitly refer to another game's recognizable designs (including **Meowlscope**, **Gingerscope** and rare sniper variants). An original *implementation* does not guarantee an original *appearance*.
3. For any substantial similarity, redraw the blade/receiver/optic geometry and make new independently designed ornaments, while keeping the internal item ID so saved inventory remains valid.
4. Confirm source and licensing for any future imported meshes, textures, sounds, third-party fonts or images before release. Use an asset register with artist, source URL, licence, original author and approval date.
5. Have a human reviewer sign off the visual comparisons. This document does not make that approval claim.

No asset is certified as IP-safe by these code checks. See [GitHub Issue #30](https://github.com/RecoilXDev/Recoil-X/issues/30) for the ongoing review.
