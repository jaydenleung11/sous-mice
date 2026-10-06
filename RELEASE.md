# Sous Mice browser playtest release

[Play](https://sous-mice.vercel.app) · [GitHub](https://github.com/jaydenleung11/sous-mice)

The challenge's public multiplayer deliverable is live. This is not a claim that every item in the much larger v2 specification has passed acceptance.

## Built

- Room codes and invite links, 2–8 players, team/class selection, readiness, host options, bot fill, rematches and reconnect with restored identity.
- A shared restaurant with four rooms, a Burrow, tunnels, eleven holes, pickups, hiding spots and cages. Build-time graph validation checks access, escape routes and cage travel.
- Mice steal, eat, deliver, hide, sabotage and rescue. Chefs serve, inspect, grab, carry, cage, search, trap and plug holes. Guests react; orders affect Rating; all four victory conditions are implemented.
- Seven character kits, nine foods, abilities, hazards, timed events, team-only pings, private team snapshots, movement prediction and interpolation.
- Fourteen action-driven tutorial lessons; keyboard and landscape touch controls; audio, captions, remapping, reduced motion, handedness and larger-control settings.
- Original vector characters and props, generated title illustration, synthesized sound and music, PWA manifest/service worker, PNG icons and screenshot pack.
- Vercel frontend with a Cloudflare Durable Object per game room; standalone Node and PartyKit adapters remain in source.

## Cut or simplified

Gamepad, replay highlights, cosmetics, Dumbwaiter, Colony Feast, Soup Surprise, Rafter Run and roaming waiter/line-cook reactions are deferred according to the spec's cut list. Colony Orders and the full Honey wall-climb mechanic are also unimplemented gaps. Guest animations and the art/audio pass are simpler than the requested full animation, lighting and adaptive-music specification. The spectator experience has no free camera. The native wrapper is configuration and instructions only.

## Known issues and unverified criteria

- Bot balance misses the specification: 300 runs had 54.67% chef wins overall, but 72.97% in 3-vs-3. Lockdown wins are too common, Rating-collapse wins absent, and 33% of matches end before five minutes. Median duration is 378.57 seconds. Human balance is untested.
- Stress-test results and exact network-model limitations are recorded in QA.md. A simulated retransmission model does not certify actual mobile packet-loss behavior.
- A short desktop headless rendering sample averaged 17.39 fps, below the specified 60 fps target. Hardware-accelerated browser and physical-device performance need further validation and optimization; this release is not performance-certified.
- Two isolated browser contexts passed a live 90-second match, including page-refresh recovery. Full human eight-minute sessions at 2, 4 and 8 players, physical phone testing, GPU/memory budgets, store-device benchmarks and a complete accessibility/contrast audit remain outstanding.
- Some compact labels are smaller than the spec's minimum font sizes. Touch action targets passed the 48-pixel check; that is not a complete accessibility certificate.
- Room codes are invitations, not strong access control. Inactive stored rooms are cleaned on subsequent room activity, not by a guaranteed wall-clock deletion job. A rare code collision requires creating another room.

## Store readiness

Prepared: 192/512/1024 PNG icons, maskable artwork, browser screenshots at four sizes, listing copy, privacy and play-guideline drafts, asset credits, PWA files and Capacitor configuration/instructions under `store/`.

Not prepared or verified: signed Android/iOS binaries, native platform builds, full store screenshot/feature-graphic package, real-device certification, owner support contact, completed privacy/rating questionnaires and store submissions. Developer accounts, signing and any fees remain owner-controlled gates. No app-store submission has been made.
