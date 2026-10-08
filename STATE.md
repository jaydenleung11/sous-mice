# Build state

The 3D preview was published and merged into main through PR #1. The October 8 cartoon art update makes whole-mouse follow view the default inside 3D, with a View button / P shortcut for first-person. See ART-CARTOON.md for the latest artwork and verification. Classic remains the default renderer until the full acceptance checklist passes.

- 3D: https://sous-mice.vercel.app/?r=3d
- Classic: https://sous-mice.vercel.app/?r=2d
- Source: https://github.com/jaydenleung11/sous-mice
- Rooms: https://sous-mice-rooms.sous-mice.workers.dev

Implemented: 44x30 metre map, 7cm mouse camera, original textured rooms/characters, shared capsule controller and navigation, jump/climb, desktop/touch look controls, comfort settings, senses, server-timed tunnel transit and privacy, room-mode isolation, reconnect, capture/rescue/service rules, 11 mouse and 8 chef tutorials.

Verified October 8, 2026: 90 unit tests; both graph validators/build/type checks; both 3D tutorials through browser controls; four 3D layouts, comfort settings and context recovery; six classic browser regressions; nine bot matches at 2/4/8 players. Public 90-second private desktop/phone-size playtest: 1,406 matching ticks, 85 private transit snapshots, same identity after refresh, no page errors. Modeled 120ms p95 correction 0.0955m. Intel Chrome stationary benchmarks measured about 60fps on High and phone-size Medium/Low; software rendering failed frame targets.

Deployment: Cloudflare ee18d21c-9fa4-46a1-b1fb-ecf6f3dcf7f9; verified Vercel production dpl_EBMMErsTAfnK844tfs8EqrJRcpng; main merge 0f1467d. Subsequent source-only documentation updates may cause equivalent automatic frontend rebuilds.

Remaining: physical-phone performance, full GPU/process memory and 4G startup, moving eight-player performance, human balance and earlier v2 targets. Deferred depth features and native/store release are listed in RELEASE-V3.md. No credential blocker remains. Next milestone: close these acceptance gaps before making 3D the default.
