# Sous Mice
An original real-time multiplayer bistro caper for 2–8 players.

[Play Sous Mice](https://sous-mice.vercel.app) · [Source on GitHub](https://github.com/jaydenleung11/sous-mice)

Browser playtest release. The core multiplayer loop is live; the full v2 acceptance bar is not yet met. See [release scope](RELEASE.md) and [verification](QA.md).

## Play
1. Start a kitchen and share its four-character code or invite link.
2. Choose Colony (mice) or Brigade (chefs), then a class.
3. Complete your team's Training Kitchen, ready up, and let the host start.
4. Mice: hold Use to steal food, enter a hole, then deliver at the Burrow Stash. Eat food for powers.
5. Chefs: hold Use at the Pass to serve dishes. Aim and grab mice, then carry them to cages.
6. Mice win at 100 Heist or zero Rating. Chefs win when time expires, or after every mouse is caught for 3 seconds.

WASD/arrows move; Shift sprints; Ctrl sneaks; E uses; F eats; Q throws (mouse) or traps (chef); left click grabs; Space dodges; R uses class ability; T traps; C/right click tosses a colander; I inspects; Tab pings. Phone play uses landscape thumb controls. Progress bars require holding the button while standing still.

## Development
Node 22 or later. `npm ci`, then `npm run dev`. Open http://localhost:5173. Other devices on the same network can use the host's LAN address. Vite proxies to the Node room server on port 3001. Production requires the room backend.

`npm test` checks rules, graphs, privacy, reconnects and wire baselines. `npm run build` validates graphs/types before bundling. `npm run simulate -- --matches 300` runs seeded bot matches. `npm run test:e2e` runs browser tests with local servers already running. `npx tsx scripts/smoke-live.ts <room-host-base> 90` checks two real network clients. `npx tsx scripts/latency.ts <ws-url> 15` models latency, jitter and ordered TCP retransmission stalls.

## Hosting
Vercel builds `dist` with `VITE_WS_URL=wss://sous-mice-rooms.sous-mice.workers.dev/parties/main`. Cloudflare routes each room code to a distinct SQLite-backed Durable Object. `npx wrangler deploy` updates it after Cloudflare login. Rooms checkpoint every 2 seconds, run authoritative 30 Hz simulation and send 15 Hz team-filtered delta snapshots. No API secrets enter the browser. PartyKit and standalone Node adapters remain for portability. PartyKit managed deployment was blocked by its shared domain quota.

## Scope and evidence
See STATE.md, DECISIONS.md, loop-run-log.md and QA.md. This is a browser release, not a signed store build. Bot balance and device performance require human playtesting. Passing simulation invariants does not establish balance.

## Credits
Original procedural game art and synthesized audio. Title illustration made with OpenAI image generation. Fredoka/Nunito: SIL Open Font License. Libraries retain their licenses. See ASSET_LICENSES.md.

## Mouse-eye 3D preview
Open https://sous-mice.vercel.app/?r=3d to create a3D room. Invite links select the correct room mode. `?r=2d` opens classic Sous Mice. The3D preview is described in RELEASE-V3.md; it remains optional until all acceptance targets pass.

In3D: WASD moves relative to your view; click the view to lock the mouse, or drag the right side on touch. E uses, Space jumps, E+move climbs at marked surfaces, C senses, X dodges, Q aims/releases a throw or grabs, V tosses a colander, B peeks, N listens and M toggles the map. At a hole, hold Use, choose an exit or wait for the default, then wait for server arrival. Settings include FOV, follow camera, gentle tunnel transit and graphics quality.

`npm run simulate:3d` runs2/4/8-player3D bot checks. `npx tsx scripts/latency.ts <ws-url> 15 120 0 --3d` measures the3D prediction target. Browser checks use installed Chrome for hardware acceleration; software-rendered results are reported separately.
