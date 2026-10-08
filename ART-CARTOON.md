# Cartoon artwork and whole-mouse camera

October 8, 2026. The user's latest request replaces the earlier first-person default with a whole-mouse follow camera, while retaining first-person as an option. All changes apply to the existing 3D edition (`?r=3d`).

The mouse has a softer silhouette, large cream-and-brown eyes, rounded ears, rosy paws, a scarf, and a curled tail. Class colors and accessories remain distinct. Original food meshes now include a beveled cheese wedge and wheel, lobed tomatoes, carrot bundles, a curved chili, soft garlic cloves, a domed mushroom, a rounded honey jar, and produce-filled crates. Cooking pots have bright soup and garnish. Cabinets have rounded worktop edges, chefs have expressive eyes, and painted surfaces and warm lighting replace dense grain.

The follow camera orbits above and behind the body. Vertical look changes its elevation; collision checks shorten the camera boom around walls. The local mouse stays visible in cover. The View button and remappable P shortcut switch between follow and first-person, and the choice persists on the device. Existing settings migrate to the requested follow default once without resetting quality, sensitivity, or comfort preferences. Captured mice use their authoritative height in both camera and body rendering.

## Resource assessment

- [Motion](https://motion.dev/docs/quick-start): supports standalone JavaScript and object animation, including Three.js. Useful for a future menu-animation pass; the camera already runs in the game's single rendering loop and the View button needs only a short CSS press response, so no dependency is needed for this change.
- [Bklit UI](https://github.com/bklit/bklit-ui): predominantly React/shadcn charts and utility components. Good for dashboards; it does not supply mouse, food, or kitchen models.
- [Kokonut UI](https://kokonutui.com/): React, Tailwind and Motion components. Useful for React menu interfaces; introducing that stack would not improve these 3D meshes.
- The supplied `skills-main.zip` matches the installed Higgsfield skill family. Generation can make media/3D assets, and the websites skill builds on Higgsfield's own game platform. This existing game uses animated procedural Three.js models with Vercel and Cloudflare hosting. This pass edits those assets directly; no platform migration, paid generation, or new downloaded assets was necessary.

Reference images guided the broad art direction: soft proportions, appetizing colors, and warm kitchen light. Characters, models, textures, and composition are original to Sous Mice. The development-only `client/three/art-preview.html` displays the small foods and mouse for art inspection; it is excluded from the production Vite entry points.

## Verification

- 93 unit tests pass, including follow-camera framing, wall clearance, and steep look angles.
- Map/food validators, TypeScript and production build pass.
- Two browser camera tests cover the default, View button, P shortcut, reload persistence, old-setting migration, and a 56px touch target.
- Both complete 3D tutorials and the 90-second two-context desktop/phone-size room test pass, including private transit and reconnect.
- Four screen layouts and comfort settings/context restoration pass.
- Public screenshot review moved the initial look hint above the play area so it cannot obscure the whole-mouse view.
- Installed Chrome on this computer's Intel GPU measured approximately 60fps in stationary High desktop and Medium/Low phone-size scenes, with no page errors. This is viewport emulation, not a physical-phone performance claim. Details are in `evidence/cartoon/performance.json`.

The classic renderer remains available and the earlier physical-phone, moving-eight-player, and network/startup acceptance gaps remain open.
