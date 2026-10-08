# Busy French kitchen update

October 8, 2026. This update follows the user's kitchen references and request for visible control letters, human cooks, richer cooking equipment and a miniature mouse viewpoint. It applies to the existing 3D edition at https://sous-mice.vercel.app/?r=3d.

## Art direction

An image search for “ratatouille kitchen scene,” the four supplied reference images and [Pixar's official Ratatouille page](https://www.pixar.com/ratatouille) guided the palette and set dressing: cream tiles with charcoal floor diamonds, black enamel ranges, brass rails and gauges, copper cookware, steel preparation surfaces, burgundy service doors, stacked porcelain and warm light. The direct Google Images page could not be fetched; reference research used the available image search and supplied images. No film images, character models or textures are shipped in the game. All added geometry and surface labels are original procedural artwork.

Ranges now have six burner grates, steady flame rings, framed oven windows, racks, rivets, knobs, handles and gauges. Hollow copper pots contain soup and garnish; pans have shaped bowls, steel necks and wooden handles. Worktops carry cutting boards, carrot slices, knives, eggs, olive bottles, squeeze bottles, broth tins, rolling pins, towels, utensils and plate stacks. Hoods, copper rails, hanging pans and wall service shelves fill the upper kitchen. The pantry has steel racks, produce crates and labeled spice jars. Environment reflections and soft contact shadows give the equipment more depth at every graphics setting.

The human silhouettes have rounded aprons, jacket buttons, collars and tall chef toques. Six background cooks walk between stations, stir, prepare food and carry plated dishes. They derive their movement from match time, so players see the same service choreography. They are decorative service staff; playable chefs and existing bots remain the capture opponents. Staff stay out of the Burrow and are not rendered during tunnel travel. Steam and soup bubbles remain animated when the separate “reduce flickering light” setting is on; reduced motion still softens these animations. No room protocol or backend change is required.

## Controls and scale

Keyboard badges remain visible on desktop and touch action buttons, View and Map. Badges update after remapping; Grab shows Q. The default whole-mouse camera is lower and closer: approximately 18cm above the floor at neutral look, versus a 7cm first-person eye. Existing 92cm counters, approximately 2m cooks with toques, large cookware and pantry jars tower over the 9cm mouse. View / P still switches to first-person. The movement controller, map collision and traversal routes are preserved.

## Verification

- 94 unit checks pass, including staff route clearance over 120 seconds and camera framing.
- Both graph validators, TypeScript and production build pass.
- Twelve successful browser checks across the kitchen, camera, four layouts, comfort/context restoration, both complete tutorials and a 90-second two-context room. The first control-remap test failed because its settings disclosure was closed; the corrected test opens the 3D keyboard disclosure and passes.
- Actual game screens verify six cooks, cooking activity, six soup pots and moving staff. Touch keyboard letters and remapping pass. Rendering-harness screenshots cover the floor, prep counter, stove and pantry, with no page errors.
- Intel hardware Chrome, stationary ten-second samples: High 59.81fps at 1440×900; Medium 59.72fps and Low 59.85fps at 844×390. The strict High ≥60 target is not passed. JS heap samples are about 190–197MiB and do not measure full process/GPU memory. Details are in `evidence/kitchen/performance.json`.

Physical-phone, moving eight-player, full memory, mobile network/startup and human-balance acceptance gaps remain open. Classic remains the default renderer. Public deployment verification will be recorded below after publishing.
