'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import {
  Bell,
  BellOff,
  Volume2,
  VolumeX,
  Phone,
  MessageSquare,
  CheckCircle,
  XCircle,
  Clock,
  Users,
  Shield,
  UtensilsCrossed,
  RotateCw,
  Download,
  AlertTriangle,
  Send,
  UserCheck,
  UserX,
  Sparkles,
  ExternalLink,
  ChevronRight,
  LogOut,
  HelpCircle,
  Check,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Calendar,
  BarChart3,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { BookingRecord } from '@/lib/booking/booking-service';
import { adminTranslations, AdminLanguage } from '@/lib/admin-translations';
import {
  unlockAudioContext,
  isAudioUnlocked,
  startLoopingChime,
  stopLoopingChime,
  isLoopingChimeActive,
  playChimeBurst,
} from '@/lib/audio/chime-synthesizer';
import {
  getGuestReminderWaUrl,
  getOwnerAlertWaUrl,
  getGuestChatWaUrl,
  findNextAvailableSlot,
  MessageKind,
} from '@/lib/messaging';
import { WhatsAppActionModal } from '@/components/whatsapp-action-modal';
import { MessageLogsModal } from '@/components/message-logs-modal';
import { AdminMenuManager } from '@/components/admin/admin-menu-manager';
import { AdminDatesManager } from '@/components/admin/admin-dates-manager';
import { AdminPackagesManager } from '@/components/admin/admin-packages-manager';
import { AdminReportsView } from '@/components/admin/admin-reports-view';
import { VapidAndroidGuide } from '@/components/vapid-android-guide';

type StaffRole = 'owner' | 'manager' | 'kitchen';

interface StaffUser {
  id: string;
  email: string;
  fullName: string;
  role: StaffRole;
}

interface ExpectedSummary {
  confirmedGuests: number;
  waitingGuests: number;
  seatedGuests?: number;
  totalTables: number;
  pendingCount: number;
}

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

export default function AdminPortalPage() {
  // Locale State (Defaults to English)
  const [lang, setLang] = useState<AdminLanguage>('en');
  const t = adminTranslations[lang];

  useEffect(() => {
    const saved = getCookie(LOCALE_COOKIE_KEY);
    if (saved === 'en' || saved === 'hi' || saved === 'mr') {
      setLang(saved as AdminLanguage);
    }
  }, []);

  const handleLangChange = (newLang: AdminLanguage) => {
    setLang(newLang);
    setCookie(LOCALE_COOKIE_KEY, newLang);
  };

  // Auth & Role State
  const [user, setUser] = useState<StaffUser | null>(null);
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Bookings Inbox State
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [filter, setFilter] = useState<'pending' | 'today' | 'tomorrow' | 'all'>('pending');
  const [loading, setLoading] = useState(true);
  const [todaySummary, setTodaySummary] = useState<ExpectedSummary>({
    confirmedGuests: 0,
    waitingGuests: 0,
    seatedGuests: 0,
    totalTables: 0,
    pendingCount: 0,
  });
  const [tomorrowSummary, setTomorrowSummary] = useState<ExpectedSummary>({
    confirmedGuests: 0,
    waitingGuests: 0,
    totalTables: 0,
    pendingCount: 0,
  });

  // Layer (a): Loud looping chime & flashing alert banner state
  const [audioUnlocked, setAudioUnlocked] = useState(false);
  const [hasNewAlert, setHasNewAlert] = useState(false);
  const [alertBooking, setAlertBooking] = useState<BookingRecord | null>(null);
  const [isChiming, setIsChiming] = useState(false);

  // Layer (b): Web push subscription state
  const [pushStatus, setPushStatus] = useState<'prompt' | 'granted' | 'denied' | 'unsupported'>('prompt');
  const [pushSubscribed, setPushSubscribed] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);

  // PWA Install State
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [isStandalone, setIsStandalone] = useState(false);

  // Modals & Action Sheet
  const [prepModalBooking, setPrepModalBooking] = useState<BookingRecord | null>(null);
  const [rejectModalBooking, setRejectModalBooking] = useState<BookingRecord | null>(null);
  const [selectedPrepMins, setSelectedPrepMins] = useState<number>(15);
  const [selectedRejectReason, setSelectedRejectReason] = useState<string>('जागा शिल्लक नाही (Slot Full)');
  const [customRejectReason, setCustomRejectReason] = useState<string>('');
  const [guideModalOpen, setGuideModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // WhatsApp Action Sheet & Message Log Modals
  const [waModalOpen, setWaModalOpen] = useState(false);
  const [waModalKind, setWaModalKind] = useState<MessageKind>('guest_confirmed');
  const [waModalBooking, setWaModalBooking] = useState<BookingRecord | null>(null);
  const [waNextSlotOverride, setWaNextSlotOverride] = useState<string | undefined>(undefined);
  const [waRejectReasonOverride, setWaRejectReasonOverride] = useState<string | undefined>(undefined);
  const [waPrepMinsOverride, setWaPrepMinsOverride] = useState<number | undefined>(undefined);
  const [messageLogsModalOpen, setMessageLogsModalOpen] = useState(false);

  // Top-Level Module Navigation Tab State
  const [adminSection, setAdminSection] = useState<'inbox' | 'reports' | 'menu' | 'dates' | 'packages'>('inbox');

  // Demo Mode Flags & Operations
  const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';
  const [resettingDemo, setResettingDemo] = useState(false);
  const [simulatingGroup, setSimulatingGroup] = useState(false);

  const supabase = createClient();
  const knownBookingIdsRef = useRef<Set<string>>(new Set());

  // Show Toast
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // 1. Initialize PWA detection & check push/audio capabilities
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Check standalone mode
      if (
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone
      ) {
        setIsStandalone(true);
      }

      // Check Notification permission
      if (!('Notification' in window)) {
        setPushStatus('unsupported');
      } else {
        setPushStatus(Notification.permission as any);
        if (Notification.permission === 'granted') {
          // Check if subscription exists
          navigator.serviceWorker.ready.then((reg) => {
            reg.pushManager.getSubscription().then((sub) => {
              if (sub) setPushSubscribed(true);
            });
          });
        }
      }

      // Audio state check
      setAudioUnlocked(isAudioUnlocked());

      // PWA beforeinstallprompt capture
      const handleInstallable = (e: any) => {
        setInstallPrompt(e.detail || (window as any).deferredPrompt);
      };
      const handleInstalled = () => {
        setIsStandalone(true);
        setInstallPrompt(null);
      };

      window.addEventListener('pwa-installable', handleInstallable);
      window.addEventListener('pwa-installed', handleInstalled);

      if ((window as any).deferredPrompt) {
        setInstallPrompt((window as any).deferredPrompt);
      }

      return () => {
        window.removeEventListener('pwa-installable', handleInstallable);
        window.removeEventListener('appinstalled', handleInstalled);
      };
    }
  }, []);

  // Check Supabase Auth session on mount
  useEffect(() => {
    if (!supabase) return;
    const checkSession = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (session?.user) {
          const { data: profile } = await supabase
            .from('staff_profiles')
            .select('*')
            .eq('user_id', session.user.id)
            .single();

          setUser({
            id: session.user.id,
            email: session.user.email || '',
            fullName:
              profile?.full_name || session.user.email?.split('@')[0] || 'Staff Member',
            role: (profile?.role as StaffRole) || 'owner',
          });
        }
      } catch (err) {
        console.warn('Session check note:', err);
      }
    };
    checkSession();
  }, [supabase]);

  // 2. Fetch Bookings from API
  const fetchBookings = useCallback(async (isSilent = false) => {
    try {
      if (!isSilent) setLoading(true);
      const res = await fetch(`/api/admin/bookings?filter=${filter}`);
      const json = await res.json();

      if (json.success && Array.isArray(json.bookings)) {
        const incoming: BookingRecord[] = json.bookings;

        // Check if there is an unacknowledged new booking
        if (knownBookingIdsRef.current.size > 0) {
          const freshPending = incoming.find(
            (b) => b.status === 'pending' && !knownBookingIdsRef.current.has(b.id)
          );
          if (freshPending) {
            triggerNewBookingAlert(freshPending);
          }
        }

        // Update known IDs
        const newSet = new Set<string>();
        incoming.forEach((b) => newSet.add(b.id));
        knownBookingIdsRef.current = newSet;

        setBookings(incoming);
        if (json.todaySummary) setTodaySummary(json.todaySummary);
        if (json.tomorrowSummary) setTomorrowSummary(json.tomorrowSummary);
      }
    } catch (err) {
      console.warn('Failed to fetch bookings:', err);
    } finally {
      if (!isSilent) setLoading(false);
    }
  }, [filter]);

  // Initial and Filter-change Fetch
  useEffect(() => {
    if (user) {
      fetchBookings();
    }
  }, [fetchBookings, user]);

  // Layer (a): Trigger loud looping chime & flashing banner
  const triggerNewBookingAlert = (booking: BookingRecord) => {
    setHasNewAlert(true);
    setAlertBooking(booking);
    setIsChiming(true);
    startLoopingChime(0.9);
  };

  // Mute / Acknowledge Alert
  const dismissAlert = () => {
    stopLoopingChime();
    setIsChiming(false);
    setHasNewAlert(false);
  };

  // Enable Sound / Unlock Audio Context
  const handleEnableSound = async () => {
    const success = await unlockAudioContext();
    if (success) {
      setAudioUnlocked(true);
      showToast(lang === 'mr' ? 'ध्वनी अलर्ट यशस्वीरित्या सुरू झाला! 🔔' : 'Audio alerts enabled! 🔔');
    }
  };

  // Test Sound
  const handleTestSound = async () => {
    await unlockAudioContext();
    setAudioUnlocked(true);
    playChimeBurst(0.85);
    showToast(lang === 'mr' ? 'चाचणी बेल वाजवली गेली! 🔔' : 'Test chime played! 🔔');
  };

  // 3. Supabase Realtime Subscription Setup
  useEffect(() => {
    if (!supabase || !user) return;

    // Realtime Postgres change channel
    const channel = supabase
      .channel('staff-live-inbox')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'bookings' },
        (payload) => {
          const newBooking = payload.new as BookingRecord;
          setBookings((prev) => [newBooking, ...prev]);
          if (newBooking.status === 'pending') {
            triggerNewBookingAlert(newBooking);
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'bookings' },
        (payload) => {
          const updated = payload.new as BookingRecord;
          setBookings((prev) =>
            prev.map((b) => (b.id === updated.id ? updated : b))
          );
        }
      )
      .subscribe();

    // Secondary fast polling for resiliency on highway 4G
    const interval = setInterval(() => {
      fetchBookings(true);
    }, 6000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
      stopLoopingChime();
    };
  }, [supabase, fetchBookings]);

  // 4. Web Push Subscribe Handler (VAPID)
  const handleSubscribePush = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      alert(t.pushUnsupported);
      return;
    }

    try {
      setPushLoading(true);

      // Request permission
      const permission = await Notification.requestPermission();
      setPushStatus(permission as any);

      if (permission !== 'granted') {
        alert(
          lang === 'mr'
            ? 'कृपया ब्राउझर सेटिंग्जमधून सूचना परवानगी द्या.'
            : 'Please grant notification permissions in browser settings.'
        );
        return;
      }

      // Fetch VAPID Public Key from server
      const keyRes = await fetch('/api/push/key');
      const keyData = await keyRes.json();
      const vapidKey = keyData.publicKey;

      const reg = await navigator.serviceWorker.ready;

      // Convert VAPID key to Uint8Array
      const padding = '='.repeat((4 - (vapidKey.length % 4)) % 4);
      const base64 = (vapidKey + padding).replace(/-/g, '+').replace(/_/g, '/');
      const rawData = window.atob(base64);
      const outputArray = new Uint8Array(rawData.length);
      for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
      }

      // Subscribe to PushManager
      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: outputArray,
      });

      // Save to server
      const subRes = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscription,
          userId: user?.id,
          role: user?.role,
        }),
      });

      if (subRes.ok) {
        setPushSubscribed(true);
        showToast(lang === 'mr' ? 'VAPID पुश सूचना यशस्वीरित्या सुरू झाल्या! ✅' : 'Web Push subscribed successfully! ✅');
      }
    } catch (err: any) {
      console.error('Push subscription failed:', err);
      alert('Push setup failed: ' + err.message);
    } finally {
      setPushLoading(false);
    }
  };

  // Test Push Send to Current Device
  const handleSendTestPush = async () => {
    try {
      if (!('serviceWorker' in navigator)) return;
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (!sub) {
        alert(lang === 'mr' ? 'कृपया प्रथम पुश सूचना सुरू करा.' : 'Please subscribe to push first.');
        return;
      }

      const res = await fetch('/api/push/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription: sub }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(lang === 'mr' ? 'चाचणी पुश सूचना पाठवली! (Check phone/screen)' : 'Test push sent! Check device.');
      } else {
        alert(data.message || 'Push test failed');
      }
    } catch (e: any) {
      alert('Test failed: ' + e.message);
    }
  };

  // 5. Trigger Simulated Booking (Demo Feature)
  const handleSimulateNewBooking = async () => {
    try {
      const res = await fetch('/api/admin/bookings', { method: 'POST' });
      const data = await res.json();
      if (data.success && data.booking) {
        setBookings((prev) => [data.booking, ...prev]);
        triggerNewBookingAlert(data.booking);
        showToast(
          lang === 'mr'
            ? `⚡ नवीन बुकिंग प्राप्त! टोकन #${data.booking.token_number}`
            : `⚡ New booking simulated! Token #${data.booking.token_number}`
        );
      }
    } catch {
      showToast('Simulation failed');
    }
  };

  // 5b. Simulate Pilgrim Group Request (12-16 Guests, Tomorrow, Free Capacity Slot)
  // Submits through the normal create_booking path (POST /api/bookings) so alerts, push and realtime all fire!
  const handleSimulatePilgrimGroup = async () => {
    try {
      setSimulatingGroup(true);

      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`;

      // 1. Pick party size in range 12 to 16 guests (e.g. 14 pilgrims)
      const pilgrimSizes = [12, 14, 15, 16];
      const partySize = pilgrimSizes[Math.floor(Math.random() * pilgrimSizes.length)];

      // 2. Discover slot with free capacity for tomorrow
      let selectedSlotTime = '13:00';
      try {
        const slotsRes = await fetch(`/api/bookings?date=${tomorrowStr}&party_size=${partySize}`);
        const slotsData = await slotsRes.json();
        if (slotsData.success && Array.isArray(slotsData.slots)) {
          const candidateTimes = ['12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '19:00', '19:30', '20:00'];
          const openSlot = candidateTimes.find((time) => {
            const s = slotsData.slots.find((slot: any) => slot.time === time);
            return s && !s.is_full && s.available_seats >= partySize;
          });
          if (openSlot) selectedSlotTime = openSlot;
        }
      } catch {
        selectedSlotTime = '13:00';
      }

      const slotStartIso = `${tomorrowStr}T${selectedSlotTime}:00+05:30`;

      // 3. Realistic Maharashtrian Pilgrim Wari Group
      const samplePilgrims = [
        {
          name: 'ह.भ.प. ज्ञानेश्वर महाराज पालखी मंडळ (वारकरी भाविक संघ)',
          phone: '9822114455',
          notes: 'थेऊर चिंतामणी महापूजा व दर्शन झाल्यावर दुपारी आगमन. शुद्ध सात्विक पंगत थाळी, गरम बाजरी भाकरी व कटाची आमटी हवी.',
        },
        {
          name: 'श्री चिंतामणी वारकरी भजन मंडळ (पुणे-सोलापूर यात्रा)',
          phone: '9422003322',
          notes: 'भाविक बस दौरा. विना कांदा-लसूण सात्विक जेवण, ताजे ताक आणि पंगत बैठक व्यवस्था.',
        },
        {
          name: 'संत तुकाराम महाराज भक्त परिवार (आळंदी-देहू दर्शन संघ)',
          phone: '9850223344',
          notes: 'प्रवासातील भाविक समूह. त्वरित पंगत थाळी सेवा अपेक्षित. दुपारी १ वाजता पोहोचत आहोत.',
        },
      ];
      const pilgrimPick = samplePilgrims[Math.floor(Math.random() * samplePilgrims.length)];

      // 4. Normal create_booking path: POST /api/bookings
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-demo-simulation': 'true',
        },
        body: JSON.stringify({
          type: 'group_meal',
          party_size: partySize,
          slot_start: slotStartIso,
          guest_name: pilgrimPick.name,
          guest_phone: pilgrimPick.phone,
          notes: pilgrimPick.notes,
          package_id: 'pkg-1-pilgrim', // Chintamani Pilgrim Darshan Thali Feast
        }),
      });

      const data = await res.json();
      if (data.success) {
        // Unlock browser audio context if locked
        if (!isAudioUnlocked()) {
          await unlockAudioContext();
          setAudioUnlocked(true);
        }

        // Fetch refreshed bookings from server
        await fetchBookings(false);

        const newRec: BookingRecord = {
          id: data.booking_id,
          restaurant_id: 'shree-theur-main',
          token_number: data.token_number,
          type: 'group_meal',
          party_size: partySize,
          slot_start: slotStartIso,
          status: 'pending',
          guest_name: pilgrimPick.name,
          guest_phone: pilgrimPick.phone,
          notes: pilgrimPick.notes,
          package_id: 'pkg-1-pilgrim',
          total_estimated_amount: data.total_estimated_amount || partySize * 210,
          created_at: new Date().toISOString(),
          is_demo: true,
        };

        // Fire audio chime, flashing banner and alert state
        triggerNewBookingAlert(newRec);

        showToast(
          lang === 'mr'
            ? `🙏 नवीन भाविक पंगत आरक्षण दाखल! #${data.token_number} (${partySize} भाविक)`
            : `🙏 Pilgrim group booking simulated! #${data.token_number} (${partySize} guests)`
        );
      } else {
        alert(data.message_mr || data.message_en || 'Simulation failed');
      }
    } catch (err: any) {
      alert('Simulation error: ' + err.message);
    } finally {
      setSimulatingGroup(false);
    }
  };

  // 5c. Reset Demo Data (Owner-Only, calls reset_demo())
  const handleResetDemoData = async () => {
    if (user?.role !== 'owner') {
      alert(t.demoOwnerOnlyNotice);
      return;
    }

    if (!window.confirm(t.resetDemoConfirm)) {
      return;
    }

    try {
      setResettingDemo(true);
      const res = await fetch('/api/admin/demo/reset', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-staff-role': user.role,
        },
      });

      const json = await res.json();
      if (json.success) {
        dismissAlert();
        await fetchBookings(false);
        showToast(t.resetDemoSuccess);
      } else {
        alert(json.message_mr || json.message_en || 'Reset failed');
      }
    } catch (err: any) {
      alert('Reset error: ' + err.message);
    } finally {
      setResettingDemo(false);
    }
  };

  // 6. Handle PWA Custom Install Prompt
  const handleInstallApp = async () => {
    if (!installPrompt) {
      alert(
        lang === 'mr'
          ? 'अॅप आधीच इन्स्टॉल झालेले आहे किंवा ब्राउझर मेनू (⋮) मधून "Add to Home Screen" निवडा.'
          : 'App is either already installed or use browser menu (⋮) -> "Add to Home Screen".'
      );
      return;
    }
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsStandalone(true);
      setInstallPrompt(null);
    }
  };

  // 7. Update Booking Status (With Role Enforcement)
  const handleUpdateStatus = async (
    bookingId: string,
    newStatus: 'confirmed' | 'rejected' | 'seated' | 'no_show',
    options?: { rejectionReason?: string; prepTimeMins?: number }
  ): Promise<BookingRecord | null> => {
    // UI Role Guard
    if (user?.role === 'kitchen') {
      alert(t.roleReadOnlyNotice);
      return null;
    }

    try {
      const res = await fetch(`/api/bookings/${bookingId}/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-staff-role': user?.role || 'owner',
        },
        body: JSON.stringify({
          status: newStatus,
          rejection_reason: options?.rejectionReason,
          prep_time_mins: options?.prepTimeMins,
          role: user?.role,
        }),
      });

      const data = await res.json();
      if (data.success && data.booking) {
        setBookings((prev) =>
          prev.map((b) => (b.id === bookingId ? data.booking : b))
        );
        showToast(t.statusUpdatedToast);

        // If this was the alert booking, dismiss chime
        if (alertBooking?.id === bookingId) {
          dismissAlert();
        }
        return data.booking as BookingRecord;
      } else {
        alert(data.message_mr || data.message || 'Status update failed');
        return null;
      }
    } catch (e: any) {
      alert('Update failed: ' + e.message);
      return null;
    }
  };

  // 8. Demo Quick Role Switcher
  const handleSwitchRole = (newRole: StaffRole) => {
    const rolesMap: Record<StaffRole, StaffUser> = {
      owner: {
        id: 'user-owner',
        email: 'owner@shreeveg.com',
        fullName: 'श्रीमंत पाटील (मालक)',
        role: 'owner',
      },
      manager: {
        id: 'user-manager',
        email: 'manager@shreeveg.com',
        fullName: 'सचिन मोरे (व्यवस्थापक)',
        role: 'manager',
      },
      kitchen: {
        id: 'user-kitchen',
        email: 'kitchen@shreeveg.com',
        fullName: 'किचन शेफ बापू (फक्त वाचन)',
        role: 'kitchen',
      },
    };
    setUser(rolesMap[newRole]);
    showToast(
      lang === 'mr'
        ? `भूमिका बदलली: ${rolesMap[newRole].fullName}`
        : `Role switched: ${newRole.toUpperCase()}`
    );
  };

  // 9. Sign Out
  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch {}
    setUser(null);
    setEmailInput('');
    setPasswordInput('');
    showToast(lang === 'mr' ? 'लॉगआउट यशस्वी!' : 'Signed out successfully!');
  };

  // 10. Supabase Auth Sign In (Email + Password)
  const handleSupabaseSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError(null);

    try {
      // 1. Try real Supabase auth
      const { data, error } = await supabase.auth.signInWithPassword({
        email: emailInput,
        password: passwordInput,
      });

      if (error) {
        // Fallback for local demo usernames if Supabase is unconfigured
        if (emailInput.includes('owner') || emailInput.includes('shree')) {
          handleSwitchRole('owner');
          setAuthLoading(false);
          return;
        } else if (emailInput.includes('manager')) {
          handleSwitchRole('manager');
          setAuthLoading(false);
          return;
        } else if (emailInput.includes('kitchen')) {
          handleSwitchRole('kitchen');
          setAuthLoading(false);
          return;
        }
        throw error;
      }

      if (data?.user) {
        // Fetch staff profile from DB
        const { data: profile } = await supabase
          .from('staff_profiles')
          .select('*')
          .eq('user_id', data.user.id)
          .single();

        setUser({
          id: data.user.id,
          email: data.user.email || '',
          fullName: profile?.full_name || data.user.email?.split('@')[0] || 'Staff Member',
          role: (profile?.role as StaffRole) || 'owner',
        });
        showToast(lang === 'mr' ? 'यशस्वी लॉगिन झाले!' : 'Successfully signed in!');
      }
    } catch (err: any) {
      setAuthError(err.message || 'लॉगिन अयशस्वी (Sign in failed)');
    } finally {
      setAuthLoading(false);
    }
  };

  const isKitchen = user?.role === 'kitchen';

  // ==========================================================================
  // UN-AUTHENTICATED: RENDER SUPABASE AUTH LOGIN SCREEN
  // ==========================================================================
  if (!user) {
    return (
      <div className="min-h-screen bg-[#0F1330] text-[#F0F3FF] flex flex-col font-body selection:bg-marigold selection:text-primary pb-12">
        {/* DEMO MODE TOP BANNER */}
        {isDemoMode && (
          <div className="bg-[#13183B] border-b border-[#262F60] px-4 py-2.5 text-xs text-[#9AA3CC] flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-marigold animate-pulse"></span>
              <span className="font-bold text-marigold">{t.demoBannerActive}</span>
              <span className="hidden sm:inline text-[#9AA3CC]">• NH-65 Theur Phata</span>
            </div>
            <span className="text-[11px] text-marigold/90 font-medium">
              {lang === 'mr' ? 'खालील १-टॅप रोल निवडून थेट प्रवेश करा ↓' : 'Select a 1-tap test role below to enter ↓'}
            </span>
          </div>
        )}

        {/* Navigation Bar */}
        <header className="border-b border-[#262F60] bg-[#1A2048]/90 backdrop-blur sticky top-0 z-40">
          <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brass via-marigold to-haldi flex items-center justify-center font-heading font-black text-xl text-primary shadow-lg shadow-marigold/20 border border-marigold/40">
                श्री
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="font-heading font-black text-base text-white tracking-wide">{t.portalTitle}</h1>
                  <span className="text-[10px] bg-marigold/15 text-marigold border border-marigold/30 px-2 py-0.5 rounded-full font-bold">
                    NH-65
                  </span>
                </div>
                <p className="text-xs text-[#9AA3CC]">{t.portalSubtitle}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Install PWA Button */}
              <button
                onClick={handleInstallApp}
                className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-bold border transition flex items-center gap-1.5 tap-target ${
                  isStandalone
                    ? 'bg-tulsi/15 text-tulsi-light border-tulsi/30'
                    : 'bg-marigold hover:bg-marigold-hover text-primary font-black border-marigold shadow-md'
                }`}
              >
                <Download className="w-4 h-4" />
                <span>{isStandalone ? t.appInstalled : t.installApp}</span>
              </button>

              {/* Language Switcher */}
              <div className="inline-flex rounded-xl bg-[#121738] p-0.5 border border-[#262F60]">
                <button
                  type="button"
                  onClick={() => handleLangChange('en')}
                  className={`min-h-[40px] px-2.5 py-1 text-xs font-bold rounded-lg transition tap-target ${
                    lang === 'en'
                      ? 'bg-marigold text-primary font-black shadow'
                      : 'text-[#9AA3CC] hover:text-white'
                  }`}
                >
                  EN
                </button>
                <button
                  type="button"
                  onClick={() => handleLangChange('hi')}
                  className={`min-h-[40px] px-2.5 py-1 text-xs font-bold rounded-lg transition tap-target ${
                    lang === 'hi'
                      ? 'bg-marigold text-primary font-black shadow'
                      : 'text-[#9AA3CC] hover:text-white'
                  }`}
                >
                  हिंदी
                </button>
                <button
                  type="button"
                  onClick={() => handleLangChange('mr')}
                  className={`min-h-[40px] px-2.5 py-1 text-xs font-bold rounded-lg transition tap-target ${
                    lang === 'mr'
                      ? 'bg-marigold text-primary font-black shadow'
                      : 'text-[#9AA3CC] hover:text-white'
                  }`}
                >
                  मराठी
                </button>
              </div>

              {/* Guide Button */}
              <button
                onClick={() => setGuideModalOpen(true)}
                title={t.helpGuideBtn}
                className="min-h-[44px] min-w-[44px] p-2.5 bg-[#121738] hover:bg-[#1A2048] border border-[#262F60] text-[#9AA3CC] hover:text-marigold rounded-xl transition flex items-center justify-center tap-target"
              >
                <HelpCircle className="w-4 h-4" />
              </button>
            </div>
          </div>
        </header>

        {/* Login Main Container */}
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-[#1A2048] border border-[#262F60] rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur relative overflow-hidden">
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-marigold/10 rounded-full blur-3xl pointer-events-none" />

            <div className="text-center mb-6">
              <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-gradient-to-br from-brass via-marigold to-haldi flex items-center justify-center font-heading font-black text-2xl text-primary shadow-xl shadow-marigold/25 border border-marigold/40">
                श्री
              </div>
              <h2 className="font-heading text-2xl font-bold text-white mb-1.5">{t.loginTitle}</h2>
              <p className="text-xs text-[#9AA3CC] max-w-sm mx-auto leading-relaxed">{t.loginSub}</p>
            </div>

            {authError && (
              <div className="mb-4 p-3 rounded-xl bg-kumkum/15 border border-kumkum/40 text-[#E8554A] text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-kumkum" />
                <span>{authError}</span>
              </div>
            )}

            <form onSubmit={handleSupabaseSignIn} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#F0F3FF] mb-1.5">
                  {t.emailLabel}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#5B6285]">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    required
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    placeholder="owner@shreeveg.com"
                    className="min-h-[44px] w-full bg-[#0F1330] border border-[#262F60] rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-white placeholder-[#5B6285] focus:outline-none focus:border-marigold focus:ring-1 focus:ring-marigold transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#F0F3FF] mb-1.5">
                  {t.passwordLabel}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#5B6285]">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    placeholder="••••••••"
                    className="min-h-[44px] w-full bg-[#0F1330] border border-[#262F60] rounded-xl pl-10 pr-12 py-2.5 text-xs text-white placeholder-[#5B6285] focus:outline-none focus:border-marigold focus:ring-1 focus:ring-marigold transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="min-h-[44px] min-w-[44px] absolute inset-y-0 right-0 pr-3 flex items-center justify-center text-[#9AA3CC] hover:text-white transition tap-target"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={authLoading}
                className="min-h-[44px] w-full py-2.5 px-4 bg-marigold hover:bg-marigold-hover text-primary font-black text-xs rounded-xl shadow-lg shadow-marigold/25 flex items-center justify-center gap-2 transition disabled:opacity-50 tap-target focus-visible:ring-2 focus-visible:ring-marigold"
              >
                {authLoading ? (
                  <RotateCw className="w-4 h-4 animate-spin text-primary" />
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 text-primary" />
                    <span className="font-black text-primary">{t.signInBtn}</span>
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 pt-5 border-t border-[#262F60]">
              <div className="text-[11px] font-bold text-[#9AA3CC] mb-2.5 text-center flex items-center justify-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-marigold" />
                <span>{t.demoRolesTitle}</span>
              </div>

              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => handleSwitchRole('owner')}
                  className="min-h-[44px] w-full p-3 bg-[#0F1330] hover:bg-[#121738] border border-[#262F60] hover:border-marigold/50 rounded-xl text-left flex items-center justify-between transition group tap-target"
                >
                  <div>
                    <div className="text-xs font-black text-marigold flex items-center gap-1.5">
                      <span>👑</span>
                      <span>{t.roleOwner}</span>
                      <span className="text-[10px] text-[#9AA3CC] font-normal font-mono">(owner@shreeveg.com)</span>
                    </div>
                    <div className="text-[10px] text-[#9AA3CC]">{t.demoRoleOwnerHint}</div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[#5B6285] group-hover:text-marigold transition" />
                </button>

                <button
                  type="button"
                  onClick={() => handleSwitchRole('manager')}
                  className="min-h-[44px] w-full p-3 bg-[#0F1330] hover:bg-[#121738] border border-[#262F60] hover:border-sky-500/50 rounded-xl text-left flex items-center justify-between transition group tap-target"
                >
                  <div>
                    <div className="text-xs font-bold text-sky-300 flex items-center gap-1.5">
                      <span>📋</span>
                      <span>{t.roleManager}</span>
                      <span className="text-[10px] text-[#9AA3CC] font-normal font-mono">(manager@shreeveg.com)</span>
                    </div>
                    <div className="text-[10px] text-[#9AA3CC]">{t.demoRoleManagerHint}</div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[#5B6285] group-hover:text-sky-300 transition" />
                </button>

                <button
                  type="button"
                  onClick={() => handleSwitchRole('kitchen')}
                  className="min-h-[44px] w-full p-3 bg-[#0F1330] hover:bg-[#121738] border border-[#262F60] hover:border-kumkum/50 rounded-xl text-left flex items-center justify-between transition group tap-target"
                >
                  <div>
                    <div className="text-xs font-bold text-[#E8554A] flex items-center gap-1.5">
                      <span>🍳</span>
                      <span>{t.roleKitchen}</span>
                      <span className="text-[10px] text-[#E8554A]/90 font-medium font-mono">({t.roleReadOnlyBadge})</span>
                    </div>
                    <div className="text-[10px] text-[#9AA3CC]">{t.demoRoleKitchenHint}</div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[#5B6285] group-hover:text-[#E8554A] transition" />
                </button>
              </div>
            </div>

            <div className="mt-5 pt-4 border-t border-[#262F60] flex items-center justify-between text-[11px] text-[#9AA3CC]">
              <button
                type="button"
                onClick={() => setGuideModalOpen(true)}
                className="hover:text-marigold flex items-center gap-1 transition"
              >
                <HelpCircle className="w-3.5 h-3.5 text-marigold" />
                <span>{t.helpGuideBtn}</span>
              </button>

              <Link href="/book" className="hover:text-marigold transition">
                {lang === 'mr' ? 'ग्राहक बुकिंग पोर्टल →' : 'Customer Booking Portal →'}
              </Link>
            </div>
          </div>
        </div>

        <VapidAndroidGuide
          isOpen={guideModalOpen}
          onClose={() => setGuideModalOpen(false)}
          lang={lang}
        />

        {toastMessage && (
          <div className="fixed bottom-5 right-5 z-50 bg-[#1A2048] border border-marigold text-white px-4 py-3 rounded-xl text-xs font-semibold shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2">
            <Sparkles className="w-4 h-4 text-marigold" />
            <span>{toastMessage}</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0F1330] text-[#F0F3FF] flex flex-col font-body selection:bg-marigold selection:text-primary pb-20">
      {/* ==================================================================== */}
      {/* DEMO MODE CONTROL BANNER (NEXT_PUBLIC_DEMO_MODE=true)                */}
      {/* ==================================================================== */}
      {isDemoMode && (
        <div className="bg-[#13183B] border-b border-[#262F60] shadow-lg px-4 py-2.5 sticky top-0 z-50">
          <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-3 text-xs">
            {/* Left Status */}
            <div className="flex items-center gap-2.5">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-marigold opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-marigold"></span>
              </span>
              <div className="flex items-center gap-2">
                <span className="font-black text-marigold uppercase tracking-wider text-[11px]">
                  {t.demoBannerActive}
                </span>
                <span className="hidden sm:inline text-[#9AA3CC] text-[11px] border-l border-[#262F60] pl-2">
                  NH-65 Theur Phata • मालक प्रात्यक्षिक
                </span>
              </div>
            </div>

            {/* Right Controls */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Simulate Pilgrim Group Request */}
              <button
                type="button"
                onClick={handleSimulatePilgrimGroup}
                disabled={simulatingGroup}
                className="min-h-[44px] px-4 py-2 bg-marigold hover:bg-marigold-hover text-primary font-black rounded-xl flex items-center gap-1.5 shadow-md shadow-marigold/20 transition active:scale-95 disabled:opacity-50 tap-target"
                title={lang === 'mr' ? 'उद्याच्या मोकळ्या वेळेत १२-१६ भाविकांचे पंगत आरक्षण सिम्युलेट करा' : 'Simulate 12-16 pilgrim group feast tomorrow'}
              >
                {simulatingGroup ? (
                  <RotateCw className="w-3.5 h-3.5 animate-spin text-primary" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5 text-primary" />
                )}
                <span className="font-black text-primary">{t.simulatePilgrimBtn}</span>
              </button>

              {/* Owner-only: Reset demo data button */}
              {user?.role === 'owner' ? (
                <button
                  type="button"
                  onClick={handleResetDemoData}
                  disabled={resettingDemo}
                  className="min-h-[44px] px-3.5 py-2 bg-kumkum/20 hover:bg-kumkum/30 text-[#E8554A] hover:text-white border border-kumkum/40 font-bold rounded-xl flex items-center gap-1.5 transition active:scale-95 disabled:opacity-50 shadow-sm tap-target"
                  title={lang === 'mr' ? 'फक्त मालकांसाठी: सर्व चाचणी आरक्षणे हटवून सुरुवातीचा स्वच्छ डेटा आणा' : 'Owner-only: Reset to pristine seed data (calls reset_demo())'}
                >
                  {resettingDemo ? (
                    <RotateCw className="w-3.5 h-3.5 animate-spin text-kumkum" />
                  ) : (
                    <RotateCw className="w-3.5 h-3.5 text-kumkum" />
                  )}
                  <span>{t.resetDemoBtn}</span>
                </button>
              ) : (
                <span className="text-[10px] text-[#5B6285] italic hidden md:inline">
                  ({t.demoOwnerOnlyNotice})
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* LAYER (a): LOUD LOOPING CHIME & FLASHING BANNER                      */}
      {/* ==================================================================== */}
      {hasNewAlert && alertBooking && (
        <div className="sticky top-0 z-50 bg-gradient-to-r from-kumkum via-marigold to-kumkum text-primary shadow-2xl animate-pulse border-b-2 border-brass">
          <div className="max-w-6xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/30 flex items-center justify-center animate-bounce">
                <Bell className="w-6 h-6 text-primary" />
              </div>
              <div>
                <div className="text-sm font-black tracking-wide flex items-center gap-2 text-white">
                  <span>{t.newBookingAlertTitle}</span>
                  <span className="bg-marigold text-primary text-xs px-2 py-0.5 rounded font-black">
                    #{alertBooking.token_number}
                  </span>
                </div>
                <div className="text-xs text-white/95 font-medium">
                  {alertBooking.guest_name} • {alertBooking.party_size} {t.guestsUnit} • {alertBooking.slot_start?.split('T')[1]?.substring(0, 5)}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Fallback Layer (c): Owner wa.me link */}
              <a
                href={getOwnerAlertWaUrl(
                  process.env.NEXT_PUBLIC_RESTAURANT_PHONE || '919876543210',
                  alertBooking.guest_name,
                  alertBooking.token_number,
                  alertBooking.slot_start,
                  alertBooking.party_size,
                  alertBooking.type
                )}
                target="_blank"
                rel="noopener noreferrer"
                className="min-h-[44px] px-3.5 py-2 bg-tulsi hover:bg-[#25684c] text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow transition tap-target"
              >
                <MessageSquare className="w-4 h-4" />
                <span>{t.actionOwnerAlert}</span>
              </a>

              <button
                onClick={dismissAlert}
                className="min-h-[44px] px-3.5 py-2 bg-[#0F1330] hover:bg-[#1A2048] text-marigold text-xs font-black rounded-xl flex items-center gap-1.5 transition border border-marigold/30 tap-target"
              >
                <BellOff className="w-4 h-4" />
                <span>{t.muteAlertBtn}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* AUDIO AUTOPLAY UNLOCK PROMPT BANNER                                  */}
      {/* ==================================================================== */}
      {!audioUnlocked && (
        <div className="bg-marigold/15 border-b border-marigold/30 px-4 py-2.5">
          <div className="max-w-6xl mx-auto flex items-center justify-between gap-3 text-xs text-marigold">
            <div className="flex items-center gap-2 font-medium">
              <Volume2 className="w-4 h-4 text-marigold shrink-0 animate-pulse" />
              <span className="text-[#F0F3FF]">{t.soundPromptBanner}</span>
            </div>
            <button
              onClick={handleEnableSound}
              className="min-h-[44px] px-4 py-2 bg-marigold hover:bg-marigold-hover text-primary font-black rounded-xl text-xs shrink-0 transition shadow-md tap-target"
            >
              <span className="text-primary font-black">{t.enableSound}</span>
            </button>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* HEADER / NAVIGATION                                                  */}
      {/* ==================================================================== */}
      <header className="border-b border-[#262F60] bg-[#1A2048]/95 backdrop-blur sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brass via-marigold to-haldi flex items-center justify-center font-heading font-black text-xl text-primary shadow-lg shadow-marigold/20 border border-marigold/40">
              श्री
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-heading font-black text-base text-white tracking-wide">{t.portalTitle}</h1>
                <span className="text-[10px] bg-marigold/15 text-marigold border border-marigold/30 px-2.5 py-0.5 rounded-full font-bold">
                  NH-65 Kunjirwadi
                </span>
              </div>
              <p className="text-xs text-[#9AA3CC]">{t.portalSubtitle}</p>
            </div>
          </div>

          {/* Action Tools Header */}
          <div className="flex items-center gap-2">
            {/* Install PWA Button */}
            <button
              onClick={handleInstallApp}
              className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-bold border transition flex items-center gap-1.5 tap-target ${
                isStandalone
                  ? 'bg-tulsi/15 text-tulsi-light border-tulsi/30'
                  : 'bg-marigold hover:bg-marigold-hover text-primary font-black border-marigold shadow-md'
              }`}
            >
              <Download className="w-4 h-4" />
              <span>{isStandalone ? t.appInstalled : t.installApp}</span>
            </button>

            {/* Audio Toggle / Test */}
            <button
              onClick={audioUnlocked ? handleTestSound : handleEnableSound}
              title={audioUnlocked ? t.soundTest : t.enableSound}
              className={`min-h-[44px] min-w-[44px] p-2.5 rounded-xl border text-xs flex items-center justify-center transition tap-target ${
                audioUnlocked
                  ? 'bg-[#121738] text-marigold border-[#262F60] hover:bg-[#161D44]'
                  : 'bg-marigold text-primary border-marigold font-black animate-pulse'
              }`}
            >
              {audioUnlocked ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-primary" />}
            </button>

            {/* Web Push Toggle */}
            <button
              onClick={handleSubscribePush}
              disabled={pushLoading}
              title={pushSubscribed ? t.pushSubscribed : t.pushAlerts}
              className={`min-h-[44px] min-w-[44px] p-2.5 rounded-xl border text-xs flex items-center justify-center transition tap-target ${
                pushSubscribed
                  ? 'bg-tulsi/15 text-tulsi-light border-tulsi/30'
                  : 'bg-[#121738] text-[#9AA3CC] border-[#262F60] hover:text-white'
              }`}
            >
              <Bell className="w-4 h-4" />
            </button>

            {/* Language Switcher */}
            <div className="inline-flex rounded-xl bg-[#121738] p-0.5 border border-[#262F60]">
              <button
                type="button"
                onClick={() => handleLangChange('en')}
                className={`min-h-[40px] px-2.5 py-1 text-xs font-bold rounded-lg transition tap-target ${
                  lang === 'en'
                    ? 'bg-marigold text-primary font-black shadow'
                    : 'text-[#9AA3CC] hover:text-white'
                }`}
              >
                EN
              </button>
              <button
                type="button"
                onClick={() => handleLangChange('hi')}
                className={`min-h-[40px] px-2.5 py-1 text-xs font-bold rounded-lg transition tap-target ${
                  lang === 'hi'
                    ? 'bg-marigold text-primary font-black shadow'
                    : 'text-[#9AA3CC] hover:text-white'
                }`}
              >
                हिंदी
              </button>
              <button
                type="button"
                onClick={() => handleLangChange('mr')}
                className={`min-h-[40px] px-2.5 py-1 text-xs font-bold rounded-lg transition tap-target ${
                  lang === 'mr'
                    ? 'bg-marigold text-primary font-black shadow'
                    : 'text-[#9AA3CC] hover:text-white'
                }`}
              >
                मराठी
              </button>
            </div>

            {/* View Message Logs */}
            <button
              onClick={() => setMessageLogsModalOpen(true)}
              title={lang === 'mr' ? 'मेसेज लॉग (WhatsApp Logs)' : lang === 'hi' ? 'संदेश लॉग (WhatsApp Logs)' : 'Message Logs (WhatsApp)'}
              className="min-h-[44px] px-3 py-2 bg-[#121738] hover:bg-[#161D44] border border-[#262F60] text-xs font-bold rounded-xl text-tulsi-light flex items-center gap-1.5 transition tap-target"
            >
              <MessageSquare className="w-3.5 h-3.5 text-tulsi-light" />
              <span className="hidden md:inline">{lang === 'mr' ? 'मेसेज लॉग' : lang === 'hi' ? 'मेसेज लॉग' : 'Message Logs'}</span>
            </button>

            {/* Guide Button */}
            <button
              onClick={() => setGuideModalOpen(true)}
              title={t.helpGuideBtn}
              className="min-h-[44px] min-w-[44px] p-2.5 bg-[#121738] hover:bg-[#161D44] border border-[#262F60] text-[#9AA3CC] hover:text-marigold rounded-xl transition flex items-center justify-center tap-target"
            >
              <HelpCircle className="w-4 h-4" />
            </button>

            {/* Sign Out Button */}
            <button
              onClick={handleSignOut}
              title={t.signOutBtn}
              className="min-h-[44px] px-3 py-2 bg-[#121738] hover:bg-kumkum/20 hover:text-[#E8554A] border border-[#262F60] text-[#9AA3CC] text-xs font-bold rounded-xl flex items-center gap-1.5 transition tap-target"
            >
              <LogOut className="w-4 h-4 text-kumkum" />
              <span className="hidden sm:inline">{t.signOutBtn}</span>
            </button>
          </div>
        </div>
      </header>

      {/* ==================================================================== */}
      {/* ROLE SWITCHER & AUTH TOOLBAR                                         */}
      {/* ==================================================================== */}
      <div className="bg-[#13183B] border-b border-[#262F60] px-4 py-2.5 text-xs">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-3">
          {/* Active User Badge & Role Tag */}
          <div className="flex items-center gap-2">
            <span className="text-[#9AA3CC]">{t.loggedInAs}</span>
            <span className="font-bold text-white">{user?.fullName}</span>
            <span
              className={`px-2.5 py-0.5 rounded-full text-[11px] font-black border ${
                user?.role === 'owner'
                  ? 'bg-marigold/15 text-marigold border-marigold/40'
                  : user?.role === 'manager'
                  ? 'bg-sky-500/20 text-sky-300 border-sky-500/40'
                  : 'bg-kumkum/20 text-[#E8554A] border-kumkum/40'
              }`}
            >
              {user?.role === 'owner' ? t.roleOwner : user?.role === 'manager' ? t.roleManager : t.roleKitchen}
            </span>
          </div>

          {/* Quick 1-Tap Role Selector for Demo Testing */}
          <div className="flex items-center gap-1.5 bg-[#0F1330] p-1 rounded-xl border border-[#262F60]">
            <span className="text-[10px] text-[#9AA3CC] px-1 font-medium">{t.demoRolesTitle}:</span>
            <button
              onClick={() => handleSwitchRole('owner')}
              className={`min-h-[36px] px-3 py-1.5 rounded-lg text-[11px] font-black transition tap-target ${
                user?.role === 'owner' ? 'bg-marigold text-primary font-black shadow-md' : 'text-[#9AA3CC] hover:text-white'
              }`}
            >
              👑 Owner
            </button>
            <button
              onClick={() => handleSwitchRole('manager')}
              className={`min-h-[36px] px-3 py-1.5 rounded-lg text-[11px] font-bold transition tap-target ${
                user?.role === 'manager' ? 'bg-sky-600 text-white shadow-md' : 'text-[#9AA3CC] hover:text-white'
              }`}
            >
              📋 Manager
            </button>
            <button
              onClick={() => handleSwitchRole('kitchen')}
              className={`min-h-[36px] px-3 py-1.5 rounded-lg text-[11px] font-bold transition tap-target ${
                user?.role === 'kitchen' ? 'bg-kumkum text-white shadow-md' : 'text-[#9AA3CC] hover:text-white'
              }`}
            >
              🍳 Kitchen (RO)
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Install App Banner */}
      {!isStandalone && (
        <div className="bg-gradient-to-r from-marigold/20 via-haldi/20 to-marigold/20 border-b border-marigold/30 px-4 py-2">
          <div className="max-w-6xl mx-auto flex items-center justify-between gap-3 text-xs text-marigold">
            <div className="flex items-center gap-2">
              <Download className="w-4 h-4 text-marigold shrink-0" />
              <span className="font-medium text-[#F0F3FF]">
                {lang === 'mr'
                  ? 'झटपट सूचनांसाठी श्री व्हेज स्टाफ PWA फोनवर इन्स्टॉल करा'
                  : 'Install Shree Veg Staff PWA on device for instant chime alerts'}
              </span>
            </div>
            <button
              onClick={handleInstallApp}
              className="min-h-[44px] px-3.5 py-1.5 bg-marigold hover:bg-marigold-hover text-primary font-black rounded-xl text-xs shrink-0 shadow transition tap-target"
            >
              <span className="text-primary font-black">{t.installApp}</span>
            </button>
          </div>
        </div>
      )}

      {/* Kitchen Role Banner if Kitchen active */}
      {isKitchen && (
        <div className="bg-kumkum/15 border-b border-kumkum/40 px-4 py-2.5">
          <div className="max-w-6xl mx-auto flex items-center gap-2 text-xs text-[#E8554A]">
            <Shield className="w-4 h-4 text-kumkum shrink-0" />
            <span className="font-bold">{t.roleReadOnlyNotice}</span>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MAIN CONTENT AREA                                                    */}
      {/* ==================================================================== */}
      <main className="max-w-6xl mx-auto px-4 py-6 w-full space-y-6">
        {/* ==================================================================== */}
        {/* TOP LEVEL MODULE NAVIGATION BAR                                      */}
        {/* ==================================================================== */}
        <div className="flex items-center gap-2 p-1.5 bg-[#1A2048] border border-[#262F60] rounded-2xl overflow-x-auto shadow-lg no-scrollbar">
          <button
            onClick={() => setAdminSection('inbox')}
            className={`min-h-[44px] px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition shrink-0 tap-target ${
              adminSection === 'inbox'
                ? 'bg-marigold text-primary font-black shadow-lg shadow-marigold/20'
                : 'text-[#9AA3CC] hover:text-white hover:bg-[#13183B]'
            }`}
          >
            <span>📥 {lang === 'mr' ? 'बुकिंग्स इनबॉक्स' : 'Bookings Inbox'}</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
              adminSection === 'inbox' ? 'bg-primary text-sand' : 'bg-[#0F1330] text-[#9AA3CC]'
            }`}>
              {bookings.filter((b) => b.status === 'pending').length}
            </span>
          </button>

          <button
            onClick={() => setAdminSection('reports')}
            className={`min-h-[44px] px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition shrink-0 tap-target ${
              adminSection === 'reports'
                ? 'bg-marigold text-primary font-black shadow-lg shadow-marigold/20'
                : 'text-[#9AA3CC] hover:text-white hover:bg-[#13183B]'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>{lang === 'mr' ? 'अहवाल (Reports)' : 'Reports & Analytics'}</span>
          </button>

          <button
            onClick={() => setAdminSection('menu')}
            className={`min-h-[44px] px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition shrink-0 tap-target ${
              adminSection === 'menu'
                ? 'bg-marigold text-primary font-black shadow-lg shadow-marigold/20'
                : 'text-[#9AA3CC] hover:text-white hover:bg-[#13183B]'
            }`}
          >
            <UtensilsCrossed className="w-4 h-4" />
            <span>{lang === 'mr' ? 'मेनू व्यवस्थापन (Realtime)' : 'Menu Management'}</span>
          </button>

          <button
            onClick={() => setAdminSection('dates')}
            className={`min-h-[44px] px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition shrink-0 tap-target ${
              adminSection === 'dates'
                ? 'bg-marigold text-primary font-black shadow-lg shadow-marigold/20'
                : 'text-[#9AA3CC] hover:text-white hover:bg-[#13183B]'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>{lang === 'mr' ? '१४ दिवस व सण नियम' : '14-Day Calendar & Rules'}</span>
          </button>

          <button
            onClick={() => setAdminSection('packages')}
            className={`min-h-[44px] px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition shrink-0 tap-target ${
              adminSection === 'packages'
                ? 'bg-marigold text-primary font-black shadow-lg shadow-marigold/20'
                : 'text-[#9AA3CC] hover:text-white hover:bg-[#13183B]'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>{lang === 'mr' ? 'पंगत पॅकेजेस' : 'Group Packages'}</span>
          </button>
        </div>

        {/* 1. SECTION: MENU MANAGEMENT */}
        {adminSection === 'menu' && (
          <AdminMenuManager
            lang={lang}
            userRole={user.role}
            onToast={showToast}
          />
        )}

        {/* 2. SECTION: 14-DAY CALENDAR & RULES */}
        {adminSection === 'dates' && (
          <AdminDatesManager
            lang={lang}
            userRole={user.role}
            onToast={showToast}
          />
        )}

        {/* 3. SECTION: GROUP PACKAGES */}
        {adminSection === 'packages' && (
          <AdminPackagesManager
            lang={lang}
            userRole={user.role}
            onToast={showToast}
          />
        )}

        {/* 4. SECTION: REPORTS & ANALYTICS */}
        {adminSection === 'reports' && (
          <AdminReportsView
            lang={lang}
            userRole={user.role}
            onToast={showToast}
          />
        )}

        {/* 5. SECTION: INBOX (DEFAULT) */}
        {adminSection === 'inbox' && (
          <>
            {/* Simulator & Action Bar */}
            <div className="bg-[#1A2048] border border-[#262F60] rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 shadow-lg">
              <div className="flex flex-wrap items-center gap-2">
                {isDemoMode && (
                  <button
                    onClick={handleSimulatePilgrimGroup}
                    disabled={simulatingGroup}
                    className="min-h-[44px] px-4 py-2 bg-marigold hover:bg-marigold-hover text-primary font-black text-xs rounded-xl flex items-center gap-2 shadow-md transition active:scale-95 disabled:opacity-50 tap-target"
                  >
                    {simulatingGroup ? <RotateCw className="w-4 h-4 animate-spin text-primary" /> : <Sparkles className="w-4 h-4 text-primary" />}
                    <span className="font-black text-primary">{t.simulatePilgrimBtn}</span>
                  </button>
                )}

                <button
                  onClick={handleSimulateNewBooking}
                  className="min-h-[44px] px-3.5 py-2 bg-[#121738] hover:bg-[#161D44] text-[#F0F3FF] border border-[#262F60] font-bold text-xs rounded-xl flex items-center gap-1.5 transition tap-target"
                >
                  <Sparkles className="w-3.5 h-3.5 text-marigold" />
                  <span>{t.simulateBookingBtn}</span>
                </button>

                {isDemoMode && user?.role === 'owner' && (
                  <button
                    onClick={handleResetDemoData}
                    disabled={resettingDemo}
                    className="min-h-[44px] px-3.5 py-2 bg-kumkum/20 hover:bg-kumkum/30 text-[#E8554A] border border-kumkum/40 font-bold text-xs rounded-xl flex items-center gap-1.5 transition active:scale-95 disabled:opacity-50 tap-target"
                  >
                    {resettingDemo ? <RotateCw className="w-3.5 h-3.5 animate-spin text-kumkum" /> : <RotateCw className="w-3.5 h-3.5 text-kumkum" />}
                    <span>{t.resetDemoBtn}</span>
                  </button>
                )}

                {pushSubscribed && (
                  <button
                    onClick={handleSendTestPush}
                    className="min-h-[44px] px-3.5 py-2 bg-[#121738] hover:bg-[#161D44] text-[#F0F3FF] border border-[#262F60] font-bold text-xs rounded-xl flex items-center gap-1.5 transition tap-target"
                  >
                    <Send className="w-3.5 h-3.5 text-marigold" />
                    <span>{t.pushTestBtn}</span>
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => fetchBookings(false)}
                  className="min-h-[44px] min-w-[44px] p-2.5 bg-[#121738] hover:bg-[#161D44] text-[#F0F3FF] border border-[#262F60] rounded-xl flex items-center justify-center transition tap-target"
                  title="Refresh"
                >
                  <RotateCw className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* ================================================================== */}
            {/* FILTERS & SUMMARY OF EXPECTED GUESTS                               */}
            {/* ================================================================== */}
            <div className="space-y-4">
              {/* Filter Tabs */}
              <div className="flex items-center gap-2 border-b border-[#262F60] pb-3 overflow-x-auto">
                <button
                  onClick={() => setFilter('pending')}
                  className={`min-h-[44px] px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition shrink-0 tap-target ${
                    filter === 'pending'
                      ? 'bg-marigold text-primary font-black shadow-md'
                      : 'bg-[#1A2048] text-[#9AA3CC] hover:text-white border border-[#262F60]'
                  }`}
                >
                  <span className={filter === 'pending' ? 'text-primary font-black' : ''}>{t.filterPending}</span>
                  <span className={`px-2 py-0.5 rounded text-[11px] font-black ${
                    filter === 'pending' ? 'bg-primary text-sand' : 'bg-[#0F1330] text-marigold'
                  }`}>
                    {bookings.filter((b) => b.status === 'pending').length}
                  </span>
                </button>

                <button
                  onClick={() => setFilter('today')}
                  className={`min-h-[44px] px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition shrink-0 tap-target ${
                    filter === 'today'
                      ? 'bg-marigold text-primary font-black shadow-md'
                      : 'bg-[#1A2048] text-[#9AA3CC] hover:text-white border border-[#262F60]'
                  }`}
                >
                  <span className={filter === 'today' ? 'text-primary font-black' : ''}>{t.filterToday}</span>
                </button>

                <button
                  onClick={() => setFilter('tomorrow')}
                  className={`min-h-[44px] px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition shrink-0 tap-target ${
                    filter === 'tomorrow'
                      ? 'bg-marigold text-primary font-black shadow-md'
                      : 'bg-[#1A2048] text-[#9AA3CC] hover:text-white border border-[#262F60]'
                  }`}
                >
                  <span className={filter === 'tomorrow' ? 'text-primary font-black' : ''}>{t.filterTomorrow}</span>
                </button>

                <button
                  onClick={() => setFilter('all')}
                  className={`min-h-[44px] px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition shrink-0 tap-target ${
                    filter === 'all'
                      ? 'bg-marigold text-primary font-black shadow-md'
                      : 'bg-[#1A2048] text-[#9AA3CC] hover:text-white border border-[#262F60]'
                  }`}
                >
                  <span className={filter === 'all' ? 'text-primary font-black' : ''}>{t.filterAll}</span>
                  <span className={`px-2 py-0.5 rounded text-[11px] font-black ${
                    filter === 'all' ? 'bg-primary text-sand' : 'bg-[#0F1330] text-[#9AA3CC]'
                  }`}>
                    {bookings.length}
                  </span>
                </button>
              </div>

              {/* SUMMARY OF EXPECTED GUESTS (TODAY & TOMORROW) */}
              {(filter === 'today' || filter === 'tomorrow') && (
                <div className="bg-[#1A2048] border border-[#262F60] rounded-2xl p-5 shadow-xl animate-in fade-in">
                  <div className="flex items-center justify-between mb-4 pb-2 border-b border-[#262F60]">
                    <div className="flex items-center gap-2">
                      <Users className="w-5 h-5 text-marigold" />
                      <h3 className="font-heading font-bold text-sm text-white">
                        {filter === 'today' ? t.summaryTodayTitle : t.summaryTomorrowTitle}
                      </h3>
                    </div>
                    <span className="text-xs text-[#9AA3CC]">
                      {filter === 'today' ? todaySummary.totalTables : tomorrowSummary.totalTables} {t.totalTables}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {/* Confirmed Guests */}
                    <div className="bg-tulsi/15 border border-tulsi/30 rounded-xl p-3">
                      <div className="text-[11px] font-semibold text-tulsi-light mb-1 flex items-center gap-1">
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>{t.confirmedGuests}</span>
                      </div>
                      <div className="text-2xl font-black text-white">
                        {filter === 'today' ? todaySummary.confirmedGuests : tomorrowSummary.confirmedGuests}
                        <span className="text-xs text-[#9AA3CC] font-normal ml-1">{t.guestsUnit}</span>
                      </div>
                    </div>

                    {/* Waiting / Pending Guests */}
                    <div className="bg-marigold/15 border border-marigold/30 rounded-xl p-3">
                      <div className="text-[11px] font-semibold text-marigold mb-1 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{t.waitingGuests}</span>
                      </div>
                      <div className="text-2xl font-black text-white">
                        {filter === 'today' ? todaySummary.waitingGuests : tomorrowSummary.waitingGuests}
                        <span className="text-xs text-[#9AA3CC] font-normal ml-1">{t.guestsUnit}</span>
                      </div>
                    </div>

                    {/* Seated Guests (Today Only) */}
                    {filter === 'today' && (
                      <div className="bg-sky-500/15 border border-sky-500/30 rounded-xl p-3">
                        <div className="text-[11px] font-semibold text-sky-400 mb-1 flex items-center gap-1">
                          <UtensilsCrossed className="w-3.5 h-3.5" />
                          <span>{t.seatedGuests}</span>
                        </div>
                        <div className="text-2xl font-black text-white">
                          {todaySummary.seatedGuests || 0}
                          <span className="text-xs text-[#9AA3CC] font-normal ml-1">{t.guestsUnit}</span>
                        </div>
                      </div>
                    )}

                    {/* Total Tables */}
                    <div className="bg-[#121738] border border-[#262F60] rounded-xl p-3">
                      <div className="text-[11px] font-semibold text-[#9AA3CC] mb-1">
                        <span>{t.totalTables}</span>
                      </div>
                      <div className="text-2xl font-black text-white">
                        {filter === 'today' ? todaySummary.totalTables : tomorrowSummary.totalTables}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* ================================================================== */}
            {/* BOOKINGS LIST (NEWEST FIRST)                                       */}
            {/* ================================================================== */}
            {loading ? (
              <div className="p-12 text-center text-[#9AA3CC]">
                <RotateCw className="w-8 h-8 mx-auto animate-spin text-marigold mb-2" />
                <p className="text-xs">आरक्षणे लोड होत आहेत (Loading Bookings)...</p>
              </div>
            ) : bookings.length === 0 ? (
              <div className="bg-[#1A2048] border border-[#262F60] rounded-2xl p-12 text-center shadow-lg">
                <UtensilsCrossed className="w-12 h-12 mx-auto text-[#5B6285] mb-3" />
                <h3 className="font-heading font-bold text-white text-base mb-1">{t.emptyInboxTitle}</h3>
                <p className="text-xs text-[#9AA3CC] max-w-md mx-auto">{t.emptyInboxSub}</p>
              </div>
            ) : (
              <div className="space-y-4">
                {bookings.map((booking) => {
                  const isPending = booking.status === 'pending';
                  const isConfirmed = booking.status === 'confirmed';
                  const isSeated = booking.status === 'seated';
                  const isRejected = booking.status === 'rejected';
                  const isNoShow = booking.status === 'no_show';

                  return (
                    <div
                      key={booking.id}
                      className={`rounded-2xl transition shadow-xl overflow-hidden ${
                        isPending
                          ? 'border border-[#262F60] border-l-[6px] border-l-accent bg-[#151B3B] shadow-[0_0_24px_rgba(242,169,0,0.18)]'
                          : isConfirmed
                          ? 'border border-tulsi/40 bg-[#1A2048]'
                          : isSeated
                          ? 'border border-sky-600/40 bg-[#1A2048]'
                          : isRejected
                          ? 'border border-kumkum/30 bg-[#1A2048]/75 opacity-80'
                          : 'border border-[#262F60] bg-[#1A2048]'
                      }`}
                    >
                      <div className="p-5">
                        {/* Top Row: Token, Type, Status & Brass Bell for Pending */}
                        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#262F60]">
                          <div className="flex items-center gap-2.5">
                            <span className="font-mono text-base font-black px-3 py-1.5 rounded-xl bg-[#0F1330] border border-[#262F60] text-marigold shadow-inner">
                              #{booking.token_number}
                            </span>
                            <span className="text-xs font-semibold text-[#9AA3CC]">
                              {booking.type === 'table'
                                ? t.bookingTypeTable
                                : booking.type === 'group_meal'
                                ? t.bookingTypeGroup
                                : t.bookingTypeOrderAhead}
                            </span>
                            {/* New booking marigold highlight with Brass Bell Icon */}
                            {isPending && (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-marigold/15 border border-marigold/30 text-marigold text-xs font-bold animate-pulse">
                                <Bell className="w-3.5 h-3.5 text-brass" />
                                <span>{lang === 'mr' ? 'नवीन आरक्षण दाखल!' : 'New Booking!'}</span>
                              </span>
                            )}
                          </div>

                          {/* Status Pill with Both Text AND Icon */}
                          <span
                            className={`text-xs px-3 py-1.5 rounded-full font-bold border inline-flex items-center gap-1.5 ${
                              isPending
                                ? 'bg-marigold/15 text-[#FFBE2E] border-marigold/40'
                                : isConfirmed
                                ? 'bg-tulsi/20 text-[#3EA87C] border-tulsi/40'
                                : isSeated
                                ? 'bg-sky-500/20 text-sky-300 border-sky-500/40'
                                : isRejected
                                ? 'bg-kumkum/20 text-[#E8554A] border-kumkum/40'
                                : isNoShow
                                ? 'bg-slate-700/50 text-slate-300 border-slate-600'
                                : 'bg-slate-800 text-slate-400 border-slate-700'
                            }`}
                          >
                            {booking.status === 'pending' && <Clock className="w-3.5 h-3.5 text-marigold shrink-0" />}
                            {booking.status === 'confirmed' && <CheckCircle className="w-3.5 h-3.5 text-tulsi-light shrink-0" />}
                            {booking.status === 'seated' && <UtensilsCrossed className="w-3.5 h-3.5 text-sky-400 shrink-0" />}
                            {booking.status === 'rejected' && <XCircle className="w-3.5 h-3.5 text-kumkum shrink-0" />}
                            {booking.status === 'no_show' && <AlertTriangle className="w-3.5 h-3.5 text-slate-300 shrink-0" />}
                            {booking.status === 'cancelled' && <XCircle className="w-3.5 h-3.5 text-slate-400 shrink-0" />}
                            <span>
                              {booking.status === 'pending'
                                ? t.statusPending
                                : booking.status === 'confirmed'
                                ? t.statusConfirmed
                                : booking.status === 'seated'
                                ? t.statusSeated
                                : booking.status === 'rejected'
                                ? t.statusRejected
                                : booking.status === 'no_show'
                                ? t.statusNoShow
                                : t.statusCancelled}
                            </span>
                          </span>
                        </div>

                        {/* Middle Info: Guest, Party, Slot */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 py-4 text-xs">
                          {/* Column 1: Guest */}
                          <div>
                            <div className="text-[#9AA3CC] text-[11px] mb-0.5">ग्राहक नाव (Guest Name):</div>
                            <div className="font-bold text-sm text-white">{booking.guest_name}</div>
                            <div className="text-[#9AA3CC] mt-1 font-mono">{booking.guest_phone}</div>
                          </div>

                          {/* Column 2: Party Size & Slot */}
                          <div>
                            <div className="text-[#9AA3CC] text-[11px] mb-0.5">{t.timeSlotLabel} & {t.partySizeLabel}:</div>
                            <div className="font-bold text-sm text-white flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5 text-marigold" />
                              <span>{booking.slot_start?.split('T')[1]?.substring(0, 5) || '13:00'}</span>
                              <span className="text-[#9AA3CC] font-normal">
                                ({booking.slot_start?.split('T')[0]})
                              </span>
                            </div>
                            <div className="text-marigold font-semibold mt-1 flex items-center gap-1">
                              <Users className="w-3.5 h-3.5" />
                              <span>{booking.party_size} {t.guestsUnit}</span>
                            </div>
                          </div>

                          {/* Column 3: Prep time or Rejection info */}
                          <div>
                            {booking.estimated_prep_time_mins && (
                              <div className="bg-marigold/15 border border-marigold/30 rounded-xl p-2.5 text-marigold">
                                <span className="font-bold">{t.prepTimePrefix}</span> {booking.estimated_prep_time_mins} मिनिटे
                              </div>
                            )}
                            {booking.rejection_reason && (
                              <div className="bg-kumkum/15 border border-kumkum/30 rounded-xl p-2.5 text-[#E8554A]">
                                <span className="font-bold">नकार कारण:</span> {booking.rejection_reason}
                              </div>
                            )}
                            {booking.notes && (
                              <div className="text-[#9AA3CC] mt-1">
                                <strong className="text-white">{t.notesLabel}</strong> {booking.notes}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Pre-ordered items or package */}
                        {booking.items && booking.items.length > 0 && (
                          <div className="bg-[#0F1330] rounded-xl p-3 border border-[#262F60] text-xs mb-4">
                            <div className="font-bold text-marigold mb-1">{t.preOrderDishes}</div>
                            <div className="space-y-1">
                              {booking.items.map((item, idx) => (
                                <div key={idx} className="flex justify-between text-[#F0F3FF]">
                                  <span>• {item.menu_item_id} x {item.quantity}</span>
                                  <span className="font-mono text-[#9AA3CC]">₹{item.unit_price * item.quantity}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* ====================================================== */}
                        {/* ACTION BUTTONS ROW                                     */}
                        {/* ====================================================== */}
                        <div className="pt-3 border-t border-[#262F60] flex flex-wrap items-center justify-between gap-3">
                          {/* Tap to Call & WhatsApp Buttons */}
                          <div className="flex items-center gap-2">
                            {/* Tap to Call */}
                            <a
                              href={`tel:${booking.guest_phone}`}
                              className="min-h-[44px] px-3.5 py-2.5 bg-[#121738] hover:bg-[#161D44] text-[#F0F3FF] border border-[#262F60] rounded-xl text-xs font-semibold flex items-center gap-1.5 transition tap-target"
                            >
                              <Phone className="w-4 h-4 text-tulsi-light" />
                              <span>{t.actionTapToCall}</span>
                            </a>

                            {/* wa.me Direct Chat */}
                            <a
                              href={getGuestChatWaUrl(booking.guest_phone)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="min-h-[44px] px-3.5 py-2.5 bg-[#121738] hover:bg-[#161D44] text-[#F0F3FF] border border-[#262F60] rounded-xl text-xs font-semibold flex items-center gap-1.5 transition tap-target"
                            >
                              <MessageSquare className="w-4 h-4 text-tulsi-light" />
                              <span>{t.actionWhatsApp}</span>
                            </a>

                            {/* Owner WhatsApp Alert Fallback */}
                            <a
                              href={getOwnerAlertWaUrl(
                                process.env.NEXT_PUBLIC_RESTAURANT_PHONE || '919876543210',
                                booking.guest_name,
                                booking.token_number,
                                booking.slot_start,
                                booking.party_size,
                                booking.type
                              )}
                              target="_blank"
                              rel="noopener noreferrer"
                              title={t.actionOwnerAlert}
                              className="min-h-[44px] px-3 py-2.5 bg-[#121738] hover:bg-[#161D44] text-marigold border border-[#262F60] rounded-xl text-xs font-semibold flex items-center gap-1.5 transition tap-target"
                            >
                              <Send className="w-4 h-4 text-marigold" />
                              <span className="hidden sm:inline">{t.actionOwnerAlert}</span>
                            </a>
                          </div>

                          {/* Staff Operational Action Buttons */}
                          <div className="flex items-center gap-2.5">
                            {/* PENDING: BIG GREEN ACCEPT & RED OUTLINE REJECT */}
                            {isPending && (
                              <>
                                {/* ACCEPT IN SUCCESS GREEN */}
                                <button
                                  onClick={() => {
                                    if (isKitchen) {
                                      alert(t.roleReadOnlyNotice);
                                      return;
                                    }
                                    setPrepModalBooking(booking);
                                  }}
                                  disabled={isKitchen}
                                  className={`min-h-[44px] px-5 py-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition tap-target active:scale-95 ${
                                    isKitchen
                                      ? 'bg-[#121738] text-[#9AA3CC]/50 cursor-not-allowed border border-[#262F60]'
                                      : 'bg-success hover:bg-[#25684c] text-white shadow-lg shadow-success/30 focus-visible:ring-2 focus-visible:ring-success'
                                  }`}
                                >
                                  {isKitchen ? <Shield className="w-4 h-4 text-[#9AA3CC]/50" /> : <CheckCircle className="w-4 h-4 text-white" />}
                                  <span>{isKitchen ? `🔒 ${t.roleReadOnlyBadge}` : t.actionAccept}</span>
                                </button>

                                {/* REJECT AS ALERT-COLORED OUTLINE */}
                                <button
                                  onClick={() => {
                                    if (isKitchen) {
                                      alert(t.roleReadOnlyNotice);
                                      return;
                                    }
                                    setRejectModalBooking(booking);
                                  }}
                                  disabled={isKitchen}
                                  className={`min-h-[44px] px-5 py-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition tap-target active:scale-95 ${
                                    isKitchen
                                      ? 'bg-[#121738] text-[#9AA3CC]/50 cursor-not-allowed border border-[#262F60]'
                                      : 'border-2 border-alert text-alert hover:bg-alert/15 focus-visible:ring-2 focus-visible:ring-alert'
                                  }`}
                                >
                                  {isKitchen ? <Shield className="w-4 h-4 text-[#9AA3CC]/50" /> : <XCircle className="w-4 h-4 text-alert" />}
                                  <span>{isKitchen ? `🔒 ${t.roleReadOnlyBadge}` : t.actionReject}</span>
                                </button>
                              </>
                            )}

                            {/* CONFIRMED: SEATED, NO-SHOW, SEND REMINDER */}
                            {isConfirmed && (
                              <>
                                {/* Mark Seated */}
                                <button
                                  onClick={() => handleUpdateStatus(booking.id, 'seated')}
                                  disabled={isKitchen}
                                  className={`min-h-[44px] px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition tap-target ${
                                    isKitchen
                                      ? 'bg-[#121738] text-[#9AA3CC]/50 cursor-not-allowed border border-[#262F60]'
                                      : 'bg-sky-600 hover:bg-sky-500 text-white shadow'
                                  }`}
                                >
                                  <UserCheck className="w-4 h-4" />
                                  <span>{isKitchen ? `🔒 ${t.actionMarkSeated}` : t.actionMarkSeated}</span>
                                </button>

                                {/* No-show */}
                                <button
                                  onClick={() => handleUpdateStatus(booking.id, 'no_show')}
                                  disabled={isKitchen}
                                  className={`min-h-[44px] px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition tap-target ${
                                    isKitchen
                                      ? 'bg-[#121738] text-[#9AA3CC]/50 cursor-not-allowed border border-[#262F60]'
                                      : 'bg-[#121738] hover:bg-kumkum/20 text-[#E8554A] border border-kumkum/40'
                                  }`}
                                >
                                  <UserX className="w-4 h-4 text-kumkum" />
                                  <span>{isKitchen ? `🔒 ${t.actionNoShow}` : t.actionNoShow}</span>
                                </button>

                                {/* Send Reminder with WhatsApp Modal & Logging */}
                                <button
                                  onClick={() => {
                                    setWaModalKind('guest_reminder');
                                    setWaModalBooking(booking);
                                    setWaModalOpen(true);
                                  }}
                                  className="min-h-[44px] px-4 py-2.5 bg-marigold/15 hover:bg-marigold/25 text-marigold border border-marigold/40 rounded-xl text-xs font-black flex items-center gap-1.5 transition tap-target"
                                  title={t.actionSendReminder}
                                >
                                  <Bell className="w-4 h-4 text-marigold" />
                                  <span>{t.actionSendReminder}</span>
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </main>

      {/* ==================================================================== */}
      {/* ACCEPT MODAL: PREP TIME PICKER                                       */}
      {/* ==================================================================== */}
      {prepModalBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#1A2048] border border-[#262F60] rounded-3xl max-w-md w-full p-6 text-[#F0F3FF] shadow-2xl">
            <h3 className="font-heading font-bold text-base text-white mb-2">{t.prepTimeModalTitle}</h3>
            <p className="text-xs text-[#9AA3CC] mb-4">
              टोकन #{prepModalBooking.token_number} • {prepModalBooking.guest_name} ({prepModalBooking.party_size} व्यक्ती)
            </p>

            <div className="grid grid-cols-2 gap-2.5 mb-6">
              {[
                { mins: 0, label: t.prepImmediate },
                { mins: 15, label: t.prep15m },
                { mins: 30, label: t.prep30m },
                { mins: 45, label: t.prep45m },
              ].map((opt) => (
                <button
                  key={opt.mins}
                  onClick={() => setSelectedPrepMins(opt.mins)}
                  className={`min-h-[44px] p-3 rounded-xl text-xs font-black border text-center transition tap-target ${
                    selectedPrepMins === opt.mins
                      ? 'bg-marigold text-primary font-black border-marigold shadow-lg'
                      : 'bg-[#121738] text-[#F0F3FF] border-[#262F60] hover:bg-[#161D44]'
                  }`}
                >
                  <span className={selectedPrepMins === opt.mins ? 'text-primary font-black' : ''}>
                    {opt.label}
                  </span>
                </button>
              ))}
            </div>

            <div className="flex gap-2">
              <button
                onClick={async () => {
                  const targetBooking = prepModalBooking;
                  const mins = selectedPrepMins;
                  setPrepModalBooking(null);
                  const updated = await handleUpdateStatus(targetBooking.id, 'confirmed', {
                    prepTimeMins: mins,
                  });
                  if (updated) {
                    setWaModalKind('guest_confirmed');
                    setWaModalBooking(updated);
                    setWaPrepMinsOverride(mins);
                    setWaModalOpen(true);
                  }
                }}
                className="min-h-[44px] flex-1 py-3 bg-tulsi hover:bg-[#25684c] text-white font-black text-xs rounded-xl shadow-lg shadow-tulsi/30 transition tap-target"
              >
                {t.confirmBtn} (स्वीकारा)
              </button>
              <button
                onClick={() => setPrepModalBooking(null)}
                className="min-h-[44px] px-4 py-3 bg-[#121738] hover:bg-[#161D44] text-[#9AA3CC] font-bold text-xs rounded-xl border border-[#262F60] transition tap-target"
              >
                {t.cancelBtn}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* REJECT MODAL: REASON PICKER                                          */}
      {/* ==================================================================== */}
      {rejectModalBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#1A2048] border border-[#262F60] rounded-3xl max-w-md w-full p-6 text-[#F0F3FF] shadow-2xl">
            <h3 className="font-heading font-bold text-base text-white mb-2">{t.rejectModalTitle}</h3>
            <p className="text-xs text-[#9AA3CC] mb-4">
              टोकन #{rejectModalBooking.token_number} • {rejectModalBooking.guest_name}
            </p>

            <div className="space-y-2 mb-4">
              {[
                t.rejectReasonFull,
                t.rejectReasonClosing,
                t.rejectReasonRush,
                t.rejectReasonOther,
              ].map((reason) => (
                <button
                  key={reason}
                  onClick={() => setSelectedRejectReason(reason)}
                  className={`min-h-[44px] w-full p-3 rounded-xl text-xs font-semibold border text-left flex items-center justify-between transition tap-target ${
                    selectedRejectReason === reason
                      ? 'bg-kumkum/20 text-[#E8554A] border-kumkum font-bold'
                      : 'bg-[#121738] text-[#F0F3FF] border-[#262F60] hover:bg-[#161D44]'
                  }`}
                >
                  <span>{reason}</span>
                  {selectedRejectReason === reason && <Check className="w-4 h-4 text-kumkum" />}
                </button>
              ))}
            </div>

            {selectedRejectReason === t.rejectReasonOther && (
              <input
                type="text"
                placeholder="कारणाचा तपशील लिहा (Enter custom reason)..."
                value={customRejectReason}
                onChange={(e) => setCustomRejectReason(e.target.value)}
                className="min-h-[44px] w-full bg-[#0F1330] border border-[#262F60] rounded-xl px-3.5 py-2.5 text-xs text-white mb-4 focus:outline-none focus:border-kumkum focus:ring-1 focus:ring-kumkum"
              />
            )}

            <div className="flex gap-2">
              <button
                onClick={async () => {
                  const targetBooking = rejectModalBooking;
                  const finalReason =
                    selectedRejectReason === t.rejectReasonOther && customRejectReason
                      ? customRejectReason
                      : selectedRejectReason;
                  const nextSlot = findNextAvailableSlot(
                    targetBooking.slot_start,
                    targetBooking.party_size
                  );
                  setRejectModalBooking(null);
                  const updated = await handleUpdateStatus(targetBooking.id, 'rejected', {
                    rejectionReason: finalReason,
                  });
                  if (updated) {
                    setWaModalKind('guest_rejected');
                    setWaModalBooking(updated);
                    setWaRejectReasonOverride(finalReason);
                    setWaNextSlotOverride(nextSlot);
                    setWaModalOpen(true);
                  }
                }}
                className="min-h-[44px] flex-1 py-3 border-2 border-kumkum bg-kumkum hover:bg-kumkum-hover text-white font-black text-xs rounded-xl shadow-lg shadow-kumkum/30 transition tap-target"
              >
                {t.confirmBtn} (नकारा)
              </button>
              <button
                onClick={() => setRejectModalBooking(null)}
                className="min-h-[44px] px-4 py-3 bg-[#121738] hover:bg-[#161D44] text-[#9AA3CC] font-bold text-xs rounded-xl border border-[#262F60] transition tap-target"
              >
                {t.cancelBtn}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* WHATSAPP ACTION MODAL: BIG "SEND ON WHATSAPP" + MESSAGE LOGGING      */}
      {/* ==================================================================== */}
      <WhatsAppActionModal
        isOpen={waModalOpen}
        onClose={() => setWaModalOpen(false)}
        kind={waModalKind}
        booking={waModalBooking}
        initialLang={lang}
        nextAvailableSlotOverride={waNextSlotOverride}
        rejectionReasonOverride={waRejectReasonOverride}
        prepTimeMinsOverride={waPrepMinsOverride}
        onSent={(result) => {
          showToast(
            lang === 'mr'
              ? 'संदेश व्हॉट्सअॅपवर उघडला आणि message_log मध्ये नोंदवला! ✅'
              : 'WhatsApp opened & logged in message_log! ✅'
          );
        }}
      />

      {/* ==================================================================== */}
      {/* MESSAGE LOGS MODAL                                                   */}
      {/* ==================================================================== */}
      <MessageLogsModal
        isOpen={messageLogsModalOpen}
        onClose={() => setMessageLogsModalOpen(false)}
        lang={lang}
      />

      {/* ==================================================================== */}
      {/* VAPID & ANDROID PUSH GUIDE MODAL                                     */}
      {/* ==================================================================== */}
      <VapidAndroidGuide
        isOpen={guideModalOpen}
        onClose={() => setGuideModalOpen(false)}
        lang={lang}
      />

      {/* ==================================================================== */}
      {/* TOAST NOTIFICATION                                                   */}
      {/* ==================================================================== */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-[#1A2048] border border-marigold text-white px-4 py-3 rounded-xl text-xs font-semibold shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2">
          <Sparkles className="w-4 h-4 text-marigold" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
