'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import {
  Utensils,
  Users,
  ShoppingBag,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Phone,
  MapPin,
  Sparkles,
  Share2,
  RotateCcw,
  Plus,
  Minus,
  Check,
  Zap,
} from 'lucide-react';
import { translations, Language } from '@/lib/translations';
import { MarigoldToran } from '@/components/marigold-toran';
import {
  MenuItem,
  GroupPackage,
  DateRule,
  SlotAvailability,
  DEFAULT_MENU_ITEMS,
  DEFAULT_PACKAGES,
} from '@/lib/booking/booking-service';

// Cookie helpers
const LOCALE_COOKIE_KEY = 'shree_booking_locale';

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
  return match ? decodeURIComponent(match[1]) : null;
}

function setCookie(name: string, value: string, days = 365) {
  if (typeof document === 'undefined') return;
  const d = new Date();
  d.setTime(d.getTime() + days * 24 * 60 * 60 * 1000);
  document.cookie = `${name}=${encodeURIComponent(value)};path=/;expires=${d.toUTCString()};SameSite=Lax`;
}

// Format date helper: YYYY-MM-DD
function toYYYYMMDD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// Generate next 14 days starting today
function getNext14Days(): Array<{
  dateStr: string;
  dateObj: Date;
  dayNameEn: string;
  dayNameHi: string;
  dayNameMr: string;
  labelEn: string;
  labelHi: string;
  labelMr: string;
}> {
  const days = [];
  const daysMr = ['रवि', 'सोम', 'मंगळ', 'बुध', 'गुरू', 'शुक्र', 'शनी'];
  const daysHi = ['रवि', 'सोम', 'मंगल', 'बुध', 'गुरु', 'शुक्र', 'शनि'];
  const daysEn = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const monthsMr = ['जाने', 'फेब्रु', 'मार्च', 'एप्रिल', 'मे', 'जून', 'जुलै', 'ऑगस्ट', 'सप्टें', 'ऑक्टो', 'नोव्हें', 'डिसें'];
  const monthsHi = ['जन', 'फर', 'मार्च', 'अप्रैल', 'मई', 'जून', 'जुलाई', 'अगस्त', 'सितं', 'अक्टू', 'नवंबर', 'दिसं'];
  const monthsEn = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  for (let i = 0; i < 14; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    const dateStr = toYYYYMMDD(d);
    const dayOfWeek = d.getDay();
    const dayOfMonth = d.getDate();
    const monthIndex = d.getMonth();

    let labelEn = `${daysEn[dayOfWeek]}, ${dayOfMonth} ${monthsEn[monthIndex]}`;
    let labelHi = `${daysHi[dayOfWeek]}, ${dayOfMonth} ${monthsHi[monthIndex]}`;
    let labelMr = `${daysMr[dayOfWeek]}, ${dayOfMonth} ${monthsMr[monthIndex]}`;

    if (i === 0) {
      labelEn = `Today (${dayOfMonth} ${monthsEn[monthIndex]})`;
      labelHi = `आज (${dayOfMonth} ${monthsHi[monthIndex]})`;
      labelMr = `आज (${dayOfMonth} ${monthsMr[monthIndex]})`;
    } else if (i === 1) {
      labelEn = `Tomorrow (${dayOfMonth} ${monthsEn[monthIndex]})`;
      labelHi = `कल (${dayOfMonth} ${monthsHi[monthIndex]})`;
      labelMr = `उद्या (${dayOfMonth} ${monthsMr[monthIndex]})`;
    }

    days.push({
      dateStr,
      dateObj: d,
      dayNameEn: daysEn[dayOfWeek],
      dayNameHi: daysHi[dayOfWeek],
      dayNameMr: daysMr[dayOfWeek],
      labelEn,
      labelHi,
      labelMr,
    });
  }
  return days;
}

export default function BookingPage() {
  // Locale state (Default to English)
  const [lang, setLang] = useState<Language>('en');
  const t = useMemo(() => translations[lang], [lang]);
  const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

  // Read cookie on mount
  useEffect(() => {
    const saved = getCookie(LOCALE_COOKIE_KEY);
    if (saved === 'en' || saved === 'hi' || saved === 'mr') {
      setLang(saved as Language);
    }
  }, []);

  const handleLangToggle = (newLang: Language) => {
    setLang(newLang);
    setCookie(LOCALE_COOKIE_KEY, newLang);
  };

  // Flow State
  const [flow, setFlow] = useState<'table' | 'group_meal' | 'order_ahead'>('table');
  const [partySize, setPartySize] = useState<number>(4);
  const [selectedPackageId, setSelectedPackageId] = useState<string>('pkg-1-pilgrim');
  const [orderItems, setOrderItems] = useState<Record<string, number>>({});

  // Date and Slot State (14 Days)
  const next14Days = useMemo(() => getNext14Days(), []);
  const [selectedDate, setSelectedDate] = useState<string>(next14Days[0]?.dateStr || '');
  const [selectedSlotTime, setSelectedSlotTime] = useState<string>('13:00');

  // Form Fields
  const [guestName, setGuestName] = useState<string>('');
  const [guestPhone, setGuestPhone] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [honeypot, setHoneypot] = useState<string>('');

  // Submission & Confirmation State
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<{ mr: string; en: string; hi?: string } | null>(null);
  const [quickFillActive, setQuickFillActive] = useState<boolean>(false);

  // Confirmed booking state
  const [confirmedBooking, setConfirmedBooking] = useState<{
    id: string;
    token_number: string;
    status: 'pending' | 'confirmed' | 'rejected' | 'seated';
    guest_name: string;
    guest_phone: string;
    party_size: number;
    slot_start: string;
    type: string;
    total_estimated_amount: number;
    rejection_reason?: string;
  } | null>(null);

  // Live status update simulator state
  const [simulatorLoading, setSimulatorLoading] = useState<boolean>(false);

  // Dynamic date rules, slot availability, menu items, and packages
  const [dateRules, setDateRules] = useState<DateRule[]>([]);
  const [slots, setSlots] = useState<SlotAvailability[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>(DEFAULT_MENU_ITEMS);
  const [packages, setPackages] = useState<GroupPackage[]>(DEFAULT_PACKAGES);

  // Fetch slot availability, date rules, menu items, and packages
  const fetchAvailability = useCallback(async (date: string, size: number) => {
    try {
      const res = await fetch(`/api/bookings?date=${date}&party_size=${size}`);
      const data = await res.json();
      if (data.success) {
        setDateRules(data.dateRules || []);
        setSlots(data.slots || []);
        if (Array.isArray(data.menuItems)) setMenuItems(data.menuItems);
        if (Array.isArray(data.packages || data.groupPackages)) {
          setPackages(data.packages || data.groupPackages);
        }
      }
    } catch {
      // Fallback in case of network issue
    }
  }, []);

  // Realtime synchronization for Menu, Date Rules, and Packages
  useEffect(() => {
    let supabaseChannel: any = null;
    let pollInterval: any = null;

    // 1. Supabase Realtime channel
    import('@/lib/supabase/client')
      .then(({ createClient }) => {
        try {
          const supabase = createClient();
          supabaseChannel = supabase
            .channel('customer-live-catalog')
            .on(
              'postgres_changes',
              { event: '*', schema: 'public', table: 'menu_items' },
              (payload) => {
                if (payload.eventType === 'UPDATE' && payload.new) {
                  const updated = payload.new as MenuItem;
                  setMenuItems((prev) =>
                    prev.map((item) => (item.id === updated.id ? { ...item, ...updated } : item))
                  );
                } else {
                  fetchAvailability(selectedDate, partySize);
                }
              }
            )
            .on(
              'postgres_changes',
              { event: '*', schema: 'public', table: 'date_rules' },
              () => {
                fetchAvailability(selectedDate, partySize);
              }
            )
            .on(
              'postgres_changes',
              { event: '*', schema: 'public', table: 'group_packages' },
              (payload) => {
                if (payload.eventType === 'UPDATE' && payload.new) {
                  const updatedPkg = payload.new as GroupPackage;
                  setPackages((prev) =>
                    prev.map((p) => (p.id === updatedPkg.id ? { ...p, ...updatedPkg } : p))
                  );
                } else {
                  fetchAvailability(selectedDate, partySize);
                }
              }
            )
            .subscribe();
        } catch {}
      })
      .catch(() => {});

    // 2. BroadcastChannel for instant sub-second local updates across tabs
    const bc = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('shree-veg-realtime') : null;
    if (bc) {
      bc.onmessage = (event) => {
        if (event.data?.type === 'MENU_UPDATED' && event.data?.item) {
          const updated = event.data.item as MenuItem;
          setMenuItems((prev) =>
            prev.map((item) => (item.id === updated.id ? { ...item, ...updated } : item))
          );
        } else if (event.data?.type === 'DATE_RULE_UPDATED' || event.data?.type === 'PACKAGE_UPDATED') {
          fetchAvailability(selectedDate, partySize);
        }
      };
    }

    // 3. Fast resilient polling (every 4s) to guarantee updates under all circumstances
    pollInterval = setInterval(() => {
      fetchAvailability(selectedDate, partySize);
    }, 4000);

    return () => {
      if (supabaseChannel) {
        import('@/lib/supabase/client').then(({ createClient }) => {
          try {
            createClient().removeChannel(supabaseChannel);
          } catch {}
        });
      }
      bc?.close();
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [selectedDate, partySize, fetchAvailability]);

  useEffect(() => {
    if (selectedDate) {
      fetchAvailability(selectedDate, partySize);
    }
  }, [selectedDate, partySize, fetchAvailability]);

  // Adjust party size when switching packages
  useEffect(() => {
    if (flow === 'group_meal') {
      const pkg = packages.find((p) => p.id === selectedPackageId);
      if (pkg && partySize < pkg.min_guests) {
        setPartySize(pkg.min_guests);
      }
    }
  }, [flow, selectedPackageId, packages, partySize]);

  // Identify rule for the currently selected date
  const currentDayRule = useMemo(() => {
    return dateRules.find((r) => r.date === selectedDate);
  }, [dateRules, selectedDate]);

  const isCurrentDateBlocked = currentDayRule?.kind === 'blocked';
  const isCurrentDateFestival = currentDayRule?.kind === 'festival';

  // Calculate order ahead total bill
  const orderAheadTotal = useMemo(() => {
    let sum = 0;
    for (const [itemId, qty] of Object.entries(orderItems)) {
      if (qty > 0) {
        const item = menuItems.find((m) => m.id === itemId);
        if (item) sum += item.price * qty;
      }
    }
    return sum;
  }, [orderItems, menuItems]);

  const orderAheadItemCount = useMemo(() => {
    let count = 0;
    for (const qty of Object.values(orderItems)) {
      count += qty;
    }
    return count;
  }, [orderItems]);

  // Calculate package total bill
  const packageTotal = useMemo(() => {
    const pkg = packages.find((p) => p.id === selectedPackageId);
    return pkg ? pkg.price_per_head * partySize : 0;
  }, [packages, selectedPackageId, partySize]);

  // Handle Quick Fill Test Data
  const handleQuickFill = () => {
    setGuestName(lang === 'mr' ? 'सचिन तांबडे' : lang === 'hi' ? 'सचिन तांबडे' : 'Sachin Tambade');
    setGuestPhone('9822012345');
    setNotes(
      lang === 'mr'
        ? 'चिंतामणी गणपती दर्शन भाविक. विना कांदा-लसूण जेवण हवे.'
        : lang === 'hi'
        ? 'चिंतामणि गणपति दर्शन हेतु तीर्थयात्री। बिना प्याज-लहसुन सात्विक भोजन चाहिए।'
        : 'Visiting Chintamani Ganpati Temple. Prefer satvik no-onion/garlic meal.'
    );
    setFormError(null);
    setQuickFillActive(true);
    setTimeout(() => setQuickFillActive(false), 2000);
  };

  // Submit Handler with double-submit guard and comprehensive validations
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setFormError(null);

    // 1. Validate name
    if (!guestName.trim()) {
      setFormError({ mr: t.errNameRequired, en: t.errNameRequired });
      return;
    }

    // 2. Validate phone (10-digit Indian, starts 6-9)
    const cleanPhone = guestPhone.replace(/\D/g, '');
    if (cleanPhone.length !== 10 || !/^[6-9]\d{9}$/.test(cleanPhone)) {
      setFormError({ mr: t.errPhoneInvalid, en: t.errPhoneInvalid });
      return;
    }

    // 3. Check blocked date
    if (isCurrentDateBlocked) {
      setFormError({ mr: t.errDateBlocked, en: t.errDateBlocked });
      return;
    }

    // 4. Check festival party limit
    if (flow === 'table' && isCurrentDateFestival && partySize > 10) {
      setFormError({ mr: t.errExceedsFestivalLimit, en: t.errExceedsFestivalLimit });
      return;
    }

    // 5. Check regular table limit
    if (flow === 'table' && partySize > 12) {
      setFormError({ mr: t.errExceedsTableLimit, en: t.errExceedsTableLimit });
      return;
    }

    // 6. Check package minimum guests
    if (flow === 'group_meal') {
      const pkg = packages.find((p) => p.id === selectedPackageId);
      if (pkg && partySize < pkg.min_guests) {
        setFormError({
          mr: t.errPackageMinGuests.replace('{min}', String(pkg.min_guests)),
          en: t.errPackageMinGuests.replace('{min}', String(pkg.min_guests)),
        });
        return;
      }
    }

    // 7. Check order ahead selection
    if (flow === 'order_ahead' && orderAheadItemCount === 0) {
      setFormError({ mr: t.errNoItems, en: t.errNoItems });
      return;
    }

    // 8. Check selected slot availability
    const chosenSlot = slots.find((s) => s.time === selectedSlotTime);
    if (!chosenSlot || chosenSlot.is_full) {
      setFormError({ mr: t.errSlotFull, en: t.errSlotFull });
      return;
    }

    // Prepare items payload for order ahead
    const itemsPayload =
      flow === 'order_ahead'
        ? Object.entries(orderItems)
            .filter(([, qty]) => qty > 0)
            .map(([itemId, qty]) => ({
              menu_item_id: itemId,
              quantity: qty,
            }))
        : [];

    const slotStartIso = `${selectedDate}T${selectedSlotTime}:00+05:30`;

    setIsSubmitting(true);

    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: flow,
          party_size: partySize,
          slot_start: slotStartIso,
          guest_name: guestName.trim(),
          guest_phone: cleanPhone,
          notes: notes.trim() || undefined,
          package_id: flow === 'group_meal' ? selectedPackageId : undefined,
          items: itemsPayload,
          honeypot: honeypot, // Honeypot spam trap
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setFormError({
          mr: data.message_mr || t.errGeneric,
          en: data.message_en || t.errGeneric,
          hi: data.message_hi || data.message_mr || t.errGeneric,
        });
        setIsSubmitting(false);
        return;
      }

      // Success! Switch to confirmation screen
      setConfirmedBooking({
        id: data.booking_id,
        token_number: data.token_number,
        status: (data.status as 'pending' | 'confirmed' | 'rejected' | 'seated') || 'pending',
        guest_name: guestName.trim(),
        guest_phone: cleanPhone,
        party_size: partySize,
        slot_start: slotStartIso,
        type: flow,
        total_estimated_amount:
          data.total_estimated_amount ||
          (flow === 'group_meal' ? packageTotal : flow === 'order_ahead' ? orderAheadTotal : 0),
      });
    } catch {
      setFormError({ mr: t.errGeneric, en: t.errGeneric });
    } finally {
      setIsSubmitting(false);
    }
  };

  // ---------------------------------------------------------------------------
  // LIVE REALTIME STATUS SUBSCRIPTION & POLLING (For Confirmation Screen)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!confirmedBooking?.id) return;

    const bookingId = confirmedBooking.id;

    // 1. Polling every 3 seconds to guarantee updates on NH-65 mobile connections
    const pollInterval = setInterval(async () => {
      try {
        const res = await fetch(`/api/bookings/${bookingId}/status`);
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.status && json.status !== confirmedBooking.status) {
            setConfirmedBooking((prev) =>
              prev ? { ...prev, status: json.status, rejection_reason: json.rejection_reason } : null
            );
          }
        }
      } catch {
        // Polling retry
      }
    }, 3000);

    // 2. Supabase Realtime Channel (Dynamically loaded when on confirmation screen)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let supabaseChannel: any = null;
    import('@/lib/supabase/client')
      .then(({ createClient }) => {
        try {
          const supabase = createClient();
          supabaseChannel = supabase
            .channel(`booking-${bookingId}`)
            .on(
              'postgres_changes',
              {
                event: 'UPDATE',
                schema: 'public',
                table: 'bookings',
                filter: `id=eq.${bookingId}`,
              },
              (payload) => {
                if (payload.new && (payload.new as { status?: string }).status) {
                  const newStatus = (payload.new as { status: 'pending' | 'confirmed' | 'rejected' | 'seated' }).status;
                  const reason = (payload.new as { rejection_reason?: string }).rejection_reason;
                  setConfirmedBooking((prev) =>
                    prev ? { ...prev, status: newStatus, rejection_reason: reason } : null
                  );
                }
              }
            )
            .subscribe();
        } catch {
          // Fallback to polling
        }
      })
      .catch(() => {
        // Fallback to polling
      });

    return () => {
      clearInterval(pollInterval);
      if (supabaseChannel && typeof supabaseChannel.unsubscribe === 'function') {
        supabaseChannel.unsubscribe();
      }
    };
  }, [confirmedBooking?.id, confirmedBooking?.status]);

  // Demo simulator status updater
  const handleSimulateStatus = async (newStatus: 'confirmed' | 'rejected') => {
    if (!confirmedBooking?.id || simulatorLoading) return;
    setSimulatorLoading(true);
    try {
      const res = await fetch(`/api/bookings/${confirmedBooking.id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus,
          rejection_reason:
            newStatus === 'rejected'
              ? lang === 'mr'
                ? 'सण/उत्सवामुळे सर्व टेबल्स भरलेली आहेत.'
                : lang === 'hi'
                ? 'त्योहार/उत्सव के कारण सभी टेबल्स भर चुकी हैं।'
                : 'All tables currently fully booked for this slot.'
              : undefined,
        }),
      });
      const data = await res.json();
      if (data.success && data.booking) {
        setConfirmedBooking((prev) =>
          prev
            ? {
                ...prev,
                status: data.booking.status,
                rejection_reason: data.booking.rejection_reason,
              }
            : null
        );
      }
    } catch {
      // error
    } finally {
      setSimulatorLoading(false);
    }
  };

  // WhatsApp Share URL generator
  const getWhatsAppShareUrl = () => {
    if (!confirmedBooking) return '#';
    const isMr = lang === 'mr';
    const isHi = lang === 'hi';
    const flowText =
      confirmedBooking.type === 'table'
        ? isMr ? 'टेबल आरक्षण' : isHi ? 'टेबल आरक्षण' : 'Table Booking'
        : confirmedBooking.type === 'group_meal'
        ? isMr ? 'पंगत थाळी' : isHi ? 'भक्त पंगत थाली' : 'Pilgrim Group Feast'
        : isMr ? 'आधी जेवण ऑर्डर' : isHi ? 'पूर्व-ऑर्डर भोजन' : 'Order Ahead';

    const message = isMr
      ? `🙏 *श्री प्युअर व्हेज (थेऊर फाटा)*\nआरक्षण टोकन: *#${confirmedBooking.token_number}*\nनाव: ${confirmedBooking.guest_name}\nप्रकार: ${flowText}\nव्यक्ती: ${confirmedBooking.party_size}\nवेळ: ${selectedSlotTime} (${selectedDate})\nस्थिती: ${confirmedBooking.status.toUpperCase()}\n\nमहामार्ग भोजनालय, थेऊर फाटा, पुणे.`
      : isHi
      ? `🙏 *श्री प्योर वेज (थेऊर फाटा)*\nआरक्षण टोकन: *#${confirmedBooking.token_number}*\nनाम: ${confirmedBooking.guest_name}\nप्रकार: ${flowText}\nअतिथि: ${confirmedBooking.party_size}\nसमय: ${selectedSlotTime} (${selectedDate})\nस्थिति: ${confirmedBooking.status.toUpperCase()}\n\nहाईवे भोजनालय, थेऊर फाटा, पुणे.`
      : `🙏 *Shree Pure Veg (Theur Phata)*\nBooking Token: *#${confirmedBooking.token_number}*\nName: ${confirmedBooking.guest_name}\nType: ${flowText}\nGuests: ${confirmedBooking.party_size}\nTime: ${selectedSlotTime} (${selectedDate})\nStatus: ${confirmedBooking.status.toUpperCase()}\n\nPune-Solapur Highway, Theur Phata.`;

    return `https://wa.me/?text=${encodeURIComponent(message)}`;
  };

  // Reset to form
  const handleReset = () => {
    setConfirmedBooking(null);
    setFormError(null);
    setOrderItems({});
    setNotes('');
  };

  // ---------------------------------------------------------------------------
  // RENDER: CONFIRMATION SCREEN
  // ---------------------------------------------------------------------------
  if (confirmedBooking) {
    const isConfirmed = confirmedBooking.status === 'confirmed';
    const isRejected = confirmedBooking.status === 'rejected';
    const isPending = confirmedBooking.status === 'pending';
    const isSeated = confirmedBooking.status === 'seated';

    return (
      <main className="min-h-screen bg-sand bg-paisley-pattern p-3 sm:p-4 pb-16 max-w-lg mx-auto text-primary font-sans animate-entrance">
        {/* Demo Mode Top Banner */}
        {isDemoMode && (
          <div className="mb-3 bg-primary text-sand px-3.5 py-2.5 rounded-2xl text-xs flex flex-wrap items-center justify-between gap-2 border-2 border-brass/40 shadow-md">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-marigold animate-ping"></span>
              <span className="font-bold text-marigold">
                {lang === 'mr' ? '⚡ थेट प्रात्यक्षिक मोड (Live Demo Mode)' : lang === 'hi' ? '⚡ लाइव डेमो मोड (Live Demo Mode)' : '⚡ Live Demo Mode Active'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-sand/80">
                {lang === 'mr' ? 'रीअल-टाईम सिंक सक्रिय' : lang === 'hi' ? 'रीयल-टाइम सिंक सक्रिय' : 'Live Realtime Sync Active'}
              </span>
              <Link
                href="/admin"
                target="_blank"
                className="tap-target min-h-[36px] text-[11px] bg-marigold text-primary font-black px-3 py-1 rounded-lg border border-brass shadow transition hover:opacity-90"
              >
                {lang === 'mr' ? 'अ‍ॅडमिन इनबॉक्स ↗' : lang === 'hi' ? 'एडमिन इनबॉक्स ↗' : 'Admin Inbox ↗'}
              </Link>
            </div>
          </div>
        )}

        {/* Signature Marigold Toran Garland */}
        <MarigoldToran className="my-2" />

        {/* Confirmation Card with Temple Arch Top */}
        <div className="bg-white dark:bg-surface rounded-t-[3rem] rounded-b-2xl p-6 shadow-arch border-2 border-brass/50 temple-card relative overflow-hidden">
          {/* Subtle temple background accent */}
          <div className="absolute -top-12 -right-12 w-36 h-36 rounded-full bg-marigold/15 blur-2xl pointer-events-none"></div>

          <div className="text-center pb-4 border-b border-sand-300 dark:border-muted/30">
            <div className="w-16 h-16 mx-auto mb-3 rounded-full flex items-center justify-center bg-sand-100 dark:bg-darkbg text-marigold border-2 border-brass shadow-inner">
              <Sparkles className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-heading font-normal text-primary dark:text-sand tracking-tight">
              {t.confirmedHeading}
            </h1>
            <p className="text-xs text-muted mt-1">{t.restaurantName} • {t.restaurantLocation}</p>
          </div>

          {/* Token Hero Display */}
          <div className="mt-5 p-4 rounded-2xl bg-sand-100 dark:bg-darkbg border-2 border-marigold/70 text-center shadow-sm">
            <span className="text-xs font-bold text-primary dark:text-sand uppercase tracking-widest">
              {t.tokenLabel}
            </span>
            <div className="text-3xl font-black text-primary dark:text-sand tracking-wider my-1 font-mono">
              #{confirmedBooking.token_number}
            </div>
            <div className="text-[11px] text-muted font-mono">
              {t.bookingIdLabel}: {confirmedBooking.id}
            </div>
          </div>

          {/* Live Status Badge */}
          <div className="mt-5">
            <div className="text-xs font-bold text-primary dark:text-sand uppercase tracking-wider mb-2 flex items-center justify-between">
              <span>{t.statusLabel}</span>
              <span className="text-[11px] font-normal text-muted flex items-center gap-1">
                <span className="inline-block w-2 h-2 rounded-full bg-tulsi animate-pulse"></span>
                Realtime updates
              </span>
            </div>

            <div
              className={`p-4 rounded-2xl border-2 transition-all duration-300 ${
                isPending
                  ? 'bg-marigold/15 border-marigold text-primary dark:text-sand'
                  : isConfirmed
                  ? 'bg-tulsi-bg border-tulsi text-tulsi'
                  : isRejected
                  ? 'bg-kumkum-bg border-kumkum text-kumkum'
                  : 'bg-primary/10 border-primary text-primary dark:text-sand'
              }`}
            >
              <div className="flex items-center gap-3">
                {isPending && <Clock className="w-6 h-6 text-marigold animate-spin" />}
                {isConfirmed && <CheckCircle2 className="w-6 h-6 text-tulsi" />}
                {isRejected && <XCircle className="w-6 h-6 text-kumkum" />}
                {isSeated && <Check className="w-6 h-6 text-primary" />}

                <div>
                  <div className="font-bold text-base leading-tight">
                    {isPending && t.statusPending}
                    {isConfirmed && t.statusConfirmed}
                    {isRejected && t.statusRejected}
                    {isSeated && t.statusSeated}
                  </div>
                  <div className="text-xs mt-0.5 opacity-90">
                    {isPending && t.statusPendingDesc}
                    {isConfirmed && t.statusConfirmedDesc}
                    {isRejected &&
                      (confirmedBooking.rejection_reason || t.statusRejectedDesc)}
                    {isSeated && t.statusSeatedDesc}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Demo Staff Simulator Toolbar */}
          <div className="mt-5 p-3.5 rounded-2xl bg-primary text-sand border-2 border-brass/40 text-xs shadow-md">
            <div className="flex items-center justify-between font-semibold text-marigold mb-2">
              <span className="flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-marigold" />
                {t.staffSimulator}
              </span>
              <span className="text-[10px] bg-primary-light text-sand px-2 py-0.5 rounded-full border border-brass/30">
                Interactive Test
              </span>
            </div>
            <p className="text-[11px] text-sand/80 mb-2.5">
              Click below to test how staff action in /admin immediately updates this guest view:
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleSimulateStatus('confirmed')}
                disabled={simulatorLoading || isConfirmed}
                className="tap-target min-h-[44px] py-2.5 px-3 rounded-xl bg-tulsi hover:bg-tulsi-hover disabled:opacity-40 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow active:scale-95 transition-all"
              >
                <Check className="w-3.5 h-3.5" />
                {t.simulatorApproveBtn}
              </button>
              <button
                type="button"
                onClick={() => handleSimulateStatus('rejected')}
                disabled={simulatorLoading || isRejected}
                className="tap-target min-h-[44px] py-2.5 px-3 rounded-xl bg-kumkum hover:bg-kumkum-hover disabled:opacity-40 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow active:scale-95 transition-all"
              >
                <XCircle className="w-3.5 h-3.5" />
                {t.simulatorRejectBtn}
              </button>
            </div>
          </div>

          {/* Booking Summary Info */}
          <div className="mt-5 space-y-2.5 bg-sand-50 dark:bg-darkbg p-4 rounded-2xl border-2 border-sand-300 dark:border-muted/30 text-xs">
            <div className="flex justify-between text-muted">
              <span>{t.nameLabel}</span>
              <span className="font-bold text-primary dark:text-sand">{confirmedBooking.guest_name}</span>
            </div>
            <div className="flex justify-between text-muted">
              <span>{t.phoneLabel}</span>
              <span className="font-bold text-primary dark:text-sand font-mono">{confirmedBooking.guest_phone}</span>
            </div>
            <div className="flex justify-between text-muted">
              <span>{t.bookingType}</span>
              <span className="font-bold text-primary dark:text-sand">
                {confirmedBooking.type === 'table' && t.flowTable}
                {confirmedBooking.type === 'group_meal' && t.flowGroupMeal}
                {confirmedBooking.type === 'order_ahead' && t.flowOrderAhead}
              </span>
            </div>
            <div className="flex justify-between text-muted">
              <span>{t.selectedDate} & {t.selectedTime}</span>
              <span className="font-bold text-primary dark:text-sand">{selectedDate} @ {selectedSlotTime}</span>
            </div>
            <div className="flex justify-between text-muted">
              <span>{t.totalGuests}</span>
              <span className="font-bold text-primary dark:text-sand">{confirmedBooking.party_size} {t.guestsCount}</span>
            </div>
            {confirmedBooking.total_estimated_amount > 0 && (
              <div className="flex justify-between text-primary dark:text-sand pt-2 border-t border-sand-300 dark:border-muted/30 font-bold text-sm">
                <span>{t.totalAmount}</span>
                <span className="text-marigold font-black">₹{confirmedBooking.total_estimated_amount}</span>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="mt-6 flex flex-col gap-2.5">
            <a
              href={getWhatsAppShareUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="tap-target min-h-[48px] w-full py-3 px-4 rounded-xl bg-tulsi hover:bg-tulsi-hover text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md transition-all active:scale-[0.99]"
            >
              <Share2 className="w-4 h-4" />
              <span>{t.shareWhatsApp}</span>
            </a>

            <a
              href="tel:919876543210"
              className="tap-target min-h-[44px] w-full py-2.5 px-4 rounded-xl bg-white dark:bg-surface hover:bg-sand-100 text-primary dark:text-sand border-2 border-sand-300 dark:border-muted/30 font-semibold text-xs flex items-center justify-center gap-2 transition-all"
            >
              <Phone className="w-3.5 h-3.5 text-marigold" />
              <span>{t.callHotel}</span>
            </a>

            <button
              type="button"
              onClick={handleReset}
              className="tap-target min-h-[44px] w-full py-2.5 px-4 rounded-xl bg-sand-100 dark:bg-darkbg hover:bg-sand-200 text-primary dark:text-sand font-semibold text-xs flex items-center justify-center gap-2 transition-all mt-1 border border-sand-300 dark:border-muted/30"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{t.bookAnother}</span>
            </button>
          </div>
        </div>

        <div className="mt-6 text-center text-xs text-muted">
          <Link href="/" className="hover:underline text-primary dark:text-sand font-medium">
            {t.backToHome}
          </Link>
        </div>
      </main>
    );
  }

  // ---------------------------------------------------------------------------
  // RENDER: GUEST BOOKING FORM SCREEN
  // ---------------------------------------------------------------------------
  return (
    <main className="min-h-screen bg-sand bg-paisley-pattern p-3 sm:p-4 pb-16 max-w-lg mx-auto text-primary font-sans animate-entrance">
      {/* 1. DEMO MODE BANNER */}
      {isDemoMode && (
        <div className="mb-3 bg-primary text-sand p-3.5 rounded-2xl border-2 border-brass/40 shadow-md flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-marigold animate-pulse"></span>
              <span className="font-bold text-xs text-marigold tracking-wide">
                {lang === 'mr' ? '⚡ थेट प्रात्यक्षिक मोड सक्रिय (Demo Mode Active)' : lang === 'hi' ? '⚡ लाइव डेमो मोड सक्रिय (Demo Mode Active)' : '⚡ Live Demo Mode Active'}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] bg-primary-light text-sand px-2 py-0.5 rounded-full border border-brass/30">
                NH-65 Theur
              </span>
              <Link
                href="/admin"
                target="_blank"
                className="tap-target min-h-[36px] text-[10px] bg-marigold text-primary font-black px-2.5 py-0.5 rounded-full border border-brass shadow transition hover:opacity-90"
              >
                {lang === 'mr' ? 'अ‍ॅडमिन ↗' : lang === 'hi' ? 'एडमिन ↗' : 'Admin ↗'}
              </Link>
            </div>
          </div>
          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] text-sand/90 leading-tight">
              {lang === 'mr'
                ? 'हे श्री प्युअर व्हेजचे थेट प्रात्यक्षिक पोर्टल आहे. केलेले आरक्षण चाचणी स्वरूपातील असेल.'
                : lang === 'hi'
                ? 'यह श्री प्योर वेज का लाइव डेमो पोर्टल है। यहां किया गया आरक्षण परीक्षण स्वरूप होगा।'
                : 'Interactive demo portal for Shree Pure Veg. Reservations created here are for live testing.'}
            </p>
            <button
              type="button"
              onClick={handleQuickFill}
              className="tap-target min-h-[44px] flex-shrink-0 px-3 py-1.5 rounded-xl bg-marigold hover:bg-marigold-hover text-primary font-black text-xs shadow-md transition-all active:scale-95 flex items-center gap-1.5 border border-brass/50"
            >
              <Zap className="w-3.5 h-3.5 text-primary" />
              <span>{quickFillActive ? t.quickFillDone : t.quickFillBtn}</span>
            </button>
          </div>
        </div>
      )}

      {/* Signature Marigold Toran Garland */}
      <MarigoldToran className="my-1.5" />

      {/* 2. HERO HEADER (FESTIVAL SWITCH: KUMKUM MAROON & HALDI THEME ON FESTIVAL DAYS) */}
      <header
        className={`rounded-t-[3rem] rounded-b-2xl p-5 sm:p-6 shadow-arch border-2 mb-4 relative overflow-hidden transition-all duration-300 ${
          isCurrentDateFestival
            ? 'bg-gradient-to-br from-[#8B1E17] via-[#A82B22] to-[#6E140E] text-sand border-haldi shadow-brass'
            : 'bg-white dark:bg-surface text-primary dark:text-sand border-sand-300 dark:border-muted/30 temple-card'
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className={`flex items-center gap-1.5 text-xs font-bold mb-1 ${
              isCurrentDateFestival ? 'text-haldi' : 'text-marigold'
            }`}>
              <span>🙏</span>
              <span>{t.tagline}</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-heading font-normal tracking-tight text-inherit">
              {t.restaurantName}
            </h1>
            <h2 className={`text-xs font-semibold tracking-wider uppercase mt-0.5 ${
              isCurrentDateFestival ? 'text-sand/80' : 'text-muted'
            }`}>
              Shree Pure Veg • Theur Phata, Pune
            </h2>
            <p className={`text-xs flex items-center gap-1 mt-1.5 ${
              isCurrentDateFestival ? 'text-sand/90' : 'text-muted'
            }`}>
              <MapPin className="w-3.5 h-3.5 text-marigold flex-shrink-0" />
              <span>{t.restaurantLocation}</span>
            </p>
          </div>

          {/* Trilingual Toggle Button (English, Hindi, Marathi) */}
          <div className="flex-shrink-0 flex items-center bg-sand-100 dark:bg-darkbg p-1 rounded-xl border border-sand-300 dark:border-muted/40 shadow-inner">
            <button
              type="button"
              onClick={() => handleLangToggle('en')}
              aria-label="English Language"
              className={`tap-target min-h-[44px] px-2.5 py-1.5 text-xs font-bold rounded-lg transition-all ${
                lang === 'en'
                  ? 'bg-primary text-sand shadow-sm font-black'
                  : 'text-muted hover:text-primary dark:hover:text-sand'
              }`}
            >
              EN
            </button>
            <button
              type="button"
              onClick={() => handleLangToggle('hi')}
              aria-label="हिंदी भाषा"
              className={`tap-target min-h-[44px] px-2.5 py-1.5 text-xs font-bold rounded-lg transition-all ${
                lang === 'hi'
                  ? 'bg-marigold text-primary shadow-sm font-black'
                  : 'text-muted hover:text-primary dark:hover:text-sand'
              }`}
            >
              हिंदी
            </button>
            <button
              type="button"
              onClick={() => handleLangToggle('mr')}
              aria-label="मराठी भाषा"
              className={`tap-target min-h-[44px] px-2.5 py-1.5 text-xs font-bold rounded-lg transition-all ${
                lang === 'mr'
                  ? 'bg-marigold text-primary shadow-sm font-black'
                  : 'text-muted hover:text-primary dark:hover:text-sand'
              }`}
            >
              मराठी
            </button>
          </div>
        </div>

        {/* 4.6 on Google from 989 reviews badge */}
        <div className="mt-3.5 pt-3 border-t border-sand-300/60 dark:border-muted/20 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border shadow-sm ${
            isCurrentDateFestival
              ? 'bg-haldi text-primary border-haldi-light'
              : 'bg-sand-100 dark:bg-darkbg text-primary dark:text-sand border-brass/50'
          }`}>
            <span className="text-marigold text-sm">★</span>
            <span>4.6 on Google from 989 reviews</span>
            <span className="text-[10px] opacity-75">{lang === 'mr' ? '(४.६ ★ ९८९+ परीक्षणे)' : lang === 'hi' ? '(४.६ ★ ९८९+ समीक्षाएं)' : '(4.6 ★ 989+ reviews)'}</span>
          </div>
          <span className={`text-[11px] font-medium ${
            isCurrentDateFestival ? 'text-sand/80' : 'text-muted'
          }`}>
            Pure Veg Satvik • No Login Required
          </span>
        </div>

        {/* TEMPLE-ARCH SHAPED PHOTO PLACEHOLDER */}
        <div className={`mt-4 rounded-t-[3.5rem] rounded-b-2xl border-2 p-5 text-center relative overflow-hidden shadow-inner flex flex-col items-center justify-center ${
          isCurrentDateFestival
            ? 'bg-sand/10 border-haldi/60 text-sand'
            : 'bg-gradient-to-b from-primary/10 via-sand/60 to-marigold/15 dark:from-darkbg/90 dark:via-surface dark:to-marigold/10 border-brass/60 text-primary dark:text-sand'
        }`}>
          {/* Decorative Arch Diya Motif */}
          <div className="w-16 h-16 rounded-full bg-sand-50 dark:bg-darkbg border-2 border-brass/60 flex items-center justify-center shadow-md mb-2 text-2xl">
            🪔
          </div>
          <h3 className="font-heading font-normal text-base tracking-wide text-inherit">
            {lang === 'mr' ? 'मांडव वारसा • सात्विक भोजनालय' : lang === 'hi' ? 'मंडप विरासत • सात्विक भोजनालय' : 'Mandir Heritage Dining'}
          </h3>
          <p className="text-[11px] opacity-85 mt-1 max-w-xs">
            {lang === 'mr'
              ? 'श्री चिंतामणी गणपती मंदिर भाविकांचे हक्काचे भोजनालय • पुणे-सोलापूर महामार्ग'
              : lang === 'hi'
              ? 'श्री चिंतामणि गणपति मंदिर भक्तों का प्रामाणिक भोजनालय • पुणे-सोलापुर हाईवे'
              : 'Chintamani Ganpati Pilgrim Heritage & Highway Family Dining'}
          </p>
          <span className="mt-2 text-[10px] bg-marigold text-primary font-black px-2.5 py-0.5 rounded-full border border-brass/40 uppercase tracking-wider">
            Pure Veg • Satvik
          </span>
        </div>

        {/* Festival Headline Banner in Yatra One font with limited seats notice */}
        {isCurrentDateFestival && (
          <div className="mt-3.5 p-3 rounded-2xl bg-haldi text-primary font-heading font-normal text-xs sm:text-sm border-2 border-haldi-light flex flex-wrap items-center justify-between gap-2 shadow-sm">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary flex-shrink-0" />
              <span>
                {lang === 'mr'
                  ? 'उत्सव विशेष: चिंतामणी गणपती यात्रा सात्विक भोजन उपलब्ध!'
                  : lang === 'hi'
                  ? 'उत्सव विशेष: चिंतामणि गणपति यात्रा सात्विक भोजन उपलब्ध!'
                  : 'Festival Special: Chintamani Ganpati Yatra Satvik Feast Open!'}
              </span>
            </div>
            <span className="bg-alert text-white text-[11px] font-sans font-bold px-2.5 py-0.5 rounded-full shadow-sm">
              {lang === 'mr' ? 'जागा मर्यादित (Limited Seats)' : lang === 'hi' ? 'सीटें सीमित (Limited Seats)' : 'Limited Seats Available'}
            </span>
          </div>
        )}
      </header>

      {/* 3. THREE BOOKING TYPES AS LARGE ARCH-SHAPED CARDS WITH LINE ICONS */}
      <section className="mb-4" aria-label="Booking flow selection">
        <div className="text-xs font-bold text-muted uppercase tracking-wider mb-2 px-1">
          {lang === 'mr' ? 'आरक्षणाचा प्रकार निवडा (Booking Type)' : lang === 'hi' ? 'आरक्षण प्रकार चुनें (Booking Type)' : 'Select Booking Type'}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {/* Card 1: Table Booking */}
          <button
            type="button"
            onClick={() => setFlow('table')}
            className={`tap-target min-h-[110px] w-full p-4 rounded-t-[2.25rem] rounded-b-xl border-2 text-center transition-all duration-200 flex flex-col items-center justify-between relative overflow-hidden group ${
              flow === 'table'
                ? 'bg-white dark:bg-surface border-marigold shadow-arch ring-2 ring-marigold/40 text-primary dark:text-sand scale-[1.02]'
                : 'bg-white/80 dark:bg-surface/60 border-sand-300 dark:border-muted/30 hover:border-marigold/60 text-muted hover:text-primary dark:hover:text-sand'
            }`}
          >
            <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-2 border transition-colors ${
              flow === 'table'
                ? 'bg-marigold text-primary border-brass shadow-sm'
                : 'bg-sand-100 dark:bg-darkbg text-muted border-sand-300 group-hover:text-primary'
            }`}>
              <Utensils className="w-5 h-5" />
            </div>
            <span className="font-bold text-sm tracking-tight">{t.flowTable}</span>
            <span className="text-[11px] opacity-80 mt-0.5">{lang === 'mr' ? '१-१२ व्यक्ती' : lang === 'hi' ? '१-१२ अतिथि' : '1-12 Guests'}</span>
            <div className={`mt-2 w-2.5 h-2.5 rounded-full transition-all ${
              flow === 'table' ? 'bg-marigold ring-2 ring-brass' : 'bg-transparent'
            }`} />
          </button>

          {/* Card 2: Group Meal Thali */}
          <button
            type="button"
            onClick={() => setFlow('group_meal')}
            className={`tap-target min-h-[110px] w-full p-4 rounded-t-[2.25rem] rounded-b-xl border-2 text-center transition-all duration-200 flex flex-col items-center justify-between relative overflow-hidden group ${
              flow === 'group_meal'
                ? 'bg-white dark:bg-surface border-marigold shadow-arch ring-2 ring-marigold/40 text-primary dark:text-sand scale-[1.02]'
                : 'bg-white/80 dark:bg-surface/60 border-sand-300 dark:border-muted/30 hover:border-marigold/60 text-muted hover:text-primary dark:hover:text-sand'
            }`}
          >
            <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-2 border transition-colors ${
              flow === 'group_meal'
                ? 'bg-marigold text-primary border-brass shadow-sm'
                : 'bg-sand-100 dark:bg-darkbg text-muted border-sand-300 group-hover:text-primary'
            }`}>
              <Users className="w-5 h-5" />
            </div>
            <span className="font-bold text-sm tracking-tight">{t.flowGroupMeal}</span>
            <span className="text-[11px] opacity-80 mt-0.5">{lang === 'mr' ? 'पंगत थाळी (६+)' : lang === 'hi' ? 'पंगत थाली (६+)' : 'Feast (6+ Guests)'}</span>
            <div className={`mt-2 w-2.5 h-2.5 rounded-full transition-all ${
              flow === 'group_meal' ? 'bg-marigold ring-2 ring-brass' : 'bg-transparent'
            }`} />
          </button>

          {/* Card 3: Order Ahead */}
          <button
            type="button"
            onClick={() => setFlow('order_ahead')}
            className={`tap-target min-h-[110px] w-full p-4 rounded-t-[2.25rem] rounded-b-xl border-2 text-center transition-all duration-200 flex flex-col items-center justify-between relative overflow-hidden group ${
              flow === 'order_ahead'
                ? 'bg-white dark:bg-surface border-marigold shadow-arch ring-2 ring-marigold/40 text-primary dark:text-sand scale-[1.02]'
                : 'bg-white/80 dark:bg-surface/60 border-sand-300 dark:border-muted/30 hover:border-marigold/60 text-muted hover:text-primary dark:hover:text-sand'
            }`}
          >
            <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-2 border transition-colors ${
              flow === 'order_ahead'
                ? 'bg-marigold text-primary border-brass shadow-sm'
                : 'bg-sand-100 dark:bg-darkbg text-muted border-sand-300 group-hover:text-primary'
            }`}>
              <ShoppingBag className="w-5 h-5" />
            </div>
            <span className="font-bold text-sm tracking-tight">{t.flowOrderAhead}</span>
            <span className="text-[11px] opacity-80 mt-0.5">{lang === 'mr' ? 'वेळ वाचवा' : lang === 'hi' ? 'समय बचाएं' : 'Save Wait Time'}</span>
            <div className={`mt-2 w-2.5 h-2.5 rounded-full transition-all ${
              flow === 'order_ahead' ? 'bg-marigold ring-2 ring-brass' : 'bg-transparent'
            }`} />
          </button>
        </div>
      </section>

      {/* 4. FLOW SPECIFIC CONFIGURATION */}
      <section className="bg-white dark:bg-surface rounded-t-[2.5rem] rounded-b-2xl p-5 shadow-arch border-2 border-sand-300 dark:border-muted/30 temple-card mb-4">
        {/* FLOW 1: STANDARD TABLE */}
        {flow === 'table' && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-base font-bold text-primary dark:text-sand">{t.partySizeLabel}</h2>
                <p className="text-xs text-muted">{t.flowTableSub}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPartySize((p) => Math.max(1, p - 1))}
                  disabled={partySize <= 1}
                  aria-label="Decrease guests"
                  className="tap-target min-h-[44px] min-w-[44px] rounded-xl bg-sand-100 dark:bg-darkbg hover:bg-sand-200 dark:hover:bg-muted/20 disabled:opacity-30 text-primary dark:text-sand flex items-center justify-center font-bold text-lg active:scale-95 transition-all border-2 border-sand-300 dark:border-muted/30"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <div className="w-12 text-center">
                  <span className="text-2xl font-black text-primary dark:text-sand">{partySize}</span>
                  <span className="block text-[10px] text-muted -mt-0.5">{t.guestsCount}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setPartySize((p) => Math.min(isCurrentDateFestival ? 10 : 12, p + 1))}
                  disabled={partySize >= (isCurrentDateFestival ? 10 : 12)}
                  aria-label="Increase guests"
                  className="tap-target min-h-[44px] min-w-[44px] rounded-xl bg-sand-100 dark:bg-darkbg hover:bg-sand-200 dark:hover:bg-muted/20 disabled:opacity-30 text-primary dark:text-sand flex items-center justify-center font-bold text-lg active:scale-95 transition-all border-2 border-sand-300 dark:border-muted/30"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Notice for limits */}
            <div className="p-3 rounded-xl bg-sand-100 dark:bg-darkbg text-[11px] text-primary dark:text-sand border border-brass/40 flex items-center gap-2">
              <span className="text-marigold font-bold">ℹ</span>
              <span>{isCurrentDateFestival ? t.festivalTableNotice : t.maxTableNotice}</span>
            </div>
          </div>
        )}

        {/* FLOW 2: GROUP MEAL PACKAGES */}
        {flow === 'group_meal' && (
          <div>
            <h2 className="text-base font-bold text-primary dark:text-sand mb-1">{t.selectPackage}</h2>
            <p className="text-xs text-muted mb-3">{t.flowGroupMealSub}</p>

            <div className="space-y-3">
              {packages.map((pkg) => {
                const isSelected = selectedPackageId === pkg.id;
                return (
                  <div
                    key={pkg.id}
                    onClick={() => {
                      setSelectedPackageId(pkg.id);
                      if (partySize < pkg.min_guests) setPartySize(pkg.min_guests);
                    }}
                    className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                      isSelected
                        ? 'border-marigold bg-marigold/10 dark:bg-marigold/15 shadow-sm ring-1 ring-marigold/30'
                        : 'border-sand-300 dark:border-muted/30 hover:border-marigold/60 bg-white dark:bg-surface'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                            isSelected ? 'border-marigold bg-white' : 'border-sand-300 dark:border-muted'
                          }`}
                        >
                          {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-marigold"></div>}
                        </div>
                        <h3 className="font-bold text-sm text-primary dark:text-sand">
                          {lang === 'mr' ? pkg.name_mr : lang === 'hi' ? (pkg.name_hi || pkg.name_mr) : pkg.name_en}
                        </h3>
                      </div>
                      <div className="text-right">
                        <span className="font-black text-primary dark:text-sand text-base">₹{pkg.price_per_head}</span>
                        <span className="block text-[10px] text-muted">{t.perPerson}</span>
                      </div>
                    </div>
                    <p className="text-xs text-muted mt-2 pl-7">
                      {lang === 'mr' ? pkg.description_mr : lang === 'hi' ? (pkg.description_hi || pkg.description_mr) : pkg.description_en}
                    </p>
                    <div className="mt-2 pl-7 flex items-center justify-between text-[11px] font-semibold text-primary dark:text-sand">
                      <span className="bg-sand-100 dark:bg-darkbg px-2.5 py-0.5 rounded-full border border-sand-300 dark:border-muted/30">
                        {t.minGuestsRequired.replace('{min}', String(pkg.min_guests))}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Dynamic Group Guest Counter */}
            <div className="mt-4 pt-4 border-t border-sand-300 dark:border-muted/30 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-primary dark:text-sand">{t.partySizeLabel}</span>
                <span className="block text-[11px] text-muted">
                  {packageTotal > 0 && `Total: ₹${packageTotal}`}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const minAllowed = packages.find((p) => p.id === selectedPackageId)?.min_guests || 6;
                    setPartySize((p) => Math.max(minAllowed, p - 1));
                  }}
                  aria-label="Decrease group guests"
                  className="tap-target min-h-[44px] min-w-[44px] rounded-xl bg-sand-100 dark:bg-darkbg hover:bg-sand-200 text-primary dark:text-sand flex items-center justify-center font-bold text-base active:scale-95 border-2 border-sand-300 dark:border-muted/30"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <div className="w-12 text-center">
                  <span className="text-xl font-black text-primary dark:text-sand">{partySize}</span>
                  <span className="block text-[10px] text-muted -mt-0.5">{t.guestsCount}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setPartySize((p) => p + 1)}
                  aria-label="Increase group guests"
                  className="tap-target min-h-[44px] min-w-[44px] rounded-xl bg-sand-100 dark:bg-darkbg hover:bg-sand-200 text-primary dark:text-sand flex items-center justify-center font-bold text-base active:scale-95 border-2 border-sand-300 dark:border-muted/30"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* FLOW 3: ORDER AHEAD MENU */}
        {flow === 'order_ahead' && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <div>
                <h2 className="text-base font-bold text-primary dark:text-sand">{t.orderAheadTitle}</h2>
                <p className="text-xs text-muted">{t.orderAheadSub}</p>
              </div>
              {orderAheadTotal > 0 && (
                <div className="text-right">
                  <span className="text-xs text-muted">{t.estimatedTotal}</span>
                  <div className="font-black text-marigold text-base">₹{orderAheadTotal}</div>
                </div>
              )}
            </div>

            <div className="space-y-2.5 mt-3">
              {menuItems.map((item) => {
                const qty = orderItems[item.id] || 0;
                return (
                  <div
                    key={item.id}
                    className={`p-3.5 rounded-2xl border-2 transition-all ${
                      item.is_sold_out
                        ? 'bg-sand-100/60 dark:bg-darkbg/60 border-sand-200 dark:border-muted/20 opacity-60'
                        : qty > 0
                        ? 'border-marigold bg-marigold/10 dark:bg-marigold/15 shadow-sm'
                        : 'border-sand-300 dark:border-muted/30 bg-white dark:bg-surface hover:border-marigold/50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-xs sm:text-sm text-primary dark:text-sand">
                            {lang === 'mr' ? item.name_mr : lang === 'hi' ? (item.name_hi || item.name_mr) : item.name_en}
                          </h3>
                          {item.is_sold_out && (
                            <span className="text-[10px] bg-kumkum-bg text-kumkum px-2 py-0.5 rounded-full font-bold border border-kumkum/40">
                              {t.soldOut}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-muted mt-0.5 line-clamp-1">
                          {lang === 'mr' ? item.description_mr : lang === 'hi' ? (item.description_hi || item.description_mr) : item.description_en}
                        </p>
                        <div className="font-black text-primary dark:text-sand text-xs mt-1">₹{item.price}</div>
                      </div>

                      {/* Quantity selector or disabled sold out */}
                      {!item.is_sold_out ? (
                        <div className="flex items-center gap-1.5 self-center">
                          <button
                            type="button"
                            onClick={() =>
                              setOrderItems((prev) => ({
                                ...prev,
                                [item.id]: Math.max(0, (prev[item.id] || 0) - 1),
                              }))
                            }
                            disabled={qty === 0}
                            aria-label={`Decrease ${item.name_en}`}
                            className="tap-target min-h-[38px] min-w-[38px] rounded-lg bg-sand-100 dark:bg-darkbg hover:bg-sand-200 disabled:opacity-30 text-primary dark:text-sand flex items-center justify-center font-bold active:scale-95 border border-sand-300 dark:border-muted/30"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="w-6 text-center font-black text-xs text-primary dark:text-sand">{qty}</span>
                          <button
                            type="button"
                            onClick={() =>
                              setOrderItems((prev) => ({
                                ...prev,
                                [item.id]: (prev[item.id] || 0) + 1,
                              }))
                            }
                            aria-label={`Increase ${item.name_en}`}
                            className="tap-target min-h-[38px] min-w-[38px] rounded-lg bg-marigold hover:bg-marigold-hover text-primary flex items-center justify-center font-black active:scale-95 border border-brass shadow-sm"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <span className="text-[11px] text-muted font-medium self-center">N/A</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Guests for order ahead */}
            <div className="mt-4 pt-4 border-t border-sand-300 dark:border-muted/30 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-primary dark:text-sand">{t.partySizeLabel}</span>
                <span className="block text-[11px] text-muted">How many dining?</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPartySize((p) => Math.max(1, p - 1))}
                  aria-label="Decrease dining guests"
                  className="tap-target min-h-[44px] min-w-[44px] rounded-xl bg-sand-100 dark:bg-darkbg hover:bg-sand-200 text-primary dark:text-sand flex items-center justify-center font-bold text-base active:scale-95 border-2 border-sand-300 dark:border-muted/30"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <div className="w-10 text-center font-black text-primary dark:text-sand text-base">{partySize}</div>
                <button
                  type="button"
                  onClick={() => setPartySize((p) => p + 1)}
                  aria-label="Increase dining guests"
                  className="tap-target min-h-[44px] min-w-[44px] rounded-xl bg-sand-100 dark:bg-darkbg hover:bg-sand-200 text-primary dark:text-sand flex items-center justify-center font-bold text-base active:scale-95 border-2 border-sand-300 dark:border-muted/30"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* 5. NEXT 14 DAYS DATE CHIPS */}
      <section className="bg-white dark:bg-surface rounded-t-[2.5rem] rounded-b-2xl p-5 shadow-arch border-2 border-sand-300 dark:border-muted/30 temple-card mb-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 font-bold text-base text-primary dark:text-sand">
            <Calendar className="w-4 h-4 text-marigold" />
            <span>{t.selectDateTitle}</span>
          </div>
          {isCurrentDateFestival && (
            <span className="text-[10px] bg-kumkum text-white font-bold px-2.5 py-0.5 rounded-full border border-kumkum-light">
              {t.festivalBadge}
            </span>
          )}
        </div>

        {/* Horizontal Chips Scroll (14 Days) with minimum 44px tap targets */}
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 no-scrollbar">
          {next14Days.map((d) => {
            const isSelected = selectedDate === d.dateStr;
            const rule = dateRules.find((r) => r.date === d.dateStr);
            const isBlocked = rule?.kind === 'blocked';
            const isFestival = rule?.kind === 'festival';

            return (
              <button
                key={d.dateStr}
                type="button"
                disabled={isBlocked}
                onClick={() => setSelectedDate(d.dateStr)}
                className={`tap-target flex-shrink-0 min-w-[76px] min-h-[64px] p-2.5 rounded-t-2xl rounded-b-xl text-center border-2 transition-all flex flex-col items-center justify-center ${
                  isBlocked
                    ? 'bg-sand-100 dark:bg-darkbg border-sand-300 text-muted opacity-40 cursor-not-allowed border-dashed'
                    : isSelected
                    ? 'bg-primary text-sand border-marigold shadow-md scale-105 ring-1 ring-marigold/40'
                    : isFestival
                    ? 'bg-kumkum-bg border-kumkum text-kumkum hover:bg-kumkum/15'
                    : 'bg-sand-50 dark:bg-darkbg border-sand-300 dark:border-muted/30 text-primary dark:text-sand hover:border-marigold'
                }`}
              >
                <span className={`text-[11px] font-medium leading-none ${isSelected ? 'text-marigold' : 'text-muted'}`}>
                  {lang === 'mr' ? d.dayNameMr : lang === 'hi' ? d.dayNameHi : d.dayNameEn}
                </span>
                <span className="text-lg font-black my-0.5 leading-none">
                  {d.dateObj.getDate()}
                </span>
                {isBlocked ? (
                  <span className="text-[9px] font-bold text-kumkum">
                    {lang === 'mr' ? 'बंद' : lang === 'hi' ? 'बंद' : 'Closed'}
                  </span>
                ) : isFestival ? (
                  <span className={`text-[9px] font-bold ${isSelected ? 'text-haldi' : 'text-kumkum'}`}>
                    {lang === 'mr' ? 'सण ★' : lang === 'hi' ? 'पर्व ★' : 'Fest ★'}
                  </span>
                ) : (
                  <span className={`text-[9px] ${isSelected ? 'text-sand/90' : 'text-muted'}`}>
                    {lang === 'mr' ? 'उपलब्ध' : lang === 'hi' ? 'खुला' : 'Open'}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Festival & Blocked contextual alerts */}
        {isCurrentDateFestival && (
          <div className="mt-3 p-3 rounded-xl bg-haldi-light dark:bg-sand-100 border border-haldi text-primary text-xs flex items-start gap-2">
            <Sparkles className="w-4 h-4 text-marigold-dark flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block">{t.festivalNotice}</span>
              <span className="text-[11px] opacity-90">
                {lang === 'mr'
                  ? (currentDayRule?.note_mr || currentDayRule?.note_en)
                  : lang === 'hi'
                  ? (currentDayRule?.note_hi || currentDayRule?.note_mr || currentDayRule?.note_en)
                  : (currentDayRule?.note_en || currentDayRule?.note_mr)}
              </span>
            </div>
          </div>
        )}

        {isCurrentDateBlocked && (
          <div className="mt-3 p-3 rounded-xl bg-kumkum-bg border border-kumkum text-kumkum text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-kumkum flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block">{t.blockedNotice}</span>
              <span className="text-[11px] opacity-90">
                {lang === 'mr'
                  ? (currentDayRule?.note_mr || currentDayRule?.note_en)
                  : lang === 'hi'
                  ? (currentDayRule?.note_hi || currentDayRule?.note_mr || currentDayRule?.note_en)
                  : (currentDayRule?.note_en || currentDayRule?.note_mr)}
              </span>
            </div>
          </div>
        )}
      </section>

      {/* 6. 30-MIN SLOT CHIPS (WITH CAPACITY / FULL LOGIC) */}
      <section className="bg-white dark:bg-surface rounded-t-[2.5rem] rounded-b-2xl p-5 shadow-arch border-2 border-sand-300 dark:border-muted/30 temple-card mb-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 font-bold text-base text-primary dark:text-sand">
            <Clock className="w-4 h-4 text-marigold" />
            <span>{t.selectSlotTitle}</span>
          </div>
          <span className="text-xs text-muted">
            {partySize} {t.guestsCount}
          </span>
        </div>

        {/* Slots Grid with 44px minimum tap targets */}
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {slots.map((slot) => {
            const isSelected = selectedSlotTime === slot.time;
            const isFull = slot.is_full;

            return (
              <button
                key={slot.time}
                type="button"
                disabled={isFull}
                onClick={() => setSelectedSlotTime(slot.time)}
                className={`tap-target min-h-[48px] p-2.5 rounded-xl border-2 text-center transition-all flex flex-col items-center justify-center ${
                  isFull
                    ? 'bg-sand-100 dark:bg-darkbg border-kumkum/40 text-muted opacity-50 cursor-not-allowed'
                    : isSelected
                    ? 'bg-primary text-sand border-marigold shadow-md scale-[1.02] ring-1 ring-marigold/40'
                    : 'bg-white dark:bg-surface border-sand-300 dark:border-muted/30 hover:border-marigold text-primary dark:text-sand'
                }`}
              >
                <span className="font-black text-sm leading-tight">{slot.time}</span>
                {isFull ? (
                  <span className="text-[10px] font-bold text-kumkum mt-0.5">
                    {t.slotFull}
                  </span>
                ) : (
                  <span
                    className={`text-[9px] mt-0.5 ${
                      isSelected ? 'text-marigold font-bold' : 'text-muted'
                    }`}
                  >
                    {slot.available_seats} {t.seatsLeft}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </section>

      {/* 7. GUEST DETAILS FORM & HONEYPOT */}
      <form onSubmit={handleSubmit} noValidate>
        <section className="bg-white dark:bg-surface rounded-t-[2.5rem] rounded-b-2xl p-5 shadow-arch border-2 border-sand-300 dark:border-muted/30 temple-card mb-4 space-y-4">
          <h2 className="text-base font-bold text-primary dark:text-sand border-b border-sand-300 dark:border-muted/30 pb-2">
            {t.guestDetailsTitle}
          </h2>

          {/* Error Message Box */}
          {formError && (
            <div
              role="alert"
              className="p-3.5 rounded-2xl bg-kumkum-bg border-2 border-kumkum text-kumkum text-xs flex items-start gap-2.5 animate-shake"
            >
              <AlertCircle className="w-4 h-4 text-kumkum flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block">{t.errorTitle}</span>
                <span>{lang === 'mr' ? formError.mr : lang === 'hi' ? (formError.hi || formError.mr) : formError.en}</span>
              </div>
            </div>
          )}

          {/* Honeypot Spam Trap (Hidden from users) */}
          <div className="hidden" aria-hidden="true" style={{ display: 'none', position: 'absolute', left: '-9999px' }}>
            <label htmlFor="hp_comment">Do not fill this field</label>
            <input
              type="text"
              id="hp_comment"
              name="hp_comment"
              value={honeypot}
              onChange={(e) => setHoneypot(e.target.value)}
              tabIndex={-1}
              autoComplete="off"
            />
          </div>

          {/* Guest Name */}
          <div>
            <label htmlFor="guest_name" className="block text-xs font-bold text-primary dark:text-sand mb-1">
              {t.nameLabel} <span className="text-kumkum">*</span>
            </label>
            <input
              type="text"
              id="guest_name"
              required
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              placeholder={t.namePlaceholder}
              className="w-full tap-target min-h-[44px] px-3.5 py-2.5 rounded-xl border-2 border-sand-300 dark:border-muted/40 focus:outline-none focus:border-marigold focus:ring-1 focus:ring-marigold text-sm bg-sand-50 dark:bg-darkbg text-primary dark:text-sand"
            />
          </div>

          {/* Mobile Phone (10 digits starting 6-9) */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="guest_phone" className="block text-xs font-bold text-primary dark:text-sand">
                {t.phoneLabel} <span className="text-kumkum">*</span>
              </label>
              <span className="text-[10px] text-muted">Indian Mobile (+91)</span>
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-muted text-xs font-bold">
                +91
              </div>
              <input
                type="tel"
                id="guest_phone"
                required
                maxLength={10}
                value={guestPhone}
                onChange={(e) => setGuestPhone(e.target.value.replace(/\D/g, ''))}
                placeholder={t.phonePlaceholder}
                className="w-full tap-target min-h-[44px] pl-12 pr-3.5 py-2.5 rounded-xl border-2 border-sand-300 dark:border-muted/40 focus:outline-none focus:border-marigold focus:ring-1 focus:ring-marigold text-sm bg-sand-50 dark:bg-darkbg text-primary dark:text-sand tracking-wider font-mono"
              />
            </div>
            <p className="text-[10px] text-muted mt-1">{t.phoneHint}</p>
          </div>

          {/* Special Requests / Notes */}
          <div>
            <label htmlFor="notes" className="block text-xs font-bold text-primary dark:text-sand mb-1">
              {t.noteLabel}
            </label>
            <textarea
              id="notes"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t.notePlaceholder}
              className="w-full px-3.5 py-2.5 rounded-xl border-2 border-sand-300 dark:border-muted/40 focus:outline-none focus:border-marigold focus:ring-1 focus:ring-marigold text-xs bg-sand-50 dark:bg-darkbg text-primary dark:text-sand resize-none"
            />
          </div>

          {/* Summary of Selection */}
          <div className="p-3.5 rounded-2xl bg-sand-100 dark:bg-darkbg border-2 border-sand-300 dark:border-muted/30 text-xs space-y-1.5 shadow-inner">
            <div className="flex justify-between text-muted">
              <span>{t.selectedDate} & {t.selectedTime}:</span>
              <span className="font-bold text-primary dark:text-sand">{selectedDate} @ {selectedSlotTime}</span>
            </div>
            <div className="flex justify-between text-muted">
              <span>{t.totalGuests}:</span>
              <span className="font-bold text-primary dark:text-sand">{partySize} {t.guestsCount}</span>
            </div>
            {(packageTotal > 0 || orderAheadTotal > 0) && (
              <div className="flex justify-between text-primary dark:text-sand font-bold pt-1 border-t border-sand-300 dark:border-muted/30">
                <span>{t.totalAmount}:</span>
                <span className="text-marigold font-black text-sm">
                  ₹{flow === 'group_meal' ? packageTotal : orderAheadTotal}
                </span>
              </div>
            )}
            <p className="text-[10px] text-muted pt-0.5">{t.payAtHotelNote}</p>
          </div>

          {/* Reserve Button (Guarded against double submission) - Text on accent is always #1B2559 */}
          <button
            type="submit"
            disabled={isSubmitting || isCurrentDateBlocked}
            className="w-full tap-target min-h-[52px] py-4 px-6 rounded-2xl bg-accent hover:bg-accent-hover active:scale-[0.99] disabled:opacity-50 text-accent-ink font-black text-base shadow-marigold transition-all flex items-center justify-center gap-2 border-2 border-brass/50 cursor-pointer focus-visible:ring-2 focus-visible:ring-accent"
          >
            {isSubmitting ? (
              <>
                <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                <span className="text-accent-ink font-black">{t.submittingButton}</span>
              </>
            ) : (
              <>
                <span className="text-accent-ink font-black">
                  {lang === 'mr' ? 'आरक्षण निश्चित करा (Reserve Now)' : lang === 'hi' ? 'आरक्षण निश्चित करें (Reserve Now)' : 'Reserve Now'}
                </span>
                <span className="text-accent-ink font-black text-lg">→</span>
              </>
            )}
          </button>
        </section>
      </form>

      {/* Footer navigation */}
      <footer className="text-center text-xs text-muted mt-6">
        <Link href="/" className="hover:underline text-primary dark:text-sand font-medium">
          {t.backToHome}
        </Link>
        <div className="mt-2 text-[11px] opacity-75">
          Shree Pure Veg Theur • Next.js App Router • Mandir Heritage Theme
        </div>
      </footer>
    </main>
  );
}
