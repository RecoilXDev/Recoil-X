# A.4 — Evolution
First coordinated model upgrade pass on A.3 (271 tests passed on last deployment).

- Close fighter body rings use higher tessellation, with armor accents, gloves, footwear, helmets and distinct boss accents. Low LOD unchanged. City civilian shirts and faces enhanced; officers receive uniform mesh details on standard/high; high local hero/officers receive closer LOD.
- All four FPS weapon classes gain bounded detail, skin colors preserved; knife mesh cache keys distinguish detailed and base geometry. New Dawn Sandwyrm rifle finish receives extra decorative accents. This is a skin, not a separate boss.
- Existing humanoid bosses and scorpion/Titan rig receive shell and crest accents without changes to health, hitboxes, AI or animations. No distinct Wadi Stomper asset was found in the examined source; do not claim a separate model redesign.
- Recoil City car exterior, cockpit panels, wheel spokes and police vehicle graphics upgraded; existing vehicle collision, motion and radio unchanged. High quality adds building rooftop/entrance, shop trim, palm and bench geometry. Arena and destructible cover trim respects original bounds.
- TV rendering paths and FPS limits unchanged. Extra dynamic geometry gated by quality; arena trim baked when a map builds, so graphics changes may require a new match. No asset downloads or textures added. Model upgrades are incremental geometry refinements, not wholesale professional asset replacements.
- A.4 branding and cache revision updated; old A.3 version test generalized without removing its TV/reduced-motion checks.

Five targeted checks and four syntax checks passed directly. Full integration, actual model appearance, FPS measurements and physical-device QA pending.

## Human Evolution follow-up
- Six selectable cast appearances (Ryan, Marcus, Victor Kane, Detective Carter, Eddie, Leon) in City settings, applied to the local character and existing cinematic replay. These are procedural visual interpretations, not film-grade models or a completed story campaign.
- Standard/high City civilians now have six deterministic face and hairstyle variants, with close-detail eyes, ears, jaw silhouettes, and optional facial hair. Police retain uniforms; shopkeepers gain apron/pocket geometry. Low LOD retains the earlier geometry, and the TV path only changes optional outfit colors. No simulation, hitbox, network or economy changes.
- A separate Wadi Stomper model and full scripted movie remain outside this patch: no matching existing Wadi Stomper asset or story scene system was verified. Physical-device QA and CI deployment verification still required.

## Recoil City visual overhaul
- Corrected invalid facade palette lookups in all expanded districts, including the peninsula and airport. Nearby standard/high geometry includes architecture, curved palms and leaflet crowns, lamp bases, park fountain detail, benches and shop trim. Existing map bounds and gameplay are unchanged.
- Nearby cars use sculpted, tapered shells, distinct sport/sedan/utility rooflines, wheel arch trim and detailed lamps; dashboard, console and door interiors upgraded. Distant cars retain simpler geometry. Vehicle physics and ownership unchanged.
- Existing home, club and shop interiors get room-specific furnishing, lighting fixtures, shelves, products, a register and stage equipment. Added character clothing and footwear details to standard/high rig models. Low graphics and TV fallback retain their original geometry budgets (apart from invalid palette correction).
- This is a procedural mesh pass, not a replacement with imported photorealistic assets. Hardware FPS and visual QA remain necessary.

## Weapon Evolution follow-up
- Four core FPS classes now use original beveled receiver and body geometry on high/ultra, with distinct decorative panels and finish accents. The previous geometry remains on low/TV and distant actors; existing Godly and seasonal silhouettes, reload and recoil behavior remain intact.
- High-detail knife handles and guards are beveled, with additional grip accents and subdivided curved blade profiles. Collection previews reuse the updated meshes. No change to knife stats, rarity or inventory.
- Recoil City standard/high uses four distinct sculpted held weapon models, including first-person and animated NPC views; TV/low retain the original simple geometry. These are fictional cosmetic meshes only, not changes to weapon mechanics or hit detection.

## A.4 release-candidate human animation and boss pass
- Deterministic mixed pedestrian appearances, six additional hair/face variants and a narrower body rig on standard/high. Named story cast remains intact. Close high-quality civilians now use close LOD; distant civilians retain medium geometry.
- City poses include idle breathing, spine/hip sway, walk/run distinction, foot motion, jumping, and stable falls; input values are bounded. Original TV renderer is unchanged. Boss chest crests, shoulder and scorpion shell detail improved without combat changes.
- Release gate: actual device testing, visual screenshot comparison and 30 FPS TV target still require physical validation. A distinct Wadi Stomper model was not found in the source, and a full 30-minute movie is not implemented. Do not represent those as shipped.

## A.4 Hotfix 1 — Claude audit follow-up
- Analog touch joystick with radial dead zone, full diagonal movement, independent look pointer and camera-facing shift lock on foot. Driving uses the same analog stick and preserves auto-follow camera. Cancel, pointer loss, blur and settings reset input.
- Current release branding is derived from the release meta tag. Recoil City and main menu labels follow it; old version prefixes removed from feature hubs and mode names, while historical feature names remain. Build metadata updated to A.4-HOTFIX-1.
- Additional building window geometry, roof silhouettes, richer facade textures, fuller high-detail palms, distinct car trim and facial contours. Existing low/TV geometry budgets retained. Device and visual testing remain necessary.
