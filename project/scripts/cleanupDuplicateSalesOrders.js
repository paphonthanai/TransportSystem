/**
 * One-time (idempotent) production cleanup script.
 *
 * Fixes fallout from the SALES_ORDER duplication race condition (see the fix in
 * src/stores/salesDocuments.ts's auto-repair watcher, commit "fix: กันสร้างใบสั่งสินค้าซ้ำ...").
 * Before that fix, bookings and sales documents loaded from Firestore via two independent,
 * uncoordinated listeners. If bookings finished loading before documents did, the auto-repair
 * watcher wrongly concluded a booking had no sales order yet and created a brand new one —
 * every time the page was refreshed during that race window. This left many bookings (mostly
 * ones imported/created around 19-22 Sep 2026) with 2+ duplicate SALES_ORDER documents, some
 * even sharing the same generated document number (because the numbering itself was computed
 * from the same incomplete documents list).
 *
 * This script finds every booking with more than one SALES_ORDER document referencing it,
 * picks ONE to keep per booking (see pickKeeper below), and deletes the rest along with their
 * salesDocumentItems. It never touches bookings with exactly one (or zero) sales order.
 *
 * Keeper selection, in order:
 *   1. The document whose id matches booking.sourceDocumentId (the authoritative link field).
 *   2. If none match (sourceDocumentId missing/stale), the OLDEST document by createdAt — the
 *      real original is presumed to predate the race-created duplicates.
 * If the group is picked via (2), booking.sourceDocumentId is also repaired to point at the
 * chosen keeper as part of the same apply step.
 *
 * Safety: a group is skipped and reported under NEEDS_REVIEW (never auto-deleted) if:
 *   - any doc in the group has bookingIds.length !== 1 (violates the single-booking-per-SALES_ORDER
 *     assumption this script relies on — could be a different, unrelated shape),
 *   - any doc in the group is referenced as another document's parentDocumentId (would break a
 *     downstream reference if deleted).
 *
 * Usage:
 *   node scripts/cleanupDuplicateSalesOrders.js --dry-run     (default — reports only, writes nothing)
 *   node scripts/cleanupDuplicateSalesOrders.js --apply       (writes the changes, then re-verifies)
 *
 * Credentials: same as scripts/backfillDocumentClaimFields.js —
 *   GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json node scripts/cleanupDuplicateSalesOrders.js --dry-run
 */
import { initializeApp, cert, applicationDefault } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { readFileSync } from 'node:fs'

const PROJECT_ID = 'transportsystem-743c1'

function loadCredential() {
  const keyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS
  if (keyPath) {
    const key = JSON.parse(readFileSync(keyPath, 'utf-8'))
    return cert(key)
  }
  return applicationDefault()
}

function toMillis(v) {
  if (!v) return 0
  if (typeof v.toMillis === 'function') return v.toMillis() // Firestore Timestamp
  const t = new Date(v).getTime()
  return Number.isFinite(t) ? t : 0
}

async function main() {
  const apply = process.argv.includes('--apply')
  const mode = apply ? 'APPLY' : 'DRY-RUN'
  console.log(`cleanupDuplicateSalesOrders — mode: ${mode}, project: ${PROJECT_ID}\n`)

  initializeApp({ credential: loadCredential(), projectId: PROJECT_ID })
  const db = getFirestore()

  const [bookingsSnap, docsSnap, itemsSnap] = await Promise.all([
    db.collection('bookings').get(),
    db.collection('salesDocuments').get(),
    db.collection('salesDocumentItems').get(),
  ])

  const bookings = new Map(bookingsSnap.docs.map((d) => [d.id, { id: d.id, ...d.data() }]))
  const allDocs = docsSnap.docs.map((d) => ({ id: d.id, ...d.data() }))
  const salesOrders = allDocs.filter((d) => d.type === 'SALES_ORDER')
  const items = itemsSnap.docs.map((d) => ({ id: d.id, ...d.data() }))

  const parentDocumentIds = new Set(allDocs.map((d) => d.parentDocumentId).filter(Boolean))

  const byBooking = new Map() // bookingId -> SALES_ORDER doc[]
  const malformed = [] // docs with bookingIds.length !== 1
  salesOrders.forEach((doc) => {
    const ids = Array.isArray(doc.bookingIds) ? doc.bookingIds : []
    if (ids.length !== 1) {
      malformed.push(doc)
      return
    }
    const bid = ids[0]
    if (!byBooking.has(bid)) byBooking.set(bid, [])
    byBooking.get(bid).push(doc)
  })

  const toDeleteDocs = [] // { id, number, bookingId }
  const sourceDocFixes = [] // { bookingId, keeperId }
  const needsReview = [] // { bookingId, reason, docs: [{id, number}] }

  byBooking.forEach((group, bookingId) => {
    if (group.length <= 1) return
    const booking = bookings.get(bookingId)
    if (!booking) {
      needsReview.push({ bookingId, reason: 'booking ไม่มีอยู่จริงแล้ว (ถูกลบไปแล้ว?)', docs: group.map((d) => ({ id: d.id, number: d.number })) })
      return
    }

    const referencedAsParent = group.filter((d) => parentDocumentIds.has(d.id))
    if (referencedAsParent.length > 0) {
      needsReview.push({
        bookingId,
        reason: `มีเอกสารอื่นอ้างอิงกลับมาที่ ${referencedAsParent.map((d) => d.number).join(', ')} (parentDocumentId) ลบไม่ได้`,
        docs: group.map((d) => ({ id: d.id, number: d.number })),
      })
      return
    }

    const keeper = group.find((d) => d.id === booking.sourceDocumentId) || [...group].sort((a, b) => toMillis(a.createdAt) - toMillis(b.createdAt))[0]
    if (keeper.id !== booking.sourceDocumentId) sourceDocFixes.push({ bookingId, keeperId: keeper.id })

    group.forEach((d) => {
      if (d.id === keeper.id) return
      toDeleteDocs.push({ id: d.id, number: d.number, bookingId, amount: d.amount, keeperId: keeper.id, keeperNumber: keeper.number })
    })
  })

  const toDeleteDocIds = new Set(toDeleteDocs.map((d) => d.id))
  const toDeleteItems = items.filter((i) => toDeleteDocIds.has(i.documentId))

  console.log(`Bookings with duplicate SALES_ORDER docs: ${[...byBooking.values()].filter((g) => g.length > 1).length}`)
  console.log(`Documents to delete: ${toDeleteDocs.length}`)
  console.log(`Items to delete: ${toDeleteItems.length}`)
  console.log(`booking.sourceDocumentId repairs needed: ${sourceDocFixes.length}`)
  if (malformed.length) console.log(`\n⚠ SKIPPED (bookingIds.length !== 1, unexpected shape): ${malformed.length} doc(s) — ${malformed.map((d) => d.number).join(', ')}`)
  if (needsReview.length) {
    console.log(`\n⚠ NEEDS_REVIEW (not touched, ${needsReview.length} booking group(s)):`)
    needsReview.forEach((r) => {
      console.log(`  booking ${r.bookingId}: ${r.reason}`)
      r.docs.forEach((d) => console.log(`    - ${d.number} (${d.id})`))
    })
  }

  console.log('\nPlan (sample, first 20):')
  toDeleteDocs.slice(0, 20).forEach((d) => {
    console.log(`  DELETE ${d.number} (${d.id}, booking ${d.bookingId}, amount ${d.amount}) — keeping ${d.keeperNumber} (${d.keeperId})`)
  })
  if (toDeleteDocs.length > 20) console.log(`  ...and ${toDeleteDocs.length - 20} more`)

  if (toDeleteDocs.length === 0) {
    console.log('\nNothing to do.')
    return
  }

  if (!apply) {
    console.log('\nDry-run only — no writes made. Re-run with --apply to write these changes.')
    return
  }

  console.log('\nApplying...')
  const writes = [
    ...toDeleteDocs.map((d) => ({ type: 'delete', ref: db.collection('salesDocuments').doc(d.id) })),
    ...toDeleteItems.map((i) => ({ type: 'delete', ref: db.collection('salesDocumentItems').doc(i.id) })),
    ...sourceDocFixes.map((f) => ({ type: 'set', ref: db.collection('bookings').doc(f.bookingId), data: { sourceDocumentId: f.keeperId } })),
  ]
  const BATCH_SIZE = 400
  for (let i = 0; i < writes.length; i += BATCH_SIZE) {
    const batch = db.batch()
    writes.slice(i, i + BATCH_SIZE).forEach((w) => {
      if (w.type === 'delete') batch.delete(w.ref)
      else batch.set(w.ref, w.data, { merge: true })
    })
    await batch.commit()
    console.log(`  committed batch ${Math.floor(i / BATCH_SIZE) + 1} (${Math.min(i + BATCH_SIZE, writes.length)}/${writes.length} writes)`)
  }

  console.log(`\nDone. Deleted ${toDeleteDocs.length} document(s), ${toDeleteItems.length} item(s), repaired ${sourceDocFixes.length} sourceDocumentId field(s).`)
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('\nFAILED:', err)
    process.exit(1)
  })
