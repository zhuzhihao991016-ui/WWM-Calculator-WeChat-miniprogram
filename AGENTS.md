# AGENTS.md

## Project Overview

This repository is a WeChat Mini Program for calculating game graduation progress. Its main user flows are:

- Panel input and graduation-rate calculation.
- Equipment library management.
- OCR-assisted equipment entry through a cloud function.
- Equipment traversal to find the best panel combination.

The app is built as a native WeChat Mini Program using JavaScript, WXML, WXSS, MobX for shared state, and one cloud function for OCR.

## Hard Safety Rules

- Do not batch-delete files or directories.
- Do not use `del /s`, `rd /s`, `rmdir /s`, `Remove-Item -Recurse`, or `rm -rf`.
- If a file must be deleted, delete only one explicit file path at a time.
- If a batch cleanup is needed, stop and ask the user to delete the files manually.
- Do not rewrite or normalize large files just to fix formatting or encoding.
- Do not modify generated dependency folders such as `node_modules/`, `miniprogram_npm/`, or `cloudfunctions/*/node_modules/`.

## Important Encoding Note

Some existing Chinese text in source files appears as mojibake when read by standard tools. Treat this as existing project state. Do not perform broad encoding conversions or text rewrites unless the user explicitly asks for it. When editing files that contain mojibake, keep the change tightly scoped and avoid touching unrelated strings.

## Repository Layout

- `app.js`, `app.json`, `app.wxss`: Mini Program entry, global config, and global styles.
- `pages/index/`: main calculator page. Handles school/skill/target selection, form input, graduation calculation, saved configs, panel advice, and affix-improvement analysis.
- `pages/equipment/`: equipment management page. Handles equipment CRUD, OCR import preview, calibration, and best-combination traversal.
- `components/navigation-bar/`: custom navigation component.
- `store/calcStore.js`: MobX state for calculator form, current school/target/axis, results, advice, and calculation sessions.
- `store/equipmentStore.js`: MobX state for equipment list, selected equipment, base panel, school context, and traversal snapshot.
- `utils/calculator.js`: core calculation engine. Keep business math here when logic can be shared across pages.
- `data/`: generated data modules used at runtime, including schools, skills, axes, bonuses, sets, affixes, targets, and grand panels.
- `resources/data.xlsx`: source spreadsheet for generated data.
- `scripts/`: Node scripts that convert Excel sheets into `data/` files.
- `update-data.bat`: runs the data-generation scripts and writes logs under `logs/`.
- `cloudfunctions/equipmentOcr/`: WeChat cloud function using Tencent Cloud OCR.
- `images/`: sharing and static image assets.

## State And Data Flow

- Use `mobx-miniprogram` and `mobx-miniprogram-bindings` for shared state. Pages bind to stores with `createStoreBindings`.
- `calcStore.form` is the central panel input object. Use `updateFormField` or `batchUpdateForm` instead of mutating nested fields directly.
- `calcStore.setCalcSession()` records the calculator context after a calculation. Equipment traversal depends on this session/snapshot.
- `equipmentStore.basePanel` represents the calibrated base panel after subtracting selected equipment contributions.
- Keep calculator-page state and equipment-page state synchronized through the stores, not through duplicated ad hoc storage.
- User persistence currently uses `wx.getStorageSync` and `wx.setStorageSync`.

## Calculation Rules

- Shared damage and graduation logic belongs in `utils/calculator.js`.
- Page files should assemble context, call `createCalculator(ctx)`, render results, and handle UI interactions.
- When adding a new panel field, update all relevant places:
  - default form in `store/calcStore.js`
  - page bindings and WXML inputs
  - `utils/calculator.js`
  - equipment affix mapping in `pages/equipment/equipment.js`
  - generated data scripts if the field comes from Excel
- Preserve numeric normalization conventions used by the calculator: parse empty values as `0`, round before display, and store blank strings for zero-valued form fields when existing code expects that shape.

## Data Generation

- `data/*.js` and `data/*.json` are generated from `resources/data.xlsx`.
- Prefer changing the spreadsheet or the corresponding `scripts/excel*.js` converter rather than hand-editing generated data.
- To regenerate data on Windows, run `update-data.bat` from the repo root, or run individual scripts with `node scripts/<script>.js`.
- Generated logs are written to `logs/`. Do not delete old logs in bulk.
- If a generated data file is updated, inspect the diff for accidental encoding or ordering churn.

## OCR Cloud Function

- `cloudfunctions/equipmentOcr/index.js` calls Tencent Cloud OCR through `tencentcloud-sdk-nodejs`.
- Credentials are read from environment variables:
  - `TENCENT_SECRET_ID`
  - `TENCENT_SECRET_KEY`
  - optional `TENCENT_REGION`, defaulting to `ap-guangzhou`
- Do not commit secrets or hard-code credentials.
- Keep cloud-function dependencies isolated under `cloudfunctions/equipmentOcr/package.json`.

## Development Commands

- Install root dependencies: `npm install`
- Build npm for Mini Program dependencies through WeChat DevTools after dependency changes.
- Run the Mini Program in WeChat Developer Tools using `project.config.json`.
- Regenerate game data: `update-data.bat`
- Root `npm test` is currently a placeholder and exits with an error. Do not claim tests pass based on it.

## WeChat Mini Program Conventions

- Keep page triplets/quads together: `.js`, `.wxml`, `.wxss`, `.json`.
- Register new pages in `app.json`.
- Use Mini Program APIs (`wx.*`) for navigation, storage, modal, toast, cloud, and file operations.
- Keep runtime package size in mind. `project.config.json` already excludes scripts, root Node packages, batch/shell files, and lock files from packaging.
- If dependencies change, make sure `miniprogram_npm/` is rebuilt through WeChat DevTools.

## Coding Style

- The codebase uses CommonJS `require/module.exports` in data and utility modules, while some page/store files use ES module imports. Follow the local file's existing style.
- Keep edits small and localized.
- Prefer existing helper functions and store actions over new global abstractions.
- Do not introduce TypeScript, build tools, linters, or test frameworks unless requested.
- Avoid broad formatting-only edits.
- Keep UI labels and data keys consistent with existing game terminology.

## Verification Checklist

Before finishing a change, verify the relevant path:

- Calculator changes: open/compile the Mini Program and calculate at least one panel.
- Equipment changes: add/edit/delete one equipment item and confirm storage reload behavior.
- OCR changes: test the cloud-function call path or clearly state if Tencent credentials/devtools are unavailable.
- Traversal changes: confirm a calculator session exists, base panel is calibrated, all eight equipment slots have candidates, and traversal produces a best combo.
- Data-script changes: run the affected script or `update-data.bat`, then inspect generated `data/` diffs.

If verification cannot be run locally, state exactly what was not run and why.
