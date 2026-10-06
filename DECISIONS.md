# Decisions
- User request controls publishing: GitHub repository and new Vercel project.
- Keep a standalone Node WebSocket adapter plus a room-service adapter: Vercel supports WebSockets but separate connections are not guaranteed to share a process, and duration limits require durable room ownership. Never deploy an in-memory-only multi-instance game and claim it is synchronized.
- Spec tunnel graph has a bridge at B–T1 and only one foyer exit, contradicting M3; add B–T3 and a second foyer hole to make two independent escape routes real.
- Shared contract first, then separate implementation ownership and independent verification as explicitly requested in SPEC Section 3.
- Direct Cloudflare SQLite Durable Objects backend with Vercel frontend after PartyKit shared-domain quota failure. Each room gets its own authoritative actor.
- Heist scaling tuned from 5 to 1.75 (35% original gain) after bot pilots ended too quickly; rule tests preserve capture/rescue/timing semantics. The final 300-match balance targets still fail; report this explicitly.
- Use elapsed-time 30 Hz clocks instead of relying on timer frequency. Send only the newest input after a delayed client poll, avoiding a catch-up burst. Server message limits remain unchanged.
- Release as a public browser playtest, with explicit scope and acceptance gaps in RELEASE.md and QA.md. Do not imply full v2 certification or store readiness.
