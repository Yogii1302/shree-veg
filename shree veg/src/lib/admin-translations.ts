export type AdminLanguage = 'en' | 'hi' | 'mr';

export interface AdminTranslations {
  portalTitle: string;
  portalSubtitle: string;
  hotelLocation: string;
  roleOwner: string;
  roleManager: string;
  roleKitchen: string;
  roleReadOnlyBadge: string;
  roleReadOnlyNotice: string;

  // Auth
  loginTitle: string;
  loginSub: string;
  emailLabel: string;
  passwordLabel: string;
  signInBtn: string;
  signOutBtn: string;
  demoRolesTitle: string;
  demoRoleOwnerHint: string;
  demoRoleManagerHint: string;
  demoRoleKitchenHint: string;
  loggedInAs: string;

  // PWA & System
  installApp: string;
  appInstalled: string;
  enableSound: string;
  soundActive: string;
  soundTest: string;
  soundPromptBanner: string;
  pushAlerts: string;
  pushSubscribed: string;
  pushUnsupported: string;
  pushTestBtn: string;
  simulateBookingBtn: string;
  simulatePilgrimBtn: string;
  resetDemoBtn: string;
  resetDemoConfirm: string;
  resetDemoSuccess: string;
  demoBannerActive: string;
  demoOwnerOnlyNotice: string;
  helpGuideBtn: string;

  // Filters
  filterPending: string;
  filterToday: string;
  filterTomorrow: string;
  filterAll: string;

  // Summaries
  summaryTodayTitle: string;
  summaryTomorrowTitle: string;
  confirmedGuests: string;
  waitingGuests: string;
  seatedGuests: string;
  totalTables: string;
  guestsUnit: string;

  // Inbox & Cards
  tokenNumberLabel: string;
  partySizeLabel: string;
  timeSlotLabel: string;
  bookingTypeTable: string;
  bookingTypeGroup: string;
  bookingTypeOrderAhead: string;
  preOrderDishes: string;
  notesLabel: string;
  emptyInboxTitle: string;
  emptyInboxSub: string;

  // Statuses
  statusPending: string;
  statusConfirmed: string;
  statusRejected: string;
  statusSeated: string;
  statusNoShow: string;
  statusCancelled: string;

  // Actions
  actionAccept: string;
  actionReject: string;
  actionMarkSeated: string;
  actionNoShow: string;
  actionSendReminder: string;
  actionTapToCall: string;
  actionWhatsApp: string;
  actionOwnerAlert: string;
  prepTimePrefix: string;
  prepTimeModalTitle: string;
  prepImmediate: string;
  prep15m: string;
  prep30m: string;
  prep45m: string;
  rejectModalTitle: string;
  rejectReasonFull: string;
  rejectReasonClosing: string;
  rejectReasonRush: string;
  rejectReasonOther: string;
  confirmBtn: string;
  cancelBtn: string;

  // Realtime & Alerts
  newBookingAlertTitle: string;
  muteAlertBtn: string;
  reminderSentToast: string;
  statusUpdatedToast: string;
}

export const adminTranslations: Record<AdminLanguage, AdminTranslations> = {
  en: {
    portalTitle: 'Shree Pure Veg — Staff Portal',
    portalSubtitle: 'Live Bookings Inbox & Kitchen Display',
    hotelLocation: 'Theur Phata, Pune-Solapur Highway',
    roleOwner: '👑 Owner',
    roleManager: '📋 Manager',
    roleKitchen: '🍳 Kitchen',
    roleReadOnlyBadge: 'Read-Only',
    roleReadOnlyNotice: 'Kitchen role is strictly read-only. Status updates are restricted to Owner & Manager.',

    loginTitle: 'Staff Authentication',
    loginSub: 'Sign in to Shree Pure Veg Staff Portal or choose a demo role.',
    emailLabel: 'Staff Email',
    passwordLabel: 'Password',
    signInBtn: 'Sign In',
    signOutBtn: 'Sign Out',
    demoRolesTitle: '⚡ 1-Tap Quick Test Roles',
    demoRoleOwnerHint: 'Full access (Accept, Reject, Seated, Push)',
    demoRoleManagerHint: 'Full operational access',
    demoRoleKitchenHint: 'Strictly Read-Only (Action buttons disabled)',
    loggedInAs: 'Active User:',

    installApp: '📱 Install App',
    appInstalled: 'App Installed ✓',
    enableSound: '🔊 Enable Sound',
    soundActive: 'Sound Active 🔔',
    soundTest: 'Test Sound',
    soundPromptBanner: 'Tap here to unlock loud alert chime when new bookings arrive (Browser Autoplay Unlock)',
    pushAlerts: '🔔 Push Alerts',
    pushSubscribed: 'Push Active ✓',
    pushUnsupported: 'Web Push not supported',
    pushTestBtn: '📲 Send Test Push',
    simulateBookingBtn: '⚡ Simulate New Booking (Realtime Chime)',
    simulatePilgrimBtn: '🙏 Simulate Pilgrim Group Request (12-16 Guests)',
    resetDemoBtn: '🔄 Reset Demo Data (Owner)',
    resetDemoConfirm: 'Reset all bookings and revert to pristine initial seed state?',
    resetDemoSuccess: 'Demo data reset successfully to pristine seed state.',
    demoBannerActive: '⚡ Live Demo Mode Active (DEMO MODE)',
    demoOwnerOnlyNotice: 'Data reset is restricted to Owner role only.',
    helpGuideBtn: '📖 VAPID & Android Testing Guide',

    filterPending: 'Pending',
    filterToday: 'Today',
    filterTomorrow: 'Tomorrow',
    filterAll: 'All',

    summaryTodayTitle: "Today's Expected Guests",
    summaryTomorrowTitle: "Tomorrow's Expected Guests",
    confirmedGuests: 'Confirmed Guests',
    waitingGuests: 'Waiting Guests',
    seatedGuests: 'Seated Guests',
    totalTables: 'Total Tables',
    guestsUnit: 'guests',

    tokenNumberLabel: 'Token #',
    partySizeLabel: 'Party Size',
    timeSlotLabel: 'Slot Time',
    bookingTypeTable: 'Table Reservation',
    bookingTypeGroup: 'Pilgrim / Family Group Feast',
    bookingTypeOrderAhead: 'Order Ahead',
    preOrderDishes: 'Pre-ordered Dishes:',
    notesLabel: 'Notes:',
    emptyInboxTitle: 'No bookings in this view',
    emptyInboxSub: 'Incoming reservations will arrive in realtime with chime alert.',

    statusPending: 'Pending',
    statusConfirmed: 'Confirmed',
    statusRejected: 'Rejected',
    statusSeated: 'Seated',
    statusNoShow: 'No-Show',
    statusCancelled: 'Cancelled',

    actionAccept: 'Accept',
    actionReject: 'Reject',
    actionMarkSeated: '🪑 Mark Seated',
    actionNoShow: '❌ No-Show',
    actionSendReminder: '🔔 Send Reminder (WhatsApp)',
    actionTapToCall: '📞 Call',
    actionWhatsApp: '💬 WhatsApp',
    actionOwnerAlert: '📲 Owner WhatsApp Alert',
    prepTimePrefix: 'Prep Time:',
    prepTimeModalTitle: 'Accept Booking — Select Estimated Prep Time',
    prepImmediate: 'Immediate / Direct (0m)',
    prep15m: '15 Minutes',
    prep30m: '30 Minutes',
    prep45m: '45 Minutes',
    rejectModalTitle: 'Select Reason for Rejecting',
    rejectReasonFull: 'Slot is Full',
    rejectReasonClosing: 'Kitchen Closing',
    rejectReasonRush: 'Temple / Festival Peak Rush',
    rejectReasonOther: 'Other Reason',
    confirmBtn: 'Confirm',
    cancelBtn: 'Cancel',

    newBookingAlertTitle: '🚨 NEW BOOKING RECEIVED! Action required!',
    muteAlertBtn: 'Mute Chime 🔕',
    reminderSentToast: 'WhatsApp reminder link opened for guest!',
    statusUpdatedToast: 'Booking status updated successfully!',
  },
  hi: {
    portalTitle: 'श्री प्योर वेज — स्टाफ पोर्टल',
    portalSubtitle: 'लाइव आरक्षण इनबॉक्स एवं किचन डिस्प्ले',
    hotelLocation: 'थेऊर फाटा, पुणे-सोलापुर हाईवे',
    roleOwner: '👑 मालिक (Owner)',
    roleManager: '📋 प्रबंधक (Manager)',
    roleKitchen: '🍳 रसोई (Kitchen)',
    roleReadOnlyBadge: 'केवल वाचन (Read-Only)',
    roleReadOnlyNotice: 'रसोई भूमिका: केवल पढ़ने की अनुमति है। स्थिति बदलने का अधिकार मालिक एवं प्रबंधक के पास है।',

    loginTitle: 'कर्मचारी लॉगिन (Staff Login)',
    loginSub: 'श्री प्योर वेज पोर्टल में प्रवेश करने के लिए लॉगिन करें या परीक्षण रोल चुनें।',
    emailLabel: 'कर्मचारी ईमेल',
    passwordLabel: 'पासवर्ड',
    signInBtn: 'लॉगिन करें',
    signOutBtn: 'लॉगआउट',
    demoRolesTitle: '⚡ १-टैप परीक्षण लॉगिन (Quick Test Roles)',
    demoRoleOwnerHint: 'पूर्ण अधिकार (स्वीकृति, अस्वीकृति, सीट्स, पुश)',
    demoRoleManagerHint: 'पूर्ण परिचालन अधिकार',
    demoRoleKitchenHint: 'केवल वाचन — बटन अक्षम रहेंगे',
    loggedInAs: 'सक्रिय लॉगिन:',

    installApp: '📱 ऐप इंस्टॉल करें',
    appInstalled: 'ऐप इंस्टॉल है ✓',
    enableSound: '🔊 ध्वनि अलर्ट चालू करें',
    soundActive: 'ध्वनि सक्रिय 🔔',
    soundTest: 'ध्वनि परीक्षण',
    soundPromptBanner: 'नया आरक्षण आने पर घंटी बजने के लिए यहां टैप करें (ऑटोप्ले अनलॉक)',
    pushAlerts: '🔔 पुश सूचनाएं',
    pushSubscribed: 'पुश सक्रिय ✓',
    pushUnsupported: 'ब्राउज़र में पुश समर्थित नहीं है',
    pushTestBtn: '📲 टेस्ट पुश भेजें',
    simulateBookingBtn: '⚡ नई बुकिंग सिम्युलेट करें (Realtime Chime)',
    simulatePilgrimBtn: '🙏 तीर्थयात्री पंगत सिम्युलेट करें (१२-१६ अतिथि)',
    resetDemoBtn: '🔄 डेमो डेटा रीसेट करें (Owner)',
    resetDemoConfirm: 'क्या सभी टेस्ट बुकिंग्स हटाकर प्रारंभिक स्वच्छ स्थिति बहाल करनी है?',
    resetDemoSuccess: 'डेमो डेटा सफलतापूर्वक रीसेट किया गया!',
    demoBannerActive: '⚡ लाइव डेमो मोड सक्रिय (DEMO MODE)',
    demoOwnerOnlyNotice: 'डेटा रीसेट केवल मालिक (Owner) भूमिका तक सीमित है।',
    helpGuideBtn: '📖 VAPID एवं Android परीक्षण गाइड',

    filterPending: 'प्रतीक्षारत',
    filterToday: 'आज',
    filterTomorrow: 'कल',
    filterAll: 'सभी',

    summaryTodayTitle: 'आज के संभावित अतिथि (Today)',
    summaryTomorrowTitle: 'कल के संभावित अतिथि (Tomorrow)',
    confirmedGuests: 'स्वीकृत अतिथि',
    waitingGuests: 'प्रतीक्षारत अतिथि',
    seatedGuests: 'टेबल पर उपस्थित',
    totalTables: 'कुल टेबल्स',
    guestsUnit: 'अतिथि',

    tokenNumberLabel: 'टोकन संख्या',
    partySizeLabel: 'अतिथि संख्या',
    timeSlotLabel: 'समय स्लॉट',
    bookingTypeTable: 'टेबल आरक्षण',
    bookingTypeGroup: 'भक्त व परिवार पंगत थाली',
    bookingTypeOrderAhead: 'पूर्व-ऑर्डर भोजन',
    preOrderDishes: 'ऑर्डर किए गए व्यंजन:',
    notesLabel: 'टिप्पणी:',
    emptyInboxTitle: 'इस दृश्य में कोई आरक्षण नहीं है',
    emptyInboxSub: 'नया आरक्षण आने पर रियल-टाइम में घंटी के साथ यहां प्रदर्शित होगा।',

    statusPending: 'प्रतीक्षारत (Pending)',
    statusConfirmed: 'स्वीकृत (Confirmed)',
    statusRejected: 'अस्वीकृत (Rejected)',
    statusSeated: 'उपस्थित (Seated)',
    statusNoShow: 'अनुपस्थित (No-Show)',
    statusCancelled: 'रद्द (Cancelled)',

    actionAccept: 'स्वीकारें (Accept)',
    actionReject: 'अस्वीकारें (Reject)',
    actionMarkSeated: '🪑 टेबल दी (Seated)',
    actionNoShow: '❌ No-Show (अनुपस्थित)',
    actionSendReminder: '🔔 याद दिलाएं (WhatsApp)',
    actionTapToCall: '📞 कॉल करें',
    actionWhatsApp: '💬 WhatsApp',
    actionOwnerAlert: '📲 मालिक WhatsApp अलर्ट',
    prepTimePrefix: 'तैयारी समय:',
    prepTimeModalTitle: 'आरक्षण स्वीकारें — अनुमानित तैयारी समय चुनें',
    prepImmediate: 'तुरंत / सीधा (० मि)',
    prep15m: '१५ मिनट',
    prep30m: '३० मिनट',
    prep45m: '४५ मिनट',
    rejectModalTitle: 'अस्वीकार करने का कारण चुनें',
    rejectReasonFull: 'स्लॉट फुल है (Slot Full)',
    rejectReasonClosing: 'रसोई बंद हो रही है (Kitchen Closing)',
    rejectReasonRush: 'भीड़ / मंदिर उत्सव (Peak Rush)',
    rejectReasonOther: 'अन्य कारण (Other)',
    confirmBtn: 'निश्चित करें',
    cancelBtn: 'रद्द करें',

    newBookingAlertTitle: '🚨 नया आरक्षण प्राप्त हुआ! तत्काल ध्यान दें!',
    muteAlertBtn: 'घंटी बंद करें 🔕',
    reminderSentToast: 'अतिथि के लिए WhatsApp लिंक खोली गई!',
    statusUpdatedToast: 'आरक्षण स्थिति सफलतापूर्वक अपडेट की गई!',
  },
  mr: {
    portalTitle: 'श्री प्युअर व्हेज — कर्मचारी पोर्टल',
    portalSubtitle: 'थेट आरक्षण इनबॉक्स व किचन डिस्प्ले',
    hotelLocation: 'थेऊर फाटा, पुणे-सोलापूर महामार्ग',
    roleOwner: '👑 मालक (Owner)',
    roleManager: '📋 व्यवस्थापक (Manager)',
    roleKitchen: '🍳 स्वयंपाकघर (Kitchen)',
    roleReadOnlyBadge: 'केवळ वाचन (Read-Only)',
    roleReadOnlyNotice: 'स्वयंपाकघर भूमिका: केवळ वाचनाची परवानगी आहे. आरक्षण बदलण्याचा अधिकार मालक व व्यवस्थापकांना आहे.',

    loginTitle: 'कर्मचारी लॉगिन (Staff Login)',
    loginSub: 'श्री प्युअर व्हेज पोर्टल वापरण्यासाठी कृपया लॉगिन करा किंवा झटपट चाचणी रोल निवडा.',
    emailLabel: 'कर्मचारी ईमेल',
    passwordLabel: 'पासवर्ड',
    signInBtn: 'लॉगिन करा',
    signOutBtn: 'लॉगआउट',
    demoRolesTitle: '⚡ १-टॅप चाचणी लॉगिन (Quick Test Roles)',
    demoRoleOwnerHint: 'पूर्ण अधिकार (स्वीकारा, नकारा, सीट्स, पुश)',
    demoRoleManagerHint: 'सर्व ऑपरेशन्स अधिकार',
    demoRoleKitchenHint: 'केवळ वाचन — बटणे बंद असतील',
    loggedInAs: 'सक्रिय लॉगिन:',

    installApp: '📱 अॅप इन्स्टॉल करा',
    appInstalled: 'अॅप इन्स्टॉल आहे ✓',
    enableSound: '🔊 ध्वनी अलर्ट सुरू करा',
    soundActive: 'ध्वनी सक्रिय 🔔',
    soundTest: 'ध्वनी चाचणी',
    soundPromptBanner: 'नवीन बुकिंग आल्यावर मोठा बेल ध्वनी वाजण्यासाठी येथे टॅप करा (ब्राउझर ऑटॉप्ले अनलॉक)',
    pushAlerts: '🔔 पुश सूचना',
    pushSubscribed: 'पुश सक्रिय ✓',
    pushUnsupported: 'ब्राउझरमध्ये पुश उपलब्ध नाही',
    pushTestBtn: '📲 चाचणी पुश पाठवा',
    simulateBookingBtn: '⚡ नवीन बुकिंग सिम्युलेट करा (Realtime Chime)',
    simulatePilgrimBtn: '🙏 भाविक पंगत विनंती सिम्युलेट करा (१२-१६ व्यक्ती)',
    resetDemoBtn: '🔄 डेमो डेटा रीसेट करा (मालक)',
    resetDemoConfirm: 'सर्व चाचणी आरक्षणे हटवून सुरुवातीचा स्वच्छ डेमो डेटा पूर्ववत करायचा आहे का?',
    resetDemoSuccess: 'डेमो डेटा पूर्ववत केला! सिस्टीम स्वच्छ स्थितीत आली.',
    demoBannerActive: '⚡ थेट प्रात्यक्षिक मोड सक्रिय (DEMO MODE)',
    demoOwnerOnlyNotice: 'डेटा रीसेट करण्याची सुविधा केवळ मालक (Owner) भूमिकेसाठी मर्यादित आहे.',
    helpGuideBtn: '📖 VAPID व Android पुश मार्गदर्शक',

    filterPending: 'प्रलंबित',
    filterToday: 'आजचे',
    filterTomorrow: 'उद्याचे',
    filterAll: 'सर्व',

    summaryTodayTitle: 'आजचे अपेक्षित पाहुणे (Today)',
    summaryTomorrowTitle: 'उद्याचे अपेक्षित पाहुणे (Tomorrow)',
    confirmedGuests: 'स्वीकृत पाहुणे',
    waitingGuests: 'प्रतीक्षेत पाहुणे',
    seatedGuests: 'टेबलवर आसनस्थ',
    totalTables: 'एकूण टेबल्स',
    guestsUnit: 'लोक',

    tokenNumberLabel: 'टोकन क्र.',
    partySizeLabel: 'व्यक्ती',
    timeSlotLabel: 'वेळ',
    bookingTypeTable: 'टेबल आरक्षण',
    bookingTypeGroup: 'भाविक व कुटुंब पंगत थाळी',
    bookingTypeOrderAhead: 'आधी मागवलेले जेवण',
    preOrderDishes: 'मागवलेले पदार्थ:',
    notesLabel: 'टीप:',
    emptyInboxTitle: 'सध्या कोणतेही आरक्षण उपलब्ध नाही',
    emptyInboxSub: 'नवीन ग्राहक बुकिंग आल्यावर येथे Realtime मध्ये दिसेल व बेल वाजेल.',

    statusPending: 'प्रलंबित (Pending)',
    statusConfirmed: 'स्वीकृत (Confirmed)',
    statusRejected: 'नाकारले (Rejected)',
    statusSeated: 'टेबलवर (Seated)',
    statusNoShow: 'हजर राहिले नाहीत (No-Show)',
    statusCancelled: 'रद्द (Cancelled)',

    actionAccept: 'स्वीकारा (Accept)',
    actionReject: 'नकारा (Reject)',
    actionMarkSeated: '🪑 टेबल दिले (Seated)',
    actionNoShow: '❌ No-Show (गैरहजर)',
    actionSendReminder: '🔔 आठवण पाठवा (WhatsApp)',
    actionTapToCall: '📞 कॉल करा',
    actionWhatsApp: '💬 WhatsApp',
    actionOwnerAlert: '📲 मालक WhatsApp अलर्ट',
    prepTimePrefix: 'तयारी वेळ:',
    prepTimeModalTitle: 'बुकिंग स्वीकारा — अंदाजे तयारी वेळ निवडा',
    prepImmediate: 'त्वरित / थेट (० मि)',
    prep15m: '१५ मिनिटे',
    prep30m: '३० मिनिटे',
    prep45m: '४५ मिनिटे',
    rejectModalTitle: 'आरक्षण नाकारण्याचे कारण निवडा',
    rejectReasonFull: 'जागा शिल्लक नाही (Slot Full)',
    rejectReasonClosing: 'किचन बंद होत आहे (Kitchen Closing)',
    rejectReasonRush: 'सण गर्दी / मोठी रांग (Temple Rush)',
    rejectReasonOther: 'इतर कारण (Other)',
    confirmBtn: 'निश्चित करा',
    cancelBtn: 'रद्द करा',

    newBookingAlertTitle: '🚨 नवीन बुकिंग प्राप्त! तातडीने स्वीकारा किंवा नकारा!',
    muteAlertBtn: 'अलर्ट म्यूट करा 🔕',
    reminderSentToast: 'ग्राहकाला WhatsApp आठवण लिंक उघडली गेली!',
    statusUpdatedToast: 'स्थिती यशस्वीरित्या बदलली!',
  },
};
