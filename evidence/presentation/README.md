# Presentation evidence

Raw baseline, intermediate and final screenshots and WebM recordings remain in this directory locally. They are ignored to avoid duplicating large video files in Git. Curated before/after evidence is published from `client/public/presentation/` and is accessible at `/presentation/`.

Reproduce the final audit from the repository root with the development app and room server running:

- `node scripts/presentation-audit.mjs` records menus, actual mouse/chef tutorials and a labeled results-message fixture.
- `node scripts/motion-record.mjs` records the movement-controller sequence plus labeled captive/rescue fixtures.
- Set `PASS=after-front` and `FRONT=1` for a separate front-angle recording.
- `node scripts/video-review.mjs` extracts sequential recorded video frames for closer transition review.
- `node scripts/presentation-performance.mjs` samples quality profiles and tunnel rendering on the installed GPU.
- `node scripts/presentation-review.mjs` curates the final gallery after performance measurements are saved.

Run browser recordings and performance sampling sequentially. Stop source edits during the runs to avoid live-reload interruptions. The baseline was recorded before this change; recreating it requires the previous source revision. Recordings are silent. Physical phone performance and audible sound quality remain unverified.
