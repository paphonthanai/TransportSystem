/**
 * One-time (idempotent) production migration script.
 *
 * Mirrors backfillDocumentClaimFields() in src/stores/salesDocuments.ts exactly, reimplemented here
 * against Firestore directly via firebase-admin — the store version only runs inside the app's live
 * Pinia state (browser), so it can't be invoked headlessly against production.
 *
 * Why this is needed: the app used to gate Billing/Tax Invoice/Receipt creation off a single shared
 * Booking.billingStatus field, so a job could only ever be claimed by ONE of the three document types.
 * That was replaced with three independent fields (Booking.billingNoteDocId/taxInvoiceDocId/receiptDocId)
 * so the three types can claim the same job independently. Existing bookings that were already claimed
 * under the old model have none of the new fields set — this script derives them from the bookingIds
 * already recorded on existing BILLING/TAX_INVOICE/RECEIPT documents (the source of truth), so already-
 * claimed jobs don't silently look "unclaimed" and become re-claimable by the same document type again.
 *
 * Idempotent: only sets a field on a booking if that field is not already set. Re-running after a
 * successful --apply finds nothing left to change.
 *
 * Usage:
 *   node scripts/backfillDocumentClaimFields.js --dry-run     (default if no flag given — reports only, writes nothing)
 *   node scripts/backfillDocumentClaimFields.js --apply       (writes the changes, then re-verifies)
 *
 * Credentials: point GOOGLE_APPLICATION_CREDENTIALS at a service account JSON key for the production
 * project (Firebase Console → Project Settings → Service Accounts → Generate new private key), e.g.:
 *   GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json node scripts/backfillDocumentClaimFields.js --dry-run
 * Never commit that key file — it is gitignored via *.json service-account patterns; double check before committing.
 */
import { initializeApp, cert, applicationDefault } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { readFileSync } from 'node:fs'

const PROJECT_ID = 'transportsystem-743c1'
const CLAIM_TYPES = ['BILLING', 'TAX_INVOICE', 'RECEIPT']
const FIELD_BY_TYPE = {
  BILLING: 'billingNoteDocId',
  TAX_INVOICE: 'taxInvoiceDocId',
  RECEIPT: 'receiptDocId',
}

function loadCredential() {
  const keyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS
  if (keyPath) {
    const key = JSON.parse(readFileSync(keyPath, 'utf-8'))
    return cert(key)
  }
  // falls back to gcloud application-default credentials if already configured on this machine
  return applicationDefault()
}

async function main() {
  const apply = process.argv.includes('--apply')
  const mode = apply ? 'APPLY' : 'DRY-RUN'
  console.log(`backfillDocumentClaimFields — mode: ${mode}, project: ${PROJECT_ID}\n`)

  initializeApp({ credential: loadCredential(), projectId: PROJECT_ID })
  const db = getFirestore()

  const [bookingsSnap, docsSnap] = await Promise.all([db.collection('bookings').get(), db.collection('salesDocuments').get()])

  const bookings = new Map(bookingsSnap.docs.map((d) => [d.id, d.data()]))
  const claimDocs = docsSnap.docs.filter((d) => CLAIM_TYPES.includes(d.data().type))

  const before = countClaims(bookings)
  console.log('Before:')
  printCounts(before, bookings.size)

  const plan = [] // { bookingId, docNo, field, docNumber }
  const pendingByBooking = new Map() // bookingId -> { field: docId, ... } (fields to set, merged across docs)

  claimDocs.forEach((docSnap) => {
    const doc = docSnap.data()
    const field = FIELD_BY_TYPE[doc.type]
    const bookingIds = Array.isArray(doc.bookingIds) ? doc.bookingIds : []
    bookingIds.forEach((bid) => {
      const booking = bookings.get(bid)
      if (!booking) return // booking doesn't exist (deleted) — nothing to repair
      if (booking[field]) return // already set — idempotent skip
      const pending = pendingByBooking.get(bid) || {}
      if (pending[field]) return // another doc of the same type already claimed this booking in this run — shouldn't happen, first wins
      pending[field] = docSnap.id
      pendingByBooking.set(bid, pending)
      plan.push({ bookingId: bid, docNo: booking.docNo, field, docNumber: doc.number })
    })
  })

  console.log(`\nPlan: ${plan.length} field(s) to set across ${pendingByBooking.size} booking(s)`)
  plan.forEach((p) => console.log(`  ${p.docNo} (${p.bookingId}) . ${p.field} = ${p.docNumber}`))

  if (plan.length === 0) {
    console.log('\nNothing to do.')
    return
  }

  if (!apply) {
    console.log('\nDry-run only — no writes made. Re-run with --apply to write these changes.')
    return
  }

  console.log('\nApplying...')
  const entries = [...pendingByBooking.entries()]
  const BATCH_SIZE = 400 // Firestore batch limit is 500 writes; stay well under it
  for (let i = 0; i < entries.length; i += BATCH_SIZE) {
    const batch = db.batch()
    entries.slice(i, i + BATCH_SIZE).forEach(([bookingId, fields]) => {
      batch.set(db.collection('bookings').doc(bookingId), fields, { merge: true })
    })
    await batch.commit()
    console.log(`  committed batch ${Math.floor(i / BATCH_SIZE) + 1}`)
  }

  console.log('\nVerifying...')
  const afterSnap = await db.collection('bookings').get()
  const afterBookings = new Map(afterSnap.docs.map((d) => [d.id, d.data()]))
  const after = countClaims(afterBookings)
  console.log('After:')
  printCounts(after, afterBookings.size)

  console.log('\nSample of repaired records:')
  plan.slice(0, 5).forEach((p) => {
    const b = afterBookings.get(p.bookingId)
    console.log(`  ${p.docNo}: ${p.field} = ${b?.[p.field]} (expected ${p.field === 'billingNoteDocId' ? pendingByBooking.get(p.bookingId).billingNoteDocId : p.field === 'taxInvoiceDocId' ? pendingByBooking.get(p.bookingId).taxInvoiceDocId : pendingByBooking.get(p.bookingId).receiptDocId})`)
  })

  console.log(`\nDone. ${plan.length} field(s) repaired across ${pendingByBooking.size} booking(s).`)
}

function countClaims(bookingsMap) {
  let billingNoteDocId = 0
  let taxInvoiceDocId = 0
  let receiptDocId = 0
  for (const b of bookingsMap.values()) {
    if (b.billingNoteDocId) billingNoteDocId++
    if (b.taxInvoiceDocId) taxInvoiceDocId++
    if (b.receiptDocId) receiptDocId++
  }
  return { billingNoteDocId, taxInvoiceDocId, receiptDocId }
}

function printCounts(counts, total) {
  console.log(`  total bookings: ${total}`)
  console.log(`  billingNoteDocId set: ${counts.billingNoteDocId}`)
  console.log(`  taxInvoiceDocId set: ${counts.taxInvoiceDocId}`)
  console.log(`  receiptDocId set: ${counts.receiptDocId}`)
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('\nFAILED:', err)
    process.exit(1)
  })
