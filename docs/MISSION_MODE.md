# Mission Mode

Open **Play → Missions → Mission Mode**, choose **Dead Air**, then select **Start mission**. A clear unlocks the next story operation at every difficulty. **Daily dispatch** is open immediately. Each run uses the existing solo arena and can be played without signing into Friends. After the game page has loaded, the mission simulation runs on the device.

| Operation | What to do |
| --- | --- |
| Dead Air | Find the transmitter, scan it, clear the relay and extract. |
| Black Box | Carry a power cell to the archive. Read the code on the HUD and activate the three marked pads in order. |
| Long Way Home | Reactivate the repair drone. Stay close as it crosses the yard, then defend its broadcast. |
| Last Light | Choose the green service terminal or the red surge terminal. Restore power, open the vault and extract. |

## The 20 updates

| # | Update | How it works |
| --- | --- | --- |
| 1 | Transmitter scanning | Stay inside the marked circle to charge the station. You can leave and finish the scan when you return. |
| 2 | Power-cell delivery | Interact with the cell to pick it up. Follow the compass to the socket and interact again to install it. |
| 3 | Contested relay defense | Clear nearby guards, then hold the marked relay. Its progress pauses whenever a guard contests it. |
| 4 | Repair-drone escort | The drone moves while you are close and waits when you fall behind. |
| 5 | Three-symbol vault locks | Read the HUD sequence and activate the matching triangle, square and circle terminals. A wrong input resets the sequence. |
| 6 | Two finale routes | The service route uses a long scan. The surge route sends you on a cell delivery through an active pulse zone. |
| 7 | Hidden intel | Every operation has one optional cache. Collect it before extracting to earn the intel star. |
| 8 | Pulse hazards | A floor ring and a nearby HUD warning precede each pulse. Move outside the ring before impact. |
| 9 | Rechargeable radar | A pulse marks nearby guards and highlights intel and supply locations. Watch the cooldown before using it again. |
| 10 | Three field kits | Engineer accelerates scanning and relay work. Medic starts with more shield and heals more at lockers. Scout recharges radar faster. |
| 11 | Supply lockers | Each operation has one use of its locker. It restores health, shield and reserve ammunition. |
| 12 | Timed extraction | Stay inside the extraction circle for three continuous seconds. Leaving the circle restarts the countdown. |
| 13 | Three difficulty levels | Recruit, Standard and Veteran adjust guard count and health, pulse damage, the mission clock and the time-star target. |
| 14 | Local checkpoints | The current objective, equipment, health, ammo and collected items are saved. Select **Continue checkpoint** after leaving, reloading or failing. **Start over** uses your current kit selection. |
| 15 | Three-star grades | Earn a star for extracting, a second for collecting intel, and a third for meeting the displayed time target. |
| 16 | Personal bests | The board keeps your fastest clear and highest star grade for each story operation at each difficulty. |
| 17 | Signal colours | Ion blue is available immediately. Amber unlocks at four total stars, Orchid at nine. Colours apply to mission markers and the repair drone. Each operation contributes its highest grade across difficulties. |
| 18 | Oman daily dispatch | A different operation rotates in at midnight in Muscat. Radar recharges twice as fast. Earn one dated stamp per day, with the latest 31 shown as a count on the board. |
| 19 | Objective navigation and controls | The HUD gives direction and distance. On keyboard, use **E** to interact and **Y** for radar. Touch players get on-screen **Use** and **Radar** buttons. |
| 20 | After-action splits | The debrief shows the time spent on each completed objective. Replay the operation or jump to the next unlocked briefing. |

## Saves and replay

Story checkpoints and records belong to the browser, site and device you use. Alwaysdata and GitHub Pages each have their own browser storage. Daily dispatches have separate checkpoints. An active daily run keeps its original date even if you finish after midnight. If browser storage is full or disabled, progress lasts for that play session. A checkpoint resumes at the current objective, with its scan, lock or escort restarted. You can select a different difficulty for a separate checkpoint.

## Testing

Run the following from the repository root using Node.js 24 or later and the dependencies in `server/package.json`.

```sh
cd server
npm ci
cd ..
node --test --test-concurrency=2
```

The dedicated mission tests are in [mission-mode.test.cjs](../tests/mission-mode.test.cjs). They use the game's existing DOM harness, simulate player positions and drive the objective and frame loops. They cover story progression, both finale routes, controls, save and resume, grades, daily rollover, field kits and returning to Operation Blackout. Existing suites cover the local challenges and use local WebSockets for multiplayer matches.

For a manual playthrough, start Dead Air, use radar, collect the intel and complete the scan. Leave and return with **Continue checkpoint**. Eliminate the guards at the relay, step off the extraction pad before three seconds, then re-enter and finish. Check the last split and star grade on the debrief. Repeat with the touch control scheme. For a device-performance check, record the device, graphics preset and observed frame rate during the escort and the surge route.

### Verification on 18 November 2026

| Check | Observed result |
| --- | --- |
| Repository suite | 23 tests passed with Node.js 24.22.3. Six cover Mission Mode and 17 cover existing systems. |
| Story completion | The automated game harness finished all four operations and both Last Light routes. It checked the star grades, the debrief splits and the walkable objective positions. |
| Checkpoints and daily runs | Reload, defeat, timeout, an independent difficulty slot and session-only progress passed. The daily operation changed at 00:00 Muscat time and a replay awarded no duplicate stamp. |
| Browser controls | In Chrome, Dead Air opened from Play using both desktop and touch schemes. Keyboard **Y** and the on-screen **Radar** button revealed the intel bearing and started the cooldown. |
| Multiplayer regression | Local server tests passed at 2, 4, 6 and 10 simultaneous clients. The 2- and 10-player latency simulations also passed at 130 and 276 ms. |
| Device performance | Physical phone and TV frame rates and the user's internet ping were not measured in this release. |

## Release and rollback

The runtime change is in `index.html`. This release uses the existing automatic deployment workflow and has no server migration. To roll back just this release, revert its merge commit on a branch and merge the revert into `main`. The previous release was [the multiplayer connection update](https://github.com/RecoilXDev/Recoil-X/commit/01e2a7eb6b4624016ae7813fe270f3cc7982521e). Verify the Alwaysdata deployment job and open the Play menu after the revert. Mission progress uses dedicated `zone90v2_signal_` browser keys. Keep those keys for a later roll-forward. No production database restore or account reset is part of the rollback.
