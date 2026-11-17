# VERDANT visual system

This is an operating research dashboard for one Korean-speaking investor. Primary action: research and compare up to four short-horizon and four long-horizon candidates, then open one company. Preserve the existing forest identity, routes, research functions and source caveats.

The surface is a research desk: forest ink, restrained pale mint and sea-glass strategy colors, an interactive liquid-metal V brand mark, aligned candidate lists, and paper-colored scenario charts. No promotional KPI, invented price or decorative chart may stand in for actual research.

- Type: existing Korean sans family. Body 16px, secondary 14px, source metadata 12px, company names 20px, section headings 24/30px. Numeric values use tabular figures.
- Space: 8/12/16/20/24/32/40/48px; controls and data in close groups, generous space between strategies.
- Candidate hierarchy: company and price, strategy scenario, selection reasons, actual historical sparkline, source/flow limitations.
- Data semantics: forecast sensitivity is distinct from realized historical prices. Every sparkline derives from actual returned prices; empty states contain no invented market data.
- Motion: a single short artwork reveal, quiet state/color transitions. Reduced motion disables movement.
- Accessibility: visible focus, label and placeholder contrast, native controls, responsive one-column composition below 860px.
- Image: the old SVG is superseded; visuals/liquid-hero.jsx is the current decorative WebGL V mark. See the explicit correction section below.

References applied selectively, in the existing app context:

1. pbakaus/impeccable: operate mode, craft floor, hierarchy and accessible states; detector run.
2. Nutlope/hallmark: app-screen restyle, no repeated heading kickers, no fabricated proof; static lint run. Not a claim of full Hallmark workflow or a clean Hallmark report.
3. elayadesign/ai-design-skills: primary action, deliberate type/spacing and decelerating motion. Marketing sections and conflicting visual prescriptions were not imported into this existing dashboard.
4. alchaincyf/huashu-design: type derived from language/content, material-led composition, honest data. Its prototype-only three-direction workflow excludes production apps with a backend, so it was not applied here.

Implementation is in public/desk.css and public/desk.js, loaded after the incumbent styles/scripts. Core server ranking and return-scenario mathematics remain unchanged. The local static server allowlist includes the new files and artwork.


## User-requested WebGL correction

The rejected leaf is no longer used by the UI. The four reference repositories are integrated as renderer packages and credited optical shader source:

- https://github.com/pmndrs/react-three-fiber: 9.8.2, bevelled V geometry, pointer response and rendering lifecycle.
- https://github.com/ruucm/shadergradient: 2.4.20, moving background field.
- https://github.com/dashersw/liquid-glass-js: 78cb6ccb0b9987bb60a88b14ccbd13a9e6e8ab2a, rounded-rectangle optical functions ported into a decorative panel. No DOM screenshot capture.
- https://github.com/collidingScopes/liquid-logo: c733c38a043009b873cb9a6062c0defa9c70ee7d, original fragment shader used in an offscreen render target for the metal material.

Vendor MIT notices are preserved. This is a brand visual, not financial data. Motion toggle, reduced-motion default, capped pixel density, offscreen unmounting and a plain V fallback protect the research UI. npm run build:visual rebuilds the committed client bundle; the main build includes it.

## Agent Desk extension

The `/agents` studio extends this established forest world in operate mode; it is not a new concept direction. `public/agent-studio.css` follows the incumbent styles and introduces scoped studio tokens, locally served Pretendard Variable, a pale research form and stock digest, aligned evidence cards, and a responsive navigation shell. The existing real WebGL V and connected office remain part of the experience. [Implementation and validation scope](docs/agent-studio-design.md) records the Agent Desk-specific scale and evidence without replacing the main dashboard rules above.
