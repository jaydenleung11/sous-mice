# Build state
Current: first-person3D preview implementation verified locally; Cloudflare server published. Branch upgrade/first-person-3d; production frontend publishing next. Default remains classic while full acceptance remains incomplete.

Implemented:44x30metre map,7cm camera,original textured Three.js rooms/characters,shared controller and nav,jump/climb,desktop/touch controls,comfort settings,senses,authoritative tunnel transit and privacy,room-mode isolation,reconnect,11mouse/8chef tutorials.

Verification:90 unit tests;both map validators/build/type checks;3D tutorials through browser controls;fourlayouts/comfort/context recovery;6classic browser checks;9botmatches at2/4/8players. Local90sec private desktop/phone test:1404common ticks,85private transit snapshots,same refresh identity,noerrors. Modeled120ms p95correction0.0955m. Hardware IntelChrome High60.02fps,Medium/Low~60fps in stationary10sec benchmarks. Software-rendered performance failed.

Live:https://sous-mice.vercel.app
Preview:https://sous-mice.vercel.app/?r=3d (publishing)
GitHub:https://github.com/jaydenleung11/sous-mice
Rooms:https://sous-mice-rooms.sous-mice.workers.dev
Cloudflareversion:ee18d21c-9fa4-46a1-b1fb-ecf6f3dcf7f9

Next:publishfrontendbehindflag;90sec publicbrowser test;save final deployment IDs. Remaining:physicalphone/fullGPU-processmemory/4G/startup/moving8playerperformance,humanbalance,earlier v2targets and deferreddepthfeatures. See RELEASE-V3.md and QA.md. Nocredentialblocker.
