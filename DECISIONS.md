# Decisions
- User request controls publishing: GitHub repository and new Vercel project.
- Keep a standalone Node WebSocket adapter plus a room-service adapter: Vercel supports WebSockets but separate connections are not guaranteed to share a process, and duration limits require durable room ownership. Never deploy an in-memory-only multi-instance game and claim it is synchronized.
- Spec tunnel graph has a bridge at B–T1 and only one foyer exit, contradicting M3; add B–T3 and a second foyer hole to make two independent escape routes real.
- Shared contract first, then separate implementation ownership and independent verification as explicitly requested in SPEC Section 3.
- Direct Cloudflare SQLite Durable Objects backend with Vercel frontend after PartyKit shared-domain quota failure. Each room gets its own authoritative actor.
- Heist scaling tuned from 5 to 1.75 (35% original gain) after bot pilots ended too quickly; rule tests preserve capture/rescue/timing semantics. The final 300-match balance targets still fail; report this explicitly.
- Use elapsed-time 30 Hz clocks instead of relying on timer frequency. Send only the newest input after a delayed client poll, avoiding a catch-up burst. Server message limits remain unchanged.
- Release as a public browser playtest, with explicit scope and acceptance gaps in RELEASE.md and QA.md. Do not imply full v2 certification or store readiness.

## First-person 3D migration
- The explicit `?r=3d` flag creates an immutable 3D room ruleset. Invites carry the renderer flag and joining clients inherit room mode. `?r=2d` creates classic rooms. Default remains classic until all acceptance gates pass.
- Ground coordinates retain x/y compatibility; z is elevation. Three.js renders them as x/z/y. World units in 3D are metres. Both server movement and prediction use the same capsule controller.
- The tunnel selection window precedes the run. `depart` is the authoritative run start and `arrive=depart+duration`; this resolves the specification's selection-window/formula ambiguity. Choosing an exit early departs immediately. Reduced animation never grants an early server arrival.
- Traveling mice are omitted from all chef snapshots, including radar. Peek and Tunnel Ear produce anonymous nearby cues rather than entity silhouettes, preserving the privacy requirement.
- Original procedural textured geometry replaces downloaded glTF/KTX2 assets. Static props are merged by material and room, with quality tiers and dynamic resolution. The 2.04MB navigation JSON is server/build data; the frontend bundler removes unused graph exports, so it is not a downloaded art asset.
- The browser acceptance environment uses installed headless Chrome with its Intel D3D11 hardware renderer. Earlier SwiftShader numbers remain recorded as software-rendering failures; these are not silently replaced by hardware results.
- Deferred scope: native store submission, gamepad/replays, volumetric postprocessing, full cinematic briefing and separate Cold Room/Cheese Cave geometry, Colony Orders/Feast/Soup Surprise. Existing event/order rules remain; no claim that every v2/v3 acceptance target passes.
