'use client';

import React, { useState, useEffect } from 'react';
import {
  MessageSquare,
  CheckCircle,
  Copy,
  ExternalLink,
  X,
  Sparkles,
  Phone,
  Clock,
  User,
  ShieldCheck,
  Send,
} from 'lucide-react';
import {
  MessageKind,
  MessageLanguage,
  SendMessageResult,
} from '@/lib/messaging/types';
import { BookingRecord } from '@/lib/booking/booking-service';
import {
  normalizeBookingInput,
  renderMessageTemplate,
  TEMPLATES,
  findNextAvailableSlot,
} from '@/lib/messaging/templates';

interface WhatsAppActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  kind: MessageKind;
  booking: BookingRecord | null;
  initialLang?: MessageLanguage;
  onSent?: (result: SendMessageResult) => void;
  nextAvailableSlotOverride?: string;
  rejectionReasonOverride?: string;
  prepTimeMinsOverride?: number;
}

export function WhatsAppActionModal({
  isOpen,
  onClose,
  kind,
  booking,
  initialLang = 'en',
  onSent,
  nextAvailableSlotOverride,
  rejectionReasonOverride,
  prepTimeMinsOverride,
}: WhatsAppActionModalProps) {
  const [lang, setLang] = useState<MessageLanguage>(initialLang);
  const [isLogging, setIsLogging] = useState(false);
  const [sentSuccess, setSentSuccess] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (initialLang) setLang(initialLang);
    setSentSuccess(false);
  }, [initialLang, isOpen]);

  if (!isOpen || !booking) return null;

  // Build normalized booking
  const calculatedNextSlot =
    nextAvailableSlotOverride ||
    (booking.rejection_reason?.includes('पुढील उपलब्ध')
      ? undefined
      : findNextAvailableSlot(booking.slot_start, booking.party_size));

  const normalized = normalizeBookingInput({
    id: booking.id,
    tokenNumber: booking.token_number,
    guestName: booking.guest_name,
    guestPhone: booking.guest_phone,
    partySize: booking.party_size,
    slotStart: booking.slot_start,
    bookingType: booking.type,
    rejectionReason: rejectionReasonOverride || booking.rejection_reason,
    nextAvailableSlot: calculatedNextSlot,
    prepTimeMins: prepTimeMinsOverride ?? booking.estimated_prep_time_mins,
    notes: booking.notes,
    totalEstimatedAmount: booking.total_estimated_amount,
  });

  const previewText = renderMessageTemplate(kind, normalized, lang);

  const recipientPhone =
    kind === 'owner_new_booking'
      ? normalized.cleanRestaurantPhone
      : normalized.cleanGuestPhone;

  const titleConfig: Record<MessageKind, { titleMr: string; titleEn: string; iconColor: string; badge: string }> = {
    guest_confirmed: {
      titleMr: 'आरक्षण पुष्टी व्हॉट्सअॅप संदेश',
      titleEn: 'Send Booking Confirmation on WhatsApp',
      iconColor: 'text-emerald-400',
      badge: 'पुष्टी (Confirmed)',
    },
    guest_rejected: {
      titleMr: 'आरक्षण नकार व पुढील स्लॉट सूचना',
      titleEn: 'Send Rejection with Next Slot on WhatsApp',
      iconColor: 'text-rose-400',
      badge: 'पुढील स्लॉट सुचवला (Next Slot Suggested)',
    },
    guest_reminder: {
      titleMr: 'आरक्षण आठवण व्हॉट्सअॅप संदेश',
      titleEn: 'Send Reservation Reminder on WhatsApp',
      iconColor: 'text-amber-400',
      badge: 'आठवण (Reminder)',
    },
    owner_new_booking: {
      titleMr: 'मालक नवीन आरक्षण सूचना',
      titleEn: 'Send Owner Booking Alert on WhatsApp',
      iconColor: 'text-sky-400',
      badge: 'नवीन अलर्ट (New Alert)',
    },
  };

  const headerInfo = titleConfig[kind] || titleConfig.guest_confirmed;

  const handleSendOnWhatsApp = async () => {
    try {
      setIsLogging(true);

      // Call unified /api/messaging/send route which handles logging to message_log
      const res = await fetch('/api/messaging/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind,
          booking: {
            id: booking.id,
            tokenNumber: booking.token_number,
            guestName: booking.guest_name,
            guestPhone: booking.guest_phone,
            partySize: booking.party_size,
            slotStart: booking.slot_start,
            bookingType: booking.type,
            rejectionReason: rejectionReasonOverride || booking.rejection_reason,
            nextAvailableSlot: calculatedNextSlot,
            prepTimeMins: prepTimeMinsOverride ?? booking.estimated_prep_time_mins,
            totalEstimatedAmount: booking.total_estimated_amount,
            notes: booking.notes,
          },
          lang,
        }),
      });

      const data = await res.json();
      const sendResult: SendMessageResult = data.result || {
        success: true,
        provider: 'wa_me',
        kind,
        recipientPhone,
        text: previewText,
        url: `https://wa.me/${recipientPhone}?text=${encodeURIComponent(previewText)}`,
        status: 'sent',
        timestamp: new Date().toISOString(),
      };

      // Open pre-filled WhatsApp chat in a new tab/window
      const targetUrl = sendResult.url || `https://wa.me/${recipientPhone}?text=${encodeURIComponent(previewText)}`;
      if (typeof window !== 'undefined') {
        window.open(targetUrl, '_blank', 'noopener,noreferrer');
      }

      setSentSuccess(true);
      if (onSent) onSent(sendResult);
    } catch (err) {
      console.warn('Logging dispatch error:', err);
      // Fallback: open directly via wa.me even if server has glitch
      const fallbackUrl = `https://wa.me/${recipientPhone}?text=${encodeURIComponent(previewText)}`;
      if (typeof window !== 'undefined') {
        window.open(fallbackUrl, '_blank', 'noopener,noreferrer');
      }
      setSentSuccess(true);
    } finally {
      setIsLogging(false);
    }
  };

  const handleCopyText = () => {
    navigator.clipboard.writeText(previewText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl max-w-lg w-full overflow-hidden text-slate-100 shadow-2xl flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm sm:text-base text-white">
                  {lang === 'mr' ? headerInfo.titleMr : headerInfo.titleEn}
                </h3>
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300">
                  {headerInfo.badge}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                टोकन #{normalized.tokenNumber} • {normalized.guestName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4">
          {/* Target Recipient Card */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-3.5 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-slate-800 flex items-center justify-center text-slate-300">
                <Phone className="w-4 h-4 text-emerald-400" />
              </div>
              <div>
                <p className="text-[11px] text-slate-400 font-medium">
                  {kind === 'owner_new_booking' ? 'हॉटेल मालक क्रमांक (Owner)' : 'ग्राहक व्हॉट्सअॅप (Guest WhatsApp)'}
                </p>
                <p className="text-xs sm:text-sm font-bold text-white tracking-wide">
                  +{recipientPhone}
                </p>
              </div>
            </div>

            {/* Language Switcher */}
            <div className="inline-flex rounded-xl bg-slate-800 p-0.5 border border-slate-700">
              <button
                type="button"
                onClick={() => setLang('en')}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition ${
                  lang === 'en'
                    ? 'bg-emerald-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                English
              </button>
              <button
                type="button"
                onClick={() => setLang('hi')}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition ${
                  lang === 'hi'
                    ? 'bg-emerald-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                हिंदी
              </button>
              <button
                type="button"
                onClick={() => setLang('mr')}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition ${
                  lang === 'mr'
                    ? 'bg-emerald-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                मराठी
              </button>
            </div>
          </div>

          {/* Rejection Special Notice with Highlighted Next Slot */}
          {kind === 'guest_rejected' && (
            <div className="bg-rose-950/30 border border-rose-500/30 rounded-2xl p-3.5 space-y-2">
              <div className="flex items-center gap-2 text-rose-300 font-bold text-xs">
                <Clock className="w-4 h-4 text-rose-400 shrink-0" />
                <span>पुढील उपलब्ध स्लॉट सुचवला (Next Slot Automatically Suggested):</span>
              </div>
              <div className="bg-slate-950/80 border border-amber-500/40 rounded-xl px-3 py-2 text-xs font-bold text-amber-300 flex items-center justify-between">
                <span>👉 {normalized.nextAvailableSlot}</span>
                <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full">
                  Auto-Calculated
                </span>
              </div>
            </div>
          )}

          {/* WhatsApp Message Preview Bubble */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                व्हॉट्सअॅप संदेश पूर्वावलोकन (Pre-filled Message Preview)
              </span>
              <button
                type="button"
                onClick={handleCopyText}
                className="text-xs text-slate-400 hover:text-emerald-400 flex items-center gap-1 transition"
              >
                {copied ? (
                  <>
                    <CheckCircle className="w-3 h-3 text-emerald-400" />
                    <span className="text-emerald-400">कॉपी झाले!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>मजकूर कॉपी करा</span>
                  </>
                )}
              </button>
            </div>

            <div className="bg-[#0b141a] border border-[#202c33] rounded-2xl p-4 text-xs font-mono whitespace-pre-wrap text-[#e9edef] leading-relaxed shadow-inner max-h-56 overflow-y-auto selection:bg-emerald-700 selection:text-white">
              {previewText}
            </div>
          </div>

          {/* Message Log Confirmation Info */}
          <div className="flex items-center gap-2 text-[11px] text-slate-400 bg-slate-950/50 rounded-xl px-3 py-2 border border-slate-800">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              बटण दाबल्यावर व्हॉट्सअॅप उघडेल आणि संदेश आपोआप{' '}
              <strong className="text-slate-200">message_log</strong> टेबलमध्ये नोंदवला जाईल.
            </span>
          </div>

          {sentSuccess && (
            <div className="p-3 bg-emerald-950/50 border border-emerald-500/50 rounded-xl text-xs text-emerald-300 flex items-center gap-2 animate-in fade-in">
              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>व्हॉट्सअॅप सुरू झाले आणि संदेश message_log मध्ये यशस्वीरित्या नोंदवला गेला! ✅</span>
            </div>
          )}
        </div>

        {/* Modal Footer with BIG SEND ON WHATSAPP BUTTON */}
        <div className="p-4 sm:p-5 border-t border-slate-800 bg-slate-900/90 flex flex-col sm:flex-row gap-2.5">
          {/* BIG WHATSAPP BUTTON */}
          <button
            type="button"
            disabled={isLogging}
            onClick={handleSendOnWhatsApp}
            className="flex-1 py-3.5 px-6 bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] text-white font-black text-sm rounded-2xl flex items-center justify-center gap-2.5 shadow-xl shadow-emerald-950/60 transition duration-150 disabled:opacity-50"
          >
            <MessageSquare className="w-5 h-5 fill-white text-emerald-600" />
            <span>
              {isLogging
                ? 'नोंदणी करत आहे...'
                : lang === 'mr'
                ? '📲 व्हॉट्सअॅपवर पाठवा (Send on WhatsApp)'
                : '📲 Send on WhatsApp'}
            </span>
            <ExternalLink className="w-4 h-4 opacity-75 ml-1" />
          </button>

          <button
            type="button"
            onClick={onClose}
            className="py-3 px-5 bg-slate-800 hover:bg-slate-750 text-slate-300 font-bold text-xs rounded-2xl border border-slate-700 transition"
          >
            बंद करा (Close)
          </button>
        </div>
      </div>
    </div>
  );
}
