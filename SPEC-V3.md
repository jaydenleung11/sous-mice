# SOUS MICE v3: First-Person 3D Upgrade

> **You are the mouse.** Eye height of a few centimetres. Chair legs are pillars. Chefs are giants whose shadows blot out the room. The match rules, teams and objectives stay as in `sous-mice-spec-v2.md`. This document **overrides v2 wherever the two disagree**, and v2 stays in force everywhere else.
> The game is already deployed at https://sous-mice.vercel.app/. This is an **upgrade of the existing build**, not a restart.

---

## 0. Instructions to the building agent (read first)

1. **Inspect before you change.** Read the current repo, deployment and `STATE.md`. In your first message, post a 10-line gap list (what exists, what is reused, what is replaced) and a 10-line summary of this upgrade. Then start. Do not wait for approval.
2. Keep and reuse: the rules and win conditions, shared simulation logic, rooms, lobby, protocol, bots' decision logic, tests and validators. **Replace**: the renderer, camera, map geometry, HUD layout, input scheme and transit system, per this document.
3. Keep working under the **graph engineering** and **loop engineering** method in v2 Section 3 (state files, caps, separate verifier contexts, bot playtests, post-deploy smoke tests). Extend them as in Section 14 below.
4. Never leave `main` or the live URL broken. Build the 3D client **behind a flag** (`?r=3d`) until the acceptance tests in Section 15 pass, then make it the default and keep the old renderer for one release as a fallback (`?r=2d`).
5. Record decisions in `DECISIONS.md`. Ask the user **only** for the v2 human gates (logins, payments, keys, accounts, anything outside the project folder, anything that costs money).
6. Hold the quality bar in v2 Section 16 plus Section 13 below. Placeholder cubes, untextured grey boxes, default lighting or a 15-fps slideshow is **not done**.

**Originality rule (unchanged and non-negotiable).** Nothing may be copied or closely imitated from any existing film or game: characters, kitchens, camera framings, props, UI, names or music. Do not reproduce the composition of the reference screenshot the user shared (a cartoon chef leaning around a corner, a mouse seen from behind in the middle of the floor). This game's identity is **first person**, **team-versus-team**, **tunnel transit** and **scent and vibration senses**. Do not name or mention any existing film or game anywhere in the product.

---

## 1. What changes, at a glance

| Area | v2 | v3 |
|---|---|---|
| Camera (mice) | 3/4 top-down 2.5D | **First person**, mouse eyes |
| Camera (chefs) | Same top-down | **Over-the-shoulder third person** by default, first-person option |
| World | 2D tile map, sprites | **Real 3D**, human-scale rooms, mouse-scale player |
| Scale | Everyone about the same size | Chef about 25× mouse height; furniture is monumental |
| Tunnels | Walk through a corridor | **Press Use → cinematic dark tunnel run → teleport** to the chosen exit |
| Senses | none | **Whisker Sense, Scent Sense, Floor Tremors** (mice); **Sound Ripples** (chefs) |
| Look | 2D, lit sprites | 3D, stylized-realistic cartoon lighting, volumetric light, per-room mood |
| Controls | Top-down stick | **Look + move** (touch drag-look, mouse-look, gamepad) |

Everything else stays: teams, classes, Heist Meter, Rating, Composure, capture → cage → key → rescue, foods and buffs, tamper, orders, guests and their reactions, events, bots, rooms, reconnect.

---

## 2. Scale and proportions (the "I'm a rat among giants" rule)

World unit = **1 metre at human scale**. Everything is modelled at human scale. The mouse is just very small inside it.

| Entity | Height / size | Notes |
|---|---|---|
| **Mouse eye height** | **0.07 m** (crouched/sneak 0.05 m, ledge-top same relative) | The camera sits here. Capsule radius 0.035, height 0.09. |
| Mouse body length | about 0.10 m (+0.09 m tail) | Seen by others, not by its owner. |
| **Chef height** | **1.85 m** (Odile 1.95, Wren 1.65) | About 25× the mouse. Foot length 0.30 m. |
| Guest | 1.55–1.90 m | Seated eye height 1.15 m. |
| Dining table | 0.75 m high, 1.2 × 0.8 m | A 10-second walk under it in sneak. |
| Chair seat | 0.45 m high | A climbable ledge for a mouse (via the leg and a ramp-like crossbar). |
| Kitchen counter | 0.92 m high | Reached by climbing (see 5.4) or by holes. |
| Doorway | 2.0 × 0.9 m | A canyon. |
| Cheese wedge | 0.10 m tall | About the size of the mouse. Cheese wheel (heavy) 0.40 m. |
| Tomato | 0.07 m | Carried in the mouth or paws. |

Key rules:
- **Never fake it with a small FOV zoom.** The giants feel real because the camera is truly low: you look *up* at chefs' aprons and chins, tables are ceilings, a dropped fork is a drawbridge.
- Walls, doors and fixtures use real proportions. Baseboards are 0.12 m, so a baseboard is a **wall-like step** for a mouse; holes are cut into baseboards.
- The map footprint is about **44 m × 30 m** (not 72 × 48). Dining 16 × 14 m, Foyer 8 × 14 m, Main Kitchen 16 × 12 m, Pantry & Cold Room 14 × 12 m. All validators from v2 (M1–M8) are re-expressed in metres and re-run on the 3D collision and nav data.
- **Speeds are tuned for the camera**, not realism. Starting values (all *tunable*):

| Stat | Mouse | Chef |
|---|---|---|
| Sneak | 1.1 m/s | n/a |
| Walk | 2.6 m/s | 2.2 m/s |
| Sprint | 4.0 m/s | 3.4 m/s |
| Stamina | 100 (drain 22/s, regen 14/s) | 100 (drain 30/s, regen 12/s) |
| Jump / climb | Jump 0.12 m high; climb on marked surfaces (5.4) | Walk only |

A mouse sprinting at 4 m/s at 7 cm eye height reads as **very fast**; check the feel (motion blur and speed lines must not overdo it) and tune with Section 12 comfort options.

---

## 3. Camera, viewmodel and feel

### 3.1 Mouse camera (first person)
- Perspective camera, **FOV 85°** default (slider 70–100), near plane 0.01, far plane 80, camera attached to the capsule at eye height with a **0.4 s eased crouch** between sneak and walk.
- **Look:** yaw and pitch; pitch clamp −80° to +85° (so you can stare at a chef's face). Sensitivity slider; invert-Y option.
- **Head bob and sway:** subtle, tied to speed; **off by default for sprint** and fully disable-able. Slight roll (≤ 3°) on strafe. **FOV kick** +6° on sprint and +10° when Dash (cheese) is active.
- **Whisker framing:** soft, semi-transparent **whiskers** and the tip of a **pink-and-brown snout** appear at the bottom centre. Whiskers flicker when near surfaces (Whisker Sense, 4.1).
- **Viewmodel:** two small **paws** at the bottom corners; they animate on move, climb, grab, throw, eat, tip, squirm. A carried small food appears **in the mouth/paws** (cheese wedge, tomato, chili, etc.) with correct size, and bobs with movement. Heavy items are held with both paws, visible and big.
- **Held (grabbed) state:** the camera lifts and tilts; a **giant hand** fills the lower view, the chef's enormous face looms above; the squirm minigame (v2 6.5) shakes the view.
- **Caged state:** the camera sits inside the cage; **wire bars** cross the view; the world is visible through the bars, with a **40 s timer ring** on the cage frame and teammate icons when rescuers approach.
- **Ledge and climb transitions:** a short scripted camera move (0.4–0.8 s) so climbing does not feel like teleporting.
- **Optional third-person comfort camera** for mice (setting): a low follow camera 0.35 m behind and 0.15 m above the mouse. Off by default.

### 3.2 Chef camera
- Default: **third-person over-the-shoulder**, camera height 2.0 m, 1.6 m behind, 0.5 m to the right, collision-aware. Look pitch clamp −60° to +40° so chefs can scan the floor.
- Optional **first-person** (head height 1.65 m) in settings.
- **Floor Sweep (hold the Inspect button):** lowers the view to look under tables and shelves, narrows the cone and shows faint **Sound Ripples** (4.2).
- When a chef grabs a mouse, a small **mouse-in-hand** viewmodel appears with a struggling animation.

### 3.3 Fear and weight (what makes it feel real)
- **Floor Tremors:** each chef footstep within 12 m sends a **tremor**: camera shake scaled by distance and speed, dust motes fall, dishes rattle on tables, and a **deep low-frequency thump** plays. You feel a giant coming before you see it.
- **Shadows:** big, soft chef shadows sweep across the floor and walls. Guests' feet and chair legs cast long shadows.
- **Proximity heartbeat:** audio and a subtle red edge vignette when a chef is within 6 m with line of sight, and a faster pulse within 3 m.
- **Occlusion and cover:** tablecloths, curtains and under-furniture dark pockets reduce your visibility to chefs; the game shows **a small eye icon** (open, half, closed) at the bottom to say how exposed you are (this is the "stealth meter").

---

## 4. Senses (the unique mechanics that make first person worth it)

### 4.1 Whisker Sense (passive)
Whiskers visually bend and glow softly when a surface is within **0.15 m**. In narrow gaps (under cupboards, between crates) the HUD edge shows a gentle "tight squeeze" cue and the camera narrows slightly. Prevents getting stuck and makes cramped spaces feel physical.

### 4.2 Sound Ripples (all players)
Noise events from v2 (footsteps, tampering, plugs, panic screams) appear as **expanding, fading ripples** on the floor near the source, visible to the opposing team **only within the noise radius**. Mice see ripples from chefs' footsteps up to 12 m (a "radar" of vibrations); chefs see ripples from mouse noises (sprinting, knocking, chewing, tampering). Quiet movement (sneak) produces none.

### 4.3 Scent Sense (mouse, hold the Sense button)
Holding **Sense** for up to 3 s (cooldown 12 s, stamina cost none) shows a stylized **scent overlay**: glowing wisps leading to **food pickups** within 18 m, **the nearest hole**, **dropped keys**, and **teammates** (as warm trails). It dims colours slightly and narrows FOV a little. It does **not** show chefs (that is what Floor Tremors are for).

### 4.4 Chef senses
- **Rat Radar** (Sous Chef) from v2 now also draws **3D scent trails** where mice just passed.
- **Alert pings** from guests (v2 6.11) appear as a big floating exclamation in 3D at the guest's head plus an edge arrow.

---

## 5. The 3D map: The Rusty Ladle (rebuilt in 3D)

Same zones and gameplay layout as v2 Section 7, re-authored in 3D at the scale in Section 2. Keep the **same room names, holes (H1–H10), cages (K1, K2, P1), junction graph and validators**; adjust coordinates.

### 5.1 Rooms and mood
| Room | Mood and lighting | Mouse-scale features |
|---|---|---|
| **Dining Room** | Warm gold, candle pools, tall windows with blue night glow; chandeliers | Forests of chair and table legs; tablecloths hang like tents; crumbs and a dropped fork as set pieces; baseboard holes under curtains |
| **Foyer & Bar** | Warm and polished; a fireplace glow | Bar stool legs, coat-rack base, front-door draught under the door gap |
| **Main Kitchen** | Orange-hot, steam, stove glow, glints on steel | Stove ledge pots at head height above you; chrome pipe rafter route; hanging pans; drains and tiles with grout canyons |
| **Pantry & Dry Store** | Cool teal, shelves of jars and sacks | Climbable crate stacks and shelf rails, flour dust shafts of light |
| **Cold Room** | Blue, frosty, breath fog | Icy floor (slide effect), hanging crates |
| **Cheese Cave** | Dim amber | Giant cheese wheels (heavy items) in rows |
| **The Burrow** | Cozy amber, **built from found objects scaled to the mouse**: a matchbox bed, thimble cups, a bottle-cap table, stolen candle-stub lights, thread-spool chairs | Chefs cannot enter; safe zone with the Stash and Cauldron |

### 5.2 Verticality and traversal (all server-validated)
- **Ground:** floor, under furniture, behind cabinets.
- **Climbable surfaces (marked with subtle chalk-like scuffs and a whisker-glow):** table legs, chair legs (to seat), crate stacks, shelf rails, curtains (to rod), pipes (to rafters). Climb: hold Use at a marked surface and push forward; 0.8–1.5 m/s upward; stamina drain 8/s; **Honey buff** (Super Grip) climbs any surface.
- **Jump and drop:** short hops (0.12 m) and safe drops up to 0.6 m (taller drops stun briefly, never kill).
- **Rafter Run:** pipe network above the kitchen; mice on it are over chefs' heads; a mouse can drop Falling Pans and Flour Sacks from it.
- **Ledges:** counters, shelves, stove tops, the pass. Chefs cannot grab a mouse on a ledge unless they can reach it (reach 1.5 m up; counters are 0.92 m so a mouse at the front edge is reachable, one 0.4 m back is not). Mice on ledges can be hit by Colander throws.

### 5.3 Collision and navigation
- A **simplified collision mesh** (boxes and convex hulls, separate from render geometry) is the single source of truth. It is shared by the client prediction and the server.
- Mice use a **capsule** (r 0.035, h 0.09), chefs use a capsule (r 0.25, h 1.8). Chefs cannot enter mouse-only gaps (clearance < 0.5 m).
- **Nav data:** one nav graph for chefs (floor only) and one for mice (floor, climbs, ledges, rafters, holes); both generated at build time and used by bots and validators.

### 5.4 Holes
A hole is a small arched opening in a baseboard, cabinet or wall, **marked** by a warm glow, a tiny scuffed mat and a fine dust puff. Entering requires being within 0.2 m and holding Use for 0.6 s. Chefs can see holes, can **Peek** into one (hold Use 0.8 s for a 1.5 s view down the tunnel: any mouse in transit appears as a silhouette), and can **Plug** one (v2 rules).

---

## 6. Tunnel Transit (the signature feature)

Pressing **Use** at a hole starts a **Transit**. It replaces walking through tunnels.

### 6.1 Flow
1. **Enter:** the mouse squeezes into the hole (0.6 s hold, a short paw-on-edge animation). The server marks the mouse **In Transit**: invulnerable, untargetable, and not sent to chefs.
2. **Destination wheel (up to 2.5 s, skippable):** a radial **Fork** appears inside the dark mouth of the tunnel. The player picks an **exit** from the **connected exits** (3–4 options, each labelled with the room icon and a colour; chefs' plugs on that hole show it as **blocked**). The default is the **paired exit** for that hole, so passive players are never stuck. A teammate's recent rescue pings are shown on the wheel.
3. **The run (2.5–4.5 s cinematic, first person):** a **dark pipe and burrow tunnel** sequence plays on the client:
   - A generated tunnel mesh (rings of dirt, copper pipe, wire, tin and brick) bends past the camera; **sparse tiny lamps** and glowing mould light the path; dust and drips fly past; a tiny **Doppler-style whoosh** and the sound of your own claws on pipe.
   - Subtle **branches** flash by (other holes' dim glow).
   - **Camera shake**, FOV widening, light flicker, a faint heartbeat if a chef is near either end (**not** if only elsewhere in the map).
   - The **route length** drives duration: `duration = clamp(1.8 + 0.11 × pathLength_m, 2.5, 4.5)` s, where `pathLength_m` comes from the tunnel graph edge lengths (v2 7.3, re-expressed in metres). Longer trips take longer.
4. **Exit:** a short **burst of light** as the camera pops out of the destination hole, with a 0.6 s invulnerability window and a 0.3 s lookahead frame so players can orient. The mouse is placed at the exit hole's exit transform, facing out.
5. **Cooldowns:** 4 s before re-entering any hole; **carrying a heavy item** disables normal holes (use the three **Wide Holes**: Cheese Cave, Pantry back and Kitchen drain; both carriers must enter together and the run is 1.5 s slower).
6. **Skipping:** a **"Skip animation"** setting shortens the run to a 0.7 s fade and a whoosh (for repeat players and motion-sensitivity), and the server's transit time still applies.

### 6.2 Server rules
- The server alone decides the exit position and arrival time (`arrive = enter + duration`); the client's animation is cosmetic and must end exactly at `arrive` (it may slow or accelerate its last second to match).
- **Network and fairness:** during Transit, the server sends nothing about the mouse to chefs except two **public cues**: a short **rustle ripple** at the entry hole (radius 6 m) and at the exit hole (radius 6 m) when they happen. A chef who is within 2 m of the exit at the time of arrival gets the **Ambush**: a 0.4 s window in which the mouse is **not** invulnerable.
- **Plug during Transit:** if a chef plugs the exit hole mid-transit, the mouse is **redirected** to the paired exit and loses 1 s; the mouse sees a "blocked, rerouting" flash in the animation.
- **Re-using the wheel with allies:** two mice entering within 1 s of each other arrive together; a mouse in transit cannot pick up items or be hit.
- **Transit cap:** at most 3 transits per mouse per minute (tunable) to stop pure teleport-spam; a visible "paws are tired" cooldown dial appears.
- **Chefs cannot use tunnels**, but they can listen: **Tunnel Ear** (hold Use at a hole, 1.0 s): shows the number of mice in transit and the **destination room icon** only if one of them is currently in transit. It costs 15 s cooldown.

### 6.3 Visual and audio spec for the run
- Procedural geometry: a spline from entry to exit with **ring segments** repeated every 0.6 m; **GPU-instanced** props (pipes, roots, bricks, bones of old crumbs, bottle caps); two lighting colours (warm lamp pools, cool mould glow); depth fog 1–8 m.
- **Audio:** a looping tunnel ambience with air rush, drips, distant clinks, squeaks, plus a rising pitch toward the exit; a bright pop on exit.
- **Budget:** the run must hold the same frame rate as gameplay (≥ 30 fps on mid-range phones). Keep it under 60k triangles on screen.
- **Variation:** 3 tunnel "biomes" (**Plaster and pipe** for the kitchen, **Brick and roots** for the cellar, **Wood and wire** for the dining wall), chosen by the start and end rooms, so repeated trips do not look identical.

---

## 7. Controls (first person)

### 7.1 Touch (landscape)
```
┌────────────────────────────────────────────────────────────────┐
│ ⏱ 4:12  HEIST ▓▓▓▓░ 58%  ⭐ 41  orders…              [map][ping]│
│                                                                  │
│                    (first-person view)                           │
│                         +  (small crosshair)                     │
│                                                                  │
│  [ move stick ]                                  [Use ][Eat ]   │
│  stamina ▓▓▓▓░                  look: drag anywhere  [Jump][Sense]│
│  buff: Dash 6s                  right side            [Abil][Dodge]│
└────────────────────────────────────────────────────────────────┘
```
- **Left stick:** move (analog speed: sneak / walk / sprint by deflection).
- **Right side drag:** look (anywhere not covered by a button), with adjustable sensitivity and an optional **gyro** assist.
- Buttons at least **56 px**, left-handed layout swap, button transparency slider.
- **Aim and throw:** hold **Aim**, drag to adjust, release to throw; a dotted arc previews.
- **Auto-sprint** option (push the stick to the edge to sprint) and **tap-to-climb** assist.

### 7.2 Keyboard and mouse
Pointer-lock **mouse-look**. WASD move, Shift sprint, Ctrl sneak, Space jump, **E Use**, **F Eat**, **Q Aim/throw**, **R Ability**, **C Sense**, **Alt/Tab** Ping wheel, **M** map, **Esc** release the pointer and pause. Remappable.

### 7.3 Gamepad (stretch, M3)
Right stick look, left stick move, triggers for Use and Ability, bumpers for Sense and Dodge.

### 7.4 Chef controls
Same bindings as v2, plus **look** (right drag or mouse-look), **Floor Sweep** on the Inspect button, **Peek/Plug/Tunnel Ear** on Use at a hole, and a **camera-side switch** (left/right shoulder).

---

## 8. HUD and UI in 3D

- **Minimal, diegetic-leaning HUD:** timer and Rating at the top; the **Heist Meter** is a cheese wedge icon filling up; a **stamina** arc around the move stick; buffs as small icons with a timer ring.
- **Stealth eye icon** (open / half / closed) near the bottom centre (Section 3.3).
- **Colony Orders** appear as two small cards top-right (collapsible).
- **Proximity indicators:** a soft red ring around the screen edge in the direction of an approaching chef when within 8 m.
- **Minimap:** optional, shows known cages, holes, teammates and dropped keys; **off by default** for mice to preserve the first-person feel, **on** for chefs.
- **World-space UI:** pickups pulse softly, interactable prompts appear in 3D above the item ("Hold E"), hole mouths glow, cage keys glow green.
- All v2 screens (Title, Lobby, Class select, Briefing, Results, Settings, Training Kitchen) stay but are restyled to the 3D look. The **Briefing** becomes a **cinematic flythrough** of the 3D bistro from mouse height.

---

## 9. Art direction (3D, stylized-realistic, original)

### 9.1 Target look
A premium, warm, **stylized-realistic cartoon**: believable materials and light, characters with strong caricature and appeal, readable on a phone. Think "tabletop miniature photographed beautifully" more than "photoreal". Original silhouettes and shapes.

### 9.2 Rendering
- **Three.js** (WebGL2) is the default renderer; keep the scene graph simple and instanced. If you find a better stack that meets all budgets, record the reason in `DECISIONS.md`.
- **Materials:** PBR (base colour, roughness, normal, AO packed into ORM maps), **KTX2/Basis** texture compression, **Meshopt or Draco** compressed glTF.
- **Lighting:** a mix of **baked lightmaps** for static geometry (per room), **a few dynamic lights** (stove glow, candles, chef lantern when Lights Flicker), one soft **directional moonlight** through windows. **Soft shadows** (PCF or VSM) for chefs, guests and large props; **blob shadows** for small things.
- **Post-processing (quality tiers):** SSAO (High), subtle bloom, **depth of field** tuned for tiny scale (blur far objects slightly; High only), vignette, filmic tone mapping, light film grain optional. Volumetric **light shafts** through windows and steam in the kitchen (cheap billboards or raymarched fog on High).
- **Atmosphere:** floating dust motes, steam particles, flour clouds, drips, candle flicker. These sell the scale.
- **Quality tiers:** **Low** (mobile baseline: 720p render scale, no post-processing, baked lights only), **Medium** (default: 0.85 scale, bloom, blob shadows), **High** (desktop: full). **Auto-detect** by a 3-second benchmark and **dynamic resolution** (drop scale to hold the frame rate).
- **Culling and streaming:** portal-based room culling, frustum culling, LOD for guests and chefs, instancing for repeated props, textures streamed per room.

### 9.3 Characters
- **Chefs (3):** big, caricatured, readable silhouettes; **original designs**, not bug-eyed or toque-and-mustache clichés copying any film: Bram (barrel chest, navy apron, forearm tattoos, bandana), Odile (tall and lean, braided hair, trap belt), Wren (short and quick, pastry whites, flour-dusted). Rigged, with at least walk, sprint, grab windup, grab, carry, colander toss, set trap, send dish, stunned, scalded, blinded, flustered animations.
- **Mouse (5 skins; seen by others and in cages/results):** original designs with large expressive eyes, individual ear shapes, accessory per skin (Pip red scarf, Biscuit tool belt, Truffle goggles, Clove bandana with lockpick, Nutmeg satchel). Skinned, with idle, sneak, walk, sprint, climb, dodge, carry, eat, hide, squirm, caged, celebrate.
- **NPCs:** 6 guest variants, 2 waiters, 3 line cooks, 1 inspector; reaction animations per v2 6.11 (gasp, point, stand on chair, flee).
- **Where models come from (in order):** (1) originals built in code or exported from Blender-like procedural generation; (2) **CC0** rigged bases and props (for example Quaternius, Kenney, Poly Haven, ambientCG; verify each licence before use); (3) never anything from a film or game. Record every source in `ASSET_LICENSES.md`.

### 9.4 Palette and mood
Keep v2's palette as a guide. Per room: Dining warm gold and wine, Kitchen copper and tomato with steel highlights, Pantry teal and sage, Cold Room ice blue, Burrow honey and amber. Strong colour separation per room helps orientation at mouse scale.

### 9.5 UI style
Same UI kit as v2, but skinned to match the 3D mood: warm paper, copper trims, hand-drawn icons (no emoji). Hide UI chrome during play except the HUD above.

---

## 10. Audio (3D, immersive)

- **3D positional audio** with HRTF where supported; **distance falloff**, **occlusion/muffling through walls**, **reverb per room** (big in the dining room, tight in the cellar, damp in the cold room).
- **Giants sound giant:** chef footsteps are deep and slow with sub-bass; guest chatter is a muffled, slowed-down murmur from above; dropped cutlery is a huge clang.
- **Mouse-scale foley:** your own tiny claws on tile, wood and stone; whisper-squeaks; the **Sense** whoosh; Burrow lullaby.
- **Dynamic music:** layers rise with proximity of chefs (a plucky stalking bassline), drop to a calm theme in the Burrow; stingers for capture, rescue, tamper success, win and lose.
- **Subtitles** for barks, mix **ducking** for big events, remembered **mute**.

---

## 11. Netcode and simulation changes (3D)

Keep the v2 architecture (server-authoritative, 30 Hz tick, input frames, prediction and reconciliation, interpolation, lag compensation, interest management). Changes:

- **Positions in 3D:** `(x, y, z)` quantized to 1 mm in 16-bit offsets from a per-room origin; **orientation** `(yaw, pitch)` at 10-bit each; send **only yaw and pitch** of heads (chefs and guests) and body yaw for mice. Snapshots stay under **5 KB** at 8 players and 40 NPCs; client down-bandwidth under **60 KB/s**.
- **Input frame:** `{seq, tick, moveX, moveY, yawDelta, pitchDelta, buttons, aimX, aimY}` at 30 Hz.
- **Character controller:** a kinematic capsule controller (step height 0.04 m for mice, 0.25 m for chefs, slope limit 50°), **identical on client and server** (shared code), no physics engine required for gameplay. A physics engine (for example Rapier) may be used for **cosmetic** props only (knocked cups, spilled grains) on the client.
- **Climbing, ledges and rafters:** modeled as **scripted traversal states** with entry/exit transforms on marked surfaces, validated on the server (position bounds, stamina), not free physics.
- **Line of sight:** 3D **raycasts** against the collision mesh using eye positions (mouse eye 0.07 m, chef 1.65 m, seated guest 1.15 m) for interest management and guest/chef sight; **spatial grid** acceleration. A mouse under a tablecloth or inside a hiding spot is excluded per v2 Section 5.
- **Hit validation:** Grab uses a **sphere sweep** in front of the chef's hands (radius 0.35, reach 1.1 m from the chef's hand position, range check in 3D, **height check** so mice on ledges beyond reach are safe); Colander lands in a 3D ballistic arc validated against the **position-history buffer** (250 ms), as in v2.
- **Transit** is a first-class server state (Section 6.2).
- **Guests' sight in 3D:** a guest sees a mouse if it is inside a **130° horizontal cone** and either (a) within 3 m on the floor ahead, or (b) moving fast (sprint) within 5 m, or (c) lit by a spotlight/candle within 2 m; **seated guests mostly look at the table**, so floor sight is limited (tunable). This keeps giants from being all-seeing while still making sprinting past tables risky.
- **Test proxy:** keep the 40/120/200 ms RTT and 0/2/5% loss scenarios; add **camera-look latency** checks (look input must feel immediate via local prediction).

---

## 12. Comfort and accessibility (first person needs more)

- **Motion comfort:** FOV slider 70–100°, head bob off, camera shake slider (0–100%), **vignette while sprinting** toggle, **motion-reduced transit** (shorter, no strobing), **static crosshair** (default on), **horizon lock** on climbs, optional **third-person comfort camera**.
- **Flash safety:** no flashes above 3 per second; Lights Flicker is rate-limited and has a reduce-flicker option.
- **Control accessibility:** remap everything, left-handed layout, toggle vs hold for Sense and Use, auto-sprint, aim assist, adjustable look sensitivity and deadzone.
- **Colourblind modes**, subtitles, high-contrast outlines on interactables (toggle), text ≥ 14 px in HUD.

---

## 13. Quality bar for 3D (extends v2 Section 16)

A build is **not done** if any of these is true:
- Placeholder primitives (untextured cubes and cylinders) are visible in any room, or the default Three.js lighting is used.
- Scale reads wrong: the chef does not look about 25× the mouse, tables are not clearly ceilings from the mouse view, or doors do not look like canyons.
- A Transit shows a loading hitch, a visible pop to the destination, or ends before the server arrival time.
- Camera clips through walls, props or the chef; motion sickness settings are missing.
- Frame rate stays below **30 fps** on a 2019 mid-range phone on Medium, or below **60 fps** on a mid-range laptop on High.
- Hidden-information leak (v2 AT-05) or any desync at 120 ms RTT.
- Loading screens are plain, the first load exceeds the budget in Section 14, or the game fails to recover from a lost WebGL context.

**Polish checklist:** every action has animation and sound; light and shadow are consistent within each room; chefs' shadows and footfalls are clearly present; the Burrow feels like home; the dining room reacts convincingly to mice; the tunnel run feels exciting, not repetitive.

---

## 14. Performance budgets and assets

| Area | Mobile (Medium) | Desktop (High) |
|---|---|---|
| Frame rate | ≥ 30 fps (aim 45–60) | ≥ 60 fps |
| Triangles on screen | ≤ 250k | ≤ 1M |
| Draw calls | ≤ 250 | ≤ 600 |
| Texture memory | ≤ 200 MB | ≤ 500 MB |
| First playable download | ≤ 15 MB (Burrow + one room) | same |
| Total download | ≤ 45 MB, streamed per room | same |
| Memory | ≤ 400 MB | ≤ 800 MB |
| Time to interactive | ≤ 6 s on 4G | ≤ 3 s |
| Server tick | ≤ 6 ms avg, ≤ 15 ms p99 (8 players + 40 NPCs) | same |

Asset rules: glTF/GLB with Meshopt or Draco, KTX2 textures, atlases for props, **no asset over 2 MB** without a reason in `DECISIONS.md`, all licences in `ASSET_LICENSES.md`. Provide a **WebGL context-loss** handler and a **Low-quality fallback**; show a friendly message if WebGL2 is unsupported.

---

## 15. Acceptance tests (add to v2 AT list)

| ID | Test |
|---|---|
| AT-17 | **Scale check:** headless screenshots from mouse eye height and chef eye height; a script verifies chef height ÷ mouse eye height is between 22 and 28, table height is 0.70–0.80 m, and doorway height is at least 1.9 m. A human-readable report is saved. |
| AT-18 | **First-person controller:** movement, look, climb, jump/drop and sneak behave per Section 3 and 11; the client prediction error stays under 0.1 m in 95% of frames at 120 ms RTT. |
| AT-19 | **Transit:** from every hole, every listed exit is reachable; arrival time equals the server `arrive` within 100 ms; a plugged exit redirects; In Transit mice never appear in chef snapshots (v2 AT-05 extended); the 3-per-minute cap applies. |
| AT-20 | **Tunnel run visual:** the run plays at ≥ 30 fps on the Low profile, duration follows the formula in 6.1, all three biomes appear, and "skip animation" shortens it to ≈ 0.7 s. |
| AT-21 | **Collision parity:** server and client collide identically; a fuzz test of 10,000 random inputs yields identical end positions within 5 mm. |
| AT-22 | **Visibility:** guests' 3D sight, tablecloth/curtain hiding, and chef LOS tests pass (a mouse under a tablecloth is not seen from 2 m at eye height, a sprinting mouse is seen at 5 m). |
| AT-23 | **Performance:** budgets in Section 14 are met on a headless profile (triangle and draw-call counts, memory) and on the target frame-rate benchmark. |
| AT-24 | **Comfort settings** all function (FOV, bob off, vignette, reduce shake, comfort camera, skip tunnel). |
| AT-25 | **Regression:** v2 AT-01 to AT-16 still pass with the 3D client; the 2D fallback (`?r=2d`) still launches. |
| AT-26 | **Live URL:** open in a private window on desktop and a phone; join from two devices on opposite teams; play 90 seconds; the tunnel transit works for both. |

---

## 15b. Bots in 3D
Bots keep the v2 behaviour trees, now on the **3D nav graphs**; mouse bots use **holes and transit** (choosing exits to avoid plugged ones and chefs), **climb** via marked surfaces, and **hide** under tablecloths; chef bots **floor-sweep**, **peek** holes and use **Tunnel Ear** occasionally. Bots receive no hidden information.

---

## 16. Milestones, migration plan and cut list

**M0: Audit and flag (first, short)**
Inspect the repo and the live build; write the gap list; add the `?r=3d` renderer flag; set up the 3D scene, resize and quality tiers, collision mesh pipeline, and the shared character controller.

**M1: First-person vertical slice (must ship, deployed)**
Mouse first-person camera, viewmodel paws, controller, climb; scaled **Kitchen + Dining Room + Burrow** in 3D with baked light; chef (third-person) with grab, carry, cage; guests with reactions; **Tunnel Transit** (flow, wheel, run animation, server arrival); Heist Meter, Rating, win conditions; touch and mouse-look controls; both HUDs; core audio with Floor Tremors; bots on 3D nav. Test and deploy behind the flag, then switch the default.

**M2: Depth (should)**
Pantry, Cold Room, Cheese Cave, Foyer; all foods, buffs, tamper, Colony Orders; Whisker, Scent and Sound-Ripple senses; hiding spots and Search; Snap Trap, Plug, Peek, Tunnel Ear; classes; rafters and drops (Falling Pan, Flour Sack, Soup Tip, Vegetable Trap); events (Lights Flicker, Inspector, VIP); the **cinematic Briefing**; **Training Kitchens** redone in 3D; comfort settings; PWA and store assets.

**M3: Delight (could)**
High-quality post-processing, volumetric light shafts, better character art pass, tunnel biome variety, dynamic music, Colony Feast, Soup Surprise, gamepad, replay highlights, Capacitor wrapper scaffolding.

**Cut order if time or budget runs out (cut from the bottom first):**
1. Gamepad and replay highlights
2. Volumetric light, depth of field, film grain
3. Tunnel biome variety (keep one biome)
4. Colony Feast, Soup Surprise
5. Scent Sense visuals (keep Whisker and Floor Tremors)
6. First-person for chefs (keep third person only)
7. Cold Room and Foyer (keep Kitchen, Dining, Pantry, Burrow)
8. Classes (one mouse and one chef kit)
Never cut: first-person mouse camera, giant scale, Tunnel Transit, hidden-information rules, capture → rescue loop, guest reactions, reconnect, tutorial, live deployment.

---

## 17. Definition of done (v3)
- [ ] The mouse is first person at about 7 cm eye height; chefs read as about 25× taller; tables, chairs and doors look monumental.
- [ ] Pressing Use at a hole plays the dark tunnel run and arrives at the chosen exit at the server time.
- [ ] Floor Tremors, Sound Ripples and the stealth eye make the senses of being small tangible.
- [ ] A full 8-minute match works with humans and bots on 2, 4 and 8 players, on phones and laptops.
- [ ] Frame rate and download budgets are met on the target devices; the Low profile works.
- [ ] AT-01 to AT-26 pass; results are in `loop-run-log.md`.
- [ ] No placeholder art, no default lighting, no console errors.
- [ ] `DECISIONS.md`, `ASSET_LICENSES.md` and the final report list what was cut, changed, borrowed (CC0 only) or at risk.
- [ ] The live URL loads in a private window and plays correctly on two devices.