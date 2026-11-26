# A.4 — Evolution
First coordinated model upgrade pass on A.3 (271 tests passed on last deployment).

- Close fighter body rings use higher tessellation, with armor accents, gloves, footwear, helmets and distinct boss accents. Low LOD unchanged. City civilian shirts and faces enhanced; officers receive uniform mesh details on standard/high; high local hero/officers receive closer LOD.
- All four FPS weapon classes gain bounded detail, skin colors preserved; knife mesh cache keys distinguish detailed and base geometry. New Dawn Sandwyrm rifle finish receives extra decorative accents. This is a skin, not a separate boss.
- Existing humanoid bosses and scorpion/Titan rig receive shell and crest accents without changes to health, hitboxes, AI or animations. No distinct Wadi Stomper asset was found in the examined source; do not claim a separate model redesign.
- Recoil City car exterior, cockpit panels, wheel spokes and police vehicle graphics upgraded; existing vehicle collision, motion and radio unchanged. High quality adds building rooftop/entrance, shop trim, palm and bench geometry. Arena and destructible cover trim respects original bounds.
- TV rendering paths and FPS limits unchanged. Extra dynamic geometry gated by quality; arena trim baked when a map builds, so graphics changes may require a new match. No asset downloads or textures added. Model upgrades are incremental geometry refinements, not wholesale professional asset replacements.
- A.4 branding and cache revision updated; old A.3 version test generalized without removing its TV/reduced-motion checks.

Five targeted checks and four syntax checks passed directly. Full integration, actual model appearance, FPS measurements and physical-device QA pending.
