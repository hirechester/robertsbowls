HANDOFF MESSAGE (LONG):

You’re helping me maintain a small client-side React app for a family bowl pick’em league (“Roberts Cup”). It’s a static site in /public (no backend). Pages are implemented as standalone JS files like /public/js/rc-page-*.js and are routed from /public/js/rc-main.js with navigation in /public/js/rc-nav.js. Data is pulled from published Google Sheets -> CSV (Bowl Games, Teams, Picks, etc.) and joined client-side.

IMPORTANT CONTEXT / CURRENT STATE (main is stable; include ALL pages):
- Home page:
  - Uses the shared “league data” context/hooks (the app previously broke when that context export/import got miswired). Should be a lightweight landing/overview page and should not introduce new data assumptions.

- Standings page:
  - Fully ID-based now (Team IDs + Bowl IDs). Win/loss math should be correct using Bowl Games Winner ID and each player’s picks by Bowl ID (no seed/ranking string parsing).
  - Tested working after the ID migration.

- Picks page:
  - Fully ID-based now; no reliance on Winner/Home/Away/Favorite team-name string columns.
  - Team pills display “#Seed/Rank School Name” (seed preferred over rank) using Teams tab fields.
  - Auto-scroll on load to the most recently played bowl column WITHOUT reordering bowls; alignment updated so the entire most-recent column is fully visible.
  - I (the user) handled adding the Favorite/Spread/Total header formatting myself on main (you don’t need to redo that unless asked).

- Simulator page:
  - ID-based and UI preserved (prior attempts accidentally rewrote layout; avoid big UI refactors). Tested working.

- Race page:
  - ID-based and UI preserved. Tested working.

- Versus page:
  - ID-based and UI preserved. Tested working.

- Scouting page:
  - “Performance Grades” is working after refactors.
  - Conference lines present: Big Ten, SEC, Big 12, ACC, Group of 6 with specific hex colors (Big Ten and SEC colors were updated).
  - TV networks section uses exact filters (ESPN/ESPN2, ABC, FOX, CBS, HBO Max, The CW Network); TNT removed.
  - Signature Win: uses picked team primary color for accent but keeps section background light gray; font normalized to match National Champion Pick.
  - Randomizes featured player on load.
  - “Only X players got this right” includes team nickname (e.g., “Only X players got the Bulldogs right”).

- History page:
  - Tested working (minimal UI changes). Typically shows historical results/recap using the same shared data sources.

- Badges (Superlatives) page:
  - ~30 badge cards; cards randomize order on page load.
  - Each badge is independent (one breaking shouldn’t crash the page).
  - Two badge types: Individual (1+ winners) and Affinity (pairs).
  - Descriptions should be ~2 lines, playful, and NEVER include emoji (emoji already displayed separately).

- Rules page:
  - New page styled like parchment/scroll (intentionally different vibe than the modern pages).
  - Uses Google Font “IM Fell English”.
  - Placeholder: 5 paragraphs lorem ipsum for now.
  - Has a Signers section listing Nana, Papa, Grant, Frank, Trent, Maria, Grace with wax seal image from /public/images/seal.png next to signers.
  - Nav icon for Rules is a scroll SVG. Scouting nav icon updated to a magnifying-glass SVG.

DATA MODEL NOTES:
- Bowl Games tab is the schedule source of truth: Date, Time, TV/Network, Winner, and IDs (Home ID, Away ID, Winner ID, Favorite ID) + odds fields (Spread, O/U) + flags (CFP, Indoor, etc.). Bowl ID is the stable game identifier (string/int mix but unique).
- Teams tab maps Team ID -> school name, nickname, primary color hex, rank/seed, conference, etc.
- Picks tab now uses Bowl IDs in headers and Team IDs for all selections.

KNOWN PITFALLS (avoid breaking the app):
- Don’t re-declare helper functions (e.g., winnerIdFor) in the same file - duplicate declarations have broken builds before.
- React hook rules matter: hooks must be at top level of the component only (not inside useEffect/useMemo or nested helpers).
- UI regressions: several pages had “accidental redesigns” during logic updates; keep styling/layout changes minimal unless explicitly requested.
- Sheet columns can be brittle; prefer robust key lookup where possible, but don’t introduce duplicate helpers already present in the file.

WORKFLOW NOTE:
- Generate the commit summary and detailed notes for anything we commit.

NEXT TASK:
- Goal:
- Current state:
- Key files:
- Decisions/constraints:
- Open questions:
- Next step:

HANDOFF MESSAGE (SHORT):

Project: Roberts Cup static React app in /public. Pages are /public/js/rc-page-*.js, routed in /public/js/rc-main.js, nav in /public/js/rc-nav.js. Data is Google Sheets -> CSV joined client-side.

Context: Main is stable. All pages are ID-based. Avoid UI refactors. Hooks must stay top-level. Do not duplicate helpers like winnerIdFor.

Data: Bowl Games tab is schedule source of truth; Teams tab maps Team ID to metadata; Picks tab uses Bowl IDs in headers and Team IDs for selections.

NEXT TASK:
- Goal:
- Current state:
- Key files:
- Decisions/constraints:
- Open questions:
- Next step:
