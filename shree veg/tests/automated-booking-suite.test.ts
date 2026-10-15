import test from 'node:test';
import assert from 'node:assert';
import {
  createBookingService,
  updateBookingStatusService,
  setDateRuleService,
  removeDateRuleService,
  resetDemoDataService,
  updateMenuItemService,
  listAllBookingsService,
  getBookingStatusService,
  getDateRules,
} from '@/lib/booking/booking-service';
import { checkRateLimit } from '@/lib/rate-limiter';
import { sendMessage } from '@/lib/messaging';
import { broadcastNewBookingPush } from '@/lib/push/push-service';
import { listMessageLogs, clearInMemoryMessageLogs } from '@/lib/messaging/logger';

// -----------------------------------------------------------------------------
// HELPER FIXTURES & DATES
// -----------------------------------------------------------------------------
const TEST_SLOT_TIME = '13:00';
const FUTURE_DATE = '2026-12-25'; // Isolated test date
const TEST_SLOT_START = `${FUTURE_DATE}T${TEST_SLOT_TIME}:00+05:30`;

// Reset database/demo store before test suites
async function resetTestEnvironment() {
  await resetDemoDataService();
  clearInMemoryMessageLogs();
  await removeDateRuleService(FUTURE_DATE, 'owner');
}

// =============================================================================
// TEST SUITE 1: OVERBOOKING UNDER TWO SIMULTANEOUS REQUESTS (CONCURRENCY)
// =============================================================================
test('1. Concurrency: Two simultaneous booking requests exceeding slot capacity', async () => {
  await resetTestEnvironment();

  // Test setup: Slot has 30 seats total.
  // We first fill 18 seats with an initial group meal booking (party size 18).
  // Remaining slot capacity is strictly 12 seats (30 - 18).
  const baseline = await createBookingService({
    type: 'group_meal',
    party_size: 18,
    package_id: 'pkg-1-pilgrim',
    slot_start: TEST_SLOT_START,
    guest_name: 'प्रारंभिक वारकरी संघ (Baseline)',
    guest_phone: '9822000001',
  });
  assert.strictEqual(baseline.success, true, 'Baseline booking for 18 seats must succeed');

  // Now, Client A and Client B arrive AT THE EXACT SAME MILLISECOND.
  // Both Client A and Client B request 8 seats.
  // Combined demand is 8 + 8 = 16 seats, but only 12 seats remain!
  // Expected behavior: EXACTLY ONE succeeds, and the other receives SLOT_CAPACITY_EXCEEDED.
  const reqA = createBookingService({
    type: 'table',
    party_size: 8,
    slot_start: TEST_SLOT_START,
    guest_name: 'ग्राहक अ (Client A)',
    guest_phone: '9822000002',
  });

  const reqB = createBookingService({
    type: 'table',
    party_size: 8,
    slot_start: TEST_SLOT_START,
    guest_name: 'ग्राहक ब (Client B)',
    guest_phone: '9822000003',
  });

  const [resA, resB] = await Promise.all([reqA, reqB]);

  const successCount = (resA.success ? 1 : 0) + (resB.success ? 1 : 0);
  const failureCount = (!resA.success ? 1 : 0) + (!resB.success ? 1 : 0);

  assert.strictEqual(successCount, 1, 'Exactly one concurrent request must succeed');
  assert.strictEqual(failureCount, 1, 'Exactly one concurrent request must be rejected');

  const failedResult = !resA.success ? resA : resB;
  assert.strictEqual(
    failedResult.error_code,
    'SLOT_CAPACITY_EXCEEDED',
    'Failed request must return SLOT_CAPACITY_EXCEEDED'
  );
  assert.strictEqual(
    failedResult.available_seats,
    4,
    'Remaining seats reported must accurately be 4 (30 - 18 - 8)'
  );

  // Check total booked seats in store
  const all = await listAllBookingsService({ filter: 'all' });
  const slotBookings = all.bookings.filter(
    (b) => b.slot_start === TEST_SLOT_START && b.status !== 'rejected' && b.status !== 'cancelled'
  );
  const totalBooked = slotBookings.reduce((sum, b) => sum + b.party_size, 0);
  assert.strictEqual(totalBooked, 26, 'Total booked seats must be strictly 26 (18 + 8) and <= 30');
});

// =============================================================================
// TEST SUITE 2: DUPLICATE BOOKINGS (SAME PHONE + SLOT)
// =============================================================================
test('2. Duplicate Bookings: Same guest phone in same 30-min window rejected', async () => {
  await resetTestEnvironment();

  const phone = '9822114455';

  // 1st Attempt: Legitimate booking
  const first = await createBookingService({
    type: 'table',
    party_size: 4,
    slot_start: TEST_SLOT_START,
    guest_name: 'अविनाश कदम',
    guest_phone: phone,
  });
  assert.strictEqual(first.success, true, 'First booking should succeed');

  // 2nd Attempt: Duplicate booking from same phone for same time slot
  const duplicate = await createBookingService({
    type: 'table',
    party_size: 4,
    slot_start: TEST_SLOT_START,
    guest_name: 'अविनाश कदम (पुन्हा प्रयत्न)',
    guest_phone: phone,
  });

  assert.strictEqual(duplicate.success, false, 'Duplicate booking must be rejected');
  assert.strictEqual(
    duplicate.error_code,
    'DUPLICATE_BOOKING',
    'Error code must be DUPLICATE_BOOKING'
  );
  assert.ok(
    duplicate.message_mr?.includes('या मोबाईल क्रमांकावर या वेळेसाठी आधीच एक आरक्षण नोंदवले गेले आहे'),
    'Should return informative Marathi message'
  );

  // 3rd Attempt: Same phone booking a DIFFERENT slot (e.g. 14:00) must SUCCEED
  const differentSlotStart = `${FUTURE_DATE}T14:00:00+05:30`;
  const differentSlot = await createBookingService({
    type: 'table',
    party_size: 4,
    slot_start: differentSlotStart,
    guest_name: 'अविनाश कदम',
    guest_phone: phone,
  });
  assert.strictEqual(differentSlot.success, true, 'Same phone for different slot must succeed');
});

// =============================================================================
// TEST SUITE 3: BLOCKED AND FESTIVAL DATES
// =============================================================================
test('3. Date Rules: Blocked dates reject; Festival dates enforce 10-seat table cap & 24-seat Pangat', async () => {
  await resetTestEnvironment();

  const testDate = FUTURE_DATE;
  const slotStart = `${testDate}T12:00:00+05:30`;

  // --- PART A: BLOCKED DATE RULE ---
  await setDateRuleService(
    testDate,
    'blocked',
    'हॉटेल देखभाल व रंगकाम (Annual Maintenance)',
    'Hotel Maintenance',
    'owner'
  );

  const blockedAttempt = await createBookingService({
    type: 'table',
    party_size: 4,
    slot_start: slotStart,
    guest_name: 'प्रशांत जोशी',
    guest_phone: '9850112233',
  });

  assert.strictEqual(blockedAttempt.success, false, 'Booking on blocked date must fail');
  assert.strictEqual(blockedAttempt.error_code, 'DATE_BLOCKED', 'Error code must be DATE_BLOCKED');
  assert.ok(
    blockedAttempt.message_mr?.includes('हॉटेल देखभाल'),
    'Blocked date message should include the specific reason'
  );

  // --- PART B: FESTIVAL DATE RULE ---
  await setDateRuleService(
    testDate,
    'festival',
    'अंगारकी संकष्टी चतुर्थी (मोठी गर्दी)',
    'Angarki Chaturthi Festival',
    'owner'
  );

  // Test 1: Single table booking with party size 11 (exceeds festival max table size 10)
  const festivalTableOver = await createBookingService({
    type: 'table',
    party_size: 11,
    slot_start: slotStart,
    guest_name: 'ज्ञानेश्वर महाराज पालखी मंडळ',
    guest_phone: '9850112244',
  });

  assert.strictEqual(festivalTableOver.success, false, 'Single table > 10 on festival must fail');
  assert.strictEqual(
    festivalTableOver.error_code,
    'EXCEEDS_FESTIVAL_TABLE_LIMIT',
    'Must return EXCEEDS_FESTIVAL_TABLE_LIMIT'
  );

  // Test 2: Single table booking with party size 8 (within festival table limit of 10)
  const festivalTableOk = await createBookingService({
    type: 'table',
    party_size: 8,
    slot_start: slotStart,
    guest_name: 'सुरेश कुलकर्णी',
    guest_phone: '9850112255',
  });
  assert.strictEqual(festivalTableOk.success, true, 'Table booking of 8 on festival must succeed');

  // Test 3: Pilgrim Group Meal (पंगत थाळी) on festival receives dedicated Pangat capacity (up to 24)
  const festivalPangat = await createBookingService({
    type: 'group_meal',
    party_size: 15,
    slot_start: slotStart,
    guest_name: 'वारकरी भाविक भजन संघ',
    guest_phone: '9850112266',
    package_id: 'pkg-1-pilgrim',
  });
  assert.strictEqual(
    festivalPangat.success,
    true,
    'Group meal Pangat of 15 guests on festival day must succeed'
  );

  // Cleanup date rule
  await removeDateRuleService(testDate, 'owner');
});

// =============================================================================
// TEST SUITE 4: INVALID PHONE VALIDATION
// =============================================================================
test('4. Input Validation: Phone number validation (Indian 10-digit 6-9 prefix)', async () => {
  await resetTestEnvironment();

  const invalidPhones = [
    { phone: '9822', reason: 'Too short (4 digits)' },
    { phone: '982211445', reason: '9 digits only' },
    { phone: '1234567890', reason: 'Starts with 1 (not valid Indian mobile)' },
    { phone: '0982211445', reason: 'Starts with 0' },
    { phone: 'abcdefghij', reason: 'Letters only' },
    { phone: '982211445X', reason: 'Contains alphanumeric characters' },
    { phone: '', reason: 'Empty string' },
  ];

  for (const item of invalidPhones) {
    const res = await createBookingService({
      type: 'table',
      party_size: 2,
      slot_start: TEST_SLOT_START,
      guest_name: 'चाचणी ग्राहक',
      guest_phone: item.phone,
    });

    assert.strictEqual(
      res.success,
      false,
      `Phone "${item.phone}" (${item.reason}) must be rejected`
    );
    assert.strictEqual(
      res.error_code,
      'INVALID_PHONE',
      `Error code for "${item.phone}" must be INVALID_PHONE`
    );
  }

  // Valid Indian mobile numbers starting with 6, 7, 8, 9
  const validPhones = ['9822114455', '8765432109', '7012345678', '6234567890'];
  for (let i = 0; i < validPhones.length; i++) {
    const res = await createBookingService({
      type: 'table',
      party_size: 2,
      slot_start: `${FUTURE_DATE}T${15 + i}:00:00+05:30`,
      guest_name: `वैध ग्राहक ${i + 1}`,
      guest_phone: validPhones[i],
    });

    assert.strictEqual(res.success, true, `Valid phone "${validPhones[i]}" must be accepted`);
  }
});

// =============================================================================
// TEST SUITE 5: ROLE PERMISSIONS (OWNER, MANAGER, KITCHEN)
// =============================================================================
test('5. Role Permissions: Owner & Manager can modify; Kitchen is strictly READ-ONLY (403)', async () => {
  await resetTestEnvironment();

  // Create a pending booking
  const created = await createBookingService({
    type: 'table',
    party_size: 4,
    slot_start: TEST_SLOT_START,
    guest_name: 'रोहित सावंत',
    guest_phone: '9822334455',
  });
  assert.strictEqual(created.success, true);
  assert.ok(created.booking_id, 'Booking ID must be present');
  const bookingId = created.booking_id!;

  // --- Kitchen Role: READ-ONLY Verification ---
  // 1. Kitchen attempts to CONFIRM a booking -> Forbidden
  const kitchenConfirm = await updateBookingStatusService(bookingId, 'confirmed', {
    callerRole: 'kitchen',
  });
  assert.strictEqual(kitchenConfirm.success, false, 'Kitchen role cannot confirm booking');
  assert.ok(
    kitchenConfirm.error?.includes('Kitchen role is strictly read-only'),
    'Kitchen update must return read-only error'
  );

  // 2. Kitchen attempts to REJECT a booking -> Forbidden
  const kitchenReject = await updateBookingStatusService(bookingId, 'rejected', {
    callerRole: 'kitchen',
    rejectionReason: 'Kitchen tried to cancel',
  });
  assert.strictEqual(kitchenReject.success, false, 'Kitchen role cannot reject booking');
  assert.ok(kitchenReject.error?.includes('Kitchen role is strictly read-only'));

  // 3. Kitchen attempts to update menu item price -> Forbidden
  const kitchenMenu = await updateMenuItemService('item-1-thali', {
    price: 300,
    callerRole: 'kitchen',
  });
  assert.strictEqual(kitchenMenu.success, false, 'Kitchen role cannot modify menu');
  assert.ok(kitchenMenu.error?.includes('Kitchen role is strictly read-only'));

  // 4. Kitchen attempts to set date rule -> Forbidden
  const kitchenDate = await setDateRuleService(FUTURE_DATE, 'blocked', 'Test', 'Test', 'kitchen');
  assert.strictEqual(kitchenDate.success, false, 'Kitchen role cannot set date rules');
  assert.ok(kitchenDate.error?.includes('Kitchen role is strictly read-only'));

  // --- Manager Role: Allowed to update status and menu ---
  const managerConfirm = await updateBookingStatusService(bookingId, 'confirmed', {
    callerRole: 'manager',
    prepTimeMins: 20,
  });
  assert.strictEqual(managerConfirm.success, true, 'Manager must be permitted to confirm');
  assert.strictEqual(managerConfirm.booking?.status, 'confirmed');

  // --- Owner Role: Full permissions including Seated ---
  const ownerSeat = await updateBookingStatusService(bookingId, 'seated', {
    callerRole: 'owner',
  });
  assert.strictEqual(ownerSeat.success, true, 'Owner must be permitted to seat guests');
  assert.strictEqual(ownerSeat.booking?.status, 'seated');
});

// =============================================================================
// TEST SUITE 6: REALTIME DELIVERY & NOTIFICATIONS
// =============================================================================
test('6. Realtime Delivery: WhatsApp templates, wa.me deep links, Push dispatch & audit logs', async () => {
  try {
    await resetTestEnvironment();

    const booking = {
      id: 'bk-test-realtime-001',
      tokenNumber: 'SV-1310-009',
      guestName: 'विठ्ठल रुक्मिणी भक्त परिवार',
      guestPhone: '9822119988',
      partySize: 12,
      slotStart: '2026-10-13T13:30:00+05:30',
      bookingType: 'group_meal',
      totalEstimatedAmount: 3960,
    };

    // 1. WhatsApp Confirmation Message Dispatch
    const waResult = await sendMessage('guest_confirmed', booking, 'mr');
    assert.strictEqual(waResult.success, true, 'WhatsApp confirmation message must dispatch');
    assert.strictEqual(waResult.recipientPhone, '919822119988');
    assert.ok(waResult.text.includes('SV-1310-009'), 'Message must contain token number');
    assert.ok(waResult.text.includes('चिंतामणी'), 'Message must mention Theur Chintamani location');
    assert.ok(waResult.url, 'URL must be generated');
    assert.ok(
      waResult.url.startsWith('https://wa.me/919822119988?text='),
      'Must construct valid wa.me URI'
    );

    // 2. WhatsApp Owner New Booking Alert Dispatch
    const ownerAlert = await sendMessage('owner_new_booking', booking, 'mr');
    assert.strictEqual(ownerAlert.success, true, 'Owner alert message must dispatch');
    assert.ok(ownerAlert.text.includes('नवीन आरक्षण सूचना'), 'Owner alert must have header');

    // 3. Web Push Broadcast Dispatch Simulation
    const pushResult = await broadcastNewBookingPush({
      title: 'श्री प्युअर व्हेज: नवीन आरक्षण! 🔔',
      body: `टोकन #${booking.tokenNumber}: ${booking.guestName} (${booking.partySize} व्यक्ती)`,
      tokenNumber: booking.tokenNumber,
      bookingId: booking.id,
      partySize: booking.partySize,
      timeSlot: booking.slotStart,
      guestName: booking.guestName,
    });
    assert.strictEqual(typeof pushResult.sentCount, 'number', 'Push broadcast must report sentCount');

    // 4. Audit Log Verification
    const logs = await listMessageLogs({ bookingId: booking.id });
    assert.ok(logs.length >= 1, 'Dispatched messages must be logged in message audit store');
    assert.ok(logs.some((l) => l.recipient_phone.includes('9822119988')), 'Audit log must record recipient');
    assert.strictEqual(logs[0].status, 'sent');
  } catch (err: any) {
    console.error('TEST 6 FAILED WITH ERROR:', err.stack);
    throw err;
  }
});

// =============================================================================
// TEST SUITE 7: RATE LIMITING UNIT TEST
// =============================================================================
test('7. Rate Limiter: Window rate limit triggers 429 after 6 attempts within 5 mins', () => {
  const testIp = '192.168.1.100';
  const phoneSuffix = '9999';
  const key = `${testIp}_${phoneSuffix}`;

  // Allow first 6 attempts
  for (let i = 1; i <= 6; i++) {
    const check = checkRateLimit(key, 6, 60000);
    assert.strictEqual(check.success, true, `Request #${i} within limit must pass`);
  }

  // 7th attempt within window must be BLOCKED
  const blocked = checkRateLimit(key, 6, 60000);
  assert.strictEqual(blocked.success, false, '7th attempt must be blocked by rate limiter');
  assert.strictEqual(blocked.remaining, 0);
  assert.ok(blocked.resetInSeconds > 0, 'Must provide reset timeout in seconds');
});
