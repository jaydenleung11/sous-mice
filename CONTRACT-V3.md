# V3 integration contract

V2 remains default and unchanged. A room created with `mode:'3d'` owns v3 rules for its full lifetime. Joining inherits the room mode. Render flag `?r=3d` opts into creating v3 rooms; `?r=2d` remains a fallback. No automatic default promotion without passing acceptance.

Coordinates: existing x/y ground plane is preserved for protocol compatibility; optional z is elevation. All three coordinates are metres in v3. Three.js maps (x,y,z) to (x,z,y). `angle` is yaw: 0 faces +x, pi/2 faces +y. Pitch positive looks upward. Existing mx/my are world-space motion; optional yaw/pitch provide local-look orientation. Frame fields remain backward compatible. JUMP=2048, SENSE=4096, PEEK=8192, EAR=16384. V2 legal mask remains 2047; v3 allows 32767.

Shared content exports from `shared/content3d.ts`: MAP3D (MapData compatible with optional z), COLLIDERS3D, TRAVERSALS3D, SCALE3D constants, walkable3D(x,y,z,team), rayClear3D(a,b), coverAt3D(position). Collision boxes have id,x,y,z,w,d,h, material and optional mouseOnly/cover flags. Traversals have id,from,to,duration. Holes retain graph IDs plus HB (Burrow), optional wide/exitYaw/paired; tunnel lengths in metres.

`shared/controller3d.ts`: movePlayer3D(player,input,dt,world?) mutates only predicted movement/stamina/traversal fields, deterministic for client/server. Player.mode enables prediction even without world. Shared scripted climb and jump use z and vz. Bots get a v3 adapter in bots/three.ts, preserving original priorities.

Simulation owner extends existing shared/sim.ts in branches on world.mode. Existing exported functions and all v2 tests stay valid. Adds transit functions (start/choose/advance), 3D sight/hits, noise and senses; room transport dispatches transitExit only to own player. Snapshot transit metadata is team-private, hidden from chefs before any reveal override. Public rustles are radius-limited anonymous cues.

Renderer owner creates client/scene3d.ts exporting Scene3D with existing Scene-compatible init(host), destroy(), screenToWorld(x,y), draw(snapshot,entities,self,dt), target?, ready. Extra setLook(yaw,pitch), metrics() accepted. It must not own main.ts/input.ts/settings.ts. Read settings3d exports from client/settings3d.ts (root-owned). The 2D renderer stays intact.

Root owns protocol/constants, room integration, client mode/loading, 3D inputs/HUD/settings, prediction, tutorials, test orchestration and deployment. Content worker owns content3d/controller3d/nav/bot adapter and tests. Simulation worker owns sim.ts/transit3d/interest and rule tests. Renderer worker owns 3D scene/models/materials/audio module. No other overlapping edits without coordination.
