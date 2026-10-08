# First-person 3D preview

The mouse-eye edition is live at https://sous-mice.vercel.app/?r=3d. Classic remains the default while the complete acceptance checklist is unfinished.

## Implemented
True 7cm mouse camera, giant chefs, shoulder camera, textured original rooms/furniture/characters, shared capsule collision, jumping and marked climbing, mouse-look and touch drag-look, sensory cues, comfort settings, server-timed tunnel travel, private transit, reconnect, capture/cage/key/rescue, service/orders and existing win conditions. Eleven mouse lessons and eight chef lessons run through actual game actions.

## Verified October 8, 2026
- 90 unit tests pass. Both legacy and 3D graph/build/type validators pass.
- Every listed tunnel exit is covered by authoritative tests; reroute, heavy carriers, cooldown/cap and radar privacy are tested.
- 10,000 seeded controller inputs agree within5mm.
- Both 3D tutorials completed through browser controls. All six classic tutorial/layout checks pass.
- Four 3D layouts pass at844x390,932x430,1024x768 and1440x900; action-grid targets are at least56px. Comfort/FOV/persistence/context-loss recovery checks pass.
- Local private desktop and phone browser contexts played90seconds, shared1404 identical ticks, observed85 transit snapshots hidden from the chef, and restored the same identity after refresh. No page errors.
- Nine seeded bot matches at2/4/8players completed without sampled invariant/privacy failures. Mean combined bot/sim/interest work0.552ms; p99 5.774ms; rare maximum167ms. Network serialization is excluded.
- Modeled120ms RTT with±15ms jitter:448 correction samples, p95 0.0955m, zero desync/errors. This is a15-second local ordered-frame-delay model, not physical packet loss.
- Installed headless Chrome on Intel D3D11: desktop High60.02fps/300draws/209182triangles/59.3MB JS heap; phone-size Medium59.97fps/136draws/95122triangles/70.8MB heap; Low60.01fps/122draws/85426triangles; Low tunnel60.04fps/6draws/43680triangles. These are10-second stationary scene tests; mobile uses a laptop GPU with an emulated viewport. Software SwiftShader tests were substantially slower and failed frame targets.

## Acceptance limits
AT17/19/21/22 have automated coverage; AT18 has shared-controller and modeled-network evidence. AT20/23/24 have browser evidence but remain partial: physical2019phone, full process/GPU memory,4G startup, all biome/comfort combinations and moving eight-player performance are not certified. AT25 is partial because earlier v2 balance/strict network targets remain open. AT26 public private-browser desktop/phone-size smoke passed; physical-device confirmation remains unverified. No claim that AT01–26 all pass.

## Deferred and changed
Native signing/store submission, gamepad/replays, volumetric effects/SSAO/depth of field, expanded cinematic briefing, separate Cold Room/Cheese Cave geometry, Colony Orders/Feast/Soup Surprise are deferred. Guest lighting visibility is approximated by sight range/geometry. Peek/Ear emit anonymous local cues; silhouettes are omitted for privacy. Reduced transit fades never advance the server arrival. Human balance remains unverified.

Evidence is saved in `evidence/v3` and the local `work` folder. The default switches only after the remaining acceptance gates pass.

Vercel production: dpl_EBMMErsTAfnK844tfs8EqrJRcpng (8c732c1). Cloudflare room server: ee18d21c-9fa4-46a1-b1fb-ecf6f3dcf7f9. Public 90-second private-browser smoke passed: 1406 shared ticks, 85 transit snapshots hidden from the chef, same identity after refresh, no page errors.
