# FieldCount v0.2 — Local-first contents inventory

A mobile-first PWA for taking photographs and logging home contents during insurance inventories. No account, backend, analytics, remote API, recurring fee, or build chain. This is a **working pilot**, not a production-certified records system.

## Included changes

- **Multiple photos** attached to one item; first is shown as the primary thumbnail, all originals are exported and backed up.
- **Duplicate item details** (description, room and quantity), intentionally **not** the photos. Duplicated entries default to `Needs Review` until confirmed.
- **Quantity shortcut** using a numeric field on item capture.
- **Autosaved local drafts** and each item saved to IndexedDB. Full-backup ZIP contains all claims, photos, thumbnail data and unfinished drafts. Backup import checks ZIP checksums, references and structure before atomically replacing local data.
- **Flag for review** and count of missing photos.
- **Pre-export checklist** with item counts, total units, photos, rooms, flags and missing photos. Incomplete claims can still export after confirmation.
- **Claim status**: In Progress, Ready for Review, Completed (completed is read-only until reopened).
- Previous essentials retained: camera/photos, keyboard dictation, room and description, reviewing/editing/deleting, Excel `.xlsx` and original-photo ZIP, resume claims, offline PWA shell.

## Setup for developer

1. Unzip the `FieldCount_v0.2` folder.
2. Use VS Code Live Server or, with Python installed, run `python -m http.server 8000` from this folder.
3. Open `http://localhost:8000` on your computer. `file://` will not load ES modules/PWA reliably.
4. For a mobile phone, host as a static HTTPS site such as GitHub Pages or Cloudflare Pages. Once installed/opened successfully online, the service worker caches the app shell for later offline use.
5. On Android Chrome, choose browser menu > Add to Home screen / Install app. On iPhone Safari, choose Share > Add to Home Screen. Availability and terminology vary with browser and OS.

**Important:** This archive is source code. Opening its ZIP on a phone will **not** install an app. HTTPS deployment is necessary for a normal installable experience.

### Project files

```text
index.html            UI shell
styles.css            Mobile-first visual design
src/app.js            Screens, navigation, event handling, draft UI
src/db.js             IndexedDB v2 records, migration, atomic writes
src/core.js           Pure domain rules, room/status lists, validation
src/export.js         Excel/ZIP exports and backup validation/restore
src/zip.js            Standalone ZIP STORE, CRC32, verified ZIP reader
sw.js                 Offline cache of code only (never claim data)
manifest.webmanifest  Installable PWA metadata
icons/                 PWA icons
tests/                 Node tests (npm test)
PROJECT_FRAMEWORK.md  Domain contracts, navigation, acceptance criteria
COPILOT_BRIEF.md       Development instructions for Copilot
```

## Crucial practical limitations

1. **Autosaving is not an external backup.** Claim data is stored in IndexedDB on this browser on this device. Browser deletion, storage eviction, phone loss, device failure and uninstall can still destroy it. Save the **Full backup ZIP** regularly to a separate safe location. The app records when it *prepared* an archive, not proof that the phone finished saving it. Do not represent the local copy as backed up.
2. **Backup restore replaces all current local claims and drafts.** The app shows a destructive confirmation first; back up current work before importing. Restoration validates the file before clearing current records and applies writes in one IndexedDB transaction. It reads v0.2 backups and compatible v0.1 full backups.
3. **Claim delivery:** `.xlsx` has an embedded main thumbnail per photographed item plus all file paths, photo counts, quantities, and review flags. The claim ZIP includes the spreadsheet, structured `claim.json`, and each original photo. The Excel file by itself does NOT contain every original full-resolution photo.
4. **HEIC and large images:** The app preserves selected originals. HEIC previews may fail on browsers without a decoder; these records still export original HEIC files. Each photo is limited to 40 MB. Large claims with many high-res photos can exhaust phone memory while creating ZIP files; this needs real-device load testing and potentially streamed/chunked exports before relying on the app professionally.
5. **Voice descriptions:** Uses the phone keyboard microphone rather than a custom voice recording or speech-to-text service. Offline dictation and privacy depend on the chosen keyboard/app/OS.
6. **Privacy:** Do not enter unnecessary claimant names, addresses, or other personal data. This app has no encryption-at-rest key management. Device locks, access controls, security policies, approved retention, transfer procedures and project-manager requirements remain the operator's responsibility. Review Alberta PIPA applicability and the contracting party's privacy expectations before handling real claims.
7. **No image analysis or cloud sync**, by design. No photos are uploaded by application code.
8. **v0.1 data:** The IndexedDB v2 schema uses the previous database name and migrates legacy single-photo items to separate photo records. First take a v0.1 full backup, test migration with non-production data, and validate the new backup before switching.

## Test guidance

Run `npm test` (requires Node v20+; there is no package installation). The included tests exercise core rules, ZIP round-trip/tamper detection, XLSX data/photopaths, and validation of backups including photo references.

The `.xlsx` output was separately checked using openpyxl, including a real JPEG thumbnail. The phone/browser end-to-end test could not run in the authoring environment because its Chromium launch was blocked by an administrator policy. Before first paid use, perform the manual test matrix in `PROJECT_FRAMEWORK.md` on your sister's own handset, preferably both online and offline.

## Recommended field routine

1. Open the correct claim, select a room, add photos and descriptions.
2. Use **Review items** to resolve flags and missing-photo entries.
3. Use **Pre-export check**. Export **Excel + original photos ZIP** and verify the downloaded package in the destination folder.
4. At the end of **every session**, use **Save full backup ZIP** and verify the ZIP is retained outside the browser in an approved location.
5. Deliver claim files only through an approved secure channel. Do not share sensitive contents inventories through public links.

## Not included

Automatic background backup to cloud accounts, multi-device sync, account login, shared editing, built-in camera stream, AI recognition, pricing valuation, approval workflow, automatic image compression, streaming exports for multi-GB claims. These require design decisions, permissions and testing rather than a bolted-on button.
