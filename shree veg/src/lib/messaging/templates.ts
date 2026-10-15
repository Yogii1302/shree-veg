import type {
  BookingInput,
  NormalizedBooking,
  MessageKind,
  MessageLanguage,
  BookingType,
} from './types';
import { getSlotAvailability } from '@/lib/booking/booking-service';

/**
 * Standardizes phone numbers for WhatsApp (e.g. +91 98220 12345 -> 919822012345).
 * Automatically prepends India country code 91 if a 10-digit number is provided.
 */
export function sanitizePhoneNumber(phone?: string): string {
  if (!phone) return '919876543210';
  const digitsOnly = phone.replace(/\D/g, '');
  if (digitsOnly.length === 10) {
    return `91${digitsOnly}`;
  }
  return digitsOnly;
}

/**
 * Finds the next available slot for a booking when rejected due to rush.
 */
export function findNextAvailableSlot(
  slotStart?: string,
  partySize: number = 2
): string {
  try {
    const rawDate = slotStart?.includes('T')
      ? slotStart.split('T')[0]
      : new Date().toISOString().split('T')[0];
    const rawTime = slotStart?.includes('T')
      ? slotStart.split('T')[1].substring(0, 5)
      : '12:00';

    const slots = getSlotAvailability(rawDate, partySize);

    // Look for first future slot today with available capacity
    const nextSlotToday = slots.find(
      (s) => !s.is_full && !s.is_past && s.time > rawTime
    );

    if (nextSlotToday) {
      const seats = nextSlotToday.available_seats;
      return `${rawDate} रोजी दुपारी/संध्याकाळी ${nextSlotToday.time} वा. (${seats} जागा शिल्लक) / Today ${nextSlotToday.time} (${seats} seats free)`;
    }

    // If none left today, look for first available slot tomorrow
    const d = new Date(rawDate);
    d.setDate(d.getDate() + 1);
    const tomorrowStr = d.toISOString().split('T')[0];
    const tomorrowSlots = getSlotAvailability(tomorrowStr, partySize);
    const nextSlotTomorrow = tomorrowSlots.find((s) => !s.is_full && !s.is_past);

    if (nextSlotTomorrow) {
      return `उद्या (${tomorrowStr}) सकाळी/दुपारी ${nextSlotTomorrow.time} वा. / Tomorrow ${nextSlotTomorrow.time}`;
    }
  } catch (err) {
    console.warn('Could not auto-calculate next slot:', err);
  }

  // Graceful fallback slot
  return 'पुढील ३०-४५ मिनिटांत किंवा संध्याकाळी ७:०० वा. (Today 7:00 PM or call hotel)';
}

/**
 * Normalizes input from either BookingRecord, API request body, or payload.
 */
export function normalizeBookingInput(input: BookingInput): NormalizedBooking {
  const id = input.id || input.bookingId || input.booking_id || `temp-${Date.now()}`;
  const tokenNumber =
    input.tokenNumber || input.token_number || `SV-${Math.floor(100 + Math.random() * 900)}`;

  const guestName = input.guestName || input.guest_name || 'Guest / सन्माननीय अतिथी';
  const rawGuestPhone = input.guestPhone || input.guest_phone || '9876543210';
  const cleanGuestPhone = sanitizePhoneNumber(rawGuestPhone);

  const rawRestPhone =
    input.restaurantPhone ||
    input.restaurant_phone ||
    process.env.NEXT_PUBLIC_RESTAURANT_PHONE ||
    '919876543210';
  const cleanRestPhone = sanitizePhoneNumber(rawRestPhone);

  const restaurantName =
    input.restaurantName ||
    input.restaurant_name ||
    process.env.NEXT_PUBLIC_RESTAURANT_NAME ||
    'Shree Pure Veg / श्री प्युअर व्हेज (Theur Phata)';

  const restaurantLocation =
    input.restaurantLocation ||
    input.restaurant_location ||
    process.env.NEXT_PUBLIC_RESTAURANT_LOCATION ||
    'Theur Phata, Kunjirwadi, Pune-Solapur Highway, Pune 412201';

  const partySize =
    input.partySize || input.party_size || input.guestCount || 2;

  const rawType = (input.type || input.bookingType || 'table').toString().toLowerCase();
  const bookingType: BookingType = ['table', 'group_meal', 'order_ahead'].includes(rawType)
    ? (rawType as BookingType)
    : 'table';

  const bookingTypeMrMap: Record<BookingType, string> = {
    table: 'टेबल आरक्षण (Table Reservation)',
    group_meal: 'भाविक व कुटुंब पंगत थाळी (Pilgrim Group Meal)',
    order_ahead: 'जेवण आधी मागवा (Order Ahead)',
  };

  const bookingTypeHiMap: Record<BookingType, string> = {
    table: 'टेबल आरक्षण (Table Reservation)',
    group_meal: 'तीर्थयात्री एवं परिवार पंगत थाली (Pilgrim Group Meal)',
    order_ahead: 'पूर्व-ऑर्डर भोजन (Order Ahead)',
  };

  const bookingTypeEnMap: Record<BookingType, string> = {
    table: 'Table Reservation',
    group_meal: 'Pilgrim / Family Group Meal',
    order_ahead: 'Order Ahead (Highway Takeaway/Dine-in)',
  };

  const slotStart =
    input.slotStart ||
    input.slot_start ||
    (input.date && input.timeSlot ? `${input.date}T${input.timeSlot}:00` : new Date().toISOString());

  let date = input.date || '';
  let time = input.time || input.timeSlot || '';

  if (slotStart.includes('T')) {
    const [dPart, tPart] = slotStart.split('T');
    if (!date) date = dPart;
    if (!time) time = tPart.substring(0, 5);
  } else if (!date) {
    date = new Date().toISOString().split('T')[0];
    time = '13:00';
  }

  const prepTimeMins =
    input.prepTimeMins ?? input.prep_time_mins ?? input.estimated_prep_time_mins;

  const rejectionReason = input.rejectionReason || input.rejection_reason;

  const nextAvailableSlot =
    input.nextAvailableSlot ||
    input.next_available_slot ||
    findNextAvailableSlot(slotStart, partySize);

  const totalEstimatedAmount =
    input.totalEstimatedAmount ?? input.total_estimated_amount;

  const notes = input.notes || input.specialRequests;

  const rawItems = input.items || input.preOrderItems || [];
  const items = rawItems.map((item) => ({
    nameMr: item.nameMr || item.name || 'पदार्थ',
    nameHi: item.nameHi || item.nameMr || item.name || 'व्यंजन',
    nameEn: item.nameEn || item.name || 'Item',
    quantity: item.quantity || 1,
    price: item.price,
  }));

  return {
    id,
    tokenNumber,
    guestName,
    guestPhone: rawGuestPhone,
    cleanGuestPhone,
    partySize,
    bookingType,
    bookingTypeMr: bookingTypeMrMap[bookingType] || bookingType,
    bookingTypeHi: bookingTypeHiMap[bookingType] || bookingType,
    bookingTypeEn: bookingTypeEnMap[bookingType] || bookingType,
    date,
    time,
    slotStart,
    rejectionReason,
    nextAvailableSlot,
    prepTimeMins,
    restaurantName,
    restaurantPhone: rawRestPhone,
    cleanRestaurantPhone: cleanRestPhone,
    restaurantLocation,
    totalEstimatedAmount,
    notes,
    items,
  };
}

// =============================================================================
// MESSAGE TEMPLATES (ENGLISH, HINDI, MARATHI)
// =============================================================================

export const TEMPLATES = {
  // 1. GUEST CONFIRMED
  guest_confirmed: {
    en: (b: NormalizedBooking): string => {
      let prepText = '';
      if (b.prepTimeMins !== undefined) {
        prepText = b.prepTimeMins === 0
          ? `\n⚡ *Prep Time:* Immediate Seating Ready`
          : `\n⏳ *Est. Prep Time:* ${b.prepTimeMins} mins`;
      }

      let itemsText = '';
      if (b.items.length > 0) {
        itemsText =
          `\n📋 *Pre-ordered Items:*\n` +
          b.items.map((i) => ` • ${i.nameEn} x ${i.quantity}`).join('\n');
      }

      let billText = '';
      if (b.totalEstimatedAmount && b.totalEstimatedAmount > 0) {
        billText = `\n💰 *Est. Bill:* ₹${b.totalEstimatedAmount} (Pay at counter)`;
      }

      return `🙏 *Shree Pure Veg - Theur Phata* 🙏
━━━━━━━━━━━━━━━━━━━━━
Hello ${b.guestName}! Your booking is CONFIRMED. ✅

🎫 *Token:* #${b.tokenNumber}
📌 *Type:* ${b.bookingTypeEn}
📅 *Date:* ${b.date}
⏰ *Time Slot:* ${b.time}
👥 *Party Size:* ${b.partySize} guests${prepText}${itemsText}${billText}

📍 *Location:* ${b.restaurantLocation}
📞 *Helpline:* ${b.restaurantPhone}
🗺️ *Map:* https://maps.google.com/?q=Theur+Phata+Kunjirwadi

Welcoming all Chintamani Ganpati temple pilgrims & highway travelers! 🙏`;
    },

    hi: (b: NormalizedBooking): string => {
      let prepText = '';
      if (b.prepTimeMins !== undefined) {
        prepText = b.prepTimeMins === 0
          ? `\n⚡ *तैयारी समय:* तत्काल टेबल उपलब्ध (Immediate Seating)`
          : `\n⏳ *अनुमानित तैयारी समय:* ${b.prepTimeMins} मिनट`;
      }

      let itemsText = '';
      if (b.items.length > 0) {
        itemsText =
          `\n📋 *ऑर्डर किए गए व्यंजन:*\n` +
          b.items.map((i) => ` • ${(i.nameHi || i.nameMr)} x ${i.quantity}`).join('\n');
      }

      let billText = '';
      if (b.totalEstimatedAmount && b.totalEstimatedAmount > 0) {
        billText = `\n💰 *अनुमानित बिल:* ₹${b.totalEstimatedAmount} (होटल काउंटर पर दें)`;
      }

      return `🙏 *श्री गणेशाय नमः | श्री प्योर वेज (थेऊर फाटा)* 🙏
━━━━━━━━━━━━━━━━━━━━━
नमस्ते ${b.guestName} जी! आपका आरक्षण निश्चित (CONFIRMED) हो गया है। ✅

🎫 *टोकन संख्या:* #${b.tokenNumber}
📌 *प्रकार:* ${b.bookingTypeHi || b.bookingTypeMr}
📅 *तारीख:* ${b.date}
⏰ *समय:* ${b.time}
👥 *अतिथि संख्या:* ${b.partySize} व्यक्ति${prepText}${itemsText}${billText}

📍 *पता:* ${b.restaurantLocation}
📞 *सहायता / संपर्क:* ${b.restaurantPhone}
🗺️ *गूगल मैप:* https://maps.google.com/?q=Theur+Phata+Kunjirwadi

चिंतामणि गणपति के दर्शन हेतु आने वाले भक्तों एवं आपके परिवार का हार्दिक स्वागत है! 🙏`;
    },

    mr: (b: NormalizedBooking): string => {
      let prepText = '';
      if (b.prepTimeMins !== undefined) {
        prepText = b.prepTimeMins === 0
          ? `\n⚡ *तयारी वेळ:* तात्काळ जागा उपलब्ध (Immediate Seating)`
          : `\n⏳ *अंदाजे तयारी वेळ:* ${b.prepTimeMins} मिनिटे`;
      }

      let itemsText = '';
      if (b.items.length > 0) {
        itemsText =
          `\n📋 *मागवलेले मेनू पदार्थ:*\n` +
          b.items.map((i) => ` • ${i.nameMr} x ${i.quantity}`).join('\n');
      }

      let billText = '';
      if (b.totalEstimatedAmount && b.totalEstimatedAmount > 0) {
        billText = `\n💰 *अंदाजे बिल:* ₹${b.totalEstimatedAmount} (हॉटेलमध्ये काउंटरवर द्यावे)`;
      }

      return `🙏 *श्री गणेशाय नमः | श्री प्युअर व्हेज (थेऊर फाटा)* 🙏
━━━━━━━━━━━━━━━━━━━━━
नमस्ते ${b.guestName} जी! आपले आरक्षण निश्चित (CONFIRMED) झाले आहे. ✅

🎫 *टोकन क्र:* #${b.tokenNumber}
📌 *प्रकार:* ${b.bookingTypeMr}
📅 *तारीख:* ${b.date}
⏰ *वेळ:* ${b.time}
👥 *व्यक्ती संख्या:* ${b.partySize} लोक${prepText}${itemsText}${billText}

📍 *पत्ता:* ${b.restaurantLocation}
📞 *मदत / संपर्क:* ${b.restaurantPhone}
🗺️ *गूगल मॅप:* https://maps.google.com/?q=Theur+Phata+Kunjirwadi

चिंतामणी गणपतीच्या दर्शनासाठी येणाऱ्या भाविकांचे आणि आपल्या परिवाराचे मनःपूर्वक स्वागत! 🙏`;
    },
  },

  // 2. GUEST REJECTED (WITH NEXT AVAILABLE SLOT SUGGESTED)
  guest_rejected: {
    en: (b: NormalizedBooking): string => {
      const reasonLine = b.rejectionReason
        ? `📌 *Reason:* ${b.rejectionReason}\n`
        : `📌 *Reason:* Temple rush and full dining capacity\n`;

      return `🙏 *Shree Pure Veg - Theur Phata* 🙏
━━━━━━━━━━━━━━━━━━━━━
Hello ${b.guestName},
We apologize! Due to high rush, we cannot accept your booking for ${b.date} at ${b.time}. ❌

${reasonLine}
💡 *Suggested Next Available Slot:*
👉 *${b.nextAvailableSlot}*

If you would like to book this suggested slot, please call us immediately or re-book online:
📞 *Helpline:* ${b.restaurantPhone}
📍 *Location:* ${b.restaurantLocation}

Thank you for your understanding! We look forward to hosting you soon. 🙏`;
    },

    hi: (b: NormalizedBooking): string => {
      const reasonLine = b.rejectionReason
        ? `📌 *कारण:* ${b.rejectionReason}\n`
        : `📌 *कारण:* मंदिर में भक्तों की भारी भीड़ एवं सीमित टेबल क्षमता\n`;

      return `🙏 *श्री प्योर वेज (थेऊर फाटा)* 🙏
━━━━━━━━━━━━━━━━━━━━━
नमस्ते ${b.guestName} जी,
क्षमा करें! आपके द्वारा चुने गए समय (${b.date} • ${b.time}) के लिए आरक्षण स्वीकार करना संभव नहीं हो सका। ❌

${reasonLine}
💡 *अगला उपलब्ध समय (Next Available Slot):*
👉 *${b.nextAvailableSlot}*

यदि आप इस नए समय के लिए बुकिंग करना चाहते हैं, तो कृपया नीचे दिए गए नंबर पर तुरंत संपर्क करें या ऑनलाइन पुनः बुक करें:
📞 *होटल हेल्पलाइन:* ${b.restaurantPhone}
📍 *पता:* ${b.restaurantLocation}

आपके सहयोग के लिए धन्यवाद! आगामी यात्रा में आपका स्वागत करने के लिए हम उत्सुक हैं। 🙏`;
    },

    mr: (b: NormalizedBooking): string => {
      const reasonLine = b.rejectionReason
        ? `📌 *कारण:* ${b.rejectionReason}\n`
        : `📌 *कारण:* मंदिर भाविकांची गर्दी व मर्यादित टेबल क्षमता\n`;

      return `🙏 *श्री प्युअर व्हेज (थेऊर फाटा)* 🙏
━━━━━━━━━━━━━━━━━━━━━
नमस्ते ${b.guestName} जी,
क्षमस्व! आपण विनंती केलेल्या वेळेसाठी (${b.date} • ${b.time}) आरक्षण स्वीकारणे शक्य झाले नाही. ❌

${reasonLine}
💡 *पुढील उपलब्ध वेळ (Next Available Slot):*
👉 *${b.nextAvailableSlot}*

आपण या नवीन वेळेसाठी आरक्षण करू इच्छित असल्यास, कृपया त्वरित खालील नंबरवर संपर्क साधा किंवा ऑनलाइन री-बुक करा:
📞 *हॉटेल संपर्क:* ${b.restaurantPhone}
📍 *पत्ता:* ${b.restaurantLocation}

आपल्या सहकार्याबद्दल धन्यवाद! पुढील भेटीत आपले स्वागत करण्यास आम्ही उत्सुक आहोत. 🙏`;
    },
  },

  // 3. GUEST REMINDER
  guest_reminder: {
    en: (b: NormalizedBooking): string => {
      return `🙏 *Shree Pure Veg - Theur Phata* — Reservation Reminder 🙏
━━━━━━━━━━━━━━━━━━━━━
Hello ${b.guestName}!
Friendly reminder that your reservation is scheduled for today.

🎫 *Token:* #${b.tokenNumber}
⏰ *Time:* Today at ${b.time}
👥 *Party Size:* ${b.partySize} guests
📌 *Type:* ${b.bookingTypeEn}

📍 *Location:* ${b.restaurantLocation} (Near Chintamani Ganpati route)
📞 *Helpline:* ${b.restaurantPhone}
🗺️ *Map:* https://maps.google.com/?q=Theur+Phata+Kunjirwadi

We look forward to welcoming you! Please call us if there is any travel delay. 🙏`;
    },

    hi: (b: NormalizedBooking): string => {
      return `🙏 *श्री प्योर वेज (थेऊर फाटा)* — आरक्षण स्मरण 🙏
━━━━━━━━━━━━━━━━━━━━━
नमस्ते ${b.guestName} जी!
आपका आरक्षण आज के लिए निर्धारित है।

🎫 *टोकन संख्या:* #${b.tokenNumber}
⏰ *समय:* आज ${b.time} बजे
👥 *अतिथि संख्या:* ${b.partySize} व्यक्ति
📌 *प्रकार:* ${b.bookingTypeHi || b.bookingTypeMr}

📍 *पता:* ${b.restaurantLocation} (चिंतामणि गणपति मंदिर मार्ग)
📞 *होटल हेल्पलाइन:* ${b.restaurantPhone}
🗺️ *लोकेशन:* https://maps.google.com/?q=Theur+Phata+Kunjirwadi

हम आपके स्वागत के लिए तैयार हैं! यात्रा में किसी भी देरी या बदलाव के लिए कृपया सूचित करें। 🙏`;
    },

    mr: (b: NormalizedBooking): string => {
      return `🙏 *श्री प्युअर व्हेज (थेऊर फाटा)* — आरक्षण आठवण 🙏
━━━━━━━━━━━━━━━━━━━━━
नमस्ते ${b.guestName} जी!
आपले आरक्षण आज वेळेवर शेड्यूल आहे.

🎫 *टोकन क्र:* #${b.tokenNumber}
⏰ *वेळ:* आज दुपारी/संध्याकाळी ${b.time} वा.
👥 *व्यक्ती संख्या:* ${b.partySize} लोक
📌 *प्रकार:* ${b.bookingTypeMr}

📍 *पत्ता:* ${b.restaurantLocation} (चिंतामणी गणपती मंदिराच्या मार्गावर)
📞 *हॉटेल हेल्पलाइन:* ${b.restaurantPhone}
🗺️ *लोकेशन:* https://maps.google.com/?q=Theur+Phata+Kunjirwadi

आम्ही आपल्या स्वागतासाठी सज्ज आहोत! प्रवासात काही उशीर किंवा बदल असल्यास कृपया त्वरित कळवा. 🙏`;
    },
  },

  // 4. OWNER NEW BOOKING
  owner_new_booking: {
    en: (b: NormalizedBooking): string => {
      let itemsText = '';
      if (b.items.length > 0) {
        itemsText =
          `\n📋 *Pre-ordered Items:*\n` +
          b.items.map((i) => ` • ${i.nameEn} x ${i.quantity}`).join('\n');
      }

      let billText = '';
      if (b.totalEstimatedAmount && b.totalEstimatedAmount > 0) {
        billText = `\n💰 *Est. Total:* ₹${b.totalEstimatedAmount}`;
      }

      const notesText = b.notes ? `\n📝 *Notes:* ${b.notes}` : '';

      return `🔔 *New Booking Alert (Shree Pure Veg)* 🔔
━━━━━━━━━━━━━━━━━━━━━
Hotel: ${b.restaurantName}
🎫 *Token:* #${b.tokenNumber}
👤 *Guest:* ${b.guestName}
📞 *Phone:* ${b.guestPhone}
👥 *Party Size:* ${b.partySize} guests
⏰ *Time:* ${b.date} | ${b.time}
📌 *Type:* ${b.bookingTypeEn}${itemsText}${billText}${notesText}

👉 *Please review and confirm in the /admin portal.*`;
    },

    hi: (b: NormalizedBooking): string => {
      let itemsText = '';
      if (b.items.length > 0) {
        itemsText =
          `\n📋 *ऑर्डर किए गए व्यंजन:*\n` +
          b.items.map((i) => ` • ${(i.nameHi || i.nameMr)} x ${i.quantity}`).join('\n');
      }

      let billText = '';
      if (b.totalEstimatedAmount && b.totalEstimatedAmount > 0) {
        billText = `\n💰 *अनुमानित बिल:* ₹${b.totalEstimatedAmount}`;
      }

      const notesText = b.notes ? `\n📝 *टिप्पणी:* ${b.notes}` : '';

      return `🔔 *नई बुकिंग सूचना (New Booking Alert)* 🔔
━━━━━━━━━━━━━━━━━━━━━
होटल: ${b.restaurantName}
🎫 *टोकन संख्या:* #${b.tokenNumber}
👤 *अतिथि नाम:* ${b.guestName}
📞 *फोन:* ${b.guestPhone}
👥 *अतिथि संख्या:* ${b.partySize} व्यक्ति
⏰ *समय:* ${b.date} | ${b.time}
📌 *प्रकार:* ${b.bookingTypeHi || b.bookingTypeMr}${itemsText}${billText}${notesText}

👉 *कृपया /admin पोर्टल पर जाकर स्वीकार/अस्वीकार करें।*`;
    },

    mr: (b: NormalizedBooking): string => {
      let itemsText = '';
      if (b.items.length > 0) {
        itemsText =
          `\n📋 *मागवलेले जेवण:*\n` +
          b.items.map((i) => ` • ${i.nameMr} x ${i.quantity}`).join('\n');
      }

      let billText = '';
      if (b.totalEstimatedAmount && b.totalEstimatedAmount > 0) {
        billText = `\n💰 *अंदाजे बिल:* ₹${b.totalEstimatedAmount}`;
      }

      const notesText = b.notes ? `\n📝 *नोंद:* ${b.notes}` : '';

      return `🔔 *नवीन आरक्षण सूचना (New Booking Alert)* 🔔
━━━━━━━━━━━━━━━━━━━━━
हॉटेल: ${b.restaurantName}
🎫 *टोकन क्र:* #${b.tokenNumber}
👤 *ग्राहक नाव:* ${b.guestName}
📞 *फोन:* ${b.guestPhone}
👥 *व्यक्ती संख्या:* ${b.partySize} लोक
⏰ *वेळ:* ${b.date} | ${b.time}
📌 *प्रकार:* ${b.bookingTypeMr}${itemsText}${billText}${notesText}

👉 *कृपया /admin पॅनेलवर जाऊन स्वीकार/नकार करा.*`;
    },
  },
};

/**
 * Render template for specified message kind and language.
 */
export function renderMessageTemplate(
  kind: MessageKind,
  normalized: NormalizedBooking,
  lang: MessageLanguage = 'en'
): string {
  const kindTemplates = TEMPLATES[kind];
  if (!kindTemplates) {
    throw new Error(`Unknown message kind: ${kind}`);
  }

  const formatter = lang === 'mr' ? kindTemplates.mr : lang === 'hi' ? kindTemplates.hi : kindTemplates.en;
  return formatter(normalized);
}

/**
 * Generates Cloud API template payload parameters for Meta WhatsApp Cloud API.
 * Maps kind to registered WhatsApp template names (e.g. 'booking_confirmed_v1').
 */
export function getCloudApiTemplatePayload(
  kind: MessageKind,
  normalized: NormalizedBooking,
  lang: MessageLanguage = 'en'
): {
  templateName: string;
  languageCode: string;
  bodyParameters: Array<{ type: 'text'; text: string }>;
} {
  const languageCode = lang === 'mr' ? 'mr' : lang === 'hi' ? 'hi' : 'en_US';

  switch (kind) {
    case 'guest_confirmed':
      return {
        templateName: 'booking_confirmed_v1',
        languageCode,
        bodyParameters: [
          { type: 'text', text: normalized.guestName },
          { type: 'text', text: normalized.tokenNumber },
          { type: 'text', text: normalized.date },
          { type: 'text', text: normalized.time },
          { type: 'text', text: String(normalized.partySize) },
        ],
      };

    case 'guest_rejected':
      return {
        templateName: 'booking_rejected_v1',
        languageCode,
        bodyParameters: [
          { type: 'text', text: normalized.guestName },
          { type: 'text', text: `${normalized.date} ${normalized.time}` },
          { type: 'text', text: normalized.rejectionReason || 'Rush' },
          { type: 'text', text: normalized.nextAvailableSlot },
          { type: 'text', text: normalized.restaurantPhone },
        ],
      };

    case 'guest_reminder':
      return {
        templateName: 'booking_reminder_v1',
        languageCode,
        bodyParameters: [
          { type: 'text', text: normalized.guestName },
          { type: 'text', text: normalized.tokenNumber },
          { type: 'text', text: normalized.time },
          { type: 'text', text: String(normalized.partySize) },
        ],
      };

    case 'owner_new_booking':
      return {
        templateName: 'booking_owner_alert_v1',
        languageCode,
        bodyParameters: [
          { type: 'text', text: normalized.tokenNumber },
          { type: 'text', text: normalized.guestName },
          { type: 'text', text: normalized.guestPhone },
          { type: 'text', text: `${normalized.date} ${normalized.time}` },
          { type: 'text', text: String(normalized.partySize) },
        ],
      };
  }
}
