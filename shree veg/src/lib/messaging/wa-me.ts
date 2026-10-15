import type {
  IMessagingProvider,
  BookingInput,
  BookingMessagePayload,
  SendMessageResult,
  MessageKind,
  MessageLanguage,
  Locale,
} from './types';
import {
  normalizeBookingInput,
  renderMessageTemplate,
  TEMPLATES,
  sanitizePhoneNumber,
} from './templates';
import { logMessage } from './logger';

/**
 * Implementation 1 (Demo, Default):
 * Generates direct wa.me click-to-chat links with pre-filled Marathi and English messages.
 * Automatically logs the dispatched message in message_log.
 */
export class WaMeMessagingProvider implements IMessagingProvider {
  /**
   * Single unified interface: sendMessage(kind, booking, lang)
   */
  async sendMessage(
    kind: MessageKind,
    bookingInput: BookingInput,
    lang: MessageLanguage = 'en'
  ): Promise<SendMessageResult> {
    const normalized = normalizeBookingInput(bookingInput);
    const messageText = renderMessageTemplate(kind, normalized, lang);
    const textMr = TEMPLATES[kind].mr(normalized);
    const textHi = TEMPLATES[kind].hi(normalized);
    const textEn = TEMPLATES[kind].en(normalized);

    // Determine recipient
    const recipientPhone =
      kind === 'owner_new_booking'
        ? normalized.cleanRestaurantPhone
        : normalized.cleanGuestPhone;

    // Generate wa.me deep link
    const waUrl = `https://wa.me/${recipientPhone}?text=${encodeURIComponent(messageText)}`;
    const messageId = `wame-${normalized.tokenNumber}-${kind}-${Date.now()}`;

    // Log message into message_log table & store
    await logMessage({
      restaurantId: normalized.id ? undefined : 'shree-theur-main',
      bookingId: normalized.id.startsWith('temp-') ? null : normalized.id,
      recipientPhone,
      messageType: kind,
      provider: 'wa_me',
      status: 'sent',
      messageId,
      payload: {
        tokenNumber: normalized.tokenNumber,
        guestName: normalized.guestName,
        language: lang,
        textPreview: messageText.substring(0, 160),
        waUrl,
        kind,
        bookingType: normalized.bookingType,
        slotStart: normalized.slotStart,
      },
    });

    return {
      success: true,
      provider: 'wa_me',
      kind,
      recipientPhone,
      text: messageText,
      url: waUrl,
      messageId,
      status: 'sent',
      timestamp: new Date().toISOString(),

      // Backwards compatibility for older UI callers
      customerActionUrl: waUrl,
      ownerActionUrl: `https://wa.me/${normalized.cleanRestaurantPhone}?text=${encodeURIComponent(
        TEMPLATES.owner_new_booking[lang](normalized)
      )}`,
      formattedMessageMarathi: textMr,
      formattedMessageEnglish: textEn,
    };
  }

  // Legacy helper methods
  async sendBookingConfirmation(
    payload: BookingMessagePayload,
    preferredLocale: Locale = 'en'
  ): Promise<SendMessageResult> {
    return this.sendMessage('guest_confirmed', payload, preferredLocale);
  }

  async sendBookingStatusUpdate(
    payload: BookingMessagePayload,
    status: 'CONFIRMED' | 'REJECTED' | 'SEATED' | 'COMPLETED' | string,
    estimatedPrepTimeMinutes?: number,
    preferredLocale: Locale = 'en'
  ): Promise<SendMessageResult> {
    const enriched = {
      ...payload,
      prepTimeMins: estimatedPrepTimeMinutes,
    };

    if (status.toUpperCase() === 'CONFIRMED') {
      return this.sendMessage('guest_confirmed', enriched, preferredLocale);
    } else if (status.toUpperCase() === 'REJECTED') {
      return this.sendMessage('guest_rejected', enriched, preferredLocale);
    }

    return this.sendMessage('guest_confirmed', enriched, preferredLocale);
  }
}

// =============================================================================
// CONVENIENCE STANDALONE URL BUILDERS (Preserved for backwards compatibility)
// =============================================================================

export function getGuestReminderWaUrl(
  guestPhone: string,
  guestName: string,
  tokenNumber: string,
  slotStart: string,
  partySize: number,
  locale: Locale = 'en'
): string {
  const cleanPhone = sanitizePhoneNumber(guestPhone);
  const timeFormatted = slotStart.includes('T')
    ? slotStart.split('T')[1].substring(0, 5)
    : slotStart;

  const normalized = normalizeBookingInput({
    guestPhone: cleanPhone,
    guestName,
    tokenNumber,
    slotStart,
    time: timeFormatted,
    partySize,
  });

  const text = TEMPLATES.guest_reminder[locale](normalized);
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
}

export function getOwnerAlertWaUrl(
  ownerPhone: string,
  guestName: string,
  tokenNumber: string,
  slotStart: string,
  partySize: number,
  bookingType: string
): string {
  const cleanPhone = sanitizePhoneNumber(ownerPhone);
  const normalized = normalizeBookingInput({
    restaurantPhone: cleanPhone,
    guestName,
    tokenNumber,
    slotStart,
    partySize,
    bookingType,
  });

  const text = TEMPLATES.owner_new_booking.mr(normalized);
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
}

export function getGuestChatWaUrl(guestPhone: string, text?: string): string {
  const cleanPhone = sanitizePhoneNumber(guestPhone);
  const query = text ? `?text=${encodeURIComponent(text)}` : '';
  return `https://wa.me/${cleanPhone}${query}`;
}
