# FieldCount v0.2 — Technical & product framework

## Product purpose

A low-friction phone app for solo contractors counting a home's contents. Success = fast, dependable item capture; ability to correct entries; clear submission records; recover from mistakes. **Not** a claim adjudication, estimating, insurance portal, or AI identification system.

## Locked workflow

```text
Home
 ├─ New claim → Capture item
 ├─ Existing claim → Claim overview
 │    ├─ Add item → Capture item
 │    ├─ Review → List → Edit / Duplicate details / Delete
 │    ├─ Pre-export check → Excel / complete ZIP
 │    ├─ Status → In Progress / Ready for Review / Completed
 │    └─ Export → Excel / complete ZIP
 └─ Full backup ZIP / Restore full backup ZIP
```

### Key workflows

- **Capture:** Take one or multiple pictures; select room; quantity defaults to 1; dictate/type description; optionally flag for review. Save then start a fresh item with the last selected room. A new item's incomplete draft auto-saves after updates and is restored upon reopening that claim.
- **Edit:** Saves changed text, quantities, room, flags and photo set together in a transaction. Does not discard an unrelated unfinished new-item draft.
- **Duplicate:** Copies description, room and quantity. DOES NOT copy image evidence; marks the new item for review. This prevents mistakenly presenting the old item's photo as evidence of a different object.
- **Review:** Stable item numbers, search/filter by room, flagged and missing-photo view. Delete removes associated original and thumbnail records.
- **Status:** Completed is read-only. User can reopen from the claim overview. Status does not change records or claim numbers.
- **Pre-export:** Missing photo, missing description, invalid quantity, manual review flag. Export allowed with explicit warning. Completed with open issues also requires confirmation.
- **Backup:** Export every claim, every photo, every unfinished draft. Require an explicit restore confirmation that local data will be replaced. Verify CRC and record relationships before atomic DB replacement. Archive PREPARATION is not proof a downloaded file was retained.

## Data entities

**Claim** `{ id, title, reference, status, lastRoom, nextItemNumber, createdAt, updatedAt }`

**Item** `{ id, claimId, itemNumber, room, description, quantity, needsReview, noPhoto, photoIds[], createdAt, updatedAt }`

**Photo** `{ id, claimId, itemId, blob, thumb, mime, name, createdAt }`

**Draft** `{ claimId, room, description, quantity, photos:[{ id, blob, thumb, mime, name, createdAt }], needsReview, noPhoto, updatedAt }`

**Meta** `{ key, value }` such as `lastBackupPrepared`.

The database is `FieldCountDatabase`, schema version `2` (IndexedDB). Photo IDs are stable, item numbers are never reused after deletions. A claim status is independent of inventory data.

## Main invariants

- Item → claim is one-to-one; photo → item and claim must both exist and match.
- Item numbers increment monotonically per claim; deletion does not renumber existing entries.
- Quantity is a positive whole number (1–99,999).
- Editing an item must never discard an unrelated new-item draft.
- New-item creation + claim counter + photo records + clearing the saved draft commit in a single transaction.
- Photo duplication must not occur silently; copying text should not claim photographic evidence.
- Exports must reference actual original photo paths, with count and review state per row.
- Restore must not clear old data until format/checksums/relationships validate; changes commit atomically.
- App-shell cache must not contain claim data or photos.

## Export contract

Excel sheet: `Inventory` with header rows and table columns:

`Item # | Room | Item description | Quantity | Photos | Original photo files (ZIP) | Needs review | Logged | Main photo preview`

XLSX embeds **main thumbnail** only. ZIP exports XLSX + claim JSON + every photo in `photos/item_00042_<itemid>/photo_001_<photoid>.<ext>`. Never claim Excel alone holds all originals. Use stable item IDs and numbers for traceability.

## Device acceptance tests (run before real work)

1. Open app online, create claim, capture 3 photos of one item, close tab, reopen, verify same photos and text.
2. Save item, refresh and restart phone. All data must remain.
3. Add 2 items and duplicate one. Ensure details copied, but **not** its photos. Add a new photo to duplicate, edit quantity, save.
4. Mark one for review; verify Review and Pre-export flags it. Clear flag and verify check updates.
5. Select several rooms, switch between existing claims, and confirm room memory is claim-specific.
6. Mark claim Completed; verify adding/editing/deleting is blocked until Reopen.
7. Download `.xlsx`; open in Microsoft Excel; check row counts, item numbers, quantities, names, one photo preview per item, and original-photo file names.
8. Download claim ZIP; inspect contents: all originals, Excel, and claim.json. Verify number of photo files matches photographed items' photo totals.
9. Download FULL backup ZIP. Verify it exists OUTSIDE browser storage. On a clean test browser, restore it; confirm statuses, flagged items, all photos and draft descriptions. **Do not test destructive restore on genuine unsaved claims.**
10. Toggle airplane mode after initial install. Close and reopen home-screen PWA, create/edit entries and reopen them successfully.
11. Run 100, 300, 500 image scenarios on her actual phone; watch memory, export times, failures, storage pressure. The app is NOT yet validated for these loads.
12. Test an invalid/corrupt backup and confirm local claims remain untouched.
13. Before switching from v0.1 on a device with existing records, make a v0.1 full backup. Verify migration separately and maintain old ZIP until tested.

## Delivery priority

1. Pilot on user's actual phone with fake claims.
2. Confirm project manager’s exact Excel columns and photo file expectations. Adjust export contract if necessary.
3. Confirm privacy, retention and secure handoff policy before real loss-location work.
4. Test storage/ZIP exports at field scale. Implement streaming ZIP and chunked export if needed.
5. Only then consider accessibility and speed refinements beyond requested scope.
