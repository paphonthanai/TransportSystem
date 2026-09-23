/**
 * One-time, DESTRUCTIVE production cleanup script — run once, right before real customer go-live.
 *
 * Permanently deletes ALL documents in:
 *   - bookings              (every job/booking, including completed ones)
 *   - salesDocuments        (every Quotation/SalesOrder/Billing/TaxInvoice/Receipt/CashSale/PurchaseOrder)
 *   - salesDocumentItems    (every line item belonging to the documents above)
 *
 * Deliberately does NOT touch (confirmed with the user):
 *   - documentSettings, fuelRates, billingRules, or any other settings collection
 *   - users, drivers, vehicles, customers
 *   - auditLogs — this collection is intentionally append-only by design (see
 *     src/repositories/auditLogRepository.ts and firestore.rules: update/delete on it is blocked
 *     for every role, including ADMIN, because the whole point is an edit/delete-proof history).
 *     Deleting it via this script would bypass that design intent on purpose, so it is excluded
 *     by default. If you genuinely want it wiped too, do it as an explicit separate, deliberate step —
 *     not folded into this general cleanup.
 *   - the in-browser activity log (booking.ts's `logs` ref) — this lives in each browser's own
 *     localStorage, not Firestore, so no server-side script can clear it. It is already effectively
 *     "reset" for the customer: a fresh browser/device starts with an empty history automatically.
 *     If you specifically want to clear what accumulated in a tester's own browser during this test
 *     phase, that's a client-side action (open that browser's devtools console and run
 *     `localStorage.removeItem('tms_logs_v1')` — check LOGS_KEY in src/stores/booking.ts for the
 *     exact key — or just clear that browser's site data for this origin).
 *
 * This does not reset any numbering counters — none are needed. Both booking.docNo (nextDocNo) and
 * sales-document numbers (nextFreeSequence) compute the next number by scanning existing documents
 * fresh every time, so once this script empties bookings/salesDocuments, the very next document
 * created will naturally start at 0001 for the current year on its own.
 *
 * Usage:
 *   node scripts/wipeTestDataForGoLive.js --dry-run     (default — reports counts only, deletes nothing)
 *   node scripts/wipeTestDataForGoLive.js --apply       (permanently deletes everything listed above)
 *
 * Credentials: same as the other scripts in this folder —
 *   GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json node scripts/wipeTestDataForGoLive.js --dry-run
 */
import { initializeApp, cert, applicationDefault } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { readFileSync } from 'node:fs'
import readline from 'node:readline'

const PROJECT_ID = 'transportsystem-743c1'
const COLLECTIONS_TO_WIPE = ['bookings', 'salesDocuments', 'salesDocumentItems']

function loadCredential() {
  const keyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS
  if (keyPath) {
    const key = JSON.parse(readFileSync(keyPath, 'utf-8'))
    return cert(key)
  }
  return applicationDefault()
}

function confirm(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  return new Promise((resolve) => rl.question(question, (answer) => { rl.close(); resolve(answer.trim()) }))
}

async function main() {
  const apply = process.argv.includes('--apply')
  const mode = apply ? 'APPLY (DESTRUCTIVE)' : 'DRY-RUN'
  console.log(`wipeTestDataForGoLive — mode: ${mode}, project: ${PROJECT_ID}\n`)

  initializeApp({ credential: loadCredential(), projectId: PROJECT_ID })
  const db = getFirestore()

  const counts = {}
  const refsByCollection = {}
  for (const col of COLLECTIONS_TO_WIPE) {
    const snap = await db.collection(col).get()
    counts[col] = snap.size
    refsByCollection[col] = snap.docs.map((d) => d.ref)
  }

  console.log('Documents found:')
  for (const col of COLLECTIONS_TO_WIPE) console.log(`  ${col}: ${counts[col]}`)
  const total = Object.values(counts).reduce((a, b) => a + b, 0)
  console.log(`  TOTAL: ${total}`)

  console.log('\nNOT touched (by design): documentSettings, fuelRates, billingRules, users, drivers, vehicles, customers, auditLogs')

  if (total === 0) {
    console.log('\nNothing to delete.')
    return
  }

  if (!apply) {
    console.log('\nDry-run only — no writes made. Re-run with --apply to permanently delete these documents.')
    return
  }

  console.log(`\n⚠️  This will PERMANENTLY delete ${total} document(s) across ${COLLECTIONS_TO_WIPE.join(', ')} in project "${PROJECT_ID}".`)
  console.log('This cannot be undone. There is no trash/recycle bin for Firestore deletes.')
  const answer = await confirm(`Type the project id ("${PROJECT_ID}") to confirm and proceed: `)
  if (answer !== PROJECT_ID) {
    console.log('\nConfirmation did not match — aborted, nothing was deleted.')
    return
  }

  console.log('\nDeleting...')
  const BATCH_SIZE = 400
  for (const col of COLLECTIONS_TO_WIPE) {
    const refs = refsByCollection[col]
    for (let i = 0; i < refs.length; i += BATCH_SIZE) {
      const batch = db.batch()
      refs.slice(i, i + BATCH_SIZE).forEach((ref) => batch.delete(ref))
      await batch.commit()
      console.log(`  ${col}: deleted ${Math.min(i + BATCH_SIZE, refs.length)}/${refs.length}`)
    }
  }

  console.log(`\nDone. Deleted ${total} document(s) total. The system is ready for the customer's real data.`)
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('\nFAILED:', err)
    process.exit(1)
  })
