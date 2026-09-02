# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Vermont School District Builder (`map.vermont.gov/education/district-builder/`) — a public single-page tool for grouping Vermont towns into custom school districts and comparing district-level stats, built to support Vermont's H.454 (Act 73) of 2025 school district consolidation planning. There is no backend; all reference data is fetched at runtime from public S3 JSON files.

## Commands

```bash
npm install       # install deps
npx vite          # dev server with HMR (also: npm run dev)
npm run build     # production build -> dist/ (relative asset paths, base: '' in vite.config.ts, for subdirectory hosting)
npm run preview   # preview a production build locally
npm run lint      # eslint .
npm run test      # vitest run (single run, CI mode)
npm run test:watch  # vitest in watch mode
```

To run a single test file: `npx vitest run src/utils.test.ts`. To run tests matching a name: `npx vitest run -t "sanitizeCsvCell"`.

CI (`.github/workflows/ci.yml`) runs lint, test, and build on every PR and push to `main`.

## Architecture

### Everything flows through `src/App.tsx`

`App.tsx` (~1150 lines) is the single owner of nearly all application state — town/district assignments, map view state, modal/UI state, and URL-sharing state — passed down as props/callbacks to `LeftSidebar`, `RightSidebar`, `MapComponent`, and `ReportComponent`. There is no Context, Redux, or Zustand: state changes flow one level down as props and one level up as callbacks (e.g. `onTownClick`, `onDistrictNameChange`). When working on a feature that touches state, expect to trace it through `App.tsx` first — the child components are largely presentational plus their own local UI-only state (e.g. sort order in `ReportComponent`).

Key state/logic groupings inside `App.tsx`, useful for orienting before editing:
- **Data loading**: a mount-time `useEffect` fetches `GEOJSON_URL` and `SCHOOLS_URL` (see `src/constants.ts`) and derives `townData`, `supervisoryUnions`, `schoolDetails`, `independentSchoolDetails` from the raw GeoJSON.
- **District/assignment domain state**: `assignments` (town name -> district id or null), `districtOrder`, `districtNames`, plus handlers for town/SU clicks, add/delete/reorder districts, CSV import, and preset geographies (Counties/RPCs).
- **URL state sync**: `generateShareableString`/`loadStateFromURL` serialize the current assignments/names/map name using hand-rolled Base62 encoding (`toBase62`/`fromBase62`, `BASE62_CHARS` in `constants.ts`) + Run-Length Encoding, then gzip via `pako` and base64 into a `data` URL param, so a whole map configuration is shareable via link. A legacy "V7" format is decoded for backwards compatibility with older shared URLs — don't remove that fallback without checking whether old links still need to resolve.
- **Report generation**: `handleGenerateReport` aggregates per-district stats (ADM, Grand List totals, FCI/enrollment buckets, SU/RPC intact-vs-divided status) into `ReportData[]` (shape defined in `src/types.ts`), consumed by `ReportComponent.tsx`.

### Data model

Two upstream S3 JSON sources define the entire data model (schemas documented in `docs/technical_documentation.md`, mirrored in `src/types.ts`):
- `VT_School_Geo.json` — town polygons + properties (`TownProperties`), keyed by `TOWNNAME`. Property keys are indirected through `PROPERTY_KEYS` in `src/constants.ts` (e.g. `PROPERTY_KEYS.STUDENT_COUNT` -> `Public_School_Students`) rather than hardcoded — use that indirection rather than raw string keys when adding new consumers.
- `schools_all.json` — school point locations + details (`SchoolDetail`/`SchoolPointFeature`), distinguished by `accessType: 'Public' | 'Independent'`.

### Map rendering

`MapComponent.tsx` wraps Leaflet directly (not react-leaflet) — the map instance and GeoJSON layer are created/managed imperatively inside `useEffect`s to keep Leaflet's lifecycle in sync with React's. Town fill color/border comes from `getTownStyle`, driven by `assignments` plus hover state (`hoveredDistrict`, `hoveredSU`) passed down from `App.tsx`.

### Export paths

Three distinct export mechanisms live in `App.tsx`/`ReportComponent.tsx`, each with different risk profiles: CSV export (town assignments and report tables, sanitized via `escapeHtml`/`sanitizeCsvCell` in `src/utils.ts` to prevent CSV formula injection), GeoJSON export, and JPG map export via `html2canvas`. The shareable-URL mechanism above is a fourth, distinct "export" of state.

## Testing

Vitest is configured to reuse the existing Vite config; no `jsdom` environment is set up yet (only pure-logic/node-environment tests exist so far, e.g. `src/utils.test.ts`). If you add component-level tests, add `@testing-library/react` and a `jsdom` environment at that point rather than assuming it's already available.
