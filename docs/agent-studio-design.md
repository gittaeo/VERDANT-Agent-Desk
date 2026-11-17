# Agent Desk studio extension

This is an ordinary extension of VERDANT's established research desk, guided by `PRODUCT.md` and the incumbent `DESIGN.md`. [Impeccable](https://github.com/pbakaus/impeccable) was applied in operate mode for hierarchy, craft, responsive behavior and review. No new visual-world or concept selection was required. The forest identity, existing real WebGL liquid V, research routes and connected office are retained.

## Implemented system

`public/agent-studio.css` loads after the existing Agent Desk, view and office styles. Its `--studio-*` tokens define background `#0c1915`, sidebar `#101f19`, panel `#14251e`, raised panel `#1a3026`, ink `#eef3e9`, muted text `#b0c2b7`, subtle text `#92aa9d`, line `#354b3f`, accent `#c7e5a8`, paper `#eaf0e5`, paper ink `#193c2b` and focus `#e4f1d6`. Warning, danger and information colors remain distinct. Paper surfaces emphasize the primary research form and stock conclusion rather than introducing promotional metrics.

The local Pretendard Variable font uses Malgun Gothic and sans-serif fallbacks. Body text is 16px/1.65. The desktop introduction is 46px/1.26 at weight 650, section titles are 23px/1.4, candidate titles 24px/1.3, and primary numeric values 26px with tabular figures. Supporting data uses 11–15px according to role. This is the Agent Desk scale; the main dashboard scale in `DESIGN.md` remains applicable to its own surface.

Desktop layout uses a 224px sidebar, 48px main gutters, a 1280px content cap, a two-column introduction and candidate grid, and seven team cells. Breakpoints at 1250px and 980px progressively reduce the shell and form columns. At 760px navigation moves above content with intentional local horizontal scrolling, the introduction/form/results become one column, the team becomes two columns, and gutters become 20px. The final mobile artwork height is 190px, with space reserved for its motion control. Document-level horizontal overflow was checked at 361px and 390px; local navigation scrolling is intentional.

Native labeled form controls, visible focus, selected/pressed states, status regions and keyboard tab navigation are present. Research tabs support arrows, Home and End with roving focus. Reduced-motion CSS disables transitions and smooth scrolling; the existing WebGL renderer supplies its motion controls and fallback. These implementation checks do not constitute a full assistive-technology audit.

## Evidence and limits

Documentation review inspected `web/agents.html`, `public/agent-studio.css`, `public/agents.js`, `public/agent-views.js`, `.impeccable/review/desktop.png`, `mobile.png`, `user-361.png`, and the existing `docs/images/studio-desktop.png` and `studio-stock-report.png`. No images were generated or changed for this documentation step.

The supplied validation record reports 79 passing tests, a rules-only BONK run returning seven actual contracts with no LLM call, explicit USD labels on newly fetched crypto quotes, and no document horizontal overflow at 361px or 390px. These are bounded checks, not a claim that every engine, stored historical record, market state or office interaction was exercised. Same-name contracts are identified by chain/address and pair source; partial or missing verification stays visible. Stock reporting keeps observed historical closes and source limitations separate from predictions.

The independent visual reviewer returned ship with no material fixes for four reviewed captures only. The additional 361px capture was inspected during documentation; it does not expand that independent review scope. The static detector is not clean: `.impeccable/review/detect.json` retains a `flat-type-hierarchy` warning reporting all roles as 16px. Root-relative stylesheet URL resolution prevented that static pass from reading the applied studio hierarchy; the source and rendered captures show distinct heading sizes. This is a documented false warning, not an all-pass detector result.

Pre-existing documentation describes the main dashboard's font scale, 860px collapse and `public/desk.*` implementation. The Agent Desk has its own scale, 760px shell collapse and layered styles; those differences are recorded here rather than rewriting the incumbent world. Existing source incompleteness, partial-data warnings and unconnected intraday coverage remain visible in the stock capture and are not design-validation failures or newly verified data coverage.
