# Recoil City — Update A expansion
Development branch based on main. Not deployed.

- World: 2400×1920 versus 1200×960, 16 named districts, expanded road grid, additional shops and delivery stops. New districts are street-grid expansions, not bespoke airport/beach/farm geometry.
- Shops: T/touch enter/exit, first-person interiors, B purchase, H fictional robbery with local cash and cooldown. Shopkeepers can take damage. Repair shop remains a drive-up service. Interiors are separate local scenes, police wait outside.
- Police: bounded on-foot officer population, patrol dismount near on-foot wanted player, line-of-sight attack checks, automatic recovery after a 2.4-second DEAD state. All lethal deaths use the overlay, not just police headshots.
- Vehicle collisions: player-driven vehicles use swept collision checks against nearby active pedestrians and officers; lower-speed knockdown, higher-speed defeat. Non-graphic static articulated fallen pose, not a full rigid-body ragdoll solver.
- Performance: nearby region geometry replaces previous region geometry rather than storing the whole expanded mesh, indexed nearby building checks, bounded population and displaced drivers, existing low graphics limits. Region transitions may still cause frame spikes; actual hardware measurements required.
- Verified smoke tests executed actual world module: expanded size/population, enter/rob/cooldown/exit, dismount, death/respawn, low/high speed vehicle impacts. All three city scripts parsed. Shopkeeper hit rendering, real browser controls, WebGL/software renderer, existing regression suite, FPS and production deployment remain unverified. Preserve city radio and all other main-branch content.
