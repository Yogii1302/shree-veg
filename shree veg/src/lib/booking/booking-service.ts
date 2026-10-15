import { createAdminClient } from '@/lib/supabase/admin';
import { clearInMemoryMessageLogs } from '@/lib/messaging/logger';

export interface MenuItem {
  id: string;
  name_en: string;
  name_mr: string;
  name_hi?: string;
  category: 'thali' | 'breakfast' | 'main_course' | 'dessert' | 'beverage';
  price: number;
  is_sold_out: boolean;
  description_en: string;
  description_mr: string;
  description_hi?: string;
}

export interface GroupPackage {
  id: string;
  name_en: string;
  name_mr: string;
  name_hi?: string;
  price_per_head: number;
  min_guests: number;
  description_en: string;
  description_mr: string;
  description_hi?: string;
  is_active: boolean;
}

export interface DateRule {
  date: string; // YYYY-MM-DD
  kind: 'blocked' | 'festival';
  note_mr: string;
  note_en: string;
  note_hi?: string;
}

export interface SlotAvailability {
  time: string; // e.g. "12:30"
  slot_start: string; // ISO string
  total_capacity: number;
  current_booked: number;
  available_seats: number;
  is_full: boolean;
  is_past: boolean;
}

export interface BookingRecord {
  id: string;
  restaurant_id: string;
  token_number: string;
  type: 'table' | 'group_meal' | 'order_ahead';
  party_size: number;
  slot_start: string;
  status: 'pending' | 'confirmed' | 'rejected' | 'seated' | 'no_show' | 'cancelled';
  guest_name: string;
  guest_phone: string;
  notes?: string;
  package_id?: string;
  estimated_prep_time_mins?: number;
  items?: Array<{
    menu_item_id: string;
    quantity: number;
    unit_price: number;
    notes?: string;
  }>;
  total_estimated_amount: number;
  rejection_reason?: string;
  created_at: string;
  is_demo: boolean;
}

// -----------------------------------------------------------------------------
// REPORTING & KPI INTERFACES (Computed in DB / Fallback Engine)
// -----------------------------------------------------------------------------

export interface ReportKPIs {
  total_requests: number;
  confirmed: number;
  pending: number;
  no_shows: number;
  seated: number;
  cancelled: number;
  rejected: number;
  total_guests: number;
  confirmed_guests: number;
  pending_guests: number;
}

export interface DayGuestReport {
  date: string; // YYYY-MM-DD
  day_offset: number;
  day_name_en: string;
  day_name_mr: string;
  formatted_date_en: string;
  formatted_date_mr: string;
  total_guests: number;
  confirmed_guests: number;
  pending_guests: number;
  booking_count: number;
  is_festival: boolean;
  is_blocked: boolean;
  note?: string | null;
}

export interface BookingTypeReport {
  type: 'table' | 'group_meal' | 'order_ahead';
  name_mr: string;
  name_en: string;
  icon: string;
  count: number;
  guests: number;
  percentage: number;
}

export interface TopDishReport {
  id: string;
  name_mr: string;
  name_en: string;
  category: string;
  price: number;
  total_quantity: number;
  order_count: number;
  total_revenue: number;
}

export interface AdminReportsData {
  success: boolean;
  restaurant_id?: string;
  kpis: ReportKPIs;
  next_7_days: DayGuestReport[];
  bookings_by_type: BookingTypeReport[];
  top_dishes: TopDishReport[];
  computed_at: string;
}

// -----------------------------------------------------------------------------
// DEFAULT SEED DATA & IN-MEMORY STORE (Used for Demo & Offline Fallback)
// -----------------------------------------------------------------------------

export const DEFAULT_MENU_ITEMS: MenuItem[] = [
  {
    id: 'item-1-thali',
    name_en: 'Shree Special Chintamani Mahathali',
    name_mr: 'श्री स्पेशल चिंतामणी महाथाळी',
    name_hi: 'श्री स्पेशल चिंतामणि महाथाली',
    category: 'thali',
    price: 220,
    is_sold_out: false,
    description_en: 'Unlimited satvik thali: 2 Bhajis, Dal, Pure Ghee Puran Poli, Chapati/Bhakri, Rice, Solkadhi',
    description_mr: 'अमर्यादित सात्विक महाथाळी: २ भाज्या, वरण, तुपातील पुरणपोळी, चपाती/भाकरी, भात, सोलकढी',
    description_hi: 'असीमित सात्विक महाथाली: २ सब्जियां, दाल, शुद्ध घी की पूरनपोली, चपाती/भाकरी, चावल, सोलकढ़ी',
  },
  {
    id: 'item-2-malvani',
    name_en: 'Veg Malvani Handi',
    name_mr: 'व्हेज मालवणी हंडी',
    name_hi: 'वेज मालवणी हांडी',
    category: 'main_course',
    price: 240,
    is_sold_out: false,
    description_en: 'Spiced Konkani coconut masala gravy with fresh garden vegetables',
    description_mr: 'कोकणी पद्धतीचा खास वाटप मसाला आणि ताज्या भाज्यांची चवदार हंडी',
    description_hi: 'कोंकणी स्टाइल खास वाटप मसाला और ताजी सब्जियों की स्वादिष्ट हांडी',
  },
  {
    id: 'item-3-misal',
    name_en: 'Kolhapuri Zanzanit Misal Pav',
    name_mr: 'झणझणीत कोल्हापुरी मिसळ पाव',
    name_hi: 'तीखा कोल्हापुरी मिसल पाव',
    category: 'breakfast',
    price: 90,
    is_sold_out: false,
    description_en: 'Highway spicy sprouted matki curry served with 2 Pav, Farsan, Lemon and Curd',
    description_mr: 'महामार्ग स्पेशल मटकी उसळ, झणझणीत कट, २ लादी पाव, फरसाण आणि कांदा-लिंबू',
    description_hi: 'हाईवे स्पेशल मटकी उसल, मसालेदार तरी (कट), २ पाव, फरसाण और प्याज-नींबू',
  },
  {
    id: 'item-4-bhakri',
    name_en: 'Gavran Pithla Bhakri with Thecha',
    name_mr: 'गावरान पिठलं भाकरी व ठेचा',
    name_hi: 'गावरान पिठला भाकरी व ठेचा',
    category: 'main_course',
    price: 160,
    is_sold_out: false,
    description_en: 'Hot traditional Gram flour besan, 2 hot Jowar/Bajra Bhakris, raw onion, and spicy Thecha',
    description_mr: 'गरमागरम पिठलं, २ ज्वारी/बाजरी भाकरी, खमंग मिरची ठेचा आणि कांदा',
    description_hi: 'गरमागरम बेसन पिठला, २ ज्वार/बाजरा भाकरी, तीखा मिर्ची ठेचा और प्याज',
  },
  {
    id: 'item-5-shev',
    name_en: 'Puneri / Khandeshi Shev Bhaji',
    name_mr: 'पुणेरी / खान्देशी शेव भाजी',
    name_hi: 'पुनेरी / खान्देशी शेव भाजी',
    category: 'main_course',
    price: 180,
    is_sold_out: false,
    description_en: 'Crispy Ghati Shev cooked in thick rich red onion-tomato highway gravy',
    description_mr: 'पुणेरी चवीचा लाल रस्सा आणि कुरकुरीत घाटी शेव',
    description_hi: 'पुनेरी स्वाद की मसालेदार ग्रेवी और कुरकुरी घाटी सेव',
  },
  {
    id: 'item-6-kaju',
    name_en: 'Shahi Kaju Curry Masala',
    name_mr: 'शाही काजू करी मसाला',
    name_hi: 'शाही काजू करी मसाला',
    category: 'main_course',
    price: 260,
    is_sold_out: true, // Example sold out dish during peak pilgrim rush!
    description_en: 'Whole roasted cashews tossed in rich cashew-tomato Mughlai gravy (Sold out for lunch)',
    description_mr: 'तूप-भाजलेले अखंड काजू आणि मखमली ग्रेव्ही (दुपारसाठी संपले आहे)',
    description_hi: 'घी में भुने काजू और मखमली मुगलाई ग्रेवी (दोपहर के लिए समाप्त)',
  },
  {
    id: 'item-7-puran',
    name_en: 'Puran Poli with Ghee & Katachi Amti',
    name_mr: 'शुद्ध तुपातली पुरणपोळी व कटाची आमटी',
    name_hi: 'शुद्ध घी की पूरनपोली व कटाची आमटी',
    category: 'dessert',
    price: 140,
    is_sold_out: false,
    description_en: '2 Fresh handmade Puran Polis drowned in pure cow ghee with traditional Katachi Amti',
    description_mr: '२ गरमागरम मऊ पुरणपोळ्या, गाईचे शुद्ध तूप आणि अस्सल झणझणीत कटाची आमटी',
    description_hi: '२ गरमागरम पूरनपोली, गाय का शुद्ध घी और पारंपरिक तीखी कटाची आमटी',
  },
];

export const DEFAULT_PACKAGES: GroupPackage[] = [
  {
    id: 'pkg-1-pilgrim',
    name_en: 'Chintamani Pilgrim Darshan Thali Feast',
    name_mr: 'चिंतामणी दर्शन भाविक पंगत थाळी',
    name_hi: 'चिंतामणि दर्शन भक्त पंगत थाली',
    price_per_head: 210,
    min_guests: 6,
    description_en: 'Full satvik unlimited thali for temple pilgrim groups. Fast serving, no-onion/garlic available.',
    description_mr: 'थेऊर चिंतामणी दर्शनासाठी येणाऱ्या भाविक मंडळांसाठी अमर्यादित पंगत जेवण. जलद सेवा, विना कांदा-लसूण पर्याय उपलब्ध.',
    description_hi: 'थेऊर चिंतामणि दर्शन हेतु आने वाले भक्त मंडलों के लिए असीमित पंगत भोजन। त्वरित सेवा, बिना प्याज-लहसुन उपलब्ध।',
    is_active: true,
  },
  {
    id: 'pkg-2-family',
    name_en: 'Highway Royal Family Feast',
    name_mr: 'महामार्ग रॉयल फॅमिली मेजवानी',
    name_hi: 'हाईवे रॉयल फैमिली दावत',
    price_per_head: 290,
    min_guests: 8,
    description_en: 'Deluxe family feast: Paneer starter, 2 Veg specialties (Kaju + Malvani), Bhakri, Dal Tadka, Jeera Rice, Puran Poli.',
    description_mr: 'मोठ्या कुटुंबासाठी शाही मेजवानी: स्टार्टर, काजू करी, व्हेज मालवणी, गरमागरम भाकरी, जिरा राईस आणि पुरणपोळी.',
    description_hi: 'बड़े परिवार के लिए शाही दावत: स्टार्टर, काजू करी, वेज मालवणी, गरमागरम भाकरी, जीरा राइस और पूरनपोली।',
    is_active: true,
  },
];

// Helper to format local YYYY-MM-DD
function formatYYYYMMDD(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// In-memory demo store
const demoBookingsStore: Map<string, BookingRecord> = new Map();

// Helper to populate initial demo bookings across next 7 days
function initDemoStore(forceReset = false) {
  if (forceReset) {
    demoBookingsStore.clear();
  } else if (demoBookingsStore.size > 0) {
    return;
  }

  const now = new Date();
  const todayStr = formatYYYYMMDD(now);

  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = formatYYYYMMDD(tomorrow);

  const day2 = new Date(now);
  day2.setDate(day2.getDate() + 2);
  const day2Str = formatYYYYMMDD(day2);

  const day3 = new Date(now);
  day3.setDate(day3.getDate() + 3);
  const day3Str = formatYYYYMMDD(day3);

  const day4 = new Date(now);
  day4.setDate(day4.getDate() + 4);
  const day4Str = formatYYYYMMDD(day4);

  const day6 = new Date(now);
  day6.setDate(day6.getDate() + 6);
  const day6Str = formatYYYYMMDD(day6);

  // 0. Seed No-Show booking (Today 11:30)
  demoBookingsStore.set('sv-seed-booking-0', {
    id: 'sv-seed-booking-0',
    restaurant_id: 'shree-theur-main',
    token_number: `SV-${String(now.getDate()).padStart(2, '0')}${String(now.getMonth() + 1).padStart(2, '0')}-000`,
    type: 'table',
    party_size: 5,
    slot_start: `${todayStr}T11:30:00+05:30`,
    status: 'no_show',
    guest_name: 'विकास जगताप (Vikas Jagtap)',
    guest_phone: '9822998877',
    notes: 'Customer did not arrive and phone was unreachable after 3 rings.',
    total_estimated_amount: 0,
    created_at: new Date(now.getTime() - 7200000).toISOString(),
    is_demo: true,
  });

  // 1. Confirmed Table (Today 13:00)
  demoBookingsStore.set('sv-seed-booking-1', {
    id: 'sv-seed-booking-1',
    restaurant_id: 'shree-theur-main',
    token_number: `SV-${String(now.getDate()).padStart(2, '0')}${String(now.getMonth() + 1).padStart(2, '0')}-001`,
    type: 'table',
    party_size: 4,
    slot_start: `${todayStr}T13:00:00+05:30`,
    status: 'confirmed',
    guest_name: 'सचिन तांबडे (Sachin Tambade)',
    guest_phone: '9822012345',
    notes: 'Family highway lunch - Pune to Solapur drive',
    total_estimated_amount: 0,
    created_at: new Date().toISOString(),
    is_demo: true,
  });

  // 2. Pending Group Booking (Today 14:00)
  demoBookingsStore.set('sv-seed-booking-2', {
    id: 'sv-seed-booking-2',
    restaurant_id: 'shree-theur-main',
    token_number: `SV-${String(now.getDate()).padStart(2, '0')}${String(now.getMonth() + 1).padStart(2, '0')}-002`,
    type: 'group_meal',
    party_size: 14,
    slot_start: `${todayStr}T14:00:00+05:30`,
    status: 'pending',
    guest_name: 'रमेशजी मोरे (Ramesh More)',
    guest_phone: '9423098765',
    notes: 'Chintamani Ganpati Yatra group arriving by Tempo Traveller',
    package_id: 'pkg-1-pilgrim',
    total_estimated_amount: 2940,
    created_at: new Date().toISOString(),
    is_demo: true,
  });

  // 3. Confirmed Order Ahead with Dishes (Today 19:30)
  demoBookingsStore.set('sv-seed-booking-3', {
    id: 'sv-seed-booking-3',
    restaurant_id: 'shree-theur-main',
    token_number: `SV-${String(now.getDate()).padStart(2, '0')}${String(now.getMonth() + 1).padStart(2, '0')}-003`,
    type: 'order_ahead',
    party_size: 3,
    slot_start: `${todayStr}T19:30:00+05:30`,
    status: 'confirmed',
    guest_name: 'डॉ. अनिकेत जोशी (Dr. Aniket Joshi)',
    guest_phone: '9881145678',
    notes: 'Keep food ready at 7:30 PM sharp for quick halt.',
    estimated_prep_time_mins: 20,
    items: [
      { menu_item_id: 'item-2-malvani', quantity: 1, unit_price: 240, notes: 'Medium spicy' },
      { menu_item_id: 'item-4-bhakri', quantity: 2, unit_price: 160, notes: 'Jowar bhakri' },
      { menu_item_id: 'item-7-puran', quantity: 2, unit_price: 140, notes: 'Extra pure ghee' },
    ],
    total_estimated_amount: 840,
    created_at: new Date().toISOString(),
    is_demo: true,
  });

  // 4. Seated Table Booking (Today 20:30)
  demoBookingsStore.set('sv-seed-booking-4', {
    id: 'sv-seed-booking-4',
    restaurant_id: 'shree-theur-main',
    token_number: `SV-${String(now.getDate()).padStart(2, '0')}${String(now.getMonth() + 1).padStart(2, '0')}-004`,
    type: 'table',
    party_size: 6,
    slot_start: `${todayStr}T20:30:00+05:30`,
    status: 'seated',
    guest_name: 'प्रदीप कुंजीर (Pradeep Kunjir)',
    guest_phone: '9765089012',
    notes: 'Repeat local patron from Kunjirwadi.',
    total_estimated_amount: 0,
    created_at: new Date().toISOString(),
    is_demo: true,
  });

  // 5. Tomorrow Festival Day Pending Group Booking (Tomorrow 12:30)
  demoBookingsStore.set('sv-seed-booking-5', {
    id: 'sv-seed-booking-5',
    restaurant_id: 'shree-theur-main',
    token_number: `SV-${String(tomorrow.getDate()).padStart(2, '0')}${String(tomorrow.getMonth() + 1).padStart(2, '0')}-001`,
    type: 'group_meal',
    party_size: 10,
    slot_start: `${tomorrowStr}T12:30:00+05:30`,
    status: 'pending',
    guest_name: 'बाळकृष्ण शिंदे (Balkrishna Shinde)',
    guest_phone: '9921123456',
    notes: 'Angarki Chaturthi pilgrim group from Daund. Need fast service.',
    package_id: 'pkg-1-pilgrim',
    total_estimated_amount: 2100,
    created_at: new Date().toISOString(),
    is_demo: true,
  });

  // 6. Tomorrow Confirmed Table Booking (Tomorrow 20:00)
  demoBookingsStore.set('sv-seed-booking-6', {
    id: 'sv-seed-booking-6',
    restaurant_id: 'shree-theur-main',
    token_number: `SV-${String(tomorrow.getDate()).padStart(2, '0')}${String(tomorrow.getMonth() + 1).padStart(2, '0')}-002`,
    type: 'table',
    party_size: 2,
    slot_start: `${tomorrowStr}T20:00:00+05:30`,
    status: 'confirmed',
    guest_name: 'अमोल व स्नेहल गायकवाड (Amol Gaikwad)',
    guest_phone: '9890076543',
    notes: 'Couple returning after Ganpati Abhishek.',
    total_estimated_amount: 0,
    created_at: new Date().toISOString(),
    is_demo: true,
  });

  // 7. Day 2 Confirmed Order Ahead with Items
  demoBookingsStore.set('sv-seed-booking-7', {
    id: 'sv-seed-booking-7',
    restaurant_id: 'shree-theur-main',
    token_number: `SV-${String(day2.getDate()).padStart(2, '0')}${String(day2.getMonth() + 1).padStart(2, '0')}-001`,
    type: 'order_ahead',
    party_size: 6,
    slot_start: `${day2Str}T13:30:00+05:30`,
    status: 'confirmed',
    guest_name: 'संजय गायकवाड (Sanjay Gaikwad)',
    guest_phone: '9822445566',
    notes: 'Pilgrim bus advance thali order.',
    estimated_prep_time_mins: 15,
    items: [
      { menu_item_id: 'item-1-thali', quantity: 4, unit_price: 220, notes: 'Pure ghee thali' },
      { menu_item_id: 'item-5-shev', quantity: 2, unit_price: 180, notes: 'Zanzanit gravy' },
      { menu_item_id: 'item-3-misal', quantity: 3, unit_price: 90, notes: 'Kolhapuri cut' },
    ],
    total_estimated_amount: 1510,
    created_at: new Date().toISOString(),
    is_demo: true,
  });

  // 8. Day 3 Confirmed Group Feast
  demoBookingsStore.set('sv-seed-booking-8', {
    id: 'sv-seed-booking-8',
    restaurant_id: 'shree-theur-main',
    token_number: `SV-${String(day3.getDate()).padStart(2, '0')}${String(day3.getMonth() + 1).padStart(2, '0')}-001`,
    type: 'group_meal',
    party_size: 16,
    slot_start: `${day3Str}T12:30:00+05:30`,
    status: 'confirmed',
    guest_name: 'मारुती थोरात (Maruti Thorat)',
    guest_phone: '9823112233',
    notes: 'Large family celebratory lunch.',
    package_id: 'pkg-2-family',
    total_estimated_amount: 4640,
    items: [
      { menu_item_id: 'item-1-thali', quantity: 6, unit_price: 220 },
      { menu_item_id: 'item-2-malvani', quantity: 4, unit_price: 240 },
      { menu_item_id: 'item-4-bhakri', quantity: 8, unit_price: 160 },
    ],
    created_at: new Date().toISOString(),
    is_demo: true,
  });

  // 9. Day 4 Pending Table Booking
  demoBookingsStore.set('sv-seed-booking-9', {
    id: 'sv-seed-booking-9',
    restaurant_id: 'shree-theur-main',
    token_number: `SV-${String(day4.getDate()).padStart(2, '0')}${String(day4.getMonth() + 1).padStart(2, '0')}-001`,
    type: 'table',
    party_size: 8,
    slot_start: `${day4Str}T13:00:00+05:30`,
    status: 'pending',
    guest_name: 'अशोकराव सावंत (Ashokrao Sawant)',
    guest_phone: '9850223344',
    notes: 'Family gathering with senior citizens.',
    total_estimated_amount: 0,
    created_at: new Date().toISOString(),
    is_demo: true,
  });

  // 10. Day 6 Confirmed Group Feast (Weekend rush)
  demoBookingsStore.set('sv-seed-booking-10', {
    id: 'sv-seed-booking-10',
    restaurant_id: 'shree-theur-main',
    token_number: `SV-${String(day6.getDate()).padStart(2, '0')}${String(day6.getMonth() + 1).padStart(2, '0')}-001`,
    type: 'group_meal',
    party_size: 12,
    slot_start: `${day6Str}T13:30:00+05:30`,
    status: 'confirmed',
    guest_name: 'दीपक शेवाळे (Deepak Shewale)',
    guest_phone: '9881002233',
    notes: 'Temple darshan tour group.',
    package_id: 'pkg-1-pilgrim',
    total_estimated_amount: 2520,
    items: [
      { menu_item_id: 'item-1-thali', quantity: 8, unit_price: 220 },
      { menu_item_id: 'item-7-puran', quantity: 6, unit_price: 140 },
    ],
    created_at: new Date().toISOString(),
    is_demo: true,
  });
}

initDemoStore();

// =============================================================================
// DYNAMIC IN-MEMORY STORES & MANAGEMENT
// =============================================================================

export let dynamicMenuItems: MenuItem[] = [...DEFAULT_MENU_ITEMS];
export let dynamicPackages: GroupPackage[] = [...DEFAULT_PACKAGES];
export const dynamicDateRulesMap: Map<string, DateRule> = new Map();

function initDateRulesMap(forceReset = false) {
  if (forceReset) {
    dynamicDateRulesMap.clear();
  } else if (dynamicDateRulesMap.size > 0) {
    return;
  }
  const now = new Date();
  
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = formatYYYYMMDD(tomorrow);

  const blockedDay = new Date(now);
  blockedDay.setDate(blockedDay.getDate() + 5);
  const blockedDayStr = formatYYYYMMDD(blockedDay);

  dynamicDateRulesMap.set(tomorrowStr, {
    date: tomorrowStr,
    kind: 'festival',
    note_mr: 'अंगारकी संकष्टी चतुर्थी (अमर्यादित भाविक गर्दी — मर्यादित जागा: १२ प्रति स्लॉट, टेबल कमाल १० व्यक्ती)',
    note_en: 'Angarki Sankashti Chaturthi (Peak Pilgrim Rush — Limited Seats: 12 per slot, Max 10 per table)',
  });

  dynamicDateRulesMap.set(blockedDayStr, {
    date: blockedDayStr,
    kind: 'blocked',
    note_mr: 'हॉटेल डीप-क्लिनिंग व स्वच्छता देखभाल (आरक्षण बंद)',
    note_en: 'Kitchen Sanitization & Deep Cleaning (Bookings Closed)',
  });
}

initDateRulesMap();

/**
 * Returns date rules (combining in-memory state and default seeds)
 */
export function getDateRules(): DateRule[] {
  initDateRulesMap();
  return Array.from(dynamicDateRulesMap.values());
}

// -----------------------------------------------------------------------------
// 1. MENU MANAGEMENT SERVICES
// -----------------------------------------------------------------------------

export async function listMenuItemsService(): Promise<MenuItem[]> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('menu_items')
      .select('*')
      .order('price', { ascending: true });

    if (!error && Array.isArray(data) && data.length > 0) {
      dynamicMenuItems = data as MenuItem[];
      return dynamicMenuItems;
    }
  } catch {
    // fallback
  }
  return dynamicMenuItems;
}

export async function updateMenuItemService(
  id: string,
  updates: {
    price?: number;
    is_sold_out?: boolean;
    name_en?: string;
    name_mr?: string;
    callerRole?: string;
  }
): Promise<{ success: boolean; item?: MenuItem; error?: string }> {
  // Role Enforcement: Kitchen role is READ-ONLY in UI and Backend
  if (updates.callerRole === 'kitchen') {
    return {
      success: false,
      error: 'Kitchen role is strictly read-only. Only Owner and Manager can modify menu items.',
    };
  }

  // Update in-memory store immediately
  const idx = dynamicMenuItems.findIndex((m) => m.id === id);
  if (idx !== -1) {
    dynamicMenuItems[idx] = {
      ...dynamicMenuItems[idx],
      ...(updates.price !== undefined ? { price: Number(updates.price) } : {}),
      ...(updates.is_sold_out !== undefined ? { is_sold_out: Boolean(updates.is_sold_out) } : {}),
      ...(updates.name_en ? { name_en: updates.name_en } : {}),
      ...(updates.name_mr ? { name_mr: updates.name_mr } : {}),
    };
  }

  // Update Supabase if available
  try {
    const supabase = createAdminClient();
    const dbPayload: Record<string, any> = {};
    if (updates.price !== undefined) dbPayload.price = updates.price;
    if (updates.is_sold_out !== undefined) dbPayload.is_sold_out = updates.is_sold_out;
    if (updates.name_en) dbPayload.name_en = updates.name_en;
    if (updates.name_mr) dbPayload.name_mr = updates.name_mr;

    const { data, error } = await supabase
      .from('menu_items')
      .update(dbPayload)
      .eq('id', id)
      .select()
      .maybeSingle();

    if (!error && data) {
      return { success: true, item: data as MenuItem };
    }
  } catch {
    // fallback
  }

  const found = dynamicMenuItems.find((m) => m.id === id);
  if (found) {
    return { success: true, item: found };
  }
  return { success: false, error: 'Menu item not found' };
}

// -----------------------------------------------------------------------------
// 2. GROUP PACKAGES MANAGEMENT SERVICES
// -----------------------------------------------------------------------------

export async function listPackagesService(): Promise<GroupPackage[]> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('group_packages')
      .select('*')
      .order('price_per_head', { ascending: true });

    if (!error && Array.isArray(data) && data.length > 0) {
      dynamicPackages = data as GroupPackage[];
      return dynamicPackages;
    }
  } catch {
    // fallback
  }
  return dynamicPackages;
}

export async function updatePackageService(
  id: string,
  updates: {
    name_en?: string;
    name_mr?: string;
    price_per_head?: number;
    min_guests?: number;
    is_active?: boolean;
    callerRole?: string;
  }
): Promise<{ success: boolean; pkg?: GroupPackage; error?: string }> {
  // Role Enforcement: Kitchen role is READ-ONLY
  if (updates.callerRole === 'kitchen') {
    return {
      success: false,
      error: 'Kitchen role is strictly read-only. Only Owner and Manager can modify packages.',
    };
  }

  const idx = dynamicPackages.findIndex((p) => p.id === id);
  if (idx !== -1) {
    dynamicPackages[idx] = {
      ...dynamicPackages[idx],
      ...(updates.name_en ? { name_en: updates.name_en } : {}),
      ...(updates.name_mr ? { name_mr: updates.name_mr } : {}),
      ...(updates.price_per_head !== undefined ? { price_per_head: Number(updates.price_per_head) } : {}),
      ...(updates.min_guests !== undefined ? { min_guests: Number(updates.min_guests) } : {}),
      ...(updates.is_active !== undefined ? { is_active: Boolean(updates.is_active) } : {}),
    };
  }

  try {
    const supabase = createAdminClient();
    const dbPayload: Record<string, any> = {};
    if (updates.name_en) dbPayload.name_en = updates.name_en;
    if (updates.name_mr) dbPayload.name_mr = updates.name_mr;
    if (updates.price_per_head !== undefined) dbPayload.price_per_head = updates.price_per_head;
    if (updates.min_guests !== undefined) dbPayload.min_guests = updates.min_guests;
    if (updates.is_active !== undefined) dbPayload.is_active = updates.is_active;

    const { data, error } = await supabase
      .from('group_packages')
      .update(dbPayload)
      .eq('id', id)
      .select()
      .maybeSingle();

    if (!error && data) {
      return { success: true, pkg: data as GroupPackage };
    }
  } catch {
    // fallback
  }

  const found = dynamicPackages.find((p) => p.id === id);
  if (found) {
    return { success: true, pkg: found };
  }
  return { success: false, error: 'Group package not found' };
}

// -----------------------------------------------------------------------------
// 3. DATE RULES MANAGEMENT SERVICES (14 DAYS)
// -----------------------------------------------------------------------------

export async function listDateRulesService(): Promise<DateRule[]> {
  initDateRulesMap();
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase.from('date_rules').select('*');
    if (!error && Array.isArray(data) && data.length > 0) {
      data.forEach((r: any) => {
        dynamicDateRulesMap.set(r.date, {
          date: r.date,
          kind: r.kind,
          note_mr: r.note || '',
          note_en: r.note || '',
        });
      });
    }
  } catch {
    // fallback
  }
  return Array.from(dynamicDateRulesMap.values());
}

export async function setDateRuleService(
  date: string,
  kind: 'blocked' | 'festival',
  note_mr?: string,
  note_en?: string,
  callerRole?: string
): Promise<{ success: boolean; rule?: DateRule; error?: string }> {
  // Role Enforcement: Kitchen role is READ-ONLY
  if (callerRole === 'kitchen') {
    return {
      success: false,
      error: 'Kitchen role is strictly read-only. Only Owner and Manager can set date rules.',
    };
  }

  const defaultNoteMr =
    kind === 'festival'
      ? 'सण/यात्रा गर्दी दिवस (मर्यादित जागा: १२ प्रति स्लॉट, टेबल कमाल १० व्यक्ती)'
      : 'हॉटेल देखभाल व स्वच्छता (आरक्षण बंद)';
  const defaultNoteEn =
    kind === 'festival'
      ? 'Festival Pilgrim Rush (Limited Seats: 12 per slot, Max 10 per table)'
      : 'Maintenance / Private Event (Bookings Closed)';

  const newRule: DateRule = {
    date,
    kind,
    note_mr: note_mr || defaultNoteMr,
    note_en: note_en || defaultNoteEn,
  };

  initDateRulesMap();
  dynamicDateRulesMap.set(date, newRule);

  try {
    const supabase = createAdminClient();
    const { data: rest } = await supabase.from('restaurants').select('id').limit(1).maybeSingle();
    const restId = rest?.id || '00000000-0000-0000-0000-000000000001';

    await supabase.from('date_rules').upsert(
      {
        restaurant_id: restId,
        date,
        kind,
        note: newRule.note_mr,
      },
      { onConflict: 'restaurant_id,date' }
    );
  } catch {
    // fallback
  }

  return { success: true, rule: newRule };
}

export async function removeDateRuleService(
  date: string,
  callerRole?: string
): Promise<{ success: boolean; error?: string }> {
  // Role Enforcement: Kitchen role is READ-ONLY
  if (callerRole === 'kitchen') {
    return {
      success: false,
      error: 'Kitchen role is strictly read-only. Only Owner and Manager can remove date rules.',
    };
  }

  initDateRulesMap();
  dynamicDateRulesMap.delete(date);

  try {
    const supabase = createAdminClient();
    await supabase.from('date_rules').delete().eq('date', date);
  } catch {
    // fallback
  }

  return { success: true };
}

/**
 * Generates slot availability for a given date and party size
 */
export function getSlotAvailability(
  dateStr: string,
  partySize: number = 2
): SlotAvailability[] {
  initDemoStore();
  const rules = getDateRules();
  const rule = rules.find((r) => r.date === dateStr);
  const isFestival = rule?.kind === 'festival';
  // On festival days, single tables are limited, but dedicated Pangat packages have capacity 24
  const totalCapacity = isFestival ? (partySize > 12 ? 24 : 12) : 30;

  // Standard 30-min slots: Lunch (11:00 - 15:30) and Dinner (19:00 - 22:30)
  const slotTimes = [
    '11:00', '11:30', '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30',
    '19:00', '19:30', '20:00', '20:30', '21:00', '21:30', '22:00', '22:30'
  ];

  const now = new Date();
  const todayStr = formatYYYYMMDD(now);
  const isToday = dateStr === todayStr;
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  return slotTimes.map((time) => {
    const [h, m] = time.split(':').map(Number);
    const slotStartMinutes = h * 60 + m;
    const isPast = isToday && slotStartMinutes < currentMinutes + 15; // Past or within 15 mins

    const slotStart = `${dateStr}T${time}:00+05:30`;

    // Calculate currently booked seats in this slot
    let currentBooked = 0;
    for (const b of Array.from(demoBookingsStore.values())) {
      if (
        b.slot_start.startsWith(`${dateStr}T${time}`) &&
        b.status !== 'rejected' &&
        b.status !== 'cancelled'
      ) {
        currentBooked += b.party_size;
      }
    }

    const availableSeats = Math.max(0, totalCapacity - currentBooked);
    // Slot is full if either no seats remain OR remaining seats < chosen party size
    const isFull = availableSeats < partySize || isPast;

    return {
      time,
      slot_start: slotStart,
      total_capacity: totalCapacity,
      current_booked: currentBooked,
      available_seats: availableSeats,
      is_full: isFull,
      is_past: isPast,
    };
  });
}

export interface CreateBookingInput {
  type: 'table' | 'group_meal' | 'order_ahead';
  party_size: number;
  slot_start: string;
  guest_name: string;
  guest_phone: string;
  notes?: string;
  package_id?: string;
  items?: Array<{
    menu_item_id: string;
    quantity: number;
    notes?: string;
  }>;
  honeypot?: string;
}

export interface CreateBookingResponse {
  success: boolean;
  error_code?: string;
  message_mr: string;
  message_en: string;
  booking_id?: string;
  token_number?: string;
  status?: string;
  total_estimated_amount?: number;
  available_seats?: number;
}

/**
 * Transactional Create Booking Handler
 * Executes Supabase RPC `public.create_booking` if configured,
 * or runs the exact stored procedure logic in-memory.
 */
export async function createBookingService(
  input: CreateBookingInput
): Promise<CreateBookingResponse> {
  initDemoStore();

  // 1. Honeypot check
  if (input.honeypot && input.honeypot.trim().length > 0) {
    return {
      success: false,
      error_code: 'BOT_DETECTED',
      message_mr: 'अवैध विनंती आढळली.',
      message_en: 'Invalid submission detected.',
    };
  }

  // 2. Validate party size
  if (!input.party_size || input.party_size <= 0) {
    return {
      success: false,
      error_code: 'INVALID_PARTY_SIZE',
      message_mr: 'व्यक्तींची संख्या वैध असावी (किमान १).',
      message_en: 'Party size must be greater than zero.',
    };
  }

  // 3. Clean and validate phone (Indian 10-digit starting with 6-9)
  const cleanPhone = (input.guest_phone || '').replace(/\D/g, '');
  if (cleanPhone.length !== 10 || !/^[6-9]\d{9}$/.test(cleanPhone)) {
    return {
      success: false,
      error_code: 'INVALID_PHONE',
      message_mr: 'कृपया ६, ७, ८ किंवा ९ ने सुरू होणारा वैध १०-अंकी भारतीय मोबाईल नंबर टाका.',
      message_en: 'Please enter a valid 10-digit Indian mobile number starting with 6-9.',
    };
  }

  // 4. Validate guest name
  const cleanName = (input.guest_name || '').trim();
  if (cleanName.length < 2) {
    return {
      success: false,
      error_code: 'INVALID_NAME',
      message_mr: 'कृपया आपले पूर्ण नाव टाका.',
      message_en: 'Please enter your full name.',
    };
  }

  // 5. Parse date and check date rules
  const bookingDate = input.slot_start.split('T')[0];
  const rules = getDateRules();
  const dateRule = rules.find((r) => r.date === bookingDate);

  if (dateRule?.kind === 'blocked') {
    return {
      success: false,
      error_code: 'DATE_BLOCKED',
      message_mr: dateRule.note_mr || 'सदर तारखेसाठी बुकिंग बंद आहे.',
      message_en: dateRule.note_en || 'This date is currently blocked for bookings.',
    };
  }

  const isFestival = dateRule?.kind === 'festival';
  // On festival days, table bookings are restricted to maxTableSize (10),
  // but group meal packages (पंगत थाळी) have dedicated capacity (24 seats per slot).
  const slotCapacity = isFestival ? (input.type === 'group_meal' ? 24 : 12) : 30;
  const maxTableSize = isFestival ? 10 : 12;

  // 6. Check table size limits
  if (input.type === 'table') {
    if (isFestival && input.party_size > maxTableSize) {
      return {
        success: false,
        error_code: 'EXCEEDS_FESTIVAL_TABLE_LIMIT',
        message_mr: 'सण/उत्सव दिवशी एका टेबलवर कमाल १० व्यक्तींची मर्यादा आहे. मोठ्या समूहासाठी कृपया पंगत थाळी निवडा.',
        message_en: 'On festival dates, single table bookings are restricted to a maximum of 10 guests. Please choose Pilgrim Group Meal.',
      };
    } else if (input.party_size > maxTableSize) {
      return {
        success: false,
        error_code: 'EXCEEDS_TABLE_LIMIT',
        message_mr: 'एका टेबलसाठी कमाल १२ व्यक्तींची मर्यादा आहे. १२ पेक्षा जास्त व्यक्तींसाठी कृपया पंगत थाळी निवडा.',
        message_en: 'Single table bookings are limited to 12 guests. For 13+ guests, please choose Pilgrim Group Meal.',
      };
    }
  }

  // 7. Check group meal package validation
  let totalAmount = 0;
  let selectedPkg: GroupPackage | undefined;

  if (input.type === 'group_meal') {
    if (!input.package_id) {
      return {
        success: false,
        error_code: 'PACKAGE_NOT_FOUND',
        message_mr: 'कृपया पंगत थाळी पॅकेज निवडा.',
        message_en: 'Please select a group meal package.',
      };
    }

    selectedPkg = dynamicPackages.find((p) => p.id === input.package_id);
    if (!selectedPkg) {
      return {
        success: false,
        error_code: 'PACKAGE_NOT_FOUND',
        message_mr: 'निवडलेले थाळी पॅकेज उपलब्ध नाही.',
        message_en: 'Selected group package was not found.',
      };
    }

    if (input.party_size < selectedPkg.min_guests) {
      return {
        success: false,
        error_code: 'BELOW_MIN_GUESTS',
        message_mr: `या थाळी पॅकेजसाठी किमान ${selectedPkg.min_guests} व्यक्ती असणे आवश्यक आहे.`,
        message_en: `This package requires a minimum of ${selectedPkg.min_guests} guests.`,
      };
    }

    totalAmount = selectedPkg.price_per_head * input.party_size;
  }

  // 8. Order ahead items validation & pricing
  if (input.type === 'order_ahead') {
    if (!input.items || input.items.length === 0) {
      return {
        success: false,
        error_code: 'NO_ITEMS_SELECTED',
        message_mr: 'कृपया मेनूमधून किमान एक पदार्थ निवडा.',
        message_en: 'Please select at least one menu item for order ahead.',
      };
    }

    for (const item of input.items) {
      const menuItem = dynamicMenuItems.find((m) => m.id === item.menu_item_id);
      if (menuItem) {
        if (menuItem.is_sold_out) {
          return {
            success: false,
            error_code: 'ITEM_SOLD_OUT',
            message_mr: `"${menuItem.name_mr}" आज संपले आहे. कृपया इतर पदार्थ निवडा.`,
            message_en: `"${menuItem.name_en}" is sold out today. Please select another item.`,
          };
        }
        totalAmount += menuItem.price * (item.quantity || 1);
      }
    }
  }

  // 9. Check duplicate booking for same phone + slot
  for (const b of Array.from(demoBookingsStore.values())) {
    if (
      b.guest_phone === cleanPhone &&
      b.slot_start === input.slot_start &&
      b.status !== 'rejected' &&
      b.status !== 'cancelled'
    ) {
      return {
        success: false,
        error_code: 'DUPLICATE_BOOKING',
        message_mr: 'या मोबाईल क्रमांकावर या वेळेसाठी आधीच एक आरक्षण नोंदवले गेले आहे.',
        message_en: 'A booking for this phone number at this time slot already exists.',
      };
    }
  }

  // 10. Check remaining slot capacity
  let currentBooked = 0;
  for (const b of Array.from(demoBookingsStore.values())) {
    if (
      b.slot_start === input.slot_start &&
      b.status !== 'rejected' &&
      b.status !== 'cancelled'
    ) {
      currentBooked += b.party_size;
    }
  }

  if (currentBooked + input.party_size > slotCapacity) {
    const available = Math.max(0, slotCapacity - currentBooked);
    return {
      success: false,
      error_code: 'SLOT_CAPACITY_EXCEEDED',
      available_seats: available,
      message_mr: `क्षमस्व! या वेळेसाठी फक्त ${available} जागा उपलब्ध आहेत. कृपया दुसरा स्लॉट निवडा.`,
      message_en: `Slot full. Only ${available} seats remaining for this time. Please select an adjacent slot.`,
    };
  }

  // 11. Attempt Supabase RPC execution if active Supabase connection exists
  const hasLiveSupabase =
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-project-id') &&
    !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('demo') &&
    process.env.SUPABASE_SERVICE_ROLE_KEY &&
    !process.env.SUPABASE_SERVICE_ROLE_KEY.includes('demo');

  if (hasLiveSupabase) {
    try {
      const supabase = createAdminClient();
      // Look up primary restaurant id
      const restRes = await supabase.from('restaurants').select('id').limit(1).single();
      const restaurantId = restRes.data?.id;

      if (restaurantId) {
        const { data, error } = await supabase.rpc('create_booking', {
          p_restaurant_id: restaurantId,
          p_type: input.type,
          p_party_size: input.party_size,
          p_slot_start: input.slot_start,
          p_guest_name: cleanName,
          p_guest_phone: cleanPhone,
          p_notes: input.notes || null,
          p_package_id: input.package_id || null,
          p_items: input.items || [],
          p_is_demo: false,
        });

        if (!error && data) {
          return data as CreateBookingResponse;
        }
      }
    } catch {
      // Fallback gracefully to demo in-memory engine below
    }
  }

  // 12. Create Booking in Demo Engine
  const bookingId = 'bk-' + Math.random().toString(36).substring(2, 9);
  const now = new Date();
  const tokenPrefix = `SV-${String(now.getDate()).padStart(2, '0')}${String(now.getMonth() + 1).padStart(2, '0')}`;
  const seqNumber = String(demoBookingsStore.size + 1).padStart(3, '0');
  const tokenNumber = `${tokenPrefix}-${seqNumber}`;

  const newBooking: BookingRecord = {
    id: bookingId,
    restaurant_id: 'shree-theur-main',
    token_number: tokenNumber,
    type: input.type,
    party_size: input.party_size,
    slot_start: input.slot_start,
    status: 'pending', // Starts as pending staff confirmation
    guest_name: cleanName,
    guest_phone: cleanPhone,
    notes: input.notes,
    package_id: input.package_id,
    items: input.items?.map((it) => ({
      menu_item_id: it.menu_item_id,
      quantity: it.quantity,
      unit_price: dynamicMenuItems.find((m) => m.id === it.menu_item_id)?.price || 0,
      notes: it.notes,
    })),
    total_estimated_amount: totalAmount,
    created_at: new Date().toISOString(),
    is_demo: true,
  };

  demoBookingsStore.set(bookingId, newBooking);

  return {
    success: true,
    booking_id: bookingId,
    token_number: tokenNumber,
    status: 'pending',
    total_estimated_amount: totalAmount,
    message_mr: `आरक्षण यशस्वीरित्या नोंदवले गेले! टोकन #${tokenNumber}`,
    message_en: `Booking registered successfully! Token #${tokenNumber}`,
  };
}

/**
 * Gets booking status by ID
 */
export async function getBookingStatusService(bookingId: string): Promise<{
  found: boolean;
  booking?: BookingRecord;
}> {
  initDemoStore();

  // Check demo store first
  const demoRecord = demoBookingsStore.get(bookingId);
  if (demoRecord) {
    return { found: true, booking: demoRecord };
  }

  // Try live database
  try {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from('bookings')
      .select('*, booking_items(*)')
      .eq('id', bookingId)
      .single();

    if (data) {
      return { found: true, booking: data as BookingRecord };
    }
  } catch {
    // DB not available
  }

  return { found: false };
}

/**
 * List all bookings with optional filtering (used by /admin inbox)
 */
export async function listAllBookingsService(options?: {
  status?: string;
  filter?: 'pending' | 'today' | 'tomorrow' | 'all';
}): Promise<{ bookings: BookingRecord[] }> {
  initDemoStore();

  const now = new Date();
  const todayStr = formatYYYYMMDD(now);
  const tomorrowDate = new Date(now);
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  const tomorrowStr = formatYYYYMMDD(tomorrowDate);

  // Try live database first if active
  const hasLiveSupabase =
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-project-id') &&
    !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('demo') &&
    process.env.SUPABASE_SERVICE_ROLE_KEY &&
    !process.env.SUPABASE_SERVICE_ROLE_KEY.includes('demo');

  if (hasLiveSupabase) {
    try {
      const supabase = createAdminClient();
      let query = supabase.from('bookings').select('*, booking_items(*)').order('created_at', { ascending: false });

      if (options?.filter === 'pending') {
        query = query.eq('status', 'pending');
      }

      const { data, error } = await query;
      if (!error && data && data.length > 0) {
        let results = data as BookingRecord[];
        if (options?.filter === 'today') {
          results = results.filter((b) => b.slot_start?.startsWith(todayStr));
        } else if (options?.filter === 'tomorrow') {
          results = results.filter((b) => b.slot_start?.startsWith(tomorrowStr));
        }
        return { bookings: results };
      }
    } catch {
      // Fallback to in-memory store
    }
  }

  // From Demo Memory Store
  let list = Array.from(demoBookingsStore.values());

  // Sort newest first
  list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  if (options?.filter === 'pending') {
    list = list.filter((b) => b.status === 'pending');
  } else if (options?.filter === 'today') {
    list = list.filter((b) => b.slot_start?.startsWith(todayStr));
  } else if (options?.filter === 'tomorrow') {
    list = list.filter((b) => b.slot_start?.startsWith(tomorrowStr));
  }

  return { bookings: list };
}

/**
 * Update booking status (with Role Enforcement for Kitchen)
 */
export async function updateBookingStatusService(
  bookingId: string,
  newStatus: 'confirmed' | 'rejected' | 'seated' | 'no_show' | 'cancelled',
  options?: {
    rejectionReason?: string;
    prepTimeMins?: number;
    callerRole?: string;
  }
): Promise<{ success: boolean; booking?: BookingRecord; error?: string }> {
  initDemoStore();

  // Role Enforcement: Kitchen role is READ-ONLY in UI and backend!
  if (options?.callerRole === 'kitchen') {
    return {
      success: false,
      error: 'Kitchen role is strictly read-only. Only Owner and Manager can modify bookings.',
    };
  }

  const record = demoBookingsStore.get(bookingId);
  if (record) {
    record.status = newStatus;
    if (options?.rejectionReason) {
      record.rejection_reason = options.rejectionReason;
    }
    if (options?.prepTimeMins) {
      record.estimated_prep_time_mins = options.prepTimeMins;
    }
    demoBookingsStore.set(bookingId, record);
    return { success: true, booking: record };
  }

  try {
    const supabase = createAdminClient();
    const updatePayload: Record<string, any> = {
      status: newStatus,
      updated_at: new Date().toISOString(),
    };
    if (options?.rejectionReason) {
      updatePayload.rejection_reason = options.rejectionReason;
    }
    if (options?.prepTimeMins) {
      updatePayload.estimated_prep_time_mins = options.prepTimeMins;
    }

    const { data, error } = await supabase
      .from('bookings')
      .update(updatePayload)
      .eq('id', bookingId)
      .select()
      .single();

    if (!error && data) {
      return { success: true, booking: data as BookingRecord };
    }
  } catch {
    // fallback
  }

  return { success: false, error: 'Booking not found or database update failed' };
}

/**
 * Simulates an incoming booking in demo mode (triggers Realtime, Chime, Banner)
 */
export async function simulateNewDemoBookingService(): Promise<BookingRecord> {
  initDemoStore();

  const now = new Date();
  const todayStr = formatYYYYMMDD(now);
  const sampleGuests = [
    { name: 'दत्तात्रय कुंजीर (Dattatraya Kunjir)', phone: '9822114455', size: 6, type: 'table' as const, note: 'Near highway entrance window' },
    { name: 'संदीप गायकवाड (Sandeep Gaikwad)', phone: '9422003322', size: 16, type: 'group_meal' as const, note: 'चिंतामणी भाविक बस संघ (Pilgrim Tour Bus) - सात्विक जेवण' },
    { name: 'प्रसाद देशपांडे (Prasad Deshpande)', phone: '9921556677', size: 3, type: 'order_ahead' as const, note: 'पुणे-सोलापूर हायवे प्रवास (Passing through to Solapur)' },
    { name: 'अशोकराव सावंत (Ashokrao Sawant)', phone: '9850223344', size: 8, type: 'table' as const, note: 'Family lunch with elders' },
  ];

  const pick = sampleGuests[Math.floor(Math.random() * sampleGuests.length)];
  const seq = String(demoBookingsStore.size + 1).padStart(3, '0');
  const tokenNumber = `SV-${String(now.getDate()).padStart(2, '0')}${String(now.getMonth() + 1).padStart(2, '0')}-${seq}`;
  const bookingId = 'bk-live-' + Math.random().toString(36).substring(2, 9);

  const slotHour = 12 + Math.floor(Math.random() * 8);
  const slotMin = Math.random() > 0.5 ? '30' : '00';
  const slotStart = `${todayStr}T${String(slotHour).padStart(2, '0')}:${slotMin}:00+05:30`;

  const newBooking: BookingRecord = {
    id: bookingId,
    restaurant_id: 'shree-theur-main',
    token_number: tokenNumber,
    type: pick.type,
    party_size: pick.size,
    slot_start: slotStart,
    status: 'pending',
    guest_name: pick.name,
    guest_phone: pick.phone,
    notes: pick.note,
    package_id: pick.type === 'group_meal' ? 'pkg-1-pilgrim' : undefined,
    total_estimated_amount: pick.type === 'group_meal' ? pick.size * 210 : 0,
    created_at: new Date().toISOString(),
    is_demo: true,
  };

  demoBookingsStore.set(bookingId, newBooking);

  return newBooking;
}

/**
 * Master Demo Reset Procedure
 * Calls Supabase RPC `public.reset_demo()` if connected,
 * and resets all in-memory mock tables/stores (bookings, menu items, packages, date rules, message logs).
 */
export async function resetDemoDataService(): Promise<{ success: boolean; message: string }> {
  const hasLiveSupabase =
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-project-id') &&
    !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('demo') &&
    process.env.SUPABASE_SERVICE_ROLE_KEY &&
    !process.env.SUPABASE_SERVICE_ROLE_KEY.includes('demo');

  if (hasLiveSupabase) {
    try {
      const supabase = createAdminClient();
      await supabase.rpc('reset_demo');
    } catch (err) {
      console.warn('[DemoReset] Supabase RPC reset_demo note:', err);
    }
  }

  // 1. Reset In-Memory Bookings Store
  initDemoStore(true);

  // 2. Reset In-Memory Menu Items & Packages
  dynamicMenuItems = [...DEFAULT_MENU_ITEMS];
  dynamicPackages = [...DEFAULT_PACKAGES];

  // 3. Reset In-Memory Date Rules
  initDateRulesMap(true);

  // 4. Reset Message Logs
  clearInMemoryMessageLogs();

  return {
    success: true,
    message: 'Demo store and database reset to pristine seed state.',
  };
}

/**
 * Finds an open slot for tomorrow that has free capacity for the given party size
 */
export function findTomorrowOpenSlotForGroup(partySize: number = 14): { slotStartIso: string; time: string } {
  initDemoStore();
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = formatYYYYMMDD(tomorrow);

  const candidateSlots = ['12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '19:00', '19:30', '20:00'];
  const availabilities = getSlotAvailability(tomorrowStr, partySize);

  // Find first lunch slot that has free capacity
  const chosen =
    candidateSlots.find((time) => {
      const slot = availabilities.find((s) => s.time === time);
      return slot && !slot.is_full && slot.available_seats >= partySize;
    }) || '13:00';

  return {
    slotStartIso: `${tomorrowStr}T${chosen}:00+05:30`,
    time: chosen,
  };
}

/**
 * Master Reports Service:
 * Retrieves analytics from Supabase RPC get_admin_reports (computed in DB),
 * or computes directly from in-memory engine when running demo or offline.
 */
export async function getAdminReportsService(options?: {
  restaurantId?: string;
}): Promise<AdminReportsData> {
  initDemoStore();

  const hasLiveSupabase =
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-project-id') &&
    !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('demo') &&
    process.env.SUPABASE_SERVICE_ROLE_KEY &&
    !process.env.SUPABASE_SERVICE_ROLE_KEY.includes('demo');

  if (hasLiveSupabase) {
    try {
      const supabase = createAdminClient();
      const { data, error } = await supabase.rpc('get_admin_reports', {
        p_restaurant_id: options?.restaurantId || null,
      });

      if (!error && data && data.success) {
        return data as AdminReportsData;
      }
    } catch {
      // Fallback to in-memory calculation below
    }
  }

  // In-Memory Computation (Offline / Demo Engine)
  const now = new Date();
  const bookingsList = Array.from(demoBookingsStore.values());

  // (a) KPIs
  const totalRequests = bookingsList.length;
  let confirmed = 0;
  let pending = 0;
  let noShows = 0;
  let seated = 0;
  let cancelled = 0;
  let rejected = 0;
  let totalGuests = 0;
  let confirmedGuests = 0;
  let pendingGuests = 0;

  for (const b of bookingsList) {
    totalGuests += b.party_size;
    if (b.status === 'confirmed') {
      confirmed++;
      confirmedGuests += b.party_size;
    } else if (b.status === 'pending') {
      pending++;
      pendingGuests += b.party_size;
    } else if (b.status === 'no_show') {
      noShows++;
    } else if (b.status === 'seated') {
      seated++;
      confirmedGuests += b.party_size;
    } else if (b.status === 'cancelled') {
      cancelled++;
    } else if (b.status === 'rejected') {
      rejected++;
    }
  }

  const kpis: ReportKPIs = {
    total_requests: totalRequests,
    confirmed,
    pending,
    no_shows: noShows,
    seated,
    cancelled,
    rejected,
    total_guests: totalGuests,
    confirmed_guests: confirmedGuests,
    pending_guests: pendingGuests,
  };

  // (b) Next 7 Days (Bar Chart Data)
  const dayNamesEn = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const dayNamesMr = ['रवि', 'सोम', 'मंगळ', 'बुध', 'गुरु', 'शुक्र', 'शनि'];
  const monthNamesMr: Record<number, string> = {
    0: 'जाने', 1: 'फेब्रु', 2: 'मार्च', 3: 'एप्रिल', 4: 'मे', 5: 'जून',
    6: 'जुलै', 7: 'ऑग', 8: 'सप्टें', 9: 'ऑक्टो', 10: 'नोव्हें', 11: 'डिसें',
  };
  const monthNamesEn = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  const next7Days: DayGuestReport[] = [];
  const rules = getDateRules();

  for (let offset = 0; offset < 7; offset++) {
    const d = new Date(now);
    d.setDate(d.getDate() + offset);
    const dateStr = formatYYYYMMDD(d);

    const dayBookings = bookingsList.filter(
      (b) => b.slot_start?.startsWith(dateStr) && b.status !== 'rejected' && b.status !== 'cancelled'
    );

    const totalDayGuests = dayBookings.reduce((sum, b) => sum + b.party_size, 0);
    const confirmedDayGuests = dayBookings
      .filter((b) => b.status === 'confirmed' || b.status === 'seated')
      .reduce((sum, b) => sum + b.party_size, 0);
    const pendingDayGuests = dayBookings
      .filter((b) => b.status === 'pending')
      .reduce((sum, b) => sum + b.party_size, 0);

    const rule = rules.find((r) => r.date === dateStr);

    next7Days.push({
      date: dateStr,
      day_offset: offset,
      day_name_en: dayNamesEn[d.getDay()],
      day_name_mr: dayNamesMr[d.getDay()],
      formatted_date_en: `${d.getDate()} ${monthNamesEn[d.getMonth()]}`,
      formatted_date_mr: `${d.getDate()} ${monthNamesMr[d.getMonth()]}`,
      total_guests: totalDayGuests,
      confirmed_guests: confirmedDayGuests,
      pending_guests: pendingDayGuests,
      booking_count: dayBookings.length,
      is_festival: rule?.kind === 'festival',
      is_blocked: rule?.kind === 'blocked',
      note: rule?.note_mr || rule?.note_en || null,
    });
  }

  // (c) Bookings by Type
  const typeMap: Record<'table' | 'group_meal' | 'order_ahead', { count: number; guests: number }> = {
    table: { count: 0, guests: 0 },
    group_meal: { count: 0, guests: 0 },
    order_ahead: { count: 0, guests: 0 },
  };

  for (const b of bookingsList) {
    if (typeMap[b.type]) {
      typeMap[b.type].count++;
      typeMap[b.type].guests += b.party_size;
    }
  }

  const bookingsByType: BookingTypeReport[] = [
    {
      type: 'table',
      name_mr: 'नेहमीचे जेवण टेबल',
      name_en: 'Standard Dining Table',
      icon: '🍽️',
      count: typeMap.table.count,
      guests: typeMap.table.guests,
      percentage: totalRequests > 0 ? Math.round((typeMap.table.count / totalRequests) * 1000) / 10 : 0,
    },
    {
      type: 'group_meal',
      name_mr: 'भाविक व कुटुंब पंगत थाळी',
      name_en: 'Pilgrim / Group Feast',
      icon: '🚩',
      count: typeMap.group_meal.count,
      guests: typeMap.group_meal.guests,
      percentage: totalRequests > 0 ? Math.round((typeMap.group_meal.count / totalRequests) * 1000) / 10 : 0,
    },
    {
      type: 'order_ahead',
      name_mr: 'हायवे एक्सप्रेस आगाऊ ऑर्डर',
      name_en: 'Order Ahead Quick Halt',
      icon: '⚡',
      count: typeMap.order_ahead.count,
      guests: typeMap.order_ahead.guests,
      percentage: totalRequests > 0 ? Math.round((typeMap.order_ahead.count / totalRequests) * 1000) / 10 : 0,
    },
  ];

  // (d) Top Pre-Ordered Dishes
  const dishAgg: Map<string, { qty: number; orderCount: number; revenue: number }> = new Map();

  for (const b of bookingsList) {
    if (b.status === 'rejected' || b.status === 'cancelled') continue;
    if (b.items && b.items.length > 0) {
      for (const item of b.items) {
        const cur = dishAgg.get(item.menu_item_id) || { qty: 0, orderCount: 0, revenue: 0 };
        cur.qty += item.quantity;
        cur.orderCount += 1;
        cur.revenue += item.quantity * item.unit_price;
        dishAgg.set(item.menu_item_id, cur);
      }
    }
  }

  const topDishes: TopDishReport[] = Array.from(dishAgg.entries())
    .map(([itemId, stat]) => {
      const menuItem = dynamicMenuItems.find((m) => m.id === itemId);
      return {
        id: itemId,
        name_mr: menuItem?.name_mr || 'विशेष पदार्थ',
        name_en: menuItem?.name_en || 'Special Item',
        category: menuItem?.category || 'main_course',
        price: menuItem?.price || 0,
        total_quantity: stat.qty,
        order_count: stat.orderCount,
        total_revenue: stat.revenue,
      };
    })
    .sort((a, b) => b.total_quantity - a.total_quantity)
    .slice(0, 10);

  return {
    success: true,
    restaurant_id: options?.restaurantId || 'shree-theur-main',
    kpis,
    next_7_days: next7Days,
    bookings_by_type: bookingsByType,
    top_dishes: topDishes,
    computed_at: new Date().toISOString(),
  };
}

