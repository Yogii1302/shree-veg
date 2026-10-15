export type Language = 'en' | 'hi' | 'mr';

export interface Translations {
  restaurantName: string;
  restaurantLocation: string;
  tagline: string;
  ratingText: string;
  demoBannerTitle: string;
  demoBannerDesc: string;
  quickFillBtn: string;
  quickFillDone: string;
  languageSelect: string;
  backToHome: string;

  // Flow titles
  flowTable: string;
  flowTableSub: string;
  flowGroupMeal: string;
  flowGroupMealSub: string;
  flowOrderAhead: string;
  flowOrderAheadSub: string;

  // Flow specifics
  partySizeLabel: string;
  guestsCount: string;
  maxTableNotice: string;
  festivalTableNotice: string;
  selectPackage: string;
  perPerson: string;
  minGuestsRequired: string;
  packageTotal: string;
  orderAheadTitle: string;
  orderAheadSub: string;
  soldOut: string;
  itemsCount: string;
  estimatedTotal: string;
  addItemsPrompt: string;

  // Date & Time
  selectDateTitle: string;
  today: string;
  tomorrow: string;
  blockedNotice: string;
  festivalBadge: string;
  festivalNotice: string;
  selectSlotTitle: string;
  slotFull: string;
  seatsLeft: string;
  lunchSlots: string;
  dinnerSlots: string;

  // Guest Details
  guestDetailsTitle: string;
  nameLabel: string;
  namePlaceholder: string;
  phoneLabel: string;
  phonePlaceholder: string;
  phoneHint: string;
  noteLabel: string;
  notePlaceholder: string;

  // Summary & Submission
  summaryTitle: string;
  bookingType: string;
  selectedDate: string;
  selectedTime: string;
  totalGuests: string;
  totalAmount: string;
  payAtHotelNote: string;
  submitButton: string;
  submittingButton: string;

  // Errors
  errorTitle: string;
  errNameRequired: string;
  errPhoneInvalid: string;
  errSlotRequired: string;
  errPackageRequired: string;
  errPackageMinGuests: string;
  errNoItems: string;
  errSlotFull: string;
  errDuplicateBooking: string;
  errDateBlocked: string;
  errRateLimit: string;
  errBotDetected: string;
  errExceedsTableLimit: string;
  errExceedsFestivalLimit: string;
  errGeneric: string;

  // Confirmation screen
  confirmedHeading: string;
  tokenLabel: string;
  bookingIdLabel: string;
  statusLabel: string;
  statusPending: string;
  statusPendingDesc: string;
  statusConfirmed: string;
  statusConfirmedDesc: string;
  statusRejected: string;
  statusRejectedDesc: string;
  statusSeated: string;
  statusSeatedDesc: string;
  staffSimulator: string;
  simulatorApproveBtn: string;
  simulatorRejectBtn: string;
  shareWhatsApp: string;
  callHotel: string;
  bookAnother: string;
}

export const translations: Record<Language, Translations> = {
  en: {
    restaurantName: 'Shree Pure Veg',
    restaurantLocation: 'Theur Phata, Kunjirwadi, Pune-Solapur Highway (Pune 412201)',
    tagline: 'Authentic Satvik Dining for Chintamani Ganpati Pilgrims & Highway Travelers',
    ratingText: '4.6 ★ (989+ Reviews)',
    demoBannerTitle: 'DEMO MODE',
    demoBannerDesc: 'Interactive booking preview — Watch staff live approval & rejection status update in real-time.',
    quickFillBtn: '⚡ Quick Fill Test Data',
    quickFillDone: 'Form Filled!',
    languageSelect: 'Language',
    backToHome: '← Back to Home',

    flowTable: 'Table Booking',
    flowTableSub: 'Instant table reservation for 1 to 12 guests',
    flowGroupMeal: 'Pilgrim Group Meal',
    flowGroupMealSub: 'Unlimited traditional satvik thali feast for temple yatra groups & families',
    flowOrderAhead: 'Order Ahead',
    flowOrderAheadSub: 'Pre-order food before arrival — hot meal ready as soon as you arrive',

    partySizeLabel: 'Party Size',
    guestsCount: 'Guests',
    maxTableNotice: 'Single table bookings are limited to a maximum of 12 guests.',
    festivalTableNotice: 'Festival rush: Single table limited to maximum 10 guests.',
    selectPackage: 'Choose Group Thali Package',
    perPerson: 'per person',
    minGuestsRequired: 'Min {min} guests required',
    packageTotal: 'Total Package Estimate',
    orderAheadTitle: 'Choose Dishes from Menu',
    orderAheadSub: 'Prepared fresh upon arrival. Pay at restaurant via Cash or UPI.',
    soldOut: 'Sold Out Today',
    itemsCount: 'Items',
    estimatedTotal: 'Estimated Total',
    addItemsPrompt: 'Please add at least 1 menu item to your pre-order.',

    selectDateTitle: 'Select Date (Next 7 Days)',
    today: 'Today',
    tomorrow: 'Tomorrow',
    blockedNotice: 'Bookings Closed (Maintenance / Event)',
    festivalBadge: 'Festival Rush',
    festivalNotice: 'Angarki Sankashti Chaturthi — Peak rush, capacity capped at 12 seats/slot.',
    selectSlotTitle: 'Select 30-Min Time Slot',
    slotFull: 'Full',
    seatsLeft: 'seats left',
    lunchSlots: 'Lunch Session',
    dinnerSlots: 'Dinner Session',

    guestDetailsTitle: 'Guest Details & Contact',
    nameLabel: 'Full Name',
    namePlaceholder: 'e.g. Sachin Tambade / Ramesh More',
    phoneLabel: '10-Digit Mobile Number',
    phonePlaceholder: 'e.g. 9822012345',
    phoneHint: '10-digit Indian mobile starting with 6, 7, 8, or 9',
    noteLabel: 'Special Requests / Notes (Optional)',
    notePlaceholder: 'e.g. No onion-garlic (satvik), traveling with toddlers, corner table...',

    summaryTitle: 'Booking Summary',
    bookingType: 'Booking Type',
    selectedDate: 'Date',
    selectedTime: 'Slot Time',
    totalGuests: 'Guests',
    totalAmount: 'Estimated Bill',
    payAtHotelNote: 'No advance payment needed. Pay after dining via Cash or UPI.',
    submitButton: 'Confirm Booking',
    submittingButton: 'Registering Booking...',

    errorTitle: 'Please correct the error',
    errNameRequired: 'Please enter your full name.',
    errPhoneInvalid: 'Please enter a valid 10-digit Indian mobile number (starts with 6-9).',
    errSlotRequired: 'Please select an available time slot.',
    errPackageRequired: 'Please select a group meal package.',
    errPackageMinGuests: 'This package requires a minimum of {min} guests.',
    errNoItems: 'Please select at least one menu item for order ahead.',
    errSlotFull: 'Slot full. Insufficient seats remaining for chosen party size.',
    errDuplicateBooking: 'A booking for this phone number at this time slot already exists.',
    errDateBlocked: 'This date is currently blocked (Hotel maintenance or private event).',
    errRateLimit: 'Too many requests. Please wait a few minutes before trying again.',
    errBotDetected: 'Suspicious request detected.',
    errExceedsTableLimit: 'Single table bookings are limited to 12 guests. For 13+ guests, please choose Pilgrim Group Meal.',
    errExceedsFestivalLimit: 'On festival dates, single table bookings are restricted to a maximum of 10 guests.',
    errGeneric: 'Something went wrong. Please try again or call the restaurant directly.',

    confirmedHeading: 'Booking Registered Successfully!',
    tokenLabel: 'Token #',
    bookingIdLabel: 'Booking ID',
    statusLabel: 'Live Status',
    statusPending: 'Pending Staff Confirmation',
    statusPendingDesc: 'Restaurant manager is verifying table allocation (approx. 1-2 mins)...',
    statusConfirmed: 'Confirmed & Table Reserved!',
    statusConfirmedDesc: 'Your table has been confirmed. Please arrive on time!',
    statusRejected: 'Declined (No Capacity)',
    statusRejectedDesc: 'Sorry, no tables available for the selected slot. Please pick an alternative time.',
    statusSeated: 'Seated',
    statusSeatedDesc: 'Guest has arrived at the restaurant. Enjoy your satvik meal!',
    staffSimulator: 'Staff Action Simulator (Demo Mode)',
    simulatorApproveBtn: '✓ Simulate Staff Accept',
    simulatorRejectBtn: '✕ Simulate Staff Reject',
    shareWhatsApp: 'Save / Share on WhatsApp',
    callHotel: 'Call Restaurant (+91 98765 43210)',
    bookAnother: 'Book Another Table',
  },
  hi: {
    restaurantName: 'श्री प्योर वेज',
    restaurantLocation: 'थेऊर फाटा, कुंजीरवाडी, पुणे-सोलापुर हाईवे (पुणे ४१२२०१)',
    tagline: 'चिंतामणि गणपति भक्तों एवं हाईवे यात्रियों का प्रामाणिक सात्विक भोजनालय',
    ratingText: '४.६ ★ (९८९+ समीक्षाएं)',
    demoBannerTitle: 'डेमो मोड (DEMO MODE)',
    demoBannerDesc: 'लाइव बुकिंग डेमो — स्टाफ द्वारा स्वीकृति / अस्वीकृति रियल-टाइम में देखें।',
    quickFillBtn: '⚡ टेस्ट डेटा भरें (Quick Fill)',
    quickFillDone: 'जानकारी भरी गई!',
    languageSelect: 'भाषा चुनें',
    backToHome: '← मुख्य पृष्ठ पर वापस',

    flowTable: 'टेबल आरक्षण',
    flowTableSub: '१ से १२ अतिथियों के लिए तुरंत टेबल आरक्षण',
    flowGroupMeal: 'भक्त व परिवार पंगत थाली',
    flowGroupMealSub: 'तीर्थक्षेत्र भक्त मंडलों एवं परिवार के लिए असीमित पारंपरिक सात्विक पंगत थाली',
    flowOrderAhead: 'पहले से भोजन ऑर्डर करें',
    flowOrderAheadSub: 'पहुंचने से पहले मेनू चुनें — गरमागरम ताजा भोजन तैयार मिलेगा',

    partySizeLabel: 'अतिथियों की संख्या',
    guestsCount: 'अतिथि',
    maxTableNotice: 'एक टेबल बुकिंग के लिए अधिकतम १२ अतिथियों की सीमा है।',
    festivalTableNotice: 'त्योहार की भीड़: प्रति टेबल अधिकतम १० अतिथियों की सीमा लागू।',
    selectPackage: 'पंगत थाली पैकेज चुनें',
    perPerson: 'प्रति व्यक्ति',
    minGuestsRequired: 'न्यूनतम {min} व्यक्ति आवश्यक',
    packageTotal: 'पंगत कुल अनुमानित राशि',
    orderAheadTitle: 'मेनू से व्यंजन चुनें',
    orderAheadSub: 'होटल पहुंचने पर ताजा परोसा जाएगा। भुगतान होटल में नकद या UPI द्वारा करें।',
    soldOut: 'आज समाप्त',
    itemsCount: 'व्यंजन',
    estimatedTotal: 'अनुमानित कुल बिल',
    addItemsPrompt: 'कृपया मेनू से कम से कम एक व्यंजन चुनें।',

    selectDateTitle: 'तारीख चुनें (अगले ७ दिन)',
    today: 'आज',
    tomorrow: 'कल',
    blockedNotice: 'बुकिंग बंद (रखरखाव / निजी कार्यक्रम)',
    festivalBadge: 'त्योहार / पर्व विशेष',
    festivalNotice: 'अंगारकी संकष्टी चतुर्थी — भारी भीड़, प्रति स्लॉट सीमित क्षमता (१२ सीटें)।',
    selectSlotTitle: 'समय (३०-मिनट स्लॉट) चुनें',
    slotFull: 'फुल (सीटें नहीं)',
    seatsLeft: 'सीटें उपलब्ध',
    lunchSlots: 'दोपहर का सत्र (लंच)',
    dinnerSlots: 'रात का सत्र (डिनर)',

    guestDetailsTitle: 'अतिथि विवरण एवं संपर्क',
    nameLabel: 'पूरा नाम',
    namePlaceholder: 'उदा. सचिन तांबडे / रमेश मोरे',
    phoneLabel: '१०-अंकों का मोबाइल नंबर',
    phonePlaceholder: 'उदा. 9822012345',
    phoneHint: '६, ७, ८ या ९ से शुरू होने वाला १० अंकों का मोबाइल नंबर',
    noteLabel: 'विशेष निर्देश / टिप्पणी (वैकल्पिक)',
    notePlaceholder: 'उदा. बिना प्याज-लहसुन (सात्विक), बच्चे साथ हैं, कॉर्नर टेबल दें...',

    summaryTitle: 'आरक्षण सारांश',
    bookingType: 'आरक्षण प्रकार',
    selectedDate: 'तारीख',
    selectedTime: 'समय',
    totalGuests: 'अतिथि संख्या',
    totalAmount: 'अनुमानित राशि',
    payAtHotelNote: 'अग्रिम भुगतान की आवश्यकता नहीं है। बिल का भुगतान भोजन के बाद नकद या UPI से करें।',
    submitButton: 'आरक्षण निश्चित करें',
    submittingButton: 'पंजीकरण हो रहा है...',

    errorTitle: 'कृपया त्रुटि सुधारें',
    errNameRequired: 'कृपया अपना पूरा नाम दर्ज करें।',
    errPhoneInvalid: 'कृपया मान्य १०-अंकों का मोबाइल नंबर दर्ज करें (६ से ९ से शुरू होने वाला)।',
    errSlotRequired: 'कृपया उपलब्ध समय स्लॉट चुनें।',
    errPackageRequired: 'कृपया पंगत थाली पैकेज चुनें।',
    errPackageMinGuests: 'इस पैकेज के लिए न्यूनतम {min} अतिथि आवश्यक हैं।',
    errNoItems: 'कृपया पहले से ऑर्डर करने के लिए कम से कम एक व्यंजन चुनें।',
    errSlotFull: 'स्लॉट फुल है। चुनी गई संख्या के लिए पर्याप्त सीटें उपलब्ध नहीं हैं।',
    errDuplicateBooking: 'इस मोबाइल नंबर पर इस समय के लिए पहले से ही बुकिंग दर्ज है।',
    errDateBlocked: 'इस तारीख के लिए आरक्षण बंद है (होटल रखरखाव या निजी कार्यक्रम)।',
    errRateLimit: 'बहुत अधिक अनुरोध। कृपया पुनः प्रयास करने से पहले कुछ मिनट प्रतीक्षा करें।',
    errBotDetected: 'अमान्य अनुरोध पाया गया।',
    errExceedsTableLimit: 'एक टेबल बुकिंग के लिए अधिकतम १२ अतिथियों की सीमा है। १३+ के लिए कृपया भक्त पंगत थाली चुनें।',
    errExceedsFestivalLimit: 'त्योहार के दिनों में एकल टेबल बुकिंग अधिकतम १० अतिथियों तक सीमित है।',
    errGeneric: 'कुछ गड़बड़ हुई। कृपया पुनः प्रयास करें या सीधे होटल से संपर्क करें।',

    confirmedHeading: 'आरक्षण सफलतापूर्वक दर्ज हो गया!',
    tokenLabel: 'टोकन संख्या',
    bookingIdLabel: 'बुकिंग आईडी',
    statusLabel: 'स्थिति (Live Status)',
    statusPending: 'सत्यापन जारी (प्रतीक्षारत)',
    statusPendingDesc: 'होटल प्रबंधक टेबल उपलब्धता की जांच कर रहे हैं (लगभग १-२ मिनट)...',
    statusConfirmed: 'स्वीकृत एवं टेबल आरक्षित!',
    statusConfirmedDesc: 'आपकी टेबल आरक्षित हो गई है। कृपया समय पर पधारें!',
    statusRejected: 'अस्वीकृत (स्थान उपलब्ध नहीं)',
    statusRejectedDesc: 'क्षमा करें, चुने गए समय के लिए सीटें उपलब्ध नहीं हैं। कृपया अन्य समय चुनें।',
    statusSeated: 'उपस्थित (टेबल पर बैठे)',
    statusSeatedDesc: 'अतिथि होटल में उपस्थित हो चुके हैं। सात्विक भोजन का आनंद लें!',
    staffSimulator: 'स्टाफ एक्शन सिम्युलेटर (Demo Mode)',
    simulatorApproveBtn: '✓ स्टाफ द्वारा स्वीकारें (Confirm)',
    simulatorRejectBtn: '✕ स्टाफ द्वारा अस्वीकारें (Reject)',
    shareWhatsApp: 'व्हाट्सएप पर शेयर / सेव करें',
    callHotel: 'होटल को कॉल करें (०९८७६५ ४३२१०)',
    bookAnother: 'अन्य टेबल बुक करें',
  },
  mr: {
    restaurantName: 'श्री प्युअर व्हेज',
    restaurantLocation: 'थेऊर फाटा, कुंजीरवाडी, पुणे-सोलापूर महामार्ग (पुणे ४१२२०१)',
    tagline: 'चिंतामणी गणपती भाविक व महामार्ग प्रवासी यांचे हक्काचे सात्विक भोजनालय',
    ratingText: '४.६ ★ (९८९+ परीक्षणे)',
    demoBannerTitle: 'डेमो मोड (DEMO MODE)',
    demoBannerDesc: 'चाचणी आरक्षण प्रणाली — कर्मचारी स्वीकृती / नकार थेट स्क्रीनवर लाइव्ह दिसेल.',
    quickFillBtn: '⚡ चाचणी माहिती भरा (Quick Fill)',
    quickFillDone: 'माहिती भरली!',
    languageSelect: 'भाषा निवडा',
    backToHome: '← मुख्य पानावर परत',

    flowTable: 'टेबल आरक्षण',
    flowTableSub: '१ ते १२ व्यक्तींसाठी झटपट टेबल आरक्षण',
    flowGroupMeal: 'भाविक व कुटुंब पंगत थाळी',
    flowGroupMealSub: 'तीर्थक्षेत्र भाविक मंडळे व कुटुंब मेजवानीसाठी अमर्यादित पंगत',
    flowOrderAhead: 'आधी जेवण मागवा',
    flowOrderAheadSub: 'पोहोचण्यापूर्वी मेनू निवडा — गरमागरम ताजे जेवण तयार मिळेल',

    partySizeLabel: 'व्यक्तींची संख्या',
    guestsCount: 'व्यक्ती',
    maxTableNotice: 'एका टेबलसाठी कमाल १२ व्यक्तींची मर्यादा आहे.',
    festivalTableNotice: 'सण/उत्सवानिमित्त एका टेबलवर कमाल १० व्यक्ती मर्यादा लागू.',
    selectPackage: 'पंगत थाळी पॅकेज निवडा',
    perPerson: 'प्रति व्यक्ती',
    minGuestsRequired: 'किमान {min} व्यक्ती आवश्यक',
    packageTotal: 'पंगत एकूण अंदाजे रक्कम',
    orderAheadTitle: 'मेनूमधून पदार्थ निवडा',
    orderAheadSub: 'हॉटेलवर पोहोचल्यावर ताजे वाढले जाईल. देयक हॉटेलमध्ये रोख किंवा UPI ने द्यावे.',
    soldOut: 'आज संपले',
    itemsCount: 'पदार्थ',
    estimatedTotal: 'अंदाजे एकूण बिल',
    addItemsPrompt: 'कृपया मेनूमधून किमान एक पदार्थ निवडा.',

    selectDateTitle: 'तारीख निवडा (पुढील ७ दिवस)',
    today: 'आज',
    tomorrow: 'उद्या',
    blockedNotice: 'बुकिंग बंद (देखभाल / खाजगी कार्यक्रम)',
    festivalBadge: 'सण/उत्सव विशेष',
    festivalNotice: 'अंगारकी संकष्टी चतुर्थी — गर्दीमुळे प्रति स्लॉट मर्यादित जागा (१२ जागा).',
    selectSlotTitle: 'वेळ (३०-मि. स्लॉट) निवडा',
    slotFull: 'पूर्ण (जागा नाही)',
    seatsLeft: 'जागा शिल्लक',
    lunchSlots: 'दुपारचे सत्र (लंच)',
    dinnerSlots: 'संध्याकाळचे सत्र (डिनर)',

    guestDetailsTitle: 'आरक्षण तपशील व संपर्क',
    nameLabel: 'पूर्ण नाव',
    namePlaceholder: 'उदा. सचिन तांबडे / रमेश मोरे',
    phoneLabel: '१०-अंकी मोबाईल नंबर',
    phonePlaceholder: 'उदा. 9822012345',
    phoneHint: '६, ७, ८ किंवा ९ ने सुरू होणारा १० अंकी मोबाईल नंबर',
    noteLabel: 'विशेष सूचना / टीप (पर्यायी)',
    notePlaceholder: 'उदा. विना कांदा-लसूण, लहान मुले सोबत आहेत, कॉर्नर टेबल द्यावे...',

    summaryTitle: 'आरक्षणाचा सारांश',
    bookingType: 'आरक्षण प्रकार',
    selectedDate: 'तारीख',
    selectedTime: 'वेळ',
    totalGuests: 'व्यक्ती संख्या',
    totalAmount: 'अंदाजे रक्कम',
    payAtHotelNote: 'पैसे आधी देण्याची गरज नाही. बिल हॉटेलमध्ये जेवणानंतर भरावे.',
    submitButton: 'आरक्षण निश्चित करा',
    submittingButton: 'नोंदणी होत आहे...',

    errorTitle: 'कृपया त्रुटी दुरुस्त करा',
    errNameRequired: 'कृपया आपले नाव प्रविष्ट करा.',
    errPhoneInvalid: 'कृपया वैध १०-अंकी मोबाईल नंबर टाका (६ ते ९ ने सुरू होणारा).',
    errSlotRequired: 'कृपया उपलब्ध वेळेचा स्लॉट निवडा.',
    errPackageRequired: 'कृपया पंगत थाळी पॅकेज निवडा.',
    errPackageMinGuests: 'निवडलेल्या पॅकेजसाठी किमान {min} व्यक्ती असणे बंधनकारक आहे.',
    errNoItems: 'कृपया मेनूमधून किमान एक पदार्थ निवडा.',
    errSlotFull: 'क्षमस्व! या वेळेसाठी पुरेशा जागा उपलब्ध नाहीत. कृपया शेजारील वेळ निवडा.',
    errDuplicateBooking: 'या मोबाईल क्रमांकावर या वेळेसाठी आधीच एक आरक्षण नोंदवले गेले आहे.',
    errDateBlocked: 'सदर तारखेसाठी आरक्षण बंद आहे (हॉटेल स्वच्छता किंवा देखभाल).',
    errRateLimit: 'वारंवार विनंत्या आल्याने तात्पुरते थांबवले आहे. कृपया थोड्या वेळाने प्रयत्न करा.',
    errBotDetected: 'अवैध विनंती आढळली.',
    errExceedsTableLimit: 'एका टेबलसाठी कमाल १२ व्यक्तींची मर्यादा आहे. १२+ व्यक्तींसाठी कृपया पंगत थाळी निवडा.',
    errExceedsFestivalLimit: 'सण/उत्सव दिवशी एका टेबलवर कमाल १० व्यक्तींची मर्यादा आहे.',
    errGeneric: 'काहीतरी चूक झाली. कृपया पुन्हा प्रयत्न करा किंवा थेट संपर्क करा.',

    confirmedHeading: 'आरक्षण यशस्वीरित्या नोंदवले गेले!',
    tokenLabel: 'टोकन क्रमांक',
    bookingIdLabel: 'बुकिंग आयडी',
    statusLabel: 'स्थिती (Live Status)',
    statusPending: 'पडताळणी चालू (प्रतीक्षेत)',
    statusPendingDesc: 'हॉटेल व्यवस्थापक टेबल उपलब्धता तपासत आहेत (अंदाजे १-२ मिनिटे)...',
    statusConfirmed: 'निश्चित झाले! (स्वीकारले)',
    statusConfirmedDesc: 'आपले टेबल निश्चित झाले आहे. वेळेवर हॉटेलमध्ये स्वागत आहे!',
    statusRejected: 'नाकारले (जागा उपलब्ध नाही)',
    statusRejectedDesc: 'क्षमस्व, निवडलेल्या वेळेसाठी जागा उपलब्ध नाही. कृपया इतर वेळ निवडा.',
    statusSeated: 'उपस्थित (टेबलवर बसले)',
    statusSeatedDesc: 'ग्राहक हॉटेलमध्ये हजर झाले आहेत. भोजनाचा आनंद घ्या!',
    staffSimulator: 'कर्मचारी कृती सिम्युलेटर (Demo Simulation)',
    simulatorApproveBtn: '✓ कर्मचाऱ्यांनी स्वीकारले (Confirm)',
    simulatorRejectBtn: '✕ कर्मचाऱ्यांनी नाकारले (Reject)',
    shareWhatsApp: 'व्हॉट्सॲपवर माहिती पाठवा / सेव्ह करा',
    callHotel: 'हॉटेलला फोन करा (०९८७६५ ४३२१०)',
    bookAnother: 'दुसरे आरक्षण करा',
  },
};
