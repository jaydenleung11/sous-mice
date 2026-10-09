# Presentation improvement loop — October 8-9, 2026

Priority: presentation and testing blockers; no new multiplayer mechanics.

## Baseline

Captured 23 views covering home, create room, lobby, role selection, training,
mouse/chef HUD, pause, settings and results, at 1440×900, 1024×768,
844×390, 932×430 and 390×844. `evidence/presentation/before/audit.json`
records the screen audit. Results use the real renderer with a deterministic
message fixture, not a completed match. Recorded real tutorial gameplay and a
31-second animation sequence using the real movement controller. Capture,
caged and rescue segments in the animation lab are explicitly labeled state
fixtures. No browser errors in either baseline recording.

Ranked problems:

1. Mobile tutorial, status and minimap overlap essential controls. Training
   completion retains pointer lock and blocks its return button.
2. Abrupt action/turn poses; jumps have no takeoff, flip or landing pose;
   carried cheese floats above the paws; gait depends on global time.
3. Follow camera immediately copies its target, making jumps and turns abrupt.
4. Tutorial highlights miss “Hold Use”; guides contain stale key bindings;
   settings show duplicate keyboard guides. Dialogs do not trap keyboard focus.
5. Lobby actions are far below the fold; character selection uses initials;
   home preview badge overlaps the footer; results waste mobile vertical space.
6. Ears/tails are static and chef apron pockets look wooden. Reduced motion
   does not suppress secondary character animation.

## Verification status

The acceptance matrix below records the final evidence and remaining limits.
Desktop browser touch emulation cannot certify performance on physical phones.
State-fixture clips cannot certify human multiplayer balance or networking.

## Pass 1 — objective and control hierarchy

Implemented compact objective cards with expandable instructions, separate
context and movement docks, one-row desktop controls, a collapsed default
minimap, time-limited look hint, live binding labels, correct lesson highlights,
keyboard focus containment and return, a single 3D keyboard guide, sticky
dialog headings and compact mobile menu surfaces. Training completion now
releases pointer lock. Reviewed the same 23 screens and completed the real
mouse tutorial: zero browser errors. Screenshots show the previous tutorial /
status / control overlap is resolved in desktop-size landscape emulation.

Remaining priorities: actual touch/large/left-handed layout checks; food/paw
alignment and jumps; camera transitions; character portraits and material depth.

## Pass 2 — animation and camera

Added a separate cosmetic pose group, blended shortest-path turning/action
poses, travel-based gait phase, jump rotation about the body center, landing
compression, smaller light food in the paws, chewing movement, ear/tail motion,
rounded cloth pockets and lower fill lighting. Follow-camera interpolation
rechecks collision clearance. Physics and multiplayer state are unchanged.
Recorded the same controller/state-fixture sequence with zero browser errors.

## Pass 3 — observed regressions and refinement

Video frame sequences showed a complete bounded flip and landing, but small food
was obscured by the mouse in follow view. Front-view clips then exposed food
covering too much of the face. Lowered/tilted it and moved the paws toward it.
Split shoes/paws into ankle groups so their soles stay level through a stride;
added corresponding leg-height compensation. Blended eating after interruption.
Fixed animated ear groups being accidentally merged into the static head.
Added blinking, rounded eyebrows, smiles, and seven portraits from the actual
character geometry. Cooking utensils now attach to hands and trays follow the
carry anchor instead of floating independently.

Climbing footage exposed chair/cloth occlusion. Added camera-only furniture
boxes and a nearby clear-boom search, then smoothed with a fresh collision check.
The animation lab had also kept climbing after reaching the tabletop; corrected
its repeat input so one ascent can be reviewed independently.

First broad browser regression run: 19 existing checks passed, including both
training sequences and separate 90-second classic/3D rooms with reconnection.
Seven new presentation checks failed and were kept in the improvement list:
touch keyboard plate, exposure badge overlap, small-phone minimap overlap,
stale remapped tutorial text and focus wrapping into a closed keyboard section.
These were repaired; all six touch layouts passed and the focus/remapping test
passed on rerun. Reduced-motion and larger/left-handed layouts are covered.

Performance review: frame rate remained about 60 FPS, but global sphere detail
raised sampled JS heap from ~190–197 MiB to ~346–356 MiB and triangles from
1.64M to 2.90M at High. Ranked this memory regression first and limited extra
sphere detail to character models. Final measurements remain pending.


## Pass 4 - capture, sprint and memory

The recorded front view exposed captive mice inside the chef collision capsule.
Moved their visual anchor onto the animated hand; the shared gameplay anchor
is unchanged. Slowed mouse stride cadence to remain legible at sprint speed,
kept soles level, and added a floor-level dragging pose for wheel/crate food.
A further screen review exposed the desktop Start service button below the fold;
compacted the team cards and added an explicit visibility check.

An interim browser run passed 26 of 27 checks. One staff check was interrupted
by a development-page reload during source editing, rather than a gameplay
assertion. Recordings also caught an animation-harness end condition that still
expected a 35-second sequence after its stage list ended at 31 seconds. Repaired
that harness and stopped edits during final recordings and regression runs.

Ranked remaining issues after this pass:

1. Heavy-food front view can hide the mouse.
2. Extra chef sphere detail still exceeds the earlier memory budget.
3. Climb and capture/release transitions need a final continuity review.
4. Physical device and eight-human-player performance cannot be certified here.

## Pass 5 - composition and transition refinement

Widened and raised the follow camera for heavy loads. Review then showed food
still obscuring part of the mouse from some angles, so separated the oversized
food from the body and added a small visible tug line to the paw. Heavy loads
stay level on the floor. Blended interrupted climb/drag poses and added a brief
visual transition into/out of the chef hand; the camera follows this cosmetic
anchor. Reduced motion bypasses capture movement and decorative motion.

Kept additional sphere detail on the close mouse model and restored the distant
human sphere budget. Final recordings, measurements and release checks follow.


## Pass 6 - combined status on the shortest touch layout

A layout fixture using the real HUD at 650 x 360 showed a 6.9-pixel overlap
when carrying and buff status appeared together. Reduced the short-screen
objective maximum height from 95 to 80 pixels and added a combined-status
regression check. Optional lesson details remain scrollable; the objective title
and its current binding stay visible. Other screen sizes are unchanged.

The production-build browser run was interrupted by a long host suspension;
one classic tutorial timed out. Two new test failures were test synchronization
issues: measuring a lobby button while a room update replaced the DOM, and
expecting the loading text to remain Waking after its socket had connected.
Adjusted those checks to wait for the selected side and accept the connection
phase. The failed and refined checks were rerun against the built app.

## Final acceptance evidence

| Criterion | Evidence and scope |
| --- | --- |
| Rounded, expressive characters | Actual character portraits and front/follow video: rounded mouse and chef geometry, face details, moving ears/tail, blinking, rounded cloth pockets. |
| Core motion continuity | Controller-driven clips cover idle, walking, sprinting, turns, flips, landing, climb, carry, eat interruption and moving drops. Captive/release/cage/rescue lab segments are labeled fixtures. Actual tutorial video includes capture and cage actions. Cosmetic transforms do not mutate gameplay. |
| Readable camera | Front/follow clips and camera collision tests; smooth boom checks around walls and chair rails; wider raised composition for heavy food; actual P/touch view switching and persistence. |
| Clear HUD | Desktop/landscape screenshot comparisons; six touch layout assertions with large controls, reduced motion and both handedness choices; combined-status fixture at 650 x 360. |
| Consistent major screens | 25 final screen captures: home, room entry, lobby, roles, tutorial, mouse/chef HUD, pause, settings and results. Results use a message fixture. |
| Working prompts and controls | Both full 3D tutorials; actual remapping to K updates labels and actions; pointer lock releases on completion; keyboard focus containment/return; loading/error recovery fixture. |
| Supported dimensions | 1440 x 900, 1024 x 768, 844 x 390, 932 x 430 and 650 x 360 gameplay checks. 390 x 844 portrait menus; phone gameplay is designed for landscape. |
| Performance | Final isolated Intel GPU sample: High 60.0 FPS, Medium 60.0 FPS, Low 59.9 FPS and tunnel 59.9 FPS. Sampled JS heap 194-205 MiB, compared with 190-197 MiB before. JS heap varies with collection and is not total or peak device memory. |

Representative semantic color-pair contrast: body 13.19:1, muted modal text
6.29:1, primary action 8.37:1, disabled action 5.66:1, objective binding 12.59:1
and focus outline 7.51:1. This is a representative color check, not a claim of
complete accessibility certification.

Recorded video was evaluated through sequential frames: 55 ms jump intervals,
120 ms sprint/landing intervals and slower state-transition sequences. The
published gallery provides normal, half and quarter playback plus the actual
screen/tutorial recording. Raw intermediate evidence remains locally in
`evidence/presentation/`; curated media is in `client/public/presentation/`.

Remaining ranked verification limits:

1. Physical-phone rendering/performance: this environment provides browser
   viewport/touch emulation, not a physical phone.
2. Eight active human devices: verified rooms use two independent browser
   contexts; decorative cooking staff are not human network players.
3. Audible sound quality: browser recordings are silent. Existing action cues
   remain; airborne/climbing footsteps were removed, but listening quality is
   not certified by these recordings.


Final local verification: 103 unit checks passed; type checks, map validation and
production build passed. The broad browser run passed 25 checks and had three
failures (one host-suspension timeout and two test synchronization issues).
The targeted rerun passed all 11 selected checks, including those three and one
new combined-status check. Aggregate coverage is 29 distinct passing browser
checks, including separate 90-second classic/3D rooms with reconnect and shared
snapshot comparisons. This is not presented as a single uninterrupted run.
