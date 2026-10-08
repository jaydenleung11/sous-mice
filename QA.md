# Release verification

Observed results as of October 5, 2026. These are not a blanket acceptance certificate. Machine-readable records are in `evidence/`; browser screenshots are in `store/screenshots/`.

- Map M1–M8/content C1–C5: pass. Two edge-disjoint tunnel routes per room; worst captive cage route 8.52 seconds.
- Automated suite: 54 tests pass across movement, capture/key/rescue, victory conditions, NPC/orders, privacy, reconnect, host authority, wire deltas, scheduling and team-only pings. Production build and worker typecheck pass.
- Tutorials: both completed through real browser buttons and keys, with all 14 lessons advancing. No page errors. Completion flags persisted. A direct simulation harness also passed.
- Public frontend: two isolated browser contexts joined opposite teams, played for 90 seconds and refreshed one player mid-match. Final rerun: 1,362 common snapshot ticks had equal timers/meters, identity restored, and neither page reported an error. All seven browser checks passed on the final deployment.
- Public backend smoke: 90 seconds; 1,351 common snapshots; zero timer/meter mismatches; zero detected private-field or unrevealed tunnel leaks; both connections open; 90.0667 simulated seconds.
- Responsive title/training checks: 844×390, 932×430, 1024×768 and 1440×900. No viewport overflow or page errors. Mobile match action buttons measured 56–65 pixels wide and 64–76 pixels high. Contrast and every non-action control were not exhaustively audited.
- Final bot simulation: 300 completed matches, zero sampled invariant failures. Chef wins 54.67% overall and 72.97% at 3-vs-3; Heist wins 45.33%; Rating-collapse wins 0%; Lockdown wins 42.67%; early endings 33%; median 378.57 seconds; 2,441 captures and 203 teammate rescues. **Balance acceptance fails.** Invariants are sampled once per simulated second and at match end.
- Final network model: all nine scenarios retained both connections, with zero common-tick divergence and no protocol errors. Eight pass the strict p95 ≤0.5 tile criterion. At 200 ms RTT plus 5% retransmission probability, p95 is 0.500066 tiles; 94.89% of sampled corrections are within 0.5 tiles. **Strict AT-11 fails.** Do not round that into a pass.
- Network model details: ordered WebSocket frame delays with ±15 ms jitter; a probabilistic loss event adds one RTT of retransmission delay. Frames are never discarded/reordered. These are short synthetic movement runs, not a kernel packet-loss test or physical mobile-network certification.
- Final simulation-only tick timing: mean 0.0354 ms, p99 0.1127 ms. These numbers exclude bot pathfinding, snapshots, transport and rendering; complete server/client performance budgets remain unverified.
- Headless client sample: 10 seconds at 1440×900 in mouse training averaged 17.39 animation callbacks/second, with p95 frame interval 66.7 ms, 33.1 MB reported JS heap and 2.39 MB resource transfer. This **does not meet the desktop 60 fps target** in this environment. It measures frame intervals under shared desktop/headless graphics conditions, not isolated renderer CPU time or GPU memory. Physical-device performance is unverified.

## Acceptance mapping

| Spec criterion | Status |
|---|---|
| AT-01 room creation/join | Works in private contexts; browser one-second timing not formally measured |
| AT-02 synchronized match | Pass for observed common ticks |
| AT-03 graphs | Pass |
| AT-04 core actions | Pass in rule tests and tutorials |
| AT-05 hidden information | Unit tests and observed backend smoke pass; not an exhaustive adversarial audit |
| AT-06 rescue | Pass in rule tests and tutorial |
| AT-07 victory conditions | Pass in rule tests |
| AT-08 guests | Pass for implemented reaction rules; animation depth simplified |
| AT-09 orders | Pass in rule tests and chef tutorial |
| AT-10 reconnect | Rule tests pass; live refresh restores identity |
| AT-11 latency | Fails strict threshold in one of nine modeled scenarios |
| AT-12 simulations and balance | Invariants pass; balance fails |
| AT-13 tutorials | Both pass via visible browser controls |
| AT-14 layouts/accessibility | Four-size layout and action-target checks pass; contrast/font compliance incomplete |
| AT-15 performance | Headless frame-rate target fails; complete server/device budgets unverified |
| AT-16 public 90-second play | Pass with two isolated browser contexts |

Full human eight-minute matches at 2, 4 and 8 players, real-device testing, a complete accessibility audit and signed native builds remain outstanding. See RELEASE.md for deferred features.

## V3 preview
See RELEASE-V3.md and evidence/v3 for the current automated, public-browser, network and performance results. The preview is live at https://sous-mice.vercel.app/?r=3d. The 90-second public two-context transit/privacy/reconnect test passed. Phone-size browser emulation does not certify physical-phone performance; the full v2/v3 acceptance bar remains incomplete.
