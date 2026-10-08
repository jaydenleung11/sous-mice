# Loop budget
Original limits: 12 iterations per node; 40 per milestone; 200 total. Repeated failures require changing approach. Balance cap 10; latency cap 6; UI cap 5; live-smoke cap 3.
Release checkpoints are recorded through entry 18. Earlier worker iterations were summarized rather than individually instrumented, so an exact total cannot be reconstructed. This is not evidence that the full acceptance bar passed. Further balance and performance work remains explicit backlog in QA.md.

V3 checkpoints run through28. UI/software-rendered failures changed approach to the hardware Chrome environment; earlier failures remain recorded. The final preview ships with explicit acceptance limits rather than switching the default. Counts are checkpoints, not a reconstructed exact count of every worker iteration.
