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

### `src/App.tsx` composes state from custom hooks

`App.tsx` (~340 lines) no longer owns state directly — it composes seven custom hooks under `src/hooks/`, each scoped to one cluster of the app's domain, and passes the combined values down as props/callbacks to `LeftSidebar`, `RightSidebar`, `MapComponent`, and `ReportComponent`. There is no Context, Redux, or Zustand: state changes still flow one level down as props and one level up as callbacks (e.g. `onTownClick`, `onDistrictNameChange`) — only the *ownership* of state moved out of the component body. When working on a feature that touches state, find the hook that owns it first (see below), then trace props from `App.tsx` outward.

Hooks, in the order `App.tsx` calls them (later hooks may depend on earlier ones' return values — `useDistrictAssignments` needs `townData`/`supervisoryUnions` from `useDistrictBuilderData`, `useUrlStateSync` needs setters from `useDistrictAssignments`):
- **`useMapViewState`** — map/UI view: `currentView`, `activeTab`, `hoveredDistrict`, `hoveredSU`, `showSchools`, `schoolTypeFilters`, `isLeftSidebarCollapsed`, `mapRef`.
- **`useNotification`** — the single toast/banner `notification` state and `showNotification`.
- **`useModals`** — `isExportShareModalOpen`, `isImportModalOpen`, `isHelpModalOpen`, `showSplashScreen`/`DISCLAIMER_VERSION`.
- **`useDistrictBuilderData({ onError })`** — one-shot mount-time fetch of `GEOJSON_URL`/`SCHOOLS_URL` (see `src/constants.ts`); derives and returns `townData`, `townGeoJSON`, `supervisoryUnions`, `schoolDetails`, `independentSchoolDetails`, `schoolsData`, `initialAssignments`. Returns `initialAssignments` as a plain value rather than taking a load callback, specifically so `useUrlStateSync` (below) can consume it without the two hooks needing to reference each other's setters — don't reintroduce a callback here without checking for that circularity.
- **`useDistrictAssignments({ townData, supervisoryUnions, setMapName, showNotification })`** — the largest cluster: `assignments` (town name -> district id or null), `districtNames`, `districtOrder`, `activeDistrict`, `districtToDelete`, `draggedDistrict`, `dropIndex`, and handlers for town/SU clicks, add/delete/reorder districts, CSV import (`parseCSV`), and preset geographies (Counties/RPCs).
- **`useUrlStateSync({ ...assignment state, setters, showNotification })`** — wraps the pure `src/urlState.ts` module (see below) to load/generate the shareable `data` URL param against live App state; returns `generateShareableString`, `loadStateFromURL`, `copyShareURLToClipboard`. `App.tsx` invokes `loadStateFromURL` itself from a `useEffect` keyed on `townGeoJSON` being loaded, rather than the hook doing it internally, again to avoid a circular dependency with `useDistrictBuilderData`.
- **`useExports({ ...state, showNotification, setExportShareModalOpen })`** — `exportAssignmentsToCsv`, `exportToGeoJSON`, `handleExportJpg` (DOM/Blob/Leaflet-imperative side effects, not unit-tested — verify these manually).

Pure logic lives outside the hooks in plain modules, which are unit-tested (see Testing below):
- **`src/urlState.ts`** — `toBase62`/`fromBase62`, `generateShareableString`, `loadStateFromURL`. Serializes assignments/names/map name using hand-rolled Base62 encoding (`BASE62_CHARS` in `constants.ts`) + Run-Length Encoding, then gzip via `pako` and base64 into the `data` URL param. A legacy "V7" format is decoded for backwards compatibility with older shared URLs — don't remove that fallback without checking whether old links still need to resolve. `loadStateFromURL` returns a discriminated union (`{status: 'no-data'|'too-large'|'error'|'success', ...}`) rather than calling setters directly.
- **`src/reportData.ts`** — `buildReportData(...)` aggregates per-district stats (ADM, Grand List totals, FCI/enrollment buckets, SU/RPC intact-vs-divided status) into `ReportData[]` (shape defined in `src/types.ts`), called from `App.tsx`'s `handleGenerateReport` and consumed by `ReportComponent.tsx`.
- **`src/reportView.ts`** — `processReportData`, `sortByAdmDescending`, `sortByGrandListPerStudentDescending`, `computeMaxValues`, `buildReportCsv`: the derived-value/sorting/CSV logic behind `ReportComponent.tsx`'s charts, table, and CSV export.
- **`src/schoolGrouping.ts`** — `groupSchoolsByType`, `sortSchoolTypes`: groups/orders a district's schools by type, used by `RightSidebar.tsx`'s expanded district cards.

### Data model

Two upstream S3 JSON sources define the entire data model (schemas documented in `docs/technical_documentation.md`, mirrored in `src/types.ts`):
- `VT_School_Geo.json` — town polygons + properties (`TownProperties`), keyed by `TOWNNAME`. Property keys are indirected through `PROPERTY_KEYS` in `src/constants.ts` (e.g. `PROPERTY_KEYS.STUDENT_COUNT` -> `Public_School_Students`) rather than hardcoded — use that indirection rather than raw string keys when adding new consumers.
- `schools_all.json` — school point locations + details (`SchoolDetail`/`SchoolPointFeature`), distinguished by `accessType: 'Public' | 'Independent'`.

### Map rendering

`MapComponent.tsx` wraps Leaflet directly (not react-leaflet) — the map instance and GeoJSON layer are created/managed imperatively inside `useEffect`s to keep Leaflet's lifecycle in sync with React's. Town fill color/border comes from `getTownStyle`, driven by `assignments` plus hover state (`hoveredDistrict`, `hoveredSU`) passed down from `App.tsx`.

### Export paths

Three distinct export mechanisms live in `useExports` (see above) and `ReportComponent.tsx`, each with different risk profiles: CSV export (town assignments and report tables, sanitized via `escapeHtml`/`sanitizeCsvCell` in `src/utils.ts` to prevent CSV formula injection), GeoJSON export, and JPG map export via `html2canvas`. The shareable-URL mechanism above is a fourth, distinct "export" of state.

## Testing

Vitest is configured to reuse the existing Vite config; no `jsdom` environment is set up yet — all current tests are pure-logic/node-environment tests over the extracted modules above (`src/utils.test.ts`, `src/urlState.test.ts`, `src/reportData.test.ts`, `src/reportView.test.ts`, `src/schoolGrouping.test.ts`). If you add component-level tests, add `@testing-library/react` and a `jsdom` environment at that point rather than assuming it's already available.
